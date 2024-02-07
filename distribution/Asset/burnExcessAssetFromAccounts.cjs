require('dotenv').config();
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { hexToU8a, stringToU8a, stringToHex } = require('@polkadot/util');
const fs = require('fs');
const readline = require('readline');

const wsProvider = new WsProvider('wss://rococo-asset-hub-rpc.polkadot.io'); //
const snapshotFile = './logs/accountsAssetsAddedMultipleTimes3.json';
const logFile = './logs/transactionAssetBurnLog.txt';
const lastKeyFile = './lastKeys/lastKeyBurn1.txt';
const currentBatchFile = './lastKeys/currentBatchBurn1.txt';


const localConfig = {
    batchSize: 450,
    assetId: 47,
};

async function distributeBalances() {
    const api = await ApiPromise.create({ provider: wsProvider });
    const keyring = new Keyring({ type: 'sr25519' });
    const privateKey = hexToU8a(process.env.PRIVATE_KEY);
    const sender = keyring.addFromSeed(privateKey);
    const chainDecimals = api.registry.chainDecimals;

    //  local nonce
    const assetId = 47; // Your asset ID
    let currentNonce = await api.rpc.system.accountNextIndex(sender.address);

    const fileStream = fs.createReadStream(snapshotFile);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    const logStream = fs.createWriteStream(logFile, { flags: 'a' });
    let lastKey = getLastKey() + localConfig.batchSize;
    let currentLine = 0;
    let currentBatch = getCurrentBatch() + 1;
    let accountDataList = [];

    for await (const line of rl) {
        currentLine++;
        if (currentLine <= lastKey) continue;
        const accountData = JSON.parse(line);
        accountDataList.push(accountData);

        if (accountDataList.length >= localConfig.batchSize) {
            await sendBatch(api, sender, accountDataList, assetId, logStream, currentBatch, currentNonce);
            lastKey += localConfig.batchSize; // increment lastKey after batch is finalized
            saveLastKey(lastKey);
            saveCurrentBatch(++currentBatch); // increment currentBatch after batch is finalized
            currentNonce++;
            accountDataList = [];
            // await delay(12000);
        }
    }

    if (accountDataList.length > 0) {

        await sendBatch(api, sender, accountDataList, assetId, logStream, currentBatch, currentNonce);
        saveLastKey(lastKey + accountDataList.length);
        saveCurrentBatch(++currentBatch);
        currentNonce++;
        // await delay(12000);
    }

    logStream.end();
    console.log('All assets distributed successfully.');
}

async function sendBatch(api, sender, accountDataList, assetId, logStream, currentBatch, nonce) {
    return new Promise((resolve, reject) => {
        try {
            const batchTransactions = accountDataList.flatMap(accountData => {
                const amountToBurn = ((BigInt(accountData.Total) * BigInt(accountData.Count) - BigInt(accountData.Total)) * 1000n);
                const thawTx = api.tx.assets.thaw(assetId, accountData.AccountId);
                const burnTx = api.tx.assets.burn(assetId, accountData.AccountId, amountToBurn);
                const freezeTx = api.tx.assets.freeze(assetId, accountData.AccountId);
                return [thawTx, burnTx];
            });
            const remarkHex = stringToHex(`Asset ${currentBatch}`);
            batchTransactions.push(api.tx.system.remarkWithEvent(remarkHex));
            const signedBatch = api.tx.utility.batchAll(batchTransactions);

            console.log(`Submitting Asset Distribution Batch ${currentBatch}, Batch Hash: ${signedBatch.hash.toHex()}`);
            logStream.write(`Submitting Asset Distribution Batch ${currentBatch}, Batch Hash: ${signedBatch.hash.toHex()}, nonce: ${nonce}\n`);

            signedBatch.signAndSend(sender, { nonce: nonce }, ({ status, dispatchError }) => {
                if (status.isInBlock) {
                    console.log(`Batch ${currentBatch} included at blockHash ${status.asInBlock}, nonce: ${nonce}`);
                    logStream.write(`Batch ${currentBatch} included in block: ${status.asInBlock.toString()}, nonce: ${nonce}\n`);
                    // resolve(); 
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
    

        } catch (error) {
            console.error(`Error in asset distribution batch transaction: ${error}`);
            logStream.write(`Error in asset distribution batch transaction: ${error}\n`);
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
    return 1; 
}

function saveCurrentBatch(batchNumber) {
    fs.writeFileSync(currentBatchFile, batchNumber.toString());
}

// Delay function
function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

distributeBalances().catch(console.error);
