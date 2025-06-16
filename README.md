# 🛠️ Alkanes Auto Check-in Script by [@OOP](https://x.com/__ababa___)

## 📌 Description

This is a **completely free and open-source** auto check-in script for **Alkanes2:21568**, designed for both **SegWit wallets (starting with bc1q)** and **Taproot wallets (starting with bc1p)**.
The script supports four transaction modes and can automatically construct transactions based on your configured starting fee rate, including **automatic RBF (Replace-By-Fee) resubmission**.

---

## ⚙️ Setup

1. Copy the `config.yaml.example` file and rename it to `config.yaml`.
2. Fill in the following fields in config.yaml:
	•	Your mnemonic phrase list
	•	The starting fee rate (must be ≥ 3, in sat/vByte)
	•	The maximum fee rate you are willing to pay for this check-in (usually around 20, i.e., 3-4 USD)
3. Ensure your SegWit (`bc1q...`) or Taproot (`bc1p...`) address has a sufficient balance (recommended: ~$20 USD) to cover transaction fees.

---

## 📦 Installation

Run the following command to install dependencies:

```bash
npm install
# or
pnpm install
```

---

## 🚀 Usage

### 🔹 Mode 1: With Taproot Output
- Input: SegWit (bc1q)
- Outputs:
    - Taproot (bc1p) output (546 sats)
    - Clock-in output
    - Change output (SegWit)
- Command: `node main.js`

### 🔹 Mode 2: Without Taproot Output
- Input: SegWit (bc1q)
- Outputs:
    - Clock-in output
    - Change output (SegWit)
- Command: `node without_taproot_output.js`

### 🔹 Mode 3: Taproot Input with Taproot Output
- Input: Taproot address (bc1p)
- Outputs:
    - Taproot (bc1p) output (546 sats)
    - Clock-in output
    - Change output (Taproot)
- Command: `node t_input_with_t_output.js`


### 🔹 Mode 4: Taproot Input without Taproot Output
- Input: Taproot address (bc1p)
- Outputs:
    - Clock-in output
    - Change output (Taproot)
- Command: `node t_input_without_t_output.js`

---

## 🐳 Docker Usage

You can run this project easily with Docker:

1. Copy `config.yaml.example` to `config.yaml` and fill in your configuration.
2. Build and run with Docker Compose:

```bash
docker-compose up --build
```

This will start the script in Taproot input with Taproot output mode (equivalent to `node t_input_with_t_output.js`).

---

## ⚠️ Disclaimer

This project is **fully open-source and free of charge**.
The code **contains no logic to steal or leak your private key.**
However, the author takes **no responsibility** for any losses caused by third-party dependencies or tools.
You are strongly advised to **read and understand the source code** before using it.

Use at your own risk.

---

## 🙌 Donation

If you find this script helpful, feel free to donate:

**BTC Address:**
bc1qx3m5u6uf4zryeyut26dkygeuj0vx6kj350a4ss

---

## 📫 Author

Twitter: [@OOP](https://x.com/__ababa___)

Discord: [OOP](discord.gg/SpBRAzuBff)