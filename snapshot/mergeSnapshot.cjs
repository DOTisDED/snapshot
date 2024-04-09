const fs = require('fs');
const readline = require('readline');

function bigintReplacer(key, value) {
    if (typeof value === 'bigint') {
        return value.toString();
    }
    return value;
}

async function processSnapshot(filePath, accounts, auditStream) {
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        if (line) {
            const account = JSON.parse(line);
            const accountId = account.AccountId;

            if (accounts.has(accountId)) {
                const existingAccount = accounts.get(accountId);
                // existingAccount.Free = (BigInt(existingAccount.Free) + BigInt(account.Free)).toString();
                // existingAccount.Reserved = (BigInt(existingAccount.Reserved) + BigInt(account.Reserved)).toString();
                // existingAccount.Locked = (BigInt(existingAccount.Locked) + BigInt(account.Locked)).toString();
                existingAccount.Total = (BigInt(existingAccount.Total) + BigInt(account.Total)).toString();
                auditStream.write(`Merged: ${accountId}, New Total: ${existingAccount.Total}\n`);
            } else {
                // Convert all BigInt properties to strings for new entries as well
                // account.Free = account.Free.toString();
                // account.Reserved = account.Reserved.toString();
                // account.Locked = account.Locked.toString();
                account.Total = account.Total.toString();
                accounts.set(accountId, account);
            }
        }
    }
}


async function mergeSnapshots(snapshotPaths, mergedFilePath, auditFilePath) {
    const accounts = new Map();
    const auditStream = fs.createWriteStream(auditFilePath);

    for (const snapshotPath of snapshotPaths) {
        await processSnapshot(snapshotPath, accounts, auditStream);
    }

    const mergedStream = fs.createWriteStream(mergedFilePath);
    for (const account of accounts.values()) {
        mergedStream.write(JSON.stringify(account, bigintReplacer) + '\n');
    }

    auditStream.end();
    mergedStream.end();
}



async function main() {
    const snapshotPaths = [
        './accountsFromPoolsLIVEwithUnbondingEras2.json',
        './live/DOT-balances-live-dwellir-19952000-Two.json',
        
    ];
    const mergedFilePath = './MergedSnapshotLIVE30New.json';
    const auditFilePath = './AUDITfinalMergedSnapshotLIVE30New.txt';

    await mergeSnapshots(snapshotPaths, mergedFilePath, auditFilePath);
}

main();

