require('dotenv').config();
const { mnemonicToMiniSecret } = require('@polkadot/util-crypto');

const mnemonic = process.env.MNEMONIC;

const privateKey = mnemonicToMiniSecret(mnemonic);

console.log(`Private Key: ${Buffer.from(privateKey).toString('hex')}`);
