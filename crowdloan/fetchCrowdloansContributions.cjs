const { ApiPromise, WsProvider } = require('@polkadot/api');
const { spec } = require('@polkadot/types');


const config = {
    blockNumber: 18871235,
    endpoint: "wss://polkadot-rpc.dwellir.com/",
    decimals: 10
}

async function connect() {
        endpoint = config.endpoint;
        global.endpoint = endpoint;
        const provider = new WsProvider(endpoint);
        const api = await ApiPromise.create({
            provider,
            ...spec
        });
        return api;
}

const fetchCrowdloan = async () => {
    try {
        const api = await connect();

        console.log(await api.derive.crowdloan.contributions(2052))
        console.log((await api.derive.crowdloan.contributions(2052)).contributorsHex.length)
        process.exit(0)
        // other stuff
    } catch (error) {
        console.log(error)
        process.exit(1)
    }
}

fetchCrowdloan();
// export const fetchCrowdloan = async () => {
//     const wsProvider = new WsProvider('wss://kusama-rpc.polkadot.io');
//     const api = await ApiPromise.create({ provider: wsProvider });
//     console.log(await api.derive.crowdloan.contributions(2113))
//     console.log((await api.derive.crowdloan.contributions(2113)).contributorsHex.length)
// }


