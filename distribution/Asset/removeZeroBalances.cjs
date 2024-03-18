const fs = require('fs');
const readline = require('readline');
const path = require('path');

const inputFileName = './live/finalMergedSnapshotLIVE.json';
const inputFile = `./${inputFileName}`;
const baseFileName = path.basename(inputFileName, '.json');
const outputFileName = `./live/${baseFileName}_NoZB.json`;
const removedFileName = `./live/${baseFileName}_ZBs.json`; // File for logging removed entries

async function filterAndLogRemovedAccounts() {
    // Ensure output files are empty or create them if they don't exist
    fs.writeFileSync(outputFileName, '');
    fs.writeFileSync(removedFileName, ''); // Prepare the file for removed entries

    const fileStream = fs.createReadStream(inputFile);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        try {
            const account = JSON.parse(line);
            if (account.Total !== "0") {
                // Account does not have a Total of "0", write to filtered file
                fs.appendFileSync(outputFileName, JSON.stringify(account) + '\n');
            } else {
                // Account has a Total of "0", log it in the removed entries file
                fs.appendFileSync(removedFileName, JSON.stringify(account) + '\n');
            }
        } catch (error) {
            console.error(`Error processing line: ${line}`, error);
        }
    }

    console.log('Accounts filtered and removed entries logged successfully.');
}

// Execute the function
filterAndLogRemovedAccounts().catch(console.error);
