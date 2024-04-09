
const config = {
    blockNumber: 19952000, // enter snapshot number // 0xac083fcf22d12e695236c8536314da73cd3ae0aedadf77ce19397c4851f44d0a
    endpoint: "wss://polkadot-rpc.dwellir.com/", // enter a working rpc endpoint 
    accountsFromPools: 'accountsFromPoolsLIVEwithUnbondingEras2.json', // enter the name of the file with the accounts from pools
    mainSnapshotFile: 'DOT-balances-live-dwellir-19952000.json', // enter the name of the file with the main snapshot
};

module.exports = config;