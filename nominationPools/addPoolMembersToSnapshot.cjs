const fs = require('fs');
const readline = require('readline');
const config = require('../config.cjs');

const mainSnapshotFile = `./live/${config.mainSnapshotFile}`;
const poolsDataFile = `./nominationPools/${config.accountsFromPools}`;
const updatedSnapshotFile = './live/updatedSnapshotLIVE3.json'; 
const auditFile = './nominationPools/auditFileLIVE3.json';

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

    for await (const line of rl) {
        try {
            const accountData = JSON.parse(line);
            if (poolsData[accountData.AccountId]) {
                const previousBalance = BigInt(accountData.Total);
                const poolBalance = BigInt(poolsData[accountData.AccountId].Total);
                const newTotal = previousBalance + poolBalance;

                accountData.Total = newTotal.toString();
                auditData[accountData.AccountId] = {
                    AccountId: accountData.AccountId,
                    PreviousBalance: previousBalance.toString(),
                    PoolBalance: poolBalance.toString(),
                    NewTotal: newTotal.toString()
                };
            }
            // Always add the account data to the updated snapshot
            updatedSnapshotData.push(JSON.stringify(accountData));
        } catch (err) {
            console.error(`Error parsing line: ${err}`);
        }
    }

    console.log("Writing updated snapshot to a new file...");
    fs.writeFileSync(updatedSnapshotFile, updatedSnapshotData.join('\n'));

    console.log("Writing audit data to a file...");
    fs.writeFileSync(auditFile, JSON.stringify(auditData, null, 2));
}

updateSnapshotWithPools().catch(console.error);
