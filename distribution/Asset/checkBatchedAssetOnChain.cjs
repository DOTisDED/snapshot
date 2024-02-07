const { ApiPromise, WsProvider } = require('@polkadot/api');
const fs = require('fs');

const wsProvider = new WsProvider('wss://rococo-asset-hub-rpc.polkadot.io');
const assetId = 47; // Specify the asset ID here
//   3640395
const startingBlockNumber = 3661102; // Adjust this number based on where you want to start
const outputLogFile = './logs/assetTransactionAnalysis.txt';

async function analyzeBlocks() {
    const api = await ApiPromise.create({ provider: wsProvider });
    const logStream = fs.createWriteStream(outputLogFile, { flags: 'a' });

    let currentBlockNumber = startingBlockNumber;

    while (true) {
        console.log(`Processing block number: ${currentBlockNumber}`);
        try {
            const blockHash = await api.rpc.chain.getBlockHash(currentBlockNumber);
            const block = await api.rpc.chain.getBlock(blockHash);
            let blockContainsRelevantBatches = false;

            for (const extrinsic of block.block.extrinsics) {
                if (extrinsic.method.section === "utility" && extrinsic.method.method === "batchAll") {
                    const batchDetails = analyzeBatchAll(api, extrinsic, assetId);
                    if (batchDetails && batchDetails.relevant) {
                        blockContainsRelevantBatches = true;
                        const logEntry = `Block ${currentBlockNumber}, Batch Call Hash: ${extrinsic.hash.toHex()}, First Address: ${batchDetails.firstAddress}, Last Address: ${batchDetails.lastAddress}, Mints: ${batchDetails.mints}, Freezes: ${batchDetails.freezes}\n`;
                        logStream.write(logEntry);
                    }
                }
            }

            if (!blockContainsRelevantBatches) {
                console.log(`No relevant batches found in block ${currentBlockNumber}`);
            }

            currentBlockNumber++;
        } catch (error) {
            console.error(`Error processing block ${currentBlockNumber}: ${error}`);
            break; // Stop the loop if there's an error (e.g., end of chain reached)
        }
    }

    logStream.end();
    console.log('Completed asset transaction analysis.');
}

function analyzeBatchAll(api, extrinsic, targetAssetId) {
    const calls = extrinsic.method.args[0];
    let firstAddress = null;
    let lastAddress = null;
    let mints = 0;
    let freezes = 0;
    let relevant = false; // Flag to indicate if the batch contains relevant asset operations

    calls.forEach((call) => {
        const { method, section } = api.registry.findMetaCall(call.callIndex);
        if (section === "assets" && (method === "mint" || method === "freeze")) {
            const [assetIdArg, dest] = call.args;
            if (assetIdArg.toNumber() === targetAssetId) { // Check if the asset ID matches
                relevant = true; // Mark as relevant since it matches the target asset ID
                const address = dest.toString(); // Get the address from the call argument
                if (!firstAddress) firstAddress = address;
                lastAddress = address; // Update lastAddress with every matching call

                if (method === "mint") mints++;
                if (method === "freeze") freezes++;
            }
        }
    });

    return { firstAddress, lastAddress, mints, freezes, relevant };
}

analyzeBlocks().catch(console.error);
