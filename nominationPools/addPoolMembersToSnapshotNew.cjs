const fs = require('fs');
const readline = require('readline');
const config = require('../config.cjs');

const mainSnapshotFile = `./DOT-balances-live-dwellir-19952000-Two.json`;
const poolsDataFile = `./nominationPools/${config.accountsFromPools}`;
const updatedSnapshotFile = './DOT-balances-live-dwellir-19952000-Two-NomP-New.json'; 
const auditFile = './nominationPools/AUDIT-DOT-balances-live-dwellir-19952000-Two-New.json';

async function updateSnapshotWithPools() {
    let poolsData = await readPoolsData(poolsDataFile);

    console.log("Reading and updating the main snapshot file...");
    await updateMainSnapshot(mainSnapshotFile, poolsData);

    console.log("Process completed.");
}

async function readPoolsData(poolsDataFile) {
    let poolsData = {};

    const poolsFileStream = fs.createReadStream(poolsDataFile);
    const poolsRL = readline.createInterface({
        input: poolsFileStream,
        crlfDelay: Infinity
    });

    for await (const line of poolsRL) {
        try {
            const poolAccountData = JSON.parse(line);
            poolsData[poolAccountData.AccountId] = poolAccountData;
        } catch (err) {
            console.error(`Error parsing line in pools data file: ${err}`);
        }
    }

    return poolsData;
}

async function updateMainSnapshot(mainSnapshotFile, poolsData) {
    const fileStream = fs.createReadStream(mainSnapshotFile);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let updatedSnapshotData = [];
    let auditData = {};
    let processedAccounts = {};

    for await (const line of rl) {
        try {
            const accountData = JSON.parse(line);
            let totalBalance = BigInt(accountData.Total);
            if (poolsData[accountData.AccountId]) {
                const poolBalance = BigInt(poolsData[accountData.AccountId].Total);
                totalBalance += poolBalance;

                auditData[accountData.AccountId] = {
                    AccountId: accountData.AccountId,
                    PreviousBalance: accountData.Total,
                    PoolBalance: poolBalance.toString(),
                    NewTotal: totalBalance.toString()
                };
            }
            // Update the snapshot and mark the account as processed
            accountData.Total = totalBalance.toString();
            updatedSnapshotData.push(JSON.stringify(accountData));
            processedAccounts[accountData.AccountId] = true;
        } catch (err) {
            console.error(`Error parsing line: ${err}`);
        }
    }

    // Add pool accounts not present in the main snapshot
    for (const [accountId, poolData] of Object.entries(poolsData)) {
        if (!processedAccounts[accountId]) {
            updatedSnapshotData.push(JSON.stringify(poolData));
            auditData[accountId] = {
                AccountId: accountId,
                PreviousBalance: "0",
                PoolBalance: poolData.Total,
                NewTotal: poolData.Total
            };
        }
    }

    console.log("Writing updated snapshot to a new file...");
    fs.writeFileSync(updatedSnapshotFile, updatedSnapshotData.join('\n'));

    console.log("Writing audit data to a file...");
    fs.writeFileSync(auditFile, JSON.stringify(auditData, null, 2));
}

updateSnapshotWithPools().catch(console.error);
