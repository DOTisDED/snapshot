const fs = require('fs');
const readline = require('readline');

const snapshotFile1 = './nominationPools/accountsFromPoolsLIVE.json'; // Original snapshot file path
const snapshotFile2 = './nominationPools/accountsFromPoolsLIVEwithUnbondingEras2.json'; // New snapshot file path
const diffOutputFile = './snapshotDifferencesUnbonding.json'; // File to store the differences

async function readSnapshot(filePath) {
    const snapshotData = {};
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if (line) {
            const data = JSON.parse(line);
            snapshotData[data.AccountId] = data.Total;
        }
    }

    return snapshotData;
}

async function compareSnapshotsAndWriteDifferences(snapshot1, snapshot2) {
    const writeStream = fs.createWriteStream(diffOutputFile);

    // Find and write added accounts
    for (const accountId in snapshot2) {
        if (!snapshot1[accountId]) {
            writeStream.write(JSON.stringify({ AccountId: accountId, Total: snapshot2[accountId], Status: 'Added' }) + '\n');
        } else if (snapshot1[accountId] !== snapshot2[accountId]) {
            writeStream.write(JSON.stringify({ AccountId: accountId, OldTotal: snapshot1[accountId], NewTotal: snapshot2[accountId], Status: 'Changed' }) + '\n');
        }
    }

    // Find and write removed accounts
    for (const accountId in snapshot1) {
        if (!snapshot2[accountId]) {
            writeStream.write(JSON.stringify({ AccountId: accountId, Total: snapshot1[accountId], Status: 'Removed' }) + '\n');
        }
    }

    writeStream.end();
    writeStream.on('finish', () => {
        console.log('Snapshot differences file created successfully.');
    });
}

async function createDifferenceFile() {
    const snapshotData1 = await readSnapshot(snapshotFile1);
    const snapshotData2 = await readSnapshot(snapshotFile2);

    await compareSnapshotsAndWriteDifferences(snapshotData1, snapshotData2);
}

createDifferenceFile().catch(console.error);