require('dotenv').config();
const { ApiPromise, WsProvider } = require('@polkadot/api');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

const wsProvider = new WsProvider('wss://polkadot-asset-hub-rpc.polkadot.io');
const inputFileName = './DOT-balances-live-dwellir-19952000-Two-NomP-RemP-New-NoZB.json'; 
// const inputFileName = './checkEDsOnChain.json'; 
const inputFile = `./${inputFileName}`;
const baseFileName = path.basename(inputFileName, '.json');
const lastKeyFile = `./lastKeys/${baseFileName}_lastKeyLiveAssetOnChain2.txt`; // File to keep track of the last processed line


async function checkAccountsForAsset() {
    const api = await ApiPromise.create({ provider: wsProvider });

    const checkedFileName = `${baseFileName}_AndOnChainTotal2.json`;
    const noAccountFileName = `${baseFileName}_NoAccount2.json`;

    // ensure output files are empty or create them if they don't exist
    fs.writeFileSync(checkedFileName, '');
    fs.writeFileSync(noAccountFileName, '');

    let lastKey = getLastKey();

    const fileStream = fs.createReadStream(inputFile);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        lastKey++; 
        console.log(`Processing line ${lastKey}`); 
        try {
            const account = JSON.parse(line);
            const { AccountId } = account;
            const assetBalanceResult = await api.query.assets.account(30, AccountId); 

            if (assetBalanceResult.isNone) {
                fs.appendFileSync(noAccountFileName, JSON.stringify(account) + '\n');
            } else {
                // extract actual balance from query result
                const balance = assetBalanceResult.unwrap().balance;
                // add the onChainBalance field to the account object
                account.onChainBalance = balance.toString();
                // if 30, append the modified account object to checked file
                fs.appendFileSync(checkedFileName, JSON.stringify(account) + '\n');
            }
        } catch (error) {
            console.error(`Error processing line: ${line}`, error);
        }
        saveLastKey(lastKey);

    }

    console.log('Accounts checked successfully.');
}

function getLastKey() {
    if (fs.existsSync(lastKeyFile)) {
        return parseInt(fs.readFileSync(lastKeyFile, 'utf8'), 10);
    }
    return 0; // Start from the beginning if lastKeyFile doesn't exist
}

function saveLastKey(lastKey) {
    fs.writeFileSync(lastKeyFile, lastKey.toString()); // Persist the lastKey to a file
}

// Execute the function
checkAccountsForAsset().catch(console.error);
