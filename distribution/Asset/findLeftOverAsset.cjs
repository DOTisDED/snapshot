const fs = require('fs');
const readline = require('readline');

const snapshotFilePath = './checkForEDs.json';
const batchAnalysisFilePath = './logs/assetTransactionAnalysisLiveEDCheck.txt'; 
const accountsNotAddedFilePath = './NoEDs.json';
const accountsAddedMultipleTimesFilePath = './logs/accountsAssetsAddedMultipleTimesLiveED.json';


// parse batch analysis file
function parseBatchAnalysisFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const batches = content.trim().split('\n').map(line => {
        // Updated to capture freeze information
        const match = line.match(/First Address: (.*), Last Address: (.*), Mints: (\d+), Freezes: (\d+)/);
        if (match) {
            return {
                first: match[1],
                last: match[2],
                mints: parseInt(match[3], 10),
                freezes: parseInt(match[4], 10)
            };
        }
        return null;
    }).filter(x => x);
    return batches;
}

async function parseSnapshotFile(filePath) {
    const accounts = {};
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });
    for await (const line of rl) {
        const data = JSON.parse(line);
        accounts[data.AccountId] = { ...data, count: 0 };
    }
    return accounts;
}

function tallyAccountOccurrences(accounts, batches) {
    const accountIds = Object.keys(accounts);

    batches.forEach(batch => {
        const firstIndex = accountIds.indexOf(batch.first);
        const lastIndex = accountIds.indexOf(batch.last);
        const isFrozenBatch = batch.freezes > 0;

        if (firstIndex !== -1 && lastIndex !== -1) {
            for (let i = firstIndex; i <= lastIndex; i++) {
                accounts[accountIds[i]].count += 1;
                // Mark account as frozen if in a batch with freezes
                if (isFrozenBatch) {
                    accounts[accountIds[i]].frozen = true;
                }
            }
        }
    });
}

// Adjusted function to create output files with one account per line and include count for duplicates
function createOutputFiles(accounts) {
    // Similar to the original, but now include `frozen` status
    const accountsNotAdded = Object.values(accounts).filter(a => a.count === 0);
    const accountsAddedMultipleTimes = Object.values(accounts).filter(a => a.count > 1);

    // Write accounts not added to their file, considering frozen status
    const accountsNotAddedContent = accountsNotAdded.map(a =>
        JSON.stringify({ AccountId: a.AccountId, Total: a.Total, Frozen: a.frozen ? a.frozen : false })
    ).join('\n');
    fs.writeFileSync(accountsNotAddedFilePath, accountsNotAddedContent);

    // Write accounts added multiple times to their file, including the count and frozen status
    const accountsAddedMultipleTimesContent = accountsAddedMultipleTimes.map(a => 
        JSON.stringify({ AccountId: a.AccountId, Total: a.Total, Count: a.count, Frozen: a.frozen ? a.frozen : false })
    ).join('\n');
    fs.writeFileSync(accountsAddedMultipleTimesFilePath, accountsAddedMultipleTimesContent);

    console.log(`Accounts not added: ${accountsNotAdded.length}`);
    console.log(`Accounts added multiple times: ${accountsAddedMultipleTimes.length}`);
}




(async () => {
    const accounts = await parseSnapshotFile(snapshotFilePath);
    const batches = parseBatchAnalysisFile(batchAnalysisFilePath);
    tallyAccountOccurrences(accounts, batches);
    createOutputFiles(accounts);
})();