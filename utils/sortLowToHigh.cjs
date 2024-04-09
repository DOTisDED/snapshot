const fs = require('fs');
const readline = require('readline');

const inputFile = './DOT-balances-live-dwellir-19952000-Two-NomP-RemP-New-NoZB.json'; 
const outputFile = './DOT-balances-live-dwellir-19952000-Two-NomP-RemP-New-NoZB-SORTED.json';

async function sortSnapshot() {
    const accounts = [];
    const fileStream = fs.createReadStream(inputFile);

    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if (line) {
            const account = JSON.parse(line);
            accounts.push(account);
        }
    }

    accounts.sort((a, b) => {
        const totalA = BigInt(a.Total);
        const totalB = BigInt(b.Total);
        if (totalA < totalB) return -1;
        if (totalA > totalB) return 1;
        return 0;
    });

    // Write sorted accounts to a new file
    const writeStream = fs.createWriteStream(outputFile, { flags: 'w' });
    accounts.forEach(account => {
        writeStream.write(JSON.stringify(account) + '\n');
    });

    writeStream.end();
    writeStream.on('finish', () => {
        console.log('Snapshot sorted and saved successfully.');
    });
}

sortSnapshot().catch(console.error);
