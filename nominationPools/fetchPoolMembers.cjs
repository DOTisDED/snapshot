const { ApiPromise, WsProvider } = require('@polkadot/api');
const { encodeAddress } = require('@polkadot/util-crypto');
const config = require('../config.cjs');
const fs = require('fs');

const wsProvider = new WsProvider('wss://polkadot-rpc.dwellir.com');
const outputFile = `./nominationPools/${config.accountsFromPools}`; 
const blocknumber = config.blockNumber;

async function fetchAndSaveNominatorPools(blockNumber) {
    const api = await ApiPromise.create({ provider: wsProvider });
    const outputStream = fs.createWriteStream(outputFile, { flags: 'w' });

    try {
        const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
        let lastKey = null;

        while (true) {
            const entries = await api.query.nominationPools.poolMembers.entriesPaged({
                args: [],
                pageSize: 500,
                startKey: lastKey
            });

            if (entries.length === 0) {
                break; 
            }

            entries.forEach(([key, value]) => {
                const accountId = key.args[0].toString();
                const substrateAddress = encodeAddress(accountId, 42); // convert to Substrate default address
                const totalPoints = value.unwrap().points.toString(); // Correct way to access points

                const poolMemberData = JSON.stringify({
                    AccountId: substrateAddress,
                    Total: totalPoints
                });

                outputStream.write(poolMemberData + '\n');
            });

            lastKey = entries[entries.length - 1][0];
        }

        console.log(`Data saved to ${outputFile}`);
    } catch (error) {
        console.error(`Error fetching data: ${error}`);
    } finally {
        await api.disconnect();
        outputStream.end();
    }
}

fetchAndSaveNominatorPools(blocknumber);
