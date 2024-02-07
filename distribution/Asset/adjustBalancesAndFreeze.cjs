require('dotenv').config();
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { hexToU8a, stringToHex } = require('@polkadot/util');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

// Configuration and setup
const wsProvider = new WsProvider('wss://rococo-asset-hub-rpc.dwellir.com');
const inputFileName = './mergedSnapshotWithoutNomPools_NoZB_frozen3_withDifferences.json'; // Update this to your file path
const baseFileName = path.basename(inputFileName, '.json');
const lastKeyFile = `./${baseFileName}_lastKeyDisc.txt`;
const logFile = `./logs/${baseFileName}_adjustmentLog.txt`;
const currentBatchFile = `./${baseFileName}_currentBatch.txt`; // File to keep track of the current batch number


const localConfig = {
    batchSize: 400, // Adjust based on your network's capabilities
    assetId: 47, // Update this to your asset ID
};

async function adjustBalancesAndFreeze() {
    const api = await ApiPromise.create({ provider: wsProvider });
    const keyring = new Keyring({ type: 'sr25519' });
    const privateKey = hexToU8a(process.env.PRIVATE_KEY);
    const sender = keyring.addFromSeed(privateKey);

    let lastKey = getLastKey();
    let currentBatch = getCurrentBatch(); // Load the current batch number
    const logStream = fs.createWriteStream(logFile, { flags: 'a' });
    let accountDataList = [];
    let nonce = await api.rpc.system.accountNextIndex(sender.address);
    let lineNumber = 0; // Initialize lineNumber to count each line


    const fileStream = fs.createReadStream(inputFileName);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    for await (const line of rl) {
        lineNumber++;
        console.log(`Reading line ${lineNumber}: ${line}`);
        if (lineNumber <= lastKey) {
            continue; 
        }

        const accountData = JSON.parse(line);
        accountDataList.push(accountData);

        if (accountDataList.length === localConfig.batchSize) {
            console.log(`Batch ${currentBatch} ready with ${accountDataList.length} accounts.`);

            await adjustBalancesAndFreezeBatch(api, sender, accountDataList, localConfig.assetId, logStream, currentBatch, nonce++);
            accountDataList = []; 
            currentBatch++;
            saveLastKey(lineNumber); 
            saveCurrentBatch(currentBatch);
        }
    }

    // Ensure any remaining accounts are processed
    if (accountDataList.length > 0) {
        console.log(`Processing remaining ${accountDataList.length} accounts.`);
        await adjustBalancesAndFreezeBatch(api, sender, accountDataList, localConfig.assetId, logStream, currentBatch, nonce);
        console.log(`Processed ${accountDataList.length} remaining accounts.`);
        saveLastKey(lineNumber); // Make sure to update lastKey for the final set of accounts
        saveCurrentBatch(++currentBatch);
    }

    logStream.end();
    console.log('Balance adjustment and freeze process completed.');
}


async function adjustBalancesAndFreezeBatch(api, sender, accountDataList, assetId, logStream, currentBatch, nonce) {
    console.log(`Preparing to submit batch ${currentBatch} with ${accountDataList.length} transactions.`);
    console.log(`Using nonce: ${nonce}`);
    return new Promise(async (resolve, reject) => {
        const batchTransactions = accountDataList.flatMap(accountData => {
            const difference = BigInt(accountData.difference);
            let transactions = [];

            // Unfreeze the account first if it's currently frozen
            if (accountData.Frozen) {
                console.log(`Account ${accountData.AccountId} is currently frozen. Unfreezing.`);
                transactions.push(api.tx.assets.thaw(assetId, accountData.AccountId));
            }

            // Adjust balance by minting or burning as needed
            if (difference > 0n) {
                console.log(`Account ${accountData.AccountId} has a positive difference of ${difference}. Burning the excess.`);
                transactions.push(api.tx.assets.burn(assetId, accountData.AccountId, difference));
            } else if (difference < 0n) {
                console.log(`Account ${accountData.AccountId} has a negative difference of ${difference}. Minting the shortfall.`);
                transactions.push(api.tx.assets.mint(assetId, accountData.AccountId, -difference));
            }

            // // Freeze the account after adjustment
            // console.log(`Freezing account ${accountData.AccountId} after adjustment.`);
            // transactions.push(api.tx.assets.freeze(assetId, accountData.AccountId));

            return transactions;
        });

        if (batchTransactions.length > 0) {
            const remark = `Adjustment & Freeze Batch ${currentBatch}`;
            const remarkTx = api.tx.system.remarkWithEvent(stringToHex(remark));
            batchTransactions.push(remarkTx);
            const signedBatch = api.tx.utility.batchAll(batchTransactions);

            console.log(`Submitting Adjustment & Freeze Batch ${currentBatch}, Batch Hash: ${signedBatch.hash.toHex()}`);
            logStream.write(`Submitting Adjustment & Freeze Batch ${currentBatch}, Batch Hash: ${signedBatch.hash.toHex()}, nonce: ${nonce}\n`);

            signedBatch.signAndSend(sender, { nonce }, async ({ status, dispatchError }) => {
                if (status.isInBlock) {
                    console.log(`Batch ${currentBatch} included at blockHash ${status.asInBlock.toString()}, nonce: ${nonce}`);
                    logStream.write(`Batch ${currentBatch} included in block: ${status.asInBlock.toString()}, nonce: ${nonce}\n`);
                }

                if (status.isFinalized) {
                    console.log(`Batch ${currentBatch} finalized at blockHash ${status.asFinalized.toString()}`);
                    logStream.write(`Batch ${currentBatch} finalized in block: ${status.asFinalized.toString()}\n`);
                    resolve();
                }

                if (dispatchError) {
                    console.error(`Error in batch ${currentBatch}: ${dispatchError.toString()}`);
                    logStream.write(`Error in batch ${currentBatch}: ${dispatchError.toString()}\n`);
                    reject(dispatchError);
                }
            });
        } else {
            console.log(`No adjustments needed for batch ${currentBatch}.`);
            resolve();
        }
    });
}



function getLastKey() {
    try {
        return parseInt(fs.readFileSync(lastKeyFile, 'utf8'), 10);
    } catch (e) {
        return 0; // Default to 0 if there's an issue reading the file
    }
}

function saveLastKey(key) {
    fs.writeFileSync(lastKeyFile, key.toString(), { flag: 'w' }); // Ensure this is 'w' to overwrite with the latest key
}


function getCurrentBatch() {
    try {
        return parseInt(fs.readFileSync(currentBatchFile, 'utf8'), 10);
    } catch (e) {
        return 0; // Default to 0 if there's an issue reading the file
    }
}

function saveCurrentBatch(batchNumber) {
    fs.writeFileSync(currentBatchFile, batchNumber.toString(), { flag: 'w' }); // Update the current batch number
}

adjustBalancesAndFreeze().catch(console.error);

