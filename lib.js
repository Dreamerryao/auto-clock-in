const {
  mnemonicToAccount,
  getWalletPrivateKeys,
} = require("@oyl/sdk/lib/account/account");

const {
  encodeRunestoneProtostone,
  ProtoStone,
  encipher,
} = require("alkanes/lib/index");

const bitcoin = require("bitcoinjs-lib");
const { ECPairFactory } = require("ecpair");
const ecc = require("@bitcoinerlab/secp256k1");

const fs = require("fs");
const YAML = require("yaml");
const path = require("path");



bitcoin.initEccLib(ecc);
const ECPair = ECPairFactory(ecc);

// Load config from YAML
const configPath = path.join(__dirname, "config.yaml");
const configFile = fs.readFileSync(configPath, "utf8");
const config = YAML.parse(configFile);

// INIT
const BTC_PUBLIC_NODE = config.rpc;
console.log(`Using btc rpc: ${BTC_PUBLIC_NODE}`);
if (!BTC_PUBLIC_NODE) {
  throw new Error("rpc must be defined in config.yaml");
}

const mnemonics = config.mnemonics;
console.log(`Using ${mnemonics.length} mnemonics`);
if (!Array.isArray(mnemonics) || mnemonics.length === 0) {
  throw new Error("mnemonics must be a non-empty array in config.yaml");
}

const TARGET_FEE_RATE = config.target_fee_rate || 6;
console.log(`Using fee rate: ${TARGET_FEE_RATE}`);

const MAX_FEE_RATE = config.max_fee_rate || 20;
console.log(`Using max fee rate: ${MAX_FEE_RATE}`);

const MINIUM_SATS_THRESHOLD = config.minimum_sats_threshold || 546;
console.log(`Using minimum sats threshold: ${MINIUM_SATS_THRESHOLD}`);

const TARGET_CLOCK_BLOCK = 899717;

const HEADERS = { "Content-Type": "application/json" };

const rpc = async (method, params = []) => {
  const res = await fetch(BTC_PUBLIC_NODE, {
    method: "POST",
    headers: HEADERS,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method,
      params,
    }),
  });

  const data = await res.json();
  return data.result;
};

const sendTx = async (signedHex) => {
  try {
    const response = await fetch("https://mempool.space/api/tx", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: signedHex,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to broadcast: ${errorText}`);
    }

    const txid = await response.text();
    console.log("Transaction broadcasted! TXID:", txid);
    return txid;
  } catch (error) {
    console.error("Error broadcasting transaction:", error);
    throw error;
  }
};

// clock-in (2:21568)
const opcode = 103; // 103: clock-in
const calldata = [BigInt(2), BigInt(21568), BigInt(opcode)];
const protostone = encodeRunestoneProtostone({
  protostones: [
    ProtoStone.message({
      protocolTag: 1n,
      edicts: [],
      pointer: 0,
      refundPointer: 0,
      // calldata:[]
      calldata: encipher(calldata),
    }),
  ],
}).encodedRunestone;

const selectUtxos = (utxos, withTarpoot = false, feeRate = TARGET_FEE_RATE) => {
  // select utxos
  const sortedUtxos = [...utxos].sort((a, b) => {
    return b.value - a.value;
  });

  const inputBytes = 68;
  const outputBytes = 36;
  const overheadBytes = 12 + 29;

  const dustThreshold = 546;

  const baseTxBytes = overheadBytes + outputBytes * (withTarpoot ? 2 : 1);

  const selectedUtxos = [];
  let selectedAmount = 0;

  // const exactMatchUtxo = sortedUtxos.find((utxo) => {
  //   const txFee = feeRate * (baseTxBytes + inputBytes);
  //   return utxo.value >= txFee && utxo.value <= txFee + dustThreshold;
  // });

  // if (exactMatchUtxo) {
  //   return {
  //     utxos: [exactMatchUtxo],
  //     fee: feeRate * (baseTxBytes + inputBytes),
  //   };
  // }

  // const minimumViableUtxo = sortedUtxos.find((utxo) => {
  //   const txFee = feeRate * (baseTxBytes + inputBytes);
  //   return utxo.value >= txFee;
  // });

  // if (minimumViableUtxo) {
  //   return {
  //     utxos: [minimumViableUtxo],
  //     fee: feeRate * (baseTxBytes + inputBytes),
  //   };
  // }

  for (const utxo of sortedUtxos) {
    selectedUtxos.push(utxo);
    selectedAmount += utxo.value;

    const txBytes = baseTxBytes + inputBytes * selectedUtxos.length;
    const txFee = txBytes * feeRate;

    if (selectedAmount >= txFee) {
      const change = selectedAmount - txFee;
      if (change >= dustThreshold || change === 0) {
        break;
      }
    }
  }

  const finalTxBytes = baseTxBytes + inputBytes * selectedUtxos.length;
  const finalTxFee = Math.ceil(finalTxBytes * feeRate);

  if (selectedAmount < finalTxFee) {
    throw new Error("Not enough balance");
  }
  return { utxos: selectedUtxos, fee: finalTxFee };
};

const accounts = mnemonics.map((mnemonic) =>
  mnemonicToAccount({
    mnemonic,
    opts: { network: bitcoin.networks.bitcoin },
  })
);

accounts.forEach((account) => {
 account.segwitAddress = account.nativeSegwit.address;
});

const privateKeysArray = mnemonics.map((mnemonic) =>
  getWalletPrivateKeys({
    mnemonic,
    opts: { network: bitcoin.networks.bitcoin },
  })
);

const getFinalInputUtxos = async (
  address,
  withTarpoot = false,
  feeRate = TARGET_FEE_RATE
) => {
  const confirmedResponse = await fetch(
    `https://mempool.space/api/address/${address}/utxo`
  );
  const utxos = await confirmedResponse.json();

  const filteredUtxos = utxos.filter(
    (utxo) => utxo.value > MINIUM_SATS_THRESHOLD
  );
  const { utxos: selectedUtxos, fee: estimateFee } = selectUtxos(
    filteredUtxos,
    withTarpoot,
    feeRate
  );
  console.log("selectedUtxos", selectedUtxos);
  console.log("fee", estimateFee);
  return {
    utxos: selectedUtxos,
    fee: estimateFee,
  };
};

const getRecommendedFeeRate = async () => {
  try {
    const response = await fetch(
      "https://mempool.space/api/v1/fees/recommended"
    );
    const feeData = await response.json();
    return {
      fastestFee: feeData.fastestFee,
      halfHourFee: feeData.halfHourFee,
      hourFee: feeData.hourFee,
    };
  } catch (error) {
    console.error("Error getting recommended fee rates:", error);
    return null;
  }
};

// every 144 blocks, send clock tx
const main = async (sendClockTxForAccount, resendClockTx) => {
  let lastTxsStatus = {};
  let accountsStatus = {};
  for (const account of accounts) {
    accountsStatus[account.segwitAddress] = {
      blockHeight: null,
    };
  }

  const checkAndClock = async () => {
    try {
      const currentBlock = await rpc("getblockcount");
      console.log(`Current block: ${currentBlock}`);

      if ((currentBlock + 1 - TARGET_CLOCK_BLOCK) % 144 === 0) {
        // initial clock-in
        for (const account of accounts) {
          if (
            accountsStatus[account.segwitAddress].blockHeight === currentBlock
          ) {
            continue;
          }
          const txStatus = await sendClockTxForAccount(account.segwitAddress);
          if (txStatus) {
            lastTxsStatus[account.segwitAddress] = txStatus;
            accountsStatus[account.segwitAddress].blockHeight = currentBlock;
          }
        }
        // check if need to rbf
        console.log("monitoring txs status");
        const feeRates = await getRecommendedFeeRate();
        console.log("current feeRate in mempool", feeRates.fastestFee);
        const fastestFee = Math.min(feeRates.fastestFee, MAX_FEE_RATE);
        for (const account of accounts) {
          if (lastTxsStatus[account.segwitAddress]) {
            const lastTxStatus = lastTxsStatus[account.segwitAddress];
            const currentFeeRate = lastTxStatus.feeRate;
            if (currentFeeRate < fastestFee) {
              // minium add 3
              const txStatus = await resendClockTx(
                lastTxStatus.accountDetail,
                lastTxStatus.selectedUtxos,
                lastTxStatus.estimateFee,
                lastTxStatus.feeRate,
                Math.max(fastestFee, currentFeeRate + 3)
              );
              console.log("txStatus", txStatus);
              // update lastTxsStatus
              if (txStatus) {
                lastTxsStatus[account.segwitAddress] = txStatus;
              }
            }
          }
        }
      } else {
        lastTxsStatus = {};
        const blocksUntilNextClock =
          144 - ((currentBlock + 1 - TARGET_CLOCK_BLOCK) % 144);
        console.log(`${blocksUntilNextClock} blocks until next clock-in`);
      }
    } catch (error) {
      console.error("Error in checkAndClock:", error);
    }
  };

  await checkAndClock();
  setInterval(checkAndClock, 15000);

  process.stdin.resume();
  console.log("Monitoring blocks for clock-in opportunities...");
};

module.exports = {
  opcode,
  calldata,
  protostone,
  mnemonics,
  TARGET_FEE_RATE,
  MINIUM_SATS_THRESHOLD,
  TARGET_CLOCK_BLOCK,
  ECPair,
  bitcoin,
  rpc,
  selectUtxos,
  accounts,
  privateKeysArray,
  sendTx,
  getFinalInputUtxos,
  main,
};
