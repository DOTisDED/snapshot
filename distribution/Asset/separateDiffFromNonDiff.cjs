require('dotenv').config();
const fs = require('fs');
const readline = require('readline');
const path = require('path');

// Configuration
const inputFileName = './mergedSnapshotWithoutNomPools_NoZB_unfrozen3_withDifferences_frozen3_2.json';
const baseFileName = path.basename(inputFileName, '.json');
const outputFileName = `./${baseFileName}_withDifferences.json`;

// Create a readable stream for the input file
const fileStream = fs.createReadStream(inputFileName);

// Create a writable stream for the output file
// Ensure the file is created if it doesn't exist, and overwrite if it does
const outputStream = fs.createWriteStream(outputFileName, { flags: 'w' });

const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
});

rl.on('line', (line) => {
    const accountData = JSON.parse(line);
    const desiredOnChainBalance = BigInt(accountData.Total) * 36n;
    const actualOnChainBalance = BigInt(accountData.onChainBalance);
    const difference = actualOnChainBalance - desiredOnChainBalance;

    // Check if the difference is not zero
    if (difference !== 0n) {
        // Add the difference to the accountData object for reference
        accountData.difference = difference.toString();

        // Write the modified accountData to the output file
        outputStream.write(JSON.stringify(accountData) + '\n');
    }
});

rl.on('close', () => {
    console.log(`Processed ${inputFileName} and generated ${outputFileName} for accounts with non-zero differences.`);
    // Close the output file stream
    outputStream.close();
});
