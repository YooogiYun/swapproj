const { ethers, Contract } = require('ethers');

const hre = require("hardhat");

const { tessera, besu, accounts } = require("./keys.js");
var accountA = accounts.hardhatA;
var accountAAdress = accountA.address;
const countBPrivateKey = accounts.hardhatB.privateKey;
const accountBAdress = accounts.hardhatB.address;
const ratioA2B = 2;

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

        // 等待合约部署完成
        await contractA.waitForDeployment();
        await contractB.waitForDeployment();

        const addressA = await contractA.getAddress();
        const addressB = await contractB.getAddress();


        const swapContract = await swapCrtFactory.deploy(addressA, addressB, ratioA2B);


        await swapContract.waitForDeployment();

        // 获取部署后合约的地址
        const addressSwap = await swapContract.getAddress();
        const deployerAddress = await deployer.getAddress();


        await contractA.approve(deployerAddress, 500);
        await contractB.approve(deployerAddress, 500);
        await contractA.approve(addressSwap, 500);
        await contractB.approve(addressSwap, 500);

        // 查看合约余额
        console.log("$ Token ContractA balance: ", await contractA.balanceOf(deployerAddress));
        console.log("$ Token ContractB balance: ", await contractB.balanceOf(deployerAddress));

        // 查看 allowance
        console.log("$ Token ContractA allowance: ", await contractA.allowance(deployerAddress, addressSwap));
        console.log("$ Token ContractB allowance: ", await contractB.allowance(deployerAddress, addressSwap));

        await swapContract.activeSwap(100); // A should be 100, B should be 200

        console.log("$ Token ContractA deployed to: ", addressA);
        console.log("$ Token ContractB deployed to: ", addressB);
        console.log("\tSwap ←→ Contract deployed to: ", addressSwap);
        console.log("Deployment complete");
        console.log("-".repeat(40));
        console.log();
        // 返回部署后的合约实例
        return { contractA, contractB, swapContract };
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

async function getAddressSafely(target) {
    try {
        // 尝试等待 getAddress() 函数的结果
        const address = await target.getAddress();
        return address; // 如果成功，返回获取的地址
    } catch {
        // 如果 getAddress() 抛出异常，返回 target 的 address 属性
        return target.address;
    }
}

async function getBalanceAt(target, innermsg, contractA, contractB) {
    const address = await getAddressSafely(target);
    const tokenABalance = await contractA.balanceOf(address);
    const tokenBBalance = await contractB.balanceOf(address);
    console.log("Token A ", innermsg, " balance:", tokenABalance);
    console.log("Token B ", innermsg, " balance:", tokenBBalance);
    console.log("-".repeat(40));
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

/**
 * 确保调用者地址对代币合约的授权额度足够
 * @param token - 代币合约对象
 * @param senderAddress - 调用者地址（发送方地址）
 * @param contractAddress - 需要授权的合约地址（接收方地址）
 * @param amountIn - 需要的授权金额
 * @returns {Promise<void>} 不返回任何内容
 */
async function ensureAllowance(token, senderAddress, contractAddress, amountIn) {
    // 查询当前的授权额度
    const allowance = await token.allowance(senderAddress, contractAddress);
    // 如果当前授权额度小于需要的金额，则更新授权额度
    if (allowance < amountIn) {
        await token.approve(contractAddress, amountIn);
    }
}

/**
 * 异步执行交换操作。
 * @param {string} senderAddress 发起交换操作的地址。
 * @param {Object} swapContract 交换合约对象，用于与智能合约交互。
 * @param {Number} amountIn 输入金额，即将交换的代币数量。
 * @param {boolean} isAtoB 指示交换的方向，true代表从TokenA到TokenB，false代表从TokenB到TokenA。
 * @param {string} tokenIn 输入代币的类型。
 */
async function executeSwap(senderAddress, swapContract, amountIn, isAtoB, tokenIn) {
    const contractAddress = await swapContract.getAddress(); // 获取交换合约的地址
    console.log("Contract address: ", contractAddress);

    // 确保发送方地址对交换合约有足够的允许量（allowance）以执行交换操作
    await ensureAllowance(tokenIn, senderAddress, contractAddress, amountIn);

    // 执行具体的交换操作
    let amountOut;
    if (isAtoB) {
        // 从TokenA到TokenB的交换
        amountOut = await swapContract.swapAtoB(amountIn);
        console.log("Transfer of", amountIn, "TokenA for", Math.imul(amountIn, ratioA2B), "amount of TokenB is completed.");
    } else {
        // 从TokenB到TokenA的交换
        amountOut = await swapContract.swapBtoA(amountIn);
        console.log("Transfer of", amountIn, "TokenB for", amountIn * 1 / ratioA2B, "amount of TokenA is completed.");
    }

    console.log("-".repeat(40)); // 打印分隔线
}

/**
 * 异步执行从A到B的代币交换。
 * @param {string} senderAddress 发起交换的地址。
 * @param {string} amountIn 交换输入的代币数量。
 * @param {string} swapContract 交换合约的地址。
 * @param {string} tokenIn 输入的代币类型。
 * @returns {Promise<void>} 不返回任何内容。
 */
async function swapA2B(senderAddress, amountIn, swapContract, tokenIn) {
    await executeSwap(senderAddress, swapContract, amountIn, true, tokenIn);
}

/**
 * 异步执行从 B 到 A 的代币交换。
 * @param {string} senderAddress 发起交换的地址。
 * @param {string} amountIn 交换输入的代币数量。
 * @param {string} swapContract 交换合约的地址。
 * @param {string} tokenIn 输入的代币类型。
 * @returns {Promise<void>} 不返回任何内容。
 */
async function swapB2A(senderAddress, amountIn, swapContract, tokenIn) {
    await executeSwap(senderAddress, swapContract, amountIn, false, tokenIn);
}


/**
 * 主函数，用于演示智能合约之间的代币交换。
 * 该函数首先创建一组合约（包括合约 A、合约 B 和交换合约），然后在这些合约之间进行代币转移，
 * 并监控交换过程中的余额变化。
 */
async function main() {
    // 创建合约并获取合约实例
    await createContract().then(async function (contracts) {
        const contractA = contracts.contractA;
        const contractB = contracts.contractB;
        const swapContract = contracts.swapContract;

        // 获取合约 A 的名称和符号
        await getNameAndSymbolAtAddress(contractA);
        // 从账户 A 向账户 B 在合约 A 中转移 200 个代币
        await transferTo(accountAAdress, accountBAdress, 200, contractA);

        // 获取合约 B 的名称和符号
        await getNameAndSymbolAtAddress(contractB);
        // 从账户 A 向账户 B 在合约 B 中转移 200 个代币
        await transferTo(accountAAdress, accountBAdress, 200, contractB);

        // 初始化交换合约和账户 A 的余额
        await getBalanceAt(swapContract, "Init SwapContract", contractA, contractB);
        await getBalanceAt(accountA, "Init AccountA", contractA, contractB);

        // 在合约 A 和合约 B 之间进行代币交换（A->B）
        await swapA2B(accountAAdress, 50, swapContract, contractA);

        // 检查交换后合约和账户 A 的余额
        await getBalanceAt(swapContract, "final SwapContract", contractA, contractB);
        await getBalanceAt(accountA, "final AccountA", contractA, contractB);

        // 进行反向代币交换（B->A）
        await swapB2A(accountAAdress, 10, swapContract, contractB);

        // 再次检查交换后的余额变化
        await getBalanceAt(swapContract, "final SwapContract", contractA, contractB);
        await getBalanceAt(accountA, "final AccountA", contractA, contractB);

    });
}


main()
    .then(() => {
        console.log("-".repeat(40));
        console.log("√ Functions testing complete.");
    })
    .catch((error) => console.error("Error during deployment:", error));


