
const config = {
    blockNumber: 19952000, // enter snapshot number 
    endpoint: "wss://polkadot-rpc.dwellir.com/", // enter a working rpc endpoint 
    accountsFromPools: 'accountsFromPoolsLIVE.json', // enter the name of the file with the accounts from pools
    mainSnapshotFile: 'DOT-balances-live-dwellir-19952000.json', // enter the name of the file with the main snapshot
};

module.exports = config;