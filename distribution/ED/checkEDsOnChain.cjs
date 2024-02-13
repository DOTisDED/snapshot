const { ApiPromise, WsProvider } = require('@polkadot/api');
const fs = require('fs');

const wsProvider = new WsProvider('wss://rococo-asset-hub-rpc.polkadot.io');
const startingBlockNumber = 3650741; // Adjust this number based on your requirements
const outputLogFile = './logs/batchAnalysis5.txt';

async function analyzeBlocks() {
    const api = await ApiPromise.create({ provider: wsProvider, noInitWarn: true });
    const logStream = fs.createWriteStream(outputLogFile, { flags: 'a' });
    let firstBatchLogged = false;  // Flag to log the first batch

    let currentBlockNumber = startingBlockNumber;

    while (true) {
        console.log(`Processing block number: ${currentBlockNumber}`);
        try {
            const blockHash = await api.rpc.chain.getBlockHash(currentBlockNumber);
            const block = await api.rpc.chain.getBlock(blockHash);

            for (const extrinsic of block.block.extrinsics) {
                if (extrinsic.method.section === "utility" && extrinsic.method.method === "batchAll") {
                    console.log(`Found utility.batchAll in block ${currentBlockNumber}`);

                    // Log the structure of the first encountered batchAll extrinsic
                    if (!firstBatchLogged) {
                        console.log(`Logging structure of utility.batchAll: ${JSON.stringify(extrinsic)}`);
                        firstBatchLogged = true;  // Prevent logging subsequent batches
                    }

                    const batchDetails = analyzeBatchAll(api, extrinsic);
                    if (batchDetails) {
                        const logEntry = `Block ${currentBlockNumber}, Batch Call Hash: ${extrinsic.hash.toHex()}, First Address: ${batchDetails.firstAddress}, Last Address: ${batchDetails.lastAddress}\n`;
                        logStream.write(logEntry);
                    }
                }
            }

            currentBlockNumber++;
        } catch (error) {
            console.error(`Error processing block ${currentBlockNumber}: ${error}`);
            break;
        }
    }

    logStream.end();
    console.log('Completed batch analysis.');
}

function analyzeBatchAll(api, extrinsic) {
    const calls = extrinsic.method.args[0];
    let firstAddress = null;
    let lastAddress = null;

    console.log(`Number of calls in batchAll: ${calls.length}`);

    for (let i = 0; i < calls.length; i++) {
        const call = calls[i];
        const decodedCall = api.registry.findMetaCall(call.callIndex);

        console.log(`Call ${i}: ${decodedCall.section}.${decodedCall.method}`);

        if (decodedCall.section === "balances" && decodedCall.method === "transferKeepAlive") {
            try {
                const decodedArgs = call.args.map((arg) => arg.toJSON());
                const address = decodedArgs[0].id || decodedArgs[0];
                console.log(`Found balances.transferKeepAlive with address: ${address}`);

                if (!firstAddress) firstAddress = address;
                lastAddress = address;
            } catch (error) {
                console.log(`Error decoding args for call ${i}: ${error.message}`);
            }
        }
    }

    if (firstAddress && lastAddress) {
        console.log(`Found first and last addresses: ${firstAddress}, ${lastAddress}`);
        return { firstAddress, lastAddress };
    }

    return null;
}




analyzeBlocks().catch(console.error);
