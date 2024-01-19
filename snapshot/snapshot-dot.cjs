const { BN } = require("@polkadot/util");
const { encodeAddress } = require("@polkadot/util-crypto");
const { WsProvider, ApiPromise } = require("@polkadot/api");
const fs = require('fs');


//const { spec } = require('@edgeware/node-types');
const { spec } = require('@polkadot/types');
const config = require('../config.cjs');

// const  localConfig = {
//     blockNumber: 5355206,
//     endpoint: "wss://statemint-rpc.dwellir.com/",
//     decimals: 10,
//     lastKeyFile: './lastKeyDwellir-100000.txt',
//     fileName: `./dot-balances-new-dwellir-${blockNumber}.json`,
// }

// const lastKeyFile = localConfig.lastKeyFile;
// const fileName = localConfig.fileName;  


// Global Variables
var global = {
	blocknumber: 0,
	pageSize: 1000,
};


function toUnit(balance) {
    return balance.toString();
}


// Connect to Substrate endpoint
async function connect(blockNumber) {
	let endpoint = config.endpoint;
		global.endpoint = endpoint;
		const provider = new WsProvider(endpoint);
		const api = await ApiPromise.create({
            provider,
            ...spec
            // types: {
            //     ResourceId: "u32",
            // }
        });
        const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
        const api_at = await api.at(blockHash);
        return api_at;
		// global.chainDecimals = substrate.registry.chainDecimals;
		// global.chainToken = substrate.registry.chainToken;
}


// Main function

async function takeSnapshot(blockNumber = localConfig.blockNumber, fileName = localConfig.fileName, lastKeyFile = localConfig.lastKeyFile) {
    try {
        console.log("connecting...");
        const api = await connect(blockNumber);
        let lastKey = null;
        let pageSize = 1000;
        let page = 1;

        if (fs.existsSync(lastKeyFile)) {
            const lastKeyData = fs.readFileSync(lastKeyFile, 'utf8');
            lastKey = lastKeyData.split('-')[0];
            page = parseInt(lastKeyData.split('-')[1]) + 1;
        }

        const fileStream = fs.createWriteStream(fileName, { flags: 'a' });

        while (true) {
            console.log(`querying account entries... page: ${page}`);
            const pageAccounts = await api.query.system.account.entriesPaged({
                args: [],
                pageSize: pageSize,
                startKey: lastKey
            });

            if (pageAccounts.length === 0) {
                break;
            }

            pageAccounts.forEach(account => {
                let address = encodeAddress(account[0].slice(-32));
                let accountData = account[1].data;
            
                let free = accountData.free || new BN(0);
                let reserved = accountData.reserved || new BN(0);
                let locked = accountData.frozen || new BN(0); 
            
                // Assuming 'Free' balance is the total effective balance
                let total = free.add(reserved);
            
                let accountBalance = {
                    "AccountId": address, 
                    "Free": toUnit(free), 
                    "Reserved": toUnit(reserved), 
                    "Locked": toUnit(locked), 
                    "Total": toUnit(total),
                };
            
                // Write each account on a separate line
                fileStream.write(JSON.stringify(accountBalance) + '\n');
            });
            
            lastKey = pageAccounts[pageAccounts.length - 1][0];
            fs.writeFileSync(lastKeyFile, `${lastKey}-${page}`);

            page++;
        }

        console.log("Snapshot taken successfully.");
        fileStream.end(); 

    } catch (error) {
        console.error("Error occurred:", error);
        throw error;
    } 
}

module.exports = { takeSnapshot };
