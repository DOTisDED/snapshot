const fs = require('fs');
const { Transform, pipeline } = require('stream');
const util = require('util');

const filePath = './dot-balances-new-dwellir2.json';
const streamPipeline = util.promisify(pipeline);

const accountCounter = new Transform({
    readableObjectMode: true,
    writableObjectMode: true,

    transform(chunk, encoding, callback) {
        let strChunk = chunk.toString();

        // count occurrences of "AccountId" in the chunk
        let count = (strChunk.match(/"AccountId":/g) || []).length;
        this.push(count);
        callback();
    }
});

async function countAccountsInLargeJSON() {
    let totalAccounts = 0;

    await streamPipeline(
        fs.createReadStream(filePath),
        accountCounter,
        new Transform({
            readableObjectMode: true,
            writableObjectMode: true,

            transform(chunk, encoding, callback) {
                totalAccounts += chunk;
                callback();
            },

            final(callback) {
                console.log(`total number of accounts: ${totalAccounts}`);
                callback();
            }
        })
    );
}

countAccountsInLargeJSON().catch(console.error);