const { BN } = require("@polkadot/util");
const { encodeAddress } = require("@polkadot/util-crypto");
const { WsProvider, ApiPromise } = require("@polkadot/api");
const fs = require('fs').promises;

//const { spec } = require('@edgeware/node-types');
const { spec } = require('@polkadot/types');

const config = {
    blockNumber: 0,
    endpoint: "wss://edg-snap.jelliedowl.com",
    decimals: 18
}

// Global Variables
var global = {
	blocknumber: 0,
	pageSize: 100,
};


// Convert a big number balance to expected float with correct units.
function toUnit(balance, decimals) {
    base = new BN(10).pow(new BN(decimals));
    dm = new BN(balance).divmod(base);
    decfix = dm.mod + (10 ** decimals); //add an arbitrary 1 to the start of the decimal bit
    return parseFloat(dm.div.toString() + "." + decfix.toString().substring(1))
}

// Connect to Substrate endpoint
async function connect() {
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
        const blockHash = await api.rpc.chain.getBlockHash(config.blockNumber);
        const api_at = await api.at(blockHash);
        return api_at;
		// global.chainDecimals = substrate.registry.chainDecimals;
		// global.chainToken = substrate.registry.chainToken;
}

async function getTotalIssuance() {
    try {
        const api = await connect();

        console.log("querying the total issuance")
        let total_issuance = toUnit(await api.query.balances.totalIssuance())

        let data = {
            issuance: total_issuance,
        }

        console.log("writing")
        await fs.writeFile('edg-snapshot-new.json', JSON.stringify(data));

        process.exit(0)
    } catch (e) {
        console.log(e);
        process.exit(1)
    }
}

// Main function
async function takeSnapshot() {
	try {
        console.log("connecting...")
		const api = await connect();
        let balances = {}

		// Get address from input
        console.log("fetching...")
        // console.log(api.query.system);
        // process.exit(0)
        const all_accounts = await api.query.system.account.entries();  //.entries();

        if (all_accounts.length == 0) { 
            throw("No account");
        }
        console.log("computing balances...");
		for (account of all_accounts) {
            // console.log(account.data)
            // console.log(all_accounts)
			let address = encodeAddress(account[0].slice(-32));
			let free = account[1].data.free;
			let reserved = account[1].data.reserved;
			balances[address] = {
				"AccountId": address,
				"Free": toUnit(free),
				"Reserved": toUnit(reserved),
				"Total": toUnit(free.add(reserved)),
			};
            
		}

        console.log("writing")
        await fs.writeFile('kab-balances-new.json', JSON.stringify(balances));
        process.exit(0)
	} catch (error) {
        console.log(error)
        process.exit(1)
	}
}

takeSnapshot();
// getTotalIssuance();
