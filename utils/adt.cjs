const fs = require('fs');
const readline = require('readline');
const path = require('path');

const snapshotFilePath = path.join(__dirname, '../mergedSnapshotWithoutNomPools.json'); 

// async function sumTotalsInSnapshot(snapshotFileName) { // uncoment to make it accessible by the snapshotAndAddTotals.cjs
async function sumTotalsInSnapshot() {    
    const fileStream = fs.createReadStream(snapshotFilePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let totalSum = BigInt(0);
    let accountCount = 0; // counter for the number of accounts processed

    for await (const line of rl) {
        if (line.trim()) { // Skip empty lines
            try {
                const accountData = JSON.parse(line);
                const total = BigInt(accountData.Total || "0");
                totalSum += total;
                accountCount++; 
            } catch (err) {
                console.error(`Error parsing line: ${err}`);
            }
        }
    }

    console.log(`sum total of 'Total' values: ${totalSum.toString()}`);
    console.log(`number of accounts processed: ${accountCount}`);
}

sumTotalsInSnapshot().catch(console.error);

// module.exports = { sumTotalsInSnapshot };
