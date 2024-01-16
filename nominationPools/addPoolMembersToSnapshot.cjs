const fs = require('fs');
const readline = require('readline');
const config = require('../config.cjs');

const mainSnapshotFile = config.mainSnapshotFile;
const poolsDataFile = `./nominationPools/${config.accountsFromPools}`;
const updatedSnapshotFile = './updatedSnapshot.json'; // New file for updated snapshot
const auditFile = './nominationPools/auditFile.json';

async function updateSnapshotWithPools() {
    const fileStream = fs.createReadStream(mainSnapshotFile);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const poolsData = JSON.parse(fs.readFileSync(poolsDataFile, 'utf-8'));
    let snapshotData = {};
    let auditData = {};

    console.log("Reading and parsing the main snapshot file...");

    for await (const line of rl) {
        try {
            const accountData = JSON.parse(line);
            snapshotData[accountData.AccountId] = accountData;
        } catch (err) {
            console.error(`Error parsing line: ${err}`);
        }
    }

    console.log("Updating snapshot with pool data...");

    for (const [address, poolAccount] of Object.entries(poolsData)) {
        if (snapshotData[address]) {
            const previousBalance = BigInt(snapshotData[address].Total);
            const poolBalance = BigInt(poolAccount.Total);
            const newTotal = previousBalance + poolBalance;

            snapshotData[address].Total = newTotal.toString();
            auditData[address] = {
                AccountId: address,
                PreviousBalance: previousBalance.toString(),
                PoolBalance: poolBalance.toString(),
                NewTotal: newTotal.toString()
            };
        }
    }

    console.log("Writing updated snapshot to a new file...");
    fs.writeFileSync(updatedSnapshotFile, Object.values(snapshotData).map(account => JSON.stringify(account)).join('\n'));

    console.log("Writing audit data to a file...");
    fs.writeFileSync(auditFile, JSON.stringify(auditData, null, 2));

    console.log(`Updated snapshot saved to ${updatedSnapshotFile}`);
    console.log(`Audit data saved to ${auditFile}`);
}

updateSnapshotWithPools();
