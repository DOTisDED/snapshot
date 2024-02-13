require('dotenv').config();
const { ApiPromise, WsProvider, Keyring } = require('@polkadot/api');
const { hexToU8a, stringToHex } = require('@polkadot/util');
const fs = require('fs');
const readline = require('readline');

const wsProvider = new WsProvider('wss://rococo-asset-hub-rpc.dwellir.com');
const accountsAddedMultipleTimesFilePath = './logs/accountsAssetsAddedMultipleTimes3.json';
const logFile = './logs/transactionAssetBurnLog.txt';
const lastKeyFile = './lastKeys/lastKeyBurn1.txt';
const currentBatchFile = './lastKeys/currentBatchBurn1.txt';
const errorLogFile = './logs/errorBurnLog.txt';
const errorLogStream = fs.createWriteStream(errorLogFile, { flags: 'a' });

const localConfig = {
    batchSize: 300,
    assetId: 47,
};

async function burnExcessAssets() {
    const api = await ApiPromise.create({ provider: wsProvider, noInitWarn: true });
    const keyring = new Keyring({ type: 'sr25519' });
    const privateKey = hexToU8a(process.env.PRIVATE_KEY);
    const sender = keyring.addFromSeed(privateKey);

    let currentNonce = await api.rpc.system.accountNextIndex(sender.address);

    const fileStream = fs.createReadStream(accountsAddedMultipleTimesFilePath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    const logStream = fs.createWriteStream(logFile, { flags: 'a' });
    let lastKey = getLastKey();
    let currentBatch = getCurrentBatch();
    let accountDataList = [];
    let currentLine = 0;

    for await (const line of rl) {
        currentLine++;
        if (currentLine <= lastKey) continue;
        const accountData = JSON.parse(line);
        accountDataList.push(accountData);
    
        if (accountDataList.length >= localConfig.batchSize || (accountDataList.length > 0 && rl.closed)) {
            await sendBurnBatch(api, sender, accountDataList.splice(0, accountDataList.length), localConfig.assetId, logStream, currentBatch, currentNonce);
            lastKey = currentLine;
            saveLastKey(lastKey);
            currentBatch++;
            saveCurrentBatch(currentBatch);
            currentNonce++;
        }
    }
    
    logStream.end();
    console.log('Excess asset burning process completed.');
}

async function sendBurnBatch(api, sender, accountDataList, assetId, logStream, currentBatch, nonce) {
    return new Promise(async (resolve, reject) => {
        try {
            const batchTransactions = accountDataList.flatMap(accountData => {
                const baseAmount = BigInt(accountData.Total);
                const countMultiplier = BigInt(accountData.Count);
                const amountToBurn = (baseAmount * countMultiplier - baseAmount) * BigInt(1000);

                let transactions = [];

                if (accountData.Frozen) {
                    transactions.push(api.tx.assets.thaw(assetId, accountData.AccountId));
                }

                transactions.push(api.tx.assets.burn(assetId, accountData.AccountId, amountToBurn));

                transactions.push(api.tx.assets.freeze(assetId, accountData.AccountId));

                return transactions;
            });

            const remarkHex = stringToHex(`Burn ${currentBatch}`);
            batchTransactions.push(api.tx.system.remarkWithEvent(remarkHex));
            const signedBatch = api.tx.utility.batchAll(batchTransactions);

            signedBatch.signAndSend(sender, { nonce: nonce }, async ({ status, dispatchError, events }) => {
                if (status.isInBlock) {
                    console.log(`Burn Batch ${currentBatch} included at blockHash ${status.asInBlock.toString()}, nonce: ${nonce}`);
                    logStream.write(`Burn Batch ${currentBatch} included in block: ${status.asInBlock.toString()}, nonce: ${nonce}\n`);
                }

                events.forEach(({ event: { data, method, section }, phase }) => {
                    if (section === "system" && method === "ExtrinsicFailed") {
                        const failedEventIndex = phase.asApplyExtrinsic.toNumber();
                        const failedTransaction = batchTransactions[failedEventIndex];
                        const failedAccountId = failedTransaction?.method.args[1].toString(); // Assuming the second argument is the account ID in your transaction

                        const errorDetails = data.toHuman();
                        if (errorDetails.includes('NoAccount')) {
                            console.error(`NoAccount error for account ${failedAccountId}`);
                            errorLogStream.write(`NoAccount error for account ${failedAccountId} in Burn Batch ${currentBatch}\n`);
                        } else {
                            console.error(`Extrinsic Failed: ${section}.${method} with data ${data.toString()}`);
                            errorLogStream.write(`Extrinsic Failed in Burn Batch ${currentBatch}: ${data.toString()}\n`);
                        }
                    }
                });

                if (status.isFinalized) {
                    console.log(`Burn Batch ${currentBatch} finalized at blockHash ${status.asFinalized}`);
                    logStream.write(`Burn Batch ${currentBatch} finalized in block: ${status.asFinalized.toString()}\n`);
                    resolve();
                }

                if (dispatchError) {
                    console.error(`Dispatch Error in Burn Batch ${currentBatch}: ${dispatchError.toString()}`);
                    errorLogStream.write(`Dispatch Error in Burn Batch ${currentBatch}: ${dispatchError.toString()}\n`);
                    reject(dispatchError);
                }
            });
        } catch (error) {
            console.error(`Error in Burn Batch transaction: ${error}`);
            logStream.write(`Error in Burn Batch transaction: ${error}\n`);
            reject(error);
        }
    });
}


function getLastKey() {
    if (fs.existsSync(lastKeyFile)) {
        const lastKeyStr = fs.readFileSync(lastKeyFile, 'utf8');
        return parseInt(lastKeyStr, 10) || 0;
    }
    return 0;
}

function saveLastKey(key) {
    fs.writeFileSync(lastKeyFile, String(key));
}

function getCurrentBatch() {
    if (fs.existsSync(currentBatchFile)) {
        return parseInt(fs.readFileSync(currentBatchFile, 'utf8'), 10) || 1;
    }
    return 1;
}

function saveCurrentBatch(batchNumber) {
    fs.writeFileSync(currentBatchFile, String(batchNumber));
}

burnExcessAssets().catch(console.error);
