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
                existingAccount.Free = (BigInt(existingAccount.Free) + BigInt(account.Free)).toString();
                existingAccount.Reserved = (BigInt(existingAccount.Reserved) + BigInt(account.Reserved)).toString();
                existingAccount.Locked = (BigInt(existingAccount.Locked) + BigInt(account.Locked)).toString();
                existingAccount.Total = (BigInt(existingAccount.Total) + BigInt(account.Total)).toString();
                auditStream.write(`Merged: ${accountId}, New Total: ${existingAccount.Total}\n`);
            } else {
                // Convert all BigInt properties to strings for new entries as well
                account.Free = account.Free.toString();
                account.Reserved = account.Reserved.toString();
                account.Locked = account.Locked.toString();
                account.Total = account.Total.toString();
                accounts.set(accountId, account);
            }
        }
    }
}


async function mergeSnapshots(snapshot1Path, snapshot2Path, mergedFilePath, auditFilePath) {
    const accounts = new Map();
    const auditStream = fs.createWriteStream(auditFilePath);

    await processSnapshot(snapshot1Path, accounts, auditStream);
    await processSnapshot(snapshot2Path, accounts, auditStream);

    const mergedStream = fs.createWriteStream(mergedFilePath);
    for (const account of accounts.values()) {
        mergedStream.write(JSON.stringify(account, bigintReplacer) + '\n');
    }

    auditStream.end();
    mergedStream.end();
}


async function main() {
    const snapshot1Path = './mergedSnapshot3.json';
    const snapshot2Path = './accountsFromPools.json';
    const mergedFilePath = './mergedSnapshotWithNomBalances.json';
    const auditFilePath = './AUDITmergedSnapshotWithNomBalances.txt';

    await mergeSnapshots(snapshot1Path, snapshot2Path, mergedFilePath, auditFilePath);
}

main();

