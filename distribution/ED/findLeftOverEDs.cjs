const fs = require('fs');
const readline = require('readline');
const path = require('path');

const snapshotFilePath = './snapshotLeftOver3.json';
const batchAnalysisFilePath = './logs/batchAnalysis4.txt'; 
const outputFilePath = './snapshotLeftOver4.json'; 

// Function to parse the original snapshot file
async function parseSnapshotFile(filePath) {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const addresses = [];
    for await (const line of rl) {
        try {
            const data = JSON.parse(line);
            addresses.push(data);
        } catch (error) {
            console.error(`Error parsing line: ${line}`, error);
        }
    }
    return addresses;
}

// Function to parse the batch analysis log file
function parseBatchAnalysisFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    return content.split('\n').map(line => {
        const match = line.match(/First Address: (.*), Last Address: (.*)/);
        return match ? { first: match[1], last: match[2] } : null;
    }).filter(x => x);
}

// Function to create the new snapshot file with leftover addresses
function createLeftoverSnapshot(originalAddresses, processedRanges) {
    console.log(`Total addresses in the original snapshot: ${originalAddresses.length}`);
    console.log(`Total processed batches: ${processedRanges.length}`);

    const processedSet = new Set();
    processedRanges.forEach(range => {
        let startIndex = originalAddresses.findIndex(addr => addr.AccountId === range.first);
        let endIndex = originalAddresses.findIndex(addr => addr.AccountId === range.last);
        if (startIndex !== -1 && endIndex !== -1) {
            for (let i = startIndex; i <= endIndex; i++) {
                processedSet.add(originalAddresses[i].AccountId);
            }
        }
    });

    const leftoverAddresses = originalAddresses.filter(addr => !processedSet.has(addr.AccountId));
    fs.writeFileSync(outputFilePath, leftoverAddresses.map(addr => JSON.stringify(addr)).join('\n'));
    console.log(`Created leftover snapshot file with ${leftoverAddresses.length} addresses.`);
}

(async () => {
    try {
        const originalAddresses = await parseSnapshotFile(snapshotFilePath);
        const processedRanges = parseBatchAnalysisFile(batchAnalysisFilePath);
        createLeftoverSnapshot(originalAddresses, processedRanges);
    } catch (error) {
        console.error('Error processing files:', error);
    }
})();
