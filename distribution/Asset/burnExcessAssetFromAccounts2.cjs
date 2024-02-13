require('dotenv').config();
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { hexToU8a, stringToU8a, stringToHex } = require('@polkadot/util');

const fs = require('fs');
const readline = require('readline');

// Updated file paths and configuration
const wsProvider = new WsProvider('wss://rococo-asset-hub-rpc.polkadot.io');
const snapshotFile = './logs/accountsAssetsAddedMultipleTimes3.json'; // Updated file path
const logFile = './logs/transactionAssetBurnLog.txt';
const lastKeyFile = './lastKeys/lastKeyBurn1.txt';
const currentBatchFile = './lastKeys/currentBatchBurn1.txt';
const errorLogFile = './logs/errorBurnLog.txt';
const errorLogStream = fs.createWriteStream(errorLogFile, { flags: 'a' });

const localConfig = {
    batchSize: 100, // Updated batch size
    assetId: 47, // Your asset ID remains the same
};

async function burnExcessAssets() {
    const api = await ApiPromise.create({ provider: wsProvider, noInitWarn: true });
    const keyring = new Keyring({ type: 'sr25519' });
    const privateKey = hexToU8a(process.env.PRIVATE_KEY);
    const sender = keyring.addFromSeed(privateKey);

    let currentNonce = await api.rpc.system.accountNextIndex(sender.address);

    const fileStream = fs.createReadStream(snapshotFile);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    const logStream = fs.createWriteStream(logFile, { flags: 'a' });
    let lastKey = getLastKey() + localConfig.batchSize;
    let currentBatch = getCurrentBatch() + 1;
    let accountDataList = [];

    // Processing each line in the snapshot file
    for await (const line of rl) {
        // Parse account data and process it
        const accountData = JSON.parse(line);
        accountDataList.push(accountData);

        if (accountDataList.length >= localConfig.batchSize) {
            await sendBatch(api, sender, accountDataList, logStream, currentBatch, currentNonce);
            // Update counters and nonce after each batch
            lastKey += localConfig.batchSize;
            saveLastKey(lastKey);
            saveCurrentBatch(++currentBatch);
            currentNonce++;
            accountDataList = [];
        }
    }

    // Process any remaining accounts
    if (accountDataList.length > 0) {
        await sendBatch(api, sender, accountDataList, logStream, currentBatch, currentNonce);
        saveLastKey(lastKey + accountDataList.length);
        saveCurrentBatch(++currentBatch);
    }

    logStream.end();
    console.log('All balances adjusted successfully.');
}

async function sendBatch(api, sender, accountDataList, logStream, currentBatch, nonce) {
    return new Promise((resolve, reject) => {
        const batchTransactions = accountDataList.flatMap(accountData => {
            // Calculate the amount to burn
            const amountToBurn = ((BigInt(accountData.Total) * BigInt(accountData.Count) - BigInt(accountData.Total)) * 1000n);
            const thawTx = api.tx.assets.thaw(localConfig.assetId, accountData.AccountId);
            const burnTx = api.tx.assets.burn(localConfig.assetId, accountData.AccountId, amountToBurn);
            const freezeTx = api.tx.assets.freeze(localConfig.assetId, accountData.AccountId);
            return [thawTx, burnTx, freezeTx];
        });

        // Include a remark for tracking
        const remarkHex = stringToHex(`Asset Burn & Freeze ${currentBatch}`);
        batchTransactions.push(api.tx.system.remarkWithEvent(remarkHex));

        // Send the transaction batch
        const signedBatch = api.tx.utility.batchAll(batchTransactions);
        console.log(`Submitting Batch ${currentBatch}, Batch Hash: ${signedBatch.hash.toHex()}`);
        logStream.write(`Submitting Batch ${currentBatch}, Batch Hash: ${signedBatch.hash.toHex()}, nonce: ${nonce}\n`);

        signedBatch.signAndSend(sender, { nonce: nonce }, ({ status, dispatchError }) => {
            // Handle transaction status updates
            if (status.isInBlock || status.isFinalized) {
                console.log(`Batch ${currentBatch} processed in block: ${status.toString()}`);
                logStream.write(`Batch ${currentBatch} processed in block: ${status.toString()}\n`);
            }


            if (status.isFinalized) {
                console.log(`Batch ${currentBatch} finalized at blockHash ${status.asFinalized}`);
                logStream.write(`Batch ${currentBatch} finalized in block: ${status.asFinalized.toString()}\n`);
                resolve(); 

            }

            if (dispatchError) {
                if (dispatchError.isModule) {
                    const decoded = api.registry.findMetaError(dispatchError.asModule);
                    const { docs, name, section } = decoded;
                    const errorDetails = `${section}.${name}: ${docs.join(' ')}`;
                    console.error(`Error in batch ${currentBatch}: ${errorDetails}`);
                    logStream.write(`Error in batch ${currentBatch}: ${errorDetails}\n`);
                    
                    // Log account IDs being processed in this batch for context
                    const accountIds = accountDataList.map(ad => ad.AccountId).join(", ");
                    console.error(`Affected accounts in this batch: ${accountIds}`);
                    logStream.write(`Affected accounts in this batch: ${accountIds}\n`);
                } else {
                    console.error(`Error in batch ${currentBatch}: ${dispatchError.toString()}`);
                    logStream.write(`Error in batch ${currentBatch}: ${dispatchError.toString()}\n`);
                }
                reject(dispatchError);
            }
            
        });
    });
}


function getLastKey() {
    return fs.existsSync(lastKeyFile) ? parseInt(fs.readFileSync(lastKeyFile, 'utf8'), 10) : 0;
}

function saveLastKey(key) {
    fs.writeFileSync(lastKeyFile, key.toString());
}

function getCurrentBatch() {
    return fs.existsSync(currentBatchFile) ? parseInt(fs.readFileSync(currentBatchFile, 'utf8'), 10) : 1;
}

function saveCurrentBatch(batchNumber) {
    fs.writeFileSync(currentBatchFile, batchNumber.toString());
}

burnExcessAssets().catch(console.error);
