const fs = require('fs');
const readline = require('readline');
const path = require('path');

const snapshotFilePath = path.join(__dirname, '../updatedSnapshot.json'); // replace with your custom file path

async function sumTotalsInSnapshot() {
    const fileStream = fs.createReadStream(snapshotFilePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let totalSum = BigInt(0);

    for await (const line of rl) {
        if (line.trim()) { // Skip empty lines
            try {
                const accountData = JSON.parse(line);
                const total = BigInt(accountData.Total || "0");
                totalSum += total;
            } catch (err) {
                console.error(`Error parsing line: ${err}`);
            }
        }
    }

    console.log(`Total sum of 'Total' values: ${totalSum.toString()}`);
}

sumTotalsInSnapshot().catch(console.error);
