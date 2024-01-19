const { ApiPromise, WsProvider } = require('@polkadot/api');
const { spec } = require('@polkadot/types');
const config = require('../config.cjs'); 

// Connect to Substrate endpoint
async function connect() {
    const provider = new WsProvider(config.endpoint);
    const api = await ApiPromise.create({ provider, ...spec });
    return api;
}

// Function to convert balance to a human-readable format
function toUnit(balance) {
    return balance.toString(); // Adjust this based on how you want to format the balance
}

// Function to get the total issuance at a specific block number
async function getTotalIssuance(blockNumber = config.blockNumber) {
    try {
        const api = await connect();
        console.log("Querying the total issuance...");

        // Get the hash of the specific block
        const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
        // Query the total issuance at that block
        let totalIssuance = await api.query.balances.totalIssuance.at(blockHash);

        let data = {
            issuance: toUnit(totalIssuance),
        };

        console.log("Total Issuance at block " + config.blockNumber + ": " + data.issuance);
    } catch (e) {
    console.error("Error occurred:", e);
    } finally {
    process.exit(0);
    }
    }
    
module.exports = { getTotalIssuance };