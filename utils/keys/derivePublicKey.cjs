require('dotenv').config();
const { Keyring } = require('@polkadot/keyring');
const { mnemonicToMiniSecret, cryptoWaitReady, encodeAddress } = require('@polkadot/util-crypto');

async function derivePublicKey() {
    // Wait for the WASM interface to be ready
    await cryptoWaitReady();
    console.log('cryptoWaitReady');

    const mnemonic = process.env.MNEMONIC;

    const miniSecret = mnemonicToMiniSecret(mnemonic);
    const keyring = new Keyring({ type: 'sr25519' });
    const keypair = keyring.addFromSeed(miniSecret);

    console.log(`Public Key: ${keypair.publicKey.toString('hex')}`);
    const ss58Address = encodeAddress(keypair.publicKey);
    console.log(`SS58 Address: ${ss58Address}`);
}

derivePublicKey();
