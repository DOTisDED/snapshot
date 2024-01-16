const { ApiPromise, WsProvider } = require('@polkadot/api');
const { encodeAddress } = require('@polkadot/util-crypto');
const config = require('../config.cjs');
const fs = require('fs');


    const wsProvider = new WsProvider('wss://polkadot-rpc.dwellir.com');
    const outputFile = `./nominationPools/${config.accountsFromPools}`; 

    async function fetchAndSaveNominatorPools(blockNumber) {
        const api = await ApiPromise.create({ provider: wsProvider });
    
        try {
            const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
            let poolMembersData = {};
            let lastKey = null;
    
            while (true) {
                const entries = await api.query.nominationPools.poolMembers.entriesPaged({
                    args: [],
                    pageSize: 500, // Adjust the page size as needed
                    startKey: lastKey
                });
    
                if (entries.length === 0) {
                    break; // No more entries to fetch
                }
    
                entries.forEach(([key, value]) => {
                    const accountId = key.args[0].toString();
                    const substrateAddress = encodeAddress(accountId, 42); // convert to Substrate default address
                    const totalPoints = value.unwrap().points.toString(); // Correct way to access points

                    poolMembersData[substrateAddress] = {
                        AccountId: substrateAddress,
                        Total: totalPoints
                    };
                });
    
                lastKey = entries[entries.length - 1][0];
            }
    
            // Save the data to a JSON file
            fs.writeFileSync(outputFile, JSON.stringify(poolMembersData, null, 2));
            console.log(`Data saved to ${outputFile}`);
        } catch (error) {
            console.error(`Error fetching data: ${error}`);
        } finally {
            await api.disconnect();
        }
    }
    
    fetchAndSaveNominatorPools(18871235);