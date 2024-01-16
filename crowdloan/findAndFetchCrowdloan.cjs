const { ApiPromise, WsProvider } = require('@polkadot/api');
const { spec } = require('@polkadot/types');
const fs = require('fs');
const path = require('path');
const { connect }  = require('../api/connect.cjs');

const config = require('../config.cjs');


// import { ApiPromise, WsProvider } from '@polkadot/api';
// import { spec }  from '@polkadot/types';
// import config from './config';
// import fs from 'fs';
// import path from 'path';
// import connect from '../api/connect';


// const config = {
//     blockNumber: 18871235,
//     endpoint: "wss://polkadot-rpc.dwellir.com/"
// };

// async function connect() {
//     const provider = new WsProvider(config.endpoint);
//     const api = await ApiPromise.create({ provider, ...spec });
//     return api;
// }

async function findActiveCrowdloans(api, blockHash) {
    const crowdloanFunds = await api.query.crowdloan.funds.entriesAt(blockHash);
    return crowdloanFunds
        .filter(([_, data]) => {
            const info = data.unwrapOr(null);
            if (!info) return false;
            const endBlock = parseInt(info.end.toString().replace(/,/g, ''));
            return endBlock > config.blockNumber;
        })
        .map(([key, value]) => ({ paraId: key.args[0].toNumber(), info: value.unwrap() }));
}

async function fetchAndSaveCrowdloanContributions(api, paraId, blockHash) {
    // Fetch contributions using the available method
    // Note: This does not filter by block number
    const contributions = await api.derive.crowdloan.contributions(paraId);

        // Include the block hash in the saved data
        const dataToSave = {
            blockHash: blockHash,
            contributions: contributions
        };

    // fs.writeFileSync(`crowdloan_${paraId}_contributions.json`, JSON.stringify(dataToSave, null, 2));
    console.log(`Contributions for paraId ${paraId} saved.`);
}




async function fetchContributeEvents(api, activeCrowdloanParaIds, startBlock, endBlock) {
    const outputPath = path.resolve(__dirname, 'crowdloan_contributions.json');
    const writeStream = fs.createWriteStream(outputPath, { flags: 'a' });

    console.log(`Starting to search through blocks from ${startBlock} to ${endBlock}.`);

    for (let blockNumber = startBlock; blockNumber <= endBlock; blockNumber++) {
        if (blockNumber % 1000 === 0) {
            console.log(`Processing block number ${blockNumber}...`);
        }

        const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
        const signedBlock = await api.rpc.chain.getBlock(blockHash);

        signedBlock.block.extrinsics.forEach((ex) => {
            if (ex.events) {
                ex.events.forEach(({ event }) => {
                    if (event.section === 'crowdloan' && event.method === 'Contributed') {
                        const [contributor, paraId, amount] = event.data;
                        if (activeCrowdloanParaIds.includes(paraId.toNumber())) {
                            const eventInfo = {
                                blockNumber,
                                contributor: contributor.toString(),
                                paraId: paraId.toNumber(),
                                amount: amount.toString()
                            };

                            writeStream.write(JSON.stringify(eventInfo) + ',\n');

                            console.log(`Found 'crowdloan.Contribute' event at block ${blockNumber} for paraId ${paraId}: Contributor ${contributor}, Amount ${amount}`);
                        }
                    }
                });
            }
        });
    }

    writeStream.end();
    console.log(`Finished searching blocks up to ${endBlock}. Data written to ${outputPath}`);
}

// Rest of your script remains the same



const main = async () => {
    try {
        const api = await connect();
        const blockHash = await api.rpc.chain.getBlockHash(config.blockNumber);
        console.log(`Block hash: ${blockHash}`);
        const endBlock = config.blockNumber;
        const startBlock = endBlock - 72000; // Adjust the range as needed

        const activeCrowdloans = await findActiveCrowdloans(api, blockHash);
        const activeCrowdloanParaIds = activeCrowdloans.map(({ paraId }) => paraId);

        let allContributeEvents = [];

        for (const { paraId, info } of activeCrowdloans) {
            await fetchAndSaveCrowdloanContributions(api, paraId, blockHash.toHex());
        }

        allContributeEvents = await fetchContributeEvents(api, activeCrowdloanParaIds, startBlock, endBlock);

        // Process and save allContributeEvents as needed
        // Example: Save to a file
        fs.writeFileSync('all_contribute_events.json', JSON.stringify(allContributeEvents, null, 2));
        console.log('All contribute events saved.');

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

main();
