const { ApiPromise, WsProvider } = require('@polkadot/api');
const { spec } = require('@polkadot/types');
const fs = require('fs');

const config = {
    endpoint: "wss://polkadot-rpc.dwellir.com/",
    paraId: 2025
};

async function connect() {
    const provider = new WsProvider(config.endpoint);
    const api = await ApiPromise.create({ provider, ...spec });
    return api;
}

const fetchAndSaveCrowdloanContributions = async (api) => {
    let paraId = config.paraId;
    const contributions = await api.derive.crowdloan.contributions(paraId);
    fs.writeFileSync(`crowdloan_${paraId}_contributions.json`, JSON.stringify(contributions, null, 2));
    console.log(`Contributions for fundIndex ${paraId} saved.`);
}

const main = async () => {
    try {
        const api = await connect();
        let paraId = config.paraId;
        // Get all active crowdloans
        const crowdloans = await api.query.crowdloan.funds.entries();
        console.log(crowdloans);
        for (const [key, value] of crowdloans) {
            paraId = key.args.map(k => k.toHuman())[0];
            await fetchAndSaveCrowdloanContributions(api, config.paraId);
        }

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
};

main();
