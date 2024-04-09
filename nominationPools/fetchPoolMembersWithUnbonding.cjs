const { ApiPromise, WsProvider } = require('@polkadot/api');
const { encodeAddress } = require('@polkadot/util-crypto');
const config = require('../config.cjs');
const fs = require('fs');

const wsProvider = new WsProvider('wss://polkadot-rpc.dwellir.com');
const outputFile = `./nominationPools/accountsFromPoolsLIVEDwellir.json`; 
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
                const substrateAddress = encodeAddress(accountId, 42); // Convert to Substrate default address
                const points = BigInt(value.unwrap().points.toString()); // Access points as BigInt
                
                let unbondingAmount = 0n; // Initialize unbondingAmount as BigInt
                const unbondingEras = value.unwrap().unbondingEras.toJSON();
                for (const eraAmount of Object.values(unbondingEras)) {
                    unbondingAmount += BigInt(eraAmount);
                }

                // Ensure addition is done with BigInts, convert to string for JSON output
                const totalSum = points + unbondingAmount;

                const poolMemberData = JSON.stringify({
                    AccountId: substrateAddress,
                    Total: points.toString(), // Convert BigInt to string for JSON
                    UnbondingAmount: unbondingAmount.toString(), // Convert BigInt to string for JSON
                    TotalSum: totalSum.toString() // Convert BigInt to string for JSON
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
