const { BN } = require("@polkadot/util");
const { encodeAddress } = require("@polkadot/util-crypto");
const { WsProvider, ApiPromise } = require("@polkadot/api");
const fs = require('fs');
const lastKeyFile = 'lastKeyCollectives.txt';


//const { spec } = require('@edgeware/node-types');
const { spec } = require('@polkadot/types');

const config = {
    // blockNumber: 18871235,
    blockNumber: 2883666,
    // endpoint:"wss://dot-rpc.stakeworld.io/",
    endpoint: "wss://polkadot-collectives-rpc.dwellir.com/",
    decimals: 10,
    outputFilePath: 'block-data.json',
    filePathGetParaHead: 'para-head.json'

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

// Function to connect to the Polkadot relay chain
async function connectToRelayChain() {
    const provider = new WsProvider(config.endpoint);
    const api = await ApiPromise.create({ provider });
    return api;
}

// Function to fetch and log the relay chain block
async function logRelayChainBlock(api, blockNumber, filePath = config.outputFilePath) {
    const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
    // console.log(blockHash);
    const block = await api.rpc.chain.getBlock(blockHash);
    // console.log('block', block); 

    // Log the entire block structure
    console.log(JSON.stringify(block.toHuman(), null, 2));

      // Convert block data to human-readable format and save to file
      fs.writeFileSync(filePath, JSON.stringify(block.toHuman(), null, 2), 'utf-8');
      console.log(`Block data saved to ${filePath}`);

    // Add your logic here to inspect the block and find the parachain block number
}

// Function to fetch the parachain block hash from the relay chain
async function getParachainBlockHashFromRelayChain(api, blockNumber, filePathGetParaHead = config.filePathGetParaHead) {
    const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
    const block = await api.rpc.chain.getBlock(blockHash);

    console.log("Inspecting block extrinsics...");

    // Navigate through extrinsics to find the Statemint entry in backedCandidates
    for (const [index, extrinsic] of block.block.extrinsics.entries()) {

        fs.writeFileSync(filePathGetParaHead, JSON.stringify(extrinsic.toHuman(), null, 2), 'utf-8');

        console.log(`Examining extrinsic ${index}`);

        if (extrinsic.method) {
            console.log(`Extrinsic ${index} has 'method' field`);
        }
        if (extrinsic.method.args) {
            console.log(`Extrinsic ${index} has 'args' field`);
        }
        if (extrinsic.method.args.now) {
            console.log(`Extrinsic ${index} has 'now' field`);
        }
        // Check if the extrinsic has 'args' and 'data' within 'args'
        if (extrinsic.method.args.data) {
            console.log(`Extrinsic ${index} has 'data' field in args`);

            // Check for backedCandidates array within data
            const backedCandidates = extrinsic.method.args.data.backedCandidates;
            console.log(`backedCandidates: ${backedCandidates}`);
            if (backedCandidates) {
                console.log(`Found 'backedCandidates' in extrinsic ${index}`);

                // Iterate through backedCandidates
                for (const candidate of backedCandidates) {
                    console.log(`Examining candidate with paraId: ${candidate.candidate.descriptor.paraId}`);

                    // Check if the candidate's paraId matches Statemint's ID
                    if (candidate.candidate.descriptor.paraId === "1,000") {
                        const parachainBlockHash = candidate.candidate.descriptor.paraHead;
                        console.log(`Statemint parachain block hash: ${parachainBlockHash}`);
                        return parachainBlockHash;
                    }
                }
            }
        }
    }

    console.log('Statemint parachain entry not found in the relay chain block.');
    return null;
}








async function fetchAccountsInBatches(api, batchSize) {
    let allAccounts = [];
    let hasMore = true;
    let lastKey = null;

    while (hasMore) {
        const batch = await api.query.system.account.entriesPaged({
            startKey: lastKey,
            pageSize: batchSize,
        });

        if (batch.length > 0) {
            allAccounts.push(...batch);
            lastKey = batch[batch.length - 1][0];
        } else {
            hasMore = false;
        }
    }

    return allAccounts;
}



// Main function

async function takeSnapshot() {
    try {
        console.log("connecting...");
        const api = await connect();
        let lastKey = null;
        let pageSize = 1000;
        let page = 1;

        // Check if there's a saved lastKey and resume from there
        if (fs.existsSync(lastKeyFile)) {
            const lastKeyData = fs.readFileSync(lastKeyFile, 'utf8');
            lastKey = lastKeyData.split('-')[0];
            page = parseInt(lastKeyData.split('-')[1]) + 1;
        }

        // Use a write stream for efficient file writing
        const fileStream = fs.createWriteStream('dot-test-collectives-balances.json', { flags: 'a' });

        while (true) {
            console.log(`querying account entries... page: ${page}`);
            const pageAccounts = await api.query.system.account.entriesPaged({
                args: [],
                pageSize: pageSize,
                startKey: lastKey
            });

            if (pageAccounts.length === 0) {
                break; // No more accounts to fetch
            }

            let balances = {};
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
        fileStream.end(); // Close the file stream
    } catch (error) {
        console.error("Error occurred:", error);
    } finally {
        process.exit(0);
    }
}




// Main function
async function main() {
    try {
        console.log("Connecting to Polkadot Relay Chain...");
        const api = await connectToRelayChain();

        // console.log(`Fetching and logging relay chain block ${config.blockNumber}...`);
        // await logRelayChainBlock(api, config.blockNumber);



        // console.log(`Fetching parachain block number for relay chain block ${config.blockNumber}...`);
        const parachainBlockHash = await getParachainBlockHashFromRelayChain(api, config.blockNumber);

        if (parachainBlockHash !== null) {
            console.log(`Parachain block hash: ${parachainBlockHash}`);
            // You can now proceed with your extraction process for this parachain block number
        } else {
            console.log("Parachain block number not found.");
        }
    } catch (error) {
        console.error("Error occurred:", error);
    } finally {
        process.exit(0);
    }
}

// main();


takeSnapshot();




// getTotalIssuance();




async function getTotalIssuance() {
    try {
        const api = await connect();

        console.log("querying the total issuance")
        let total_issuance = toUnit(await api.query.balances.totalIssuance())

        let data = {
            issuance: total_issuance,
        }

        console.log("writing")
        await fs.writeFile('dot-test-issuance-ah.json', JSON.stringify(data));

        process.exit(0)
    } catch (e) {
        console.log(e);
        process.exit(1)
    }
}