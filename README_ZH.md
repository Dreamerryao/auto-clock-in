# 🛠️ Alkanes 自动打卡脚本 by [@OOP](https://x.com/__ababa___)

## 📌 项目简介

这是一个完全免费、开源的 Alkanes2:21568 自动打卡脚本，适用于 SegWit 钱包（以 `bc1q` 开头） 以及 Taproot 钱包（以 `bc1p` 开头） 。  
该脚本支持四种交易模式，并可根据用户设定的起始费率自动构造交易，并完成自动的RBF手续费替换操作。

---

## ⚙️ 使用配置

1. 复制 `config.yaml.example` 文件并重命名为 `config.yaml`
2. 在 `config.yaml` 文件中填写：
   - **助记词列表**（mnemonic phrase）
   - **你期望开始使用的手续费率（不小于3）**（单位：sat/vByte）
   - **你期望这次打卡最高使用的手续费率（一般设置为20左右，3-4u）**（单位：sat/vByte）
3. 确保你的 SegWit 钱包地址（以 `bc1q...` 开头）/ Taproot 钱包（以 `bc1p` 开头）余额充足（推荐放20u左右），能支付矿工费。

---

## 📦 安装依赖

在终端运行以下命令安装依赖：

```bash
npm install
# 或
pnpm install
```

---

## 🚀 使用方法

### 🔹 模式一：SegWit输入，包含 Taproot 输出
- 输入：SegWit 地址 (bc1q)
- 输出：
    - Taproot 输出地址 (bc1p)，金额为 546 sats
    - 打卡用的输出（如 OP_RETURN）
    - 找零输出（仍为 SegWit 地址）
- 执行命令：`node main.js`


### 🔹 模式二：SegWit输入，不包含 Taproot 输出
- 输入：SegWit 地址 (bc1q)
- 输出：
    - 打卡用的输出（如 OP_RETURN）
    - 找零输出（仍为 SegWit 地址）
- 执行命令：`node without_taproot_output.js`


### 🔹 模式三：Taproot输入，包含 Taproot 输出
- 输入：Taproot 地址 (bc1p)
- 输出：
    - Taproot 输出 (bc1p)，金额为 546 sats
    - 打卡用的输出（如 OP_RETURN）
    - Taproot 找零输出
- 执行命令：`node t_input_with_t_output.js`

### 🔹 模式四：Taproot输入，不包含 Taproot 输出
- 输入：Taproot 地址 (bc1p)
- 输出：
    - 打卡用的输出（如 OP_RETURN）
    - Taproot 找零输出
- 执行命令：`node t_input_without_t_output.js`

---

## 🐳 Docker 使用方法

你可以通过 Docker 快速运行本项目：

1. 复制 `config.yaml.example` 为 `config.yaml` 并填写配置信息。
2. 使用 Docker Compose 构建并运行：

```bash
docker-compose up --build
```

这会以"Taproot输入，包含Taproot输出"模式启动脚本（等同于 `node t_input_with_t_output.js`）。

---

## ⚠️ 免责声明

本脚本**完全免费、开源**，代码中不包含任何窃取私钥的逻辑。
作者不对依赖库或第三方工具的行为以及由此可能导致的资金损失负责。
强烈建议您在使用前通读并理解源代码。

---

## 🙌 打赏支持

如果您觉得这个脚本对您有帮助，欢迎捐赠支持开发：

BTC 地址：
bc1qx3m5u6uf4zryeyut26dkygeuj0vx6kj350a4ss

---

## 📫 联系作者

Twitter: [OOP](https://x.com/__ababa___)

Discord: [OOP](discord.gg/SpBRAzuBff )

