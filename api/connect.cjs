// import { ApiPromise, WsProvider } from '@polkadot/api';
// import { spec }  from '@polkadot/types';
// import config from './config';  

const { ApiPromise, WsProvider } = require('@polkadot/api');
const { spec } = require('@polkadot/types');
const config = require('../config.cjs');

const connect = async () => {
    const provider = new WsProvider(config.endpoint);
    const api = await ApiPromise.create({ provider, noInitWarn: true });
    return api;
}

module.exports = {connect };