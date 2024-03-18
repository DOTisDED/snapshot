const fs = require('fs');
const readline = require('readline');
const path = require('path');

const inputFileName = './mergedSnapshotWithoutNomPools_NoZB_unfrozen1.json'; // Adjust the path as needed
const inputFile = `./${inputFileName}`;
const baseFileName = path.basename(inputFileName, '.json');
const discrepancyFileName = `${baseFileName}_discrepancy.json`; // File to list accounts with balance discrepancies

async function checkBalanceDiscrepancies() {
    const rl = readline.createInterface({
        input: fs.createReadStream(inputFile),
        crlfDelay: Infinity
    });

    // Prepare the discrepancy file
    fs.writeFileSync(discrepancyFileName, '');

    for await (const line of rl) {
        const account = JSON.parse(line);
        const onChainBalanceScaled = BigInt(account.onChainBalance) / 36n; // Scale down the onChainBalance
        const totalBalance = BigInt(account.Total);
        const difference = onChainBalanceScaled - totalBalance;

        if (difference !== 0n) {
            // There's a discrepancy; add the difference field to the account object
            account.difference = difference.toString();

            // Append this account to the discrepancy file
            fs.appendFileSync(discrepancyFileName, JSON.stringify(account) + '\n');
        }
    }

    console.log('Balance discrepancies checked and logged successfully.');
}

checkBalanceDiscrepancies().catch(console.error);
