const { deploy } = require('hardhat-deploy');
const { ethers, Contract } = require('ethers');



const hre = require("hardhat");

const { tessera, besu, accounts } = require("./keys.js");
var countAAdress = accounts.hardhatA.address;
const countBPrivateKey = accounts.hardhatB.privateKey;
const countBAdress = accounts.hardhatB.address;

/**
 * 异步创建一个 ERC20 合约。
 * 该函数不接受参数。
 * @returns {Promise<Contract,Contract>} 返回部署后的 ERC20 合约对象。
 */
async function createContract() {
    try {
        // 获取部署者账户
        const [deployer] = await hre.ethers.getSigners();
        console.log("Deployer address: ", deployer.address);

        // 获取 ERC20 合约的工厂，用于创建合约实例
        const tokenCrtFactory = await hre.ethers.getContractFactory("MERC20");
        const swapCrtFactory = await hre.ethers.getContractFactory("SwapERCAB");

        // 使用工厂部署 ERC20 合约，设置合约名称和符号
        const contractA = await tokenCrtFactory.deploy("TokenA", "A");
        const contractB = await tokenCrtFactory.deploy("TokenB", "B");

        const ratioA2B = 2;
        const swapContract = await swapCrtFactory.deploy(contractA.target, contractB.target, ratioA2B);

        // 等待合约部署完成
        await contractA.waitForDeployment();
        await contractB.waitForDeployment();
        await swapContract.waitForDeployment();

        // 获取部署后合约的地址
        const addressA = await contractA.getAddress();
        const addressB = await contractB.getAddress();
        const addressSwap = await contractB.getAddress();
        console.log("$ Token ContractA deployed to: ", addressA);
        console.log("$ Token ContractB deployed to: ", addressB);
        console.log("\tSwap ←→ Contract deployed to: ", addressSwap);
        console.log("Deployment complete");
        console.log("-".repeat(40));
        console.log();
        // 返回部署后的合约实例
        return { contractA, contractB };
    } catch (error) {
        console.error("Deployment failed: ", error);
        throw error;
    }
}

async function getNameAndSymbolAtAddress(contract) {
    // const contract = await hre.ethers.getContractAt("ERC20", contractAddress);
    const name = await contract.name();
    const symbol = await contract.symbol();
    console.log("Name: " + name);
    console.log("Symbol: " + symbol);
    console.log("-".repeat(40));
    console.log();
}

/**
 * 异步执行代币转移操作。
 * @param {string} recipient 接收方的地址。
 * @param {number} amount 要转移的代币数量。
 * @param {Object} contract 合约对象，用于进行代币转移操作。
 */
async function transferTo(sender, recipient, amount, contract) {
    console.log(await contract.name());
    console.log("Transferring tokens...");

    const senderAddresss = sender; // 发送方地址
    const receiverBddresss = recipient; // 接收方地址
    console.log("Sender Address:" + senderAddresss);
    console.log("Receiver Address:" + receiverBddresss);

    // 获取发送方初始余额（总供应量）
    const initialBalance = await contract.balanceOf(senderAddresss);
    console.log("Sender's initial balance:", initialBalance);

    // 执行代币转移操作
    await contract.transfer(receiverBddresss, amount);
    console.log("Transfer of", amount, "to", receiverBddresss, "is completed.");

    // 验证转移后的余额是否正确
    const senderBalance = await contract.balanceOf(senderAddresss); // 发送方转移后的余额
    const receiverBalance = await contract.balanceOf(receiverBddresss); // 接收方转移后的余额

    console.log("Sender's final balance:", senderBalance);
    console.log("Receiver's final balance:", receiverBalance);
    console.log("-".repeat(40));
    console.log();
}


async function main() {
    await createContract().then(async function (contracts) {
        const contractA = contracts.contractA;
        const contractB = contracts.contractB;
        await getNameAndSymbolAtAddress(contractA);
        await getNameAndSymbolAtAddress(contractB);
        await transferTo(countAAdress, countBAdress, 200, contractA);
        await transferTo(countAAdress, countBAdress, 200, contractB);
    });
}


main()
    .then(() => {
        console.log("-".repeat(40));
        console.log("√ Functions testing complete.");
    })
    .catch((error) => console.error("Error during deployment:", error));


