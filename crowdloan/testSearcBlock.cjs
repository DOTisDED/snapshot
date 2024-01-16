const { ApiPromise, WsProvider } = require('@polkadot/api');
const { spec } = require('@polkadot/types');

const config = {
    blockNumber: 18861235, 
    endpoint: "wss://polkadot-rpc.dwellir.com/"
};

async function connect() {
    const provider = new WsProvider(config.endpoint);
    const api = await ApiPromise.create({ provider, ...spec });
    return api;
}

async function testSingleBlock(api, blockNumber) {
    const startTime = Date.now();
    const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
    const signedBlock = await api.rpc.chain.getBlock(blockHash);

    signedBlock.block.extrinsics.forEach((ex) => {
        if (ex.events) {
            ex.events.forEach(({ event }) => {
                if (event.section === 'crowdloan' && event.method === 'Contributed') {
                    const [contributor, paraId, amount] = event.data;
                    console.log(`Found 'crowdloan.Contribute' event: Contributor - ${contributor}, ParaId - ${paraId}, Amount - ${amount}`);
                }
            });
        }
    });

    const endTime = Date.now();
    console.log(`Block ${blockNumber} processed in ${(endTime - startTime)} ms`);
}

const main = async () => {
    try {
        const api = await connect();
        await testSingleBlock(api, config.blockNumber);
        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

main();

