
require('dotenv').config();
const fs = require('fs');
const readline = require('readline');

const inputFile = './logs/mergedSnapshotWithoutNomPools_NoZB.json';
const baseFileName = 'mergedSnapshotWithoutNomPools_NoZB_unfrozen3';
const frozenFileName = `mergedSnapshotWithoutNomPools_NoZB_frozen1.json`;
const unfrozenFileName = `mergedSnapshotWithoutNomPools_NoZB_unfrozen1.json`;
const noAccountFileName = `mergedSnapshotWithoutNomPools_NoZB_NoAccount1.json`;

const processedFiles = [frozenFileName, unfrozenFileName, noAccountFileName];
const processedAccountIds = new Set(); // Store processed account IDs for comparison
const unprocessedFileName = `${baseFileName}_unprocessed1.json`;

async function findUnprocessedAccounts() {
    // Load account IDs from processed files
    for (let file of processedFiles) {
        const data = fs.readFileSync(file, { encoding: 'utf8' });
        // Assuming each line in the file is a JSON object
        data.split('\n').filter(line => line.trim()).forEach(line => {
            const account = JSON.parse(line);
            processedAccountIds.add(account.AccountId);
        });
    }

    // Stream through the original snapshot to find unprocessed accounts
    const fileStream = fs.createReadStream(inputFile);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    // Ensure the file is empty or create it if it doesn't exist
    fs.writeFileSync(unprocessedFileName, '');

    for await (const line of rl) {
        try {
            const account = JSON.parse(line);
            if (!processedAccountIds.has(account.AccountId)) {
                // This account hasn't been processed; append it to the unprocessed file
                // Include only AccountId and Total as required
                const { AccountId, Total } = account;
                fs.appendFileSync(unprocessedFileName, JSON.stringify({ AccountId, Total }) + '\n');
            }
        } catch (error) {
            console.error(`Error processing line for unprocessed accounts: ${error}`);
        }
    }

    console.log('Unprocessed accounts identified successfully.');
}

// Execute the function to find unprocessed accounts
findUnprocessedAccounts().catch(console.error);
