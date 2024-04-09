require('dotenv').config();
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { hexToU8a, stringToU8a, stringToHex } = require('@polkadot/util');
const fs = require('fs');
const readline = require('readline');

const wsProvider = new WsProvider('wss://polkadot-asset-hub-rpc.dwellir.com'); 
const snapshotFile = './DOT-balances-live-dwellir-19952000-Two-NomP-RemP-New-NoZB-SORTED-noTop40.json';

const logFile = './logs/transactionAssetTransferLog_LIVE-UNFREEZE.txt';
const lastKeyFile = './lastKeyAsset_LIVE-UN-FREEZE.txt';
const currentBatchFile = './currentBatchAsset_LIVE-UNFREEZE.txt';


const localConfig = {
    batchSize: 800,
};

async function distributeBalances() {
    const api = await ApiPromise.create({ provider: wsProvider });
    const keyring = new Keyring({ type: 'sr25519' });
    const privateKey = hexToU8a(process.env.PRIVATE_KEY);
    const sender = keyring.addFromSeed(privateKey);
    const chainDecimals = api.registry.chainDecimals;

    //  local nonce
    const assetId = 30; // Your asset ID
    let currentNonce = await api.rpc.system.accountNextIndex(sender.address);

    const fileStream = fs.createReadStream(snapshotFile);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    const logStream = fs.createWriteStream(logFile, { flags: 'a' });
    let lastKey = getLastKey();
    let currentLine = 0;
    let currentBatch = getCurrentBatch();
    let accountDataList = [];

    for await (const line of rl) {
        currentLine++;

        if (currentLine <= lastKey) continue;
        const accountData = JSON.parse(line);
        accountDataList.push(accountData);

        // Check if we've accumulated enough accountData to meet batchSize
        if (accountDataList.length === localConfig.batchSize) {
            await sendBatch(api, sender, accountDataList, assetId, logStream, currentBatch, currentNonce);
            lastKey = currentLine; // Update the last processed key to the current line number
            saveLastKey(lastKey); // Save the updated lastKey
            currentBatch++; // Increment the batch number for the next batch
            saveCurrentBatch(currentBatch); // Save the updated batch number
            currentNonce++; // Prepare nonce for the next transaction
            accountDataList = []; // Reset accountDataList for accumulating the next batch
        }
    }

    // Check for any remaining accounts in accountDataList after loop completion
    if (accountDataList.length > 0) {
        await sendBatch(api, sender, accountDataList, assetId, logStream, currentBatch, currentNonce);
        lastKey += accountDataList.length; // Update the last processed key
        saveLastKey(lastKey); // Save the lastKey reflecting processed entries of the final partial batch
        currentBatch++; // Increment batch number as we processed a final partial batch
        saveCurrentBatch(currentBatch); // Save the final batch number
    }


    logStream.end();
    console.log('All assets distributed successfully.');
}

async function sendBatch(api, sender, accountDataList, assetId, logStream, currentBatch, nonce) {
    return new Promise((resolve, reject) => {
        try {
            // Create a batch of thaw transactions
            const batchTransactions = accountDataList.map(accountData => {
                // Replace transfer and freeze with a thaw transaction for each account
                return api.tx.assets.thaw(assetId, accountData.AccountId);
            });

            // Adding a remark transaction to tag each batch uniquely
            const remarkHex = stringToHex(`Asset Thaw ${currentBatch}`);
            batchTransactions.push(api.tx.system.remarkWithEvent(remarkHex));
            const signedBatch = api.tx.utility.batchAll(batchTransactions);

            // Submitting the batch transaction
            console.log(`Submitting Asset Thaw Batch ${currentBatch}, Batch Hash: ${signedBatch.hash.toHex()}`);
            logStream.write(`Submitting Asset Thaw Batch ${currentBatch}, Batch Hash: ${signedBatch.hash.toHex()}, nonce: ${nonce}\n`);

            signedBatch.signAndSend(sender, { nonce: nonce }, ({ status, dispatchError }) => {
                if (status.isInBlock) {
                    console.log(`Batch ${currentBatch} included at blockHash ${status.asInBlock}, nonce: ${nonce}`);
                    logStream.write(`Batch ${currentBatch} included in block: ${status.asInBlock.toString()}, nonce: ${nonce}\n`);
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
        } catch (error) {
            console.error(`Error in asset thaw batch transaction: ${error}`);
            logStream.write(`Error in asset thaw batch transaction: ${error}\n`);
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
    return 0; 
}

function saveCurrentBatch(batchNumber) {
    fs.writeFileSync(currentBatchFile, batchNumber.toString());
}

// Delay function
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

distributeBalances().catch(console.error);
