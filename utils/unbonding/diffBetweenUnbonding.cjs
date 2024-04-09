const fs = require('fs');
const readline = require('readline');

const snapshotFile1 = './nominationPools/accountsFromPoolsLIVE.json'; // Original snapshot file path
const snapshotFile2 = './nominationPools/accountsFromPoolsLIVEwithUnbondingEras2.json'; // New snapshot file path
const addedOrIncreasedFile = './snapshotDifferencesUnbonding.json'; // File for added accounts or increased totals
const decreasedFile = './snapshotDifferencesDecreased.json'; // File for decreased totals in snapshot 1

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
            snapshotData[data.AccountId] = BigInt(data.Total); // Ensure Total is treated as BigInt
        }
    }

    return snapshotData;
}

async function compareSnapshotsAndWriteDifferences(snapshot1, snapshot2) {
    const writeStreamAddedOrIncreased = fs.createWriteStream(addedOrIncreasedFile);
    const writeStreamDecreased = fs.createWriteStream(decreasedFile);

    for (const accountId in snapshot2) {
        const total2 = snapshot2[accountId];
        if (!snapshot1[accountId]) {
            writeStreamAddedOrIncreased.write(JSON.stringify({ AccountId: accountId, Total: total2.toString(), Status: 'Added' }) + '\n');
        } else {
            const total1 = snapshot1[accountId];
            const difference = total2 > total1 ? total2 - total1 : total1 - total2; // Calculate the difference
            if (total2 > total1) {
                writeStreamAddedOrIncreased.write(JSON.stringify({
                    AccountId: accountId, 
                    OldTotal: total1.toString(), 
                    NewTotal: total2.toString(), 
                    Difference: difference.toString(), // Include the difference
                    Status: 'Increased'
                }) + '\n');
            } else if (total1 > total2) {
                writeStreamDecreased.write(JSON.stringify({
                    AccountId: accountId, 
                    OldTotal: total1.toString(), 
                    NewTotal: total2.toString(), 
                    Difference: difference.toString(), // Include the difference
                    Status: 'Decreased'
                }) + '\n');
            }
        }
    }

    for (const accountId in snapshot1) {
        if (!snapshot2[accountId]) {
            writeStreamDecreased.write(JSON.stringify({ AccountId: accountId, Total: snapshot1[accountId].toString(), Status: 'Removed' }) + '\n');
        }
    }

    writeStreamAddedOrIncreased.end();
    writeStreamDecreased.end();
}


async function createDifferenceFile() {
    const snapshotData1 = await readSnapshot(snapshotFile1);
    const snapshotData2 = await readSnapshot(snapshotFile2);

    await compareSnapshotsAndWriteDifferences(snapshotData1, snapshotData2);
}

createDifferenceFile().catch(console.error);
