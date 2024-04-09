require('dotenv').config();
const { ApiPromise, WsProvider } = require('@polkadot/api');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

const wsProvider = new WsProvider('wss://polkadot-asset-hub-rpc.dwellir.com');
const snapshotFile = './nominationPools/accountsFromPoolsLIVEwithUnbondingEras2.json'; // Adjust this to your snapshot file path
const baseFileName = path.basename(snapshotFile, '.json');

// Output files
const frozenAccountsFile = `${baseFileName}_accountFrozen.json`;
const unfrozenAccountsFile = `${baseFileName}_accountUnFrozen.json`;

const assetId = 30; // Your asset ID, adjust this as needed

async function checkAssetAccounts() {
    const api = await ApiPromise.create({ provider: wsProvider });
    const fileStream = fs.createReadStream(snapshotFile);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const frozenAccountsStream = fs.createWriteStream(frozenAccountsFile, { flags: 'w' });
    const unfrozenAccountsStream = fs.createWriteStream(unfrozenAccountsFile, { flags: 'w' });

    for await (const line of rl) {
        if (line) {
            const accountData = JSON.parse(line);
            const accountId = accountData.AccountId;
            
            // Check if the account has an associated asset account
            const assetInfo = await api.query.assets.account(assetId, accountId);
            if (assetInfo.isNone) {
                // Skip accounts without associated asset account
                continue;
            } else {
                const { balance, status } = assetInfo.unwrap();
                accountData.balance = balance.toString(); // Add balance to account data
                // Check if the account is frozen or not
                if (status.isFrozen) {
                    frozenAccountsStream.write(JSON.stringify(accountData) + '\n');
                } else {
                    unfrozenAccountsStream.write(JSON.stringify(accountData) + '\n');
                }
            }
        }
    }

    frozenAccountsStream.end();
    unfrozenAccountsStream.end();

    console.log('Completed checking asset accounts for frozen/unfrozen status.');
}

checkAssetAccounts().catch(console.error);