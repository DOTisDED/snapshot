require('dotenv').config();
const { ApiPromise, WsProvider } = require('@polkadot/api');
const fs = require('fs');

const wsProvider = new WsProvider('wss://polkadot-rpc.dwellir.com');
const startBlock = 19952000; 
const outputFile = './nominationPools/unbondedWithdrawals.json'; 

// 0xac083fcf22d12e695236c8536314da73cd3ae0aedadf77ce19397c4851f44d0a

async function fetchUnbondedEvents(startBlock) {
    const api = await ApiPromise.create({ provider: wsProvider });
    const currentBlock = await api.rpc.chain.getHeader();
    const currentBlockNumber = currentBlock.number.toNumber();

    const outputStream = fs.createWriteStream(outputFile, { flags: 'w' });

    for (let blockNumber = startBlock; blockNumber <= currentBlockNumber; blockNumber++) {
        const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
        const events = await api.query.system.events.at(blockHash);

        events.forEach(({ event: { section, method, data } }) => {
            if (section === 'nominationPools' && method === 'Withdrawn') {
              
                const accountId = data[0].toString();
                const amount = data[1].toString(); 

                const eventData = JSON.stringify({
                    blockNumber,
                    accountId,
                    amountUnbonded: amount
                });

                outputStream.write(eventData + '\n');
            }
        });
    }

    outputStream.end();
    console.log(`Unbonded withdrawals saved to ${outputFile}`);
    await api.disconnect();
}

fetchUnbondedEvents(startBlock).catch(console.error);
