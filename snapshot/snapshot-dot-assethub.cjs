const { BN } = require("@polkadot/util");
const { encodeAddress } = require("@polkadot/util-crypto");
const { WsProvider, ApiPromise } = require("@polkadot/api");
const fs = require('fs');
const lastKeyFile = 'lastKey3.txt';


//const { spec } = require('@edgeware/node-types');
const { spec } = require('@polkadot/types');
const localConfig = {
    relayBlockNumber: 18871235,
    paraId: "1,000",
    relayEndpoint:"wss://dot-rpc.stakeworld.io/",
    endpoint: "wss://statemint-rpc.dwellir.com/",
    decimals: 10,
    assetHubSnapshot: './snapshot/dot-assethub-snapshot.json',
    filePathGetParaHead: 'para-head2.json',
}


function toUnit(balance) {
    return balance.toString();
}

async function connect() {
	let endpoint = localConfig.endpoint;
		const provider = new WsProvider(endpoint);
		const api = await ApiPromise.create({
            provider,
            ...spec
            // types: {
            //     ResourceId: "u32",
            // }
        });
        const blockHash = await api.rpc.chain.getBlockHash(localConfig.relayBlockNumber);
        const api_at = await api.at(blockHash);
        return api_at;
		// global.chainDecimals = substrate.registry.chainDecimals;
		// global.chainToken = substrate.registry.chainToken;
}

// Function to connect to the Polkadot relay chain
async function connectToRelayChain() {
    const provider = new WsProvider(localConfig.relayEndpoint);
    const api = await ApiPromise.create({ provider });
    return api;
}


// Function to fetch the parachain block hash from the relay chain
async function getParachainBlockHashFromRelayChain(api, relayBlockNumber, paraId) {
    const blockHash = await api.rpc.chain.getBlockHash(relayBlockNumber);
    const block = await api.rpc.chain.getBlock(blockHash);
const filePathGetParaHead = localConfig.filePathGetParaHead;
    console.log("Inspecting block extrinsics...");

    // Iterate through all extrinsics
    for (const [index, extrinsic] of block.block.extrinsics.entries()) {
        console.log(`Examining extrinsic ${index}`);

        // Deep logging for extrinsic structure
        fs.writeFileSync(filePathGetParaHead, JSON.stringify(extrinsic.toHuman(), null, 2), 'utf-8');

  
        // Check for backedCandidates array within data
        if (extrinsic && extrinsic.method && extrinsic.method.args && extrinsic.method.args.data && extrinsic.method.args.data.backedCandidates) {
            console.log(`Extrinsic ${index} has 'backedCandidates' field`);
            const backedCandidates = extrinsic.method.args.data.backedCandidates;

            // Iterate through backedCandidates
            for (const candidate of backedCandidates) {
                console.log(`Examining candidate with paraId: ${candidate.candidate.descriptor.paraId}`);

                // Check if the candidate's paraId matches Statemint's ID
                if (candidate.candidate.descriptor.paraId.toString() === paraId.toString()) {
                    const parachainBlockHash = candidate.candidate.descriptor.paraHead;
                    console.log(`Statemint parachain block hash: ${parachainBlockHash}`);
                    return parachainBlockHash;
                }
            }
        }
    }

    console.log('Statemint parachain entry not found in the relay chain block.');
    return null;
}


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
        const fileStream = fs.createWriteStream(config.assetHubSnapshot, { flags: 'a' });

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
                let total = free;
            
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
        const relayApi = await connectToRelayChain();
        console.log(`Fetching parachain block hash for relay chain block ${localConfig.relayBlockNumber}...`);
        const parachainBlockHash = await getParachainBlockHashFromRelayChain(relayApi, localConfig.relayBlockNumber, localConfig.paraId);

        if (parachainBlockHash) {
            console.log(`Parachain block hash: ${parachainBlockHash}`);
            console.log("Taking snapshot of account balances from Statemint chain...");
            await takeSnapshot(); // You might need to pass the parachain block hash to this function if required
        } else {
            console.log("Parachain block hash not found.");
        }
    } catch (error) {
        console.error("Error occurred:", error);
    } finally {
        process.exit(0);
    }
}

main();




