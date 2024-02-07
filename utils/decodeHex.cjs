const { hexToString, stringToHex } = require('@polkadot/util');


function encodeToHex(text) {
    return stringToHex(text);
}

function decodeFromHex(hexString) {
    return hexToString(hexString);
}


const currentBatch = 1234;
const remark = `Batch ${currentBatch}`;
const encodedHex = stringToHex(remark);
console.log(`Encoded Hex: ${encodedHex}`);

const decodedString = hexToString(encodedHex);
console.log(`Decoded String: ${decodedString}`);
