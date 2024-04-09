require('dotenv').config();
const { ApiPromise, WsProvider } = require('@polkadot/api');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

const wsProvider = new WsProvider('wss://polkadot-asset-hub-rpc.polkadot.io');
const inputFileName = 'checkForEDs3.json'; 
const inputFile = `./${inputFileName}`;
const baseFileName = path.basename(inputFileName, '.json');
const lastKeyFile = `./lastKeys/${baseFileName}_lastKeyLiveED4.txt`;

// Define files for accounts with DOT, without DOT, and no account scenarios
const withDotFileName = `${baseFileName}_withDOT.json`;
const withoutDotFileName = `${baseFileName}_withoutDOT.json`;
const noAccountFileName = `${baseFileName}_NoAccount.json`;

async function checkAccountsForDotBalance() {
    const api = await ApiPromise.create({ provider: wsProvider });

    let lastKey = getLastKey();
    let lineCounter = 0;

    const fileStream = fs.createReadStream(inputFile);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        lineCounter++;
        if (lineCounter <= lastKey) {
            continue; // Skip lines that have already been processed
        }
                
        console.log(`Processing line ${lineCounter}`);
        try {
            const account = JSON.parse(line);
            const { AccountId } = account;
            const accountInfo = await api.query.system.account(AccountId);

            // Check if the account has a non-zero free balance
            if (accountInfo.data.free.isZero()) {
                // Account exists but has no DOT balance
                fs.appendFileSync(withoutDotFileName, JSON.stringify(account) + '\n');
            } else {
                // Account has DOT balance
                account.FreeBalance = accountInfo.data.free.toString();
                fs.appendFileSync(withDotFileName, JSON.stringify(account) + '\n');
            }

            lastKey = lineCounter;
            saveLastKey(lastKey);
        } catch (error) {
            console.error(`Error processing line: ${line}`, error);
            // If account does not exist or another error occurs, you might consider logging it differently
            // For simplicity, here we're just printing the error
        }
    }

    console.log('Accounts checked for DOT balance successfully.');
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

checkAccountsForDotBalance().catch(console.error);
