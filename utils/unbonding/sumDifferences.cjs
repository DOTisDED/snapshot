const fs = require('fs');
const readline = require('readline');

// Assuming 'snapshotDifferencesUnbonding.json' contains the differences for increased or decreased accounts
const unbondingFile = './snapshotDifferencesUnbonding.json'; 
const totalDifferencesFile = './totalUnbondingDifferences.txt'; // New file to store the sum of differences

async function sumDifferences() {
    const fileStream = fs.createReadStream(unbondingFile);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let totalDifference = BigInt(0); // Use BigInt for handling very large numbers

    for await (const line of rl) {
        if (line) {
            const data = JSON.parse(line);
            if (data.Difference) {
                totalDifference += BigInt(data.Difference);
            }
        }
    }

    // Write the total sum of differences to a new file
    fs.writeFileSync(totalDifferencesFile, `Total Difference: ${totalDifference.toString()}`);

    console.log(`Total sum of differences written to ${totalDifferencesFile}`);
}

sumDifferences().catch(console.error);
