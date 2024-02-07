require('dotenv').config();
const { ApiPromise, WsProvider } = require('@polkadot/api');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

const wsProvider = new WsProvider('wss://rococo-asset-hub-rpc.polkadot.io');
const inputFileName = './mergedSnapshotWithoutNomPools_NoZB_unfrozen3_withDifferences.json';
const inputFile = `./${inputFileName}`;
const baseFileName = path.basename(inputFileName, '.json');
const lastKeyFile = `./lastKeys/${baseFileName}_lastKey6.txt`;

// Define files for frozen, unfrozen, and no account scenarios
const frozenFileName = `${baseFileName}_frozen3_2.json`;
const unfrozenFileName = `${baseFileName}_unfrozen3_2.json`;
const noAccountFileName = `${baseFileName}_NoAccount3_2.json`;

async function checkAccountsForAsset() {
    const api = await ApiPromise.create({ provider: wsProvider });

    // Ensure output files are empty or create them if they don't exist
    // fs.writeFileSync(frozenFileName, '');
    // fs.writeFileSync(unfrozenFileName, '');
    // fs.writeFileSync(noAccountFileName, '');

    let lastKey = getLastKey();
    let lineCounter = 0;

    const fileStream = fs.createReadStream(inputFile);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        lineCounter++; // Increment for each line read

                if (lineCounter <= lastKey) {
                    continue; // Skip lines that have already been processed
                }        
                
                console.log(`Processing line ${lineCounter}`);
        try {
            const account = JSON.parse(line);
            const { AccountId } = account;
            const assetBalanceResult = await api.query.assets.account(47, AccountId);

            if (assetBalanceResult.isNone) {
                // Account does not have the asset, append to NoAccount file
                fs.appendFileSync(noAccountFileName, JSON.stringify(account) + '\n');
            } else {
                // Extract balance and status from the result
                const { balance, status } = assetBalanceResult.unwrap();
                account.onChainBalance = balance.toString();
                const isFrozen = status.isFrozen || status.toString().includes('Frozen');
                account.Frozen = isFrozen;

                // Append account to either frozen or unfrozen file based on status
                const targetFile = isFrozen ? frozenFileName : unfrozenFileName;
                fs.appendFileSync(targetFile, JSON.stringify(account) + '\n');
            }

            lastKey = lineCounter; 
            saveLastKey(lastKey);
        } catch (error) {
            console.error(`Error processing line: ${line}`, error);
        }
  
    }

    console.log('Accounts checked and categorized successfully.');
}

function getLastKey() {
    if (fs.existsSync(lastKeyFile)) {
        return parseInt(fs.readFileSync(lastKeyFile, 'utf8'), 10);
    }
    return 0; // Start from scratch if no lastKeyFile exists
}

function saveLastKey(lastKey) {
    fs.writeFileSync(lastKeyFile, lastKey.toString()); // Update last processed line
}

checkAccountsForAsset().catch(console.error);
