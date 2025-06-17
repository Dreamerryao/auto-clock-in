const {
  ECPair,
  bitcoin,
  accounts,
  privateKeysArray,
  sendTx,
  getFinalInputUtxos,
  main,
  protostone,
  TARGET_FEE_RATE,
} = require("./lib");
const { tweakSigner } = require("@oyl/sdk/lib/shared/utils");

// Create signers and addresses for all accounts
const accountDetails = accounts.map((account, index) => {
  // Extract key for taproot signing
  const privateKey = Buffer.from(
    privateKeysArray[index].taproot.privateKey,
    "hex"
  );
  // Create a signer with the private key
  const signer = ECPair.fromPrivateKey(privateKey, {
    network: account.network,
  });

  // Get the internal key (xonly pubkey)
  const pubKey = Buffer.from(account.taproot.pubkey, "hex");
  const internalPubkey = pubKey.slice(1, 33);

  const tweaked = tweakSigner(signer);

  // Create the p2tr payment with the internal pubkey
  const p2tr = bitcoin.payments.p2tr({
    internalPubkey,
    network: account.network,
  });

  console.log(`Account ${index + 1} p2tr address: ${p2tr.address}`);

  return {
    signer: tweaked,
    internalPubkey,
    p2tr,
    account,
    segwitAddress: account.segwitAddress,
  };
});

const rbfSequenceNumber = 0xffffffff - 2;

const sendClockTxForAccount = async (accountSegwitAddress) => {
  const accountDetail = accountDetails.find(
    (account) => account.segwitAddress === accountSegwitAddress
  );
  if (!accountDetail) {
    console.error(`Account ${accountSegwitAddress} not found`);
    return null;
  }
  const { signer, internalPubkey, p2tr, account } = accountDetail;
  try {
    const { utxos: selectedUtxos, fee: estimateFee } = await getFinalInputUtxos(
      p2tr.address,
      true,
      TARGET_FEE_RATE
    );

    let psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });

    for (const utxo of selectedUtxos) {
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        sequence: rbfSequenceNumber, // Add RBF sequence number
        witnessUtxo: { value: utxo.value, script: p2tr.output },
        tapInternalKey: internalPubkey,
      });
    }

    const utxoValue = selectedUtxos.reduce((acc, utxo) => acc + utxo.value, 0);
    const changeValue = utxoValue - estimateFee;

    psbt.addOutput({ address: account.taproot.address, value: 546 });
    psbt.addOutput({ script: protostone, value: 0 });
    // ignore dust output
    if (changeValue - 546 > 330) {
      psbt.addOutput({ address: p2tr.address, value: changeValue - 546 });
    }

    psbt.signAllInputs(signer);
    psbt.finalizeAllInputs();
    const signedHex = psbt.extractTransaction().toHex();
    console.log(`Signed transaction for address ${p2tr.address}`);
    const txid = await sendTx(signedHex);
    return {
      txid,
      accountDetail,
      selectedUtxos,
      estimateFee,
      feeRate: TARGET_FEE_RATE,
    };  
  } catch (error) {
    console.error(`Error sending clock tx for address ${p2tr.address}:`, error);
    return null;
  }
};

const resendClockTx = async (
  accountDetail,
  selectedUtxos,
  estimateFee,
  feeRate,
  currentFeeRate
) => {
  try {
    const { signer, internalPubkey, p2tr, account } = accountDetail;
    let psbt = new bitcoin.Psbt({ network: bitcoin.networks.bitcoin });
    for (const utxo of selectedUtxos) {
      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        sequence: rbfSequenceNumber,
        witnessUtxo: { value: utxo.value, script: p2tr.output },
        tapInternalKey: internalPubkey,
      });
    }

    const newEstimateFee = Math.ceil((estimateFee / feeRate) * currentFeeRate);
    const utxoValue = selectedUtxos.reduce((acc, utxo) => acc + utxo.value, 0);
    const changeValue = utxoValue - newEstimateFee;

    psbt.addOutput({ address: account.taproot.address, value: 546 });
    psbt.addOutput({ script: protostone, value: 0 });
    // ignore dust output
    if (changeValue - 546 > 330) {
      psbt.addOutput({ address: p2tr.address, value: changeValue - 546 });
    }
    psbt.signAllInputs(signer);
    psbt.finalizeAllInputs();
    const signedHex = psbt.extractTransaction().toHex();
    console.log(`Signed RBF-enabled transaction for address ${p2tr.address}`);
    const txid = await sendTx(signedHex);
    return {
      txid,
      accountDetail,
      selectedUtxos,
      estimateFee: newEstimateFee,
      feeRate: currentFeeRate,
    };
  } catch (error) {
    console.error(`Error sending RBF transaction: ${error.message}`);
    return null;
  }
};
main(sendClockTxForAccount, resendClockTx).catch(console.error);