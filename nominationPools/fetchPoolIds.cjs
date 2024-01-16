const fs = require('fs');
const { u8aConcat, bnToU8a, stringToHex, u8aToHex } = require('@polkadot/util');
const { encodeAddress } = require('@polkadot/keyring');

const palletId = 'modlpy/nopls'; // Pallet ID
const prefix = 42; // Prefix for Polkadot

function createSubAccount(palletId, poolId) {
  const accountType = u8aToHex(new Uint8Array([0x00]));
  const prefix = stringToHex(palletId);
  const poolIdEncoded = u8aToHex(bnToU8a(poolId, { bitLength: 32, isLe: true })).substr(2);
  const poolStashPubkey = (prefix + accountType.substr(2) + poolIdEncoded).padEnd(66,'0');
  return poolStashPubkey;
}

let poolAddresses = [];

for (let i = 1; i <= 600; i++) {
  const subAccountId = createSubAccount(palletId, i);
  const ss58Address = encodeAddress(subAccountId, prefix);
  poolAddresses.push({ poolId: i, ss58Address });
}

// Write to a JSON file
fs.writeFile('poolAddresses.json', JSON.stringify(poolAddresses, null, 2), (err) => {
  if (err) {
    console.error(err);
    return;
  }
  console.log('Pool addresses saved to poolAddresses.json');
});
