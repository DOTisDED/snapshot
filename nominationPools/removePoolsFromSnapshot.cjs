const fs = require('fs');
const readline = require('readline');
const path = require('path');

const updatedSnapshotFile = path.join(__dirname, '../live/DOT-balances-live-dwellir-19952000_NoZB_NomP.json');
const poolsAddressesFile = path.join(__dirname, 'poolAddresses.json');
const outputFile = path.join(__dirname, '../DOT-balances-live-dwellir-19952000_NoZB_NomPoolDone2.json');

async function removeNominationPoolAccounts() {
    const poolsAddressesData = JSON.parse(fs.readFileSync(poolsAddressesFile, 'utf-8'));
    const poolsAddresses = new Set(poolsAddressesData.map(pool => pool.ss58Address));
    
    const fileStream = fs.createReadStream(updatedSnapshotFile);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const outputStream = fs.createWriteStream(outputFile, { flags: 'w' });

    for await (const line of rl) {
        try {
            const accountData = JSON.parse(line);
            if (!poolsAddresses.has(accountData.AccountId)) {
                outputStream.write(line + '\n'); // Write the line to the new file
            }
        } catch (err) {
            console.error(`Error parsing line: ${err}`);
        }
    }

    outputStream.close();
    console.log(`Updated snapshot saved to ${outputFile}`);
}

removeNominationPoolAccounts().catch(console.error);
