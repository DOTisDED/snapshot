const { ApiPromise, WsProvider } = require('@polkadot/api');
const { spec } = require('@polkadot/types');
const fs = require('fs');
const path = require('path');
const lastKeyFilePath = path.resolve(__dirname, 'last_processed_block.txt');
const connect = require('./api/connect.js');

const config = {
    blockNumber: 18871235,
    endpoint: "wss://rpc-polkadot.luckyfriday.io/"
};

async function connect() {
    const provider = new WsProvider(config.endpoint);
    const api = await ApiPromise.create({ provider, ...spec });
    return api;
}

async function getLastProcessedBlock() {
    try {
        if (fs.existsSync(lastKeyFilePath)) {
            const lastBlock = fs.readFileSync(lastKeyFilePath, 'utf8');
            return parseInt(lastBlock, 10);
        }
    } catch (error) {
        console.error('Error reading last processed block:', error);
    }
    return null;
}

async function saveLastProcessedBlock(blockNumber) {
    try {
        fs.writeFileSync(lastKeyFilePath, blockNumber.toString(), 'utf8');
    } catch (error) {
        console.error('Error saving last processed block:', error);
    }
}



async function testFetchExtrinsics(api, startBlock, endBlock) {
    console.log(`Starting to search through blocks from ${startBlock} to ${endBlock} for all extrinsics (excluding 'bitfields').`);

    let allExtrinsics = [];

    for (let blockNumber = startBlock; blockNumber <= endBlock; blockNumber++) {
        const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
        const signedBlock = await api.rpc.chain.getBlock(blockHash);

        console.log(`Processing block number ${blockNumber}...`);
        signedBlock.block.extrinsics.forEach((ex, index) => {
            const extrinsicHuman = ex.toHuman();

            // Exclude extrinsics with 'bitfields'
            if (!extrinsicHuman.method.args.data || !extrinsicHuman.method.args.data.bitfields) {
                allExtrinsics.push({
                    blockNumber,
                    index,
                    extrinsic: extrinsicHuman
                });
            }
        });
    }

    const outputPath = path.resolve(__dirname, 'all_extrinsics.json');
    fs.writeFileSync(outputPath, JSON.stringify(allExtrinsics, null, 2));
    console.log(`Finished searching blocks up to ${endBlock}. Data written to ${outputPath}`);
}

async function fetchCrowdloanContributeExtrinsics(api, startBlock, endBlock) {
    console.log(`Starting to search through blocks from ${startBlock} to ${endBlock} for 'crowdloan.Contribute' extrinsics.`);

    const outputPath = path.resolve(__dirname, 'crowdloan_contribute_extrinsics.json');
    const writeStream = fs.createWriteStream(outputPath, { flags: 'a' });

    for (let blockNumber = startBlock; blockNumber <= endBlock; blockNumber++) {
        const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
        const signedBlock = await api.rpc.chain.getBlock(blockHash);

        console.log(`🔗 Processing block number ${blockNumber}...`);
        signedBlock.block.extrinsics.forEach((ex, index) => {
            const extrinsicHuman = ex.toHuman();

            // Check if the extrinsic is a 'crowdloan.Contribute'
            if (extrinsicHuman.method.section === "crowdloan" && extrinsicHuman.method.method === "contribute") {
                const eventInfo = {
                    blockNumber,
                    index,
                    extrinsic: extrinsicHuman
                };

                writeStream.write(JSON.stringify(eventInfo) + ',\n');
            }
        });

        // Save the last processed block
        await saveLastProcessedBlock(blockNumber);
    }

    writeStream.end();
    console.log(`Finished searching. Data written to ${outputPath}`);
}



const main = async () => {
    try {
        const api = await connect();
        const lastProcessedBlock = await getLastProcessedBlock();

        // Set the range to only 10 blocks for testing
        // const blockNumberInt = parseInt(config.blockNumber, 10);
        const startBlock = lastProcessedBlock ? lastProcessedBlock + 1 : config.blockNumber - 72000;
        console.log(`Start block: ${startBlock}`);
        const endBlock = config.blockNumber;

        await fetchCrowdloanContributeExtrinsics(api, startBlock, endBlock);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

main();
