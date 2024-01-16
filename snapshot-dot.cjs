const { BN } = require("@polkadot/util");
const { encodeAddress } = require("@polkadot/util-crypto");
const { WsProvider, ApiPromise } = require("@polkadot/api");
const fs = require('fs');
const lastKeyFile = 'lastKeyDwellir2.txt';


//const { spec } = require('@edgeware/node-types');
const { spec } = require('@polkadot/types');

const config = {
    blockNumber: 18871235,
    endpoint: "wss://polkadot-rpc.dwellir.com/",
    decimals: 10
}

// Global Variables
var global = {
	blocknumber: 0,
	pageSize: 1000,
};


// function toUnit(balance) {
//     base = new BN(10).pow(new BN(config.decimals)); // Ensure you're using the correct decimals from the config
//     dm = new BN(balance).divmod(base);
//     let integralPart = dm.div.toString();
//     let fractionalPart = dm.mod.toString(10, config.decimals); // Pad the fractional part to have `config.decimals` digits

//     return integralPart + "." + fractionalPart;
// }

function toUnit(balance) {
    return balance.toString();
}

// Convert a big number balance to expected float with correct units.
// function toUnit(balance) {
//     base = new BN(10).pow(new BN(10));
//     // base = new BN(10).pow(new BN(12));
//     dm = new BN(balance).divmod(base);
//     output = parseFloat(dm.div.toString(), ".", dm.mod.toString())
//     // let decinum = (output / (10 ** 12))
//     let decinum = (output / (10 ** 10))

//     return decinum
// } 

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
        await fs.writeFile('dot-balances.json', JSON.stringify(data));

        process.exit(0)
    } catch (e) {
        console.log(e);
        process.exit(1)
    }
}


// Main function

async function takeSnapshot() {
    try {
        console.log("connecting...");
        const api = await connect();
        let lastKey = null;
        let pageSize = 1000;
        let page = 1;

        if (fs.existsSync(lastKeyFile)) {
            const lastKeyData = fs.readFileSync(lastKeyFile, 'utf8');
            lastKey = lastKeyData.split('-')[0];
            page = parseInt(lastKeyData.split('-')[1]) + 1;
        }

        const fileStream = fs.createWriteStream('dot-balances-new-dwellir2.json', { flags: 'a' });

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
                let total = free.add(reserved).add(locked);

                let accountBalance = {
                    "AccountId": address, "Free": toUnit(free), "Reserved": toUnit(reserved), "Locked": toUnit(locked), "Total": toUnit(total),
                };

                // Write each account on a separate line
                fileStream.write(JSON.stringify(accountBalance) + '\n');
            });

            lastKey = pageAccounts[pageAccounts.length - 1][0];
            fs.writeFileSync(lastKeyFile, `${lastKey}-${page}`);

            page++;
        }

        console.log("Snapshot taken successfully.");
        fileStream.end(); // Close the file stream

    } catch (error) {
        console.error("Error occurred:", error);
    } finally {
        process.exit(0);
    }
}

takeSnapshot();
