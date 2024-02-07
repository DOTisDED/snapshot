require('dotenv').config();
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { hexToU8a, stringToU8a, stringToHex } = require('@polkadot/util');
const fs = require('fs');
const readline = require('readline');

const wsProvider = new WsProvider('wss://rococo-asset-hub-rpc.dwellir.com');
const snapshotFile = './mergedSnapshotWithoutNomPools_NoZB_NoAccount1.json';
const logFile = './logs/transactionLog.txt';
const lastKeyFile = './lastKey.txt';
const currentBatchFile = './currentBatch.txt';


const localConfig = {
    batchSize: 900,
};



async function distributeBalances() {
    const api = await ApiPromise.create({ provider: wsProvider });
    const keyring = new Keyring({ type: 'sr25519' });
    const privateKey = hexToU8a(process.env.PRIVATE_KEY);
    const sender = keyring.addFromSeed(privateKey);
    const chainDecimals = api.registry.chainDecimals;
    const existentialDeposit = 0.01 * Math.pow(10, chainDecimals); 

    // Initialize the local nonce
    let currentNonce = await api.rpc.system.accountNextIndex(sender.address);

    const fileStream = fs.createReadStream(snapshotFile);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    const logStream = fs.createWriteStream(logFile, { flags: 'a' });
    let lastKey = getLastKey();
    let currentLine = 0;
    let currentBatch = getCurrentBatch();
    let addresses = [];

    for await (const line of rl) {
        currentLine++;
        if (currentLine <= lastKey) continue;
        const accountData = JSON.parse(line);
        addresses.push(accountData.AccountId);

        if (addresses.length >= localConfig.batchSize) {
            await sendBatch(api, sender, addresses.splice(0, localConfig.batchSize), existentialDeposit, logStream, currentBatch, currentNonce);
            lastKey += localConfig.batchSize;
            saveLastKey(lastKey);
            saveCurrentBatch(++currentBatch);
            currentNonce++; // increment nonce after batch is finalized
        }
    }

    // Handle any remaining addresses
    if (addresses.length > 0) {
        await sendBatch(api, sender, addresses, existentialDeposit, logStream, currentBatch, currentNonce);
        saveLastKey(lastKey + addresses.length);
        saveCurrentBatch(++currentBatch);
        currentNonce++; // increment nonce after batch is finalized
    }

    logStream.end();
    console.log('All batches processed successfully.');
}

async function sendBatch(api, sender, addresses, amount, logStream, currentBatch, nonce) {
    return new Promise((resolve, reject) => {
        try {
            const batchTransactions = addresses.map(addr => api.tx.balances.transferKeepAlive(addr, amount));
            const remarkHex = stringToHex(`${currentBatch}`);
            batchTransactions.push(api.tx.system.remarkWithEvent(remarkHex));
            const signedBatch = api.tx.utility.batchAll(batchTransactions);

            signedBatch.signAndSend(sender, { nonce: nonce }, ({ status, dispatchError }) => {
                if (status.isInBlock) {
                    console.log(`Batch ${currentBatch} included at blockHash ${status.asInBlock}`);
                    logStream.write(`Batch ${currentBatch} included in block: ${status.asInBlock.toString()}\n`);
                }

                if (status.isFinalized) {
                    console.log(`Batch ${currentBatch} finalized at blockHash ${status.asFinalized}`);
                    logStream.write(`Batch ${currentBatch} finalized in block: ${status.asFinalized.toString()}\n`);
                    resolve(); 
                }

                if (dispatchError) {
                    console.error(`Error in batch ${currentBatch}: ${dispatchError.toString()}`);
                    logStream.write(`Error in batch ${currentBatch}: ${dispatchError.toString()}\n`);
                    reject(dispatchError); 
                }
            });

            console.log(`Submitting Batch ${currentBatch}, Batch Hash: ${signedBatch.hash.toHex()}`);
            logStream.write(`Submitting Batch ${currentBatch}, Batch Hash: ${signedBatch.hash.toHex()}\n`);

        } catch (error) {
            console.error(`Error in batch transaction: ${error}`);
            logStream.write(`Error in batch transaction: ${error}\n`);
            reject(error); 
        }
    });
}




function getLastKey() {
    if (fs.existsSync(lastKeyFile)) {
        return parseInt(fs.readFileSync(lastKeyFile, 'utf8'), 10);
    }
    return 0;
}

function saveLastKey(key) {
    fs.writeFileSync(lastKeyFile, key.toString());
}

function getCurrentBatch() {
    if (fs.existsSync(currentBatchFile)) {
        return parseInt(fs.readFileSync(currentBatchFile, 'utf8'), 10);
    }
    return 1; // Start from Batch 1 if file doesn't exist
}

function saveCurrentBatch(batchNumber) {
    fs.writeFileSync(currentBatchFile, batchNumber.toString());
}

distributeBalances().catch(console.error);
