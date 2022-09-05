import '@polkadot/api-augment/kusama'
import { WsProvider, ApiPromise } from "@polkadot/api";
import { Keyring } from '@polkadot/keyring';
// import fs from 'fs/promises';
import { u8aToHex } from "@polkadot/util"
import {
	createKeyMulti,
	encodeAddress,
	decodeAddress,
} from '@polkadot/util-crypto';

import balances from "./balances.json"// assert {type: "json"};
import total_issuance from './issuance.json'// assert {type: "json"};
import crowdloan from './crowdloan.json'// assert {type: "json"};
import 'dotenv/config'

const prod_config = {
	endpoint: "wss://kabocha.jelliedowl.com",
	keyring: process.env.MAIN_KEYRING, // FOR THE KEYRING :
	// either the mnemonic phrase (fish public computer mouse water ......)
	// or a hew seed (0x5646763984179830001984097003...)
	// this is to make the key pair to sign transaction, so for set balance, we need a key pair with root privileges
	collators: [
		"0x523d1b4a1d3c58231066099d34db338d92800b9c4e1815fa58f1e901c7539925",//"5DvXwFVJAhuzMEdQmFsfzCGL1CDUqVJc6nDHyxDqYoSqUE18",
		"0x2a6a802c4ea04e94d5d1788fede99e91b9df2c36c2a79388508d253bb426a45f",//"5D2KWHBa7X2RRt8zGhwmuXxa4KE4ofTGCY4nYg8W6MKxV523",
		//"0x8c33c64593491af540e01a38fcc13cc500a2434aa8cdb5d457dd9bd59f85382e",//"5FEXwYeMsBuiehBmBykHKNNjxmBtDGQZyCkT9XYsiRU1KhC4",
		//"0x1af593967e53286e85ea0d85bc6d71a11550046ce2959c1812e0a5978fd43615",//"5Cg444efBbBfw1sjyfC1yyNEakDPkkwuRi8RUZgAM4tsiNu9"
	],
	sudo: "5Ci1D63PMTHrxapmMCq9xPcP8aR89przX8b2d88wEBJPqkub",// "5D7DGQNjk5gAwatPSMf555VB1W8UCq1sQomHX2eRwiLqhc4t",
	edg_treasury: "0x6d6f646c70792f74727372790000000000000000000000000000000000000000",//"jz77v8cHXwEWbPnbfQScXnU9Qy5VkHnDLfpDsuDYUZ7ELae",
	treasury_multisig_addresses: [
		""
	],
	threshold: 1
}

const dev_config = {
	endpoint: process.env.DEVNET_ENDPOINT,
	keyring: process.env.DEVNET_SUDO,
	collators: [
		 "0xd43593c715fdd31c61141abd04a99fd6822c8558854ccde39a5684e7a56da27d",
	],
	sudo: "0x2e25b97b6ea3d9ea70d82e7896a8979483185186f853d5a7614d2dcfd983477c",
	edg_treasury: "0x6d6f646c70792f74727372790000000000000000000000000000000000000000",//"jz77v8cHXwEWbPnbfQScXnU9Qy5VkHnDLfpDsuDYUZ7ELae",
	treasury_multisig_addresses: [
		"mzY9mC8bW4iDjcGmW12fbaeayMEJBa4DxEvUknugH968KyC",
		"5HYRyvQ9XvGu9n3GHDqwLbKVruyS2mkCqTMXFKk53GHCXigF",
		"ks9tY4vnb5oEGsj5QyrJ1Z66ydjMbjhy623zMBdnCigfGAk",
	],
	threshold: 2
}

export const config = prod_config;

// Global Variables
var global = {
	balances: {},
	blocknumber: 0,
	pageSize: 100,
};

// Connect to Substrate endpoint
export async function connect() {
	let endpoint = config.endpoint;
	global.endpoint = endpoint;
	const provider = new WsProvider(endpoint);
	const api = await ApiPromise.create({
		provider,
	});
	return api
}

export function compute_total_contrib() {
	let total = 0;
	for (let contrib in crowdloan) {
		total += crowdloan[contrib]
	}
	return total
}

export function convertAddresses(objects, new_addr_field) {
	let new_obj = {};

	let i = 0
	for (let obj in objects) {
		i++
		// if (i == 100) {
		//   return new_obj
		// }
		const new_addr = u8aToHex(decodeAddress(obj))
		new_obj[new_addr] = objects[obj]
		if (new_addr_field != undefined) {
			new_obj[new_addr][new_addr_field] = new_addr
		}
	}
	return new_obj;
}

// Main function
async function setupAccounts() {
	let converted_balances = convertAddresses(balances, "AccountId");
	// let converted_balances = {}
	// converted_balances["0x8898292c0ce12edf81e48834ee91d8431ee399c4454fcd982f6aae0080fcd114"] = {
	// 	AccountId: "0x8898292c0ce12edf81e48834ee91d8431ee399c4454fcd982f6aae0080fcd114",
	// converted_balances["0x12d490251399a081935bf731184d2bf37d228bc38d3d68a8e3822933bcf23a09"] = {
	// 	AccountId: "0x12d490251399a081935bf731184d2bf37d228bc38d3d68a8e3822933bcf23a09",
	// 	Free: 7869183.223877703,
	// 	Reserved: 1020,
	// 	Total: 7870203.223877703
	// };
	// converted_balances = convertAddresses(converted_balances, "AccountId");
	let converted_crowdloan = crowdloan;//convertAddresses(crowdloan);

	try {
		const api = await connect();

		const keyring = new Keyring({ type: 'sr25519' });
		const sudo = keyring.addFromUri(config.keyring);

		const total_kab = total_issuance.issuance / 100;
		const kab_for_crowdloan = total_kab * (4.9 / 100)
		const total_crowdloan_contribution = compute_total_contrib();
		const kab_per_ksm = kab_for_crowdloan / total_crowdloan_contribution;
		//const treasuryAddress = u8aToHex(createKeyMulti(config.treasury_multisig_addresses, config.threshold));

		console.log("reading data...")
		if (converted_balances == undefined) {
			throw ("No data");
		}
		// console.log("uploading balances...");
		// for (let account in converted_balances) {
		//   // account = converted_balances[account]
		//   const deposit = converted_crowdloan[account];
		//   if (deposit) {
		//     console.log(account);
		//     process.exit(0)
		//   }
		// }
		// process.exit(0)

		// let rawNonce = await api.rpc.system.accountNextIndex(sender);
		// let nonce = new BN(rawNonce.toString());
		//
		//
		let i = 0;
		for (let account in converted_balances) {
			i++;
			if (i < 0)
 			continue;
			account = converted_balances[account]
			let address = account.AccountId;

			if (config.collators.includes(address) || address == config.sudo || address == config.edg_treasury) {
				continue;
			}
			let new_balance = (account.Total / 100) * 10 ** 12;
			// console.log(new_balance)

			const deposit = converted_crowdloan[address];
			if (deposit != undefined) {
				delete converted_crowdloan[address]
				let add = deposit * kab_per_ksm * 10 ** 12

			// console.log(add)
				new_balance += add
				// const percentage = deposit / (total_crowdloan_contribution / 100);
				// new_balance += kab_for_crowdloan * (percentage / 100);
			}
			// console.log(new_balance)

			const free_balance = parseInt((new_balance * (3 / 10)))
			const reserved_balance = parseInt((new_balance * (7 / 10)))

			// console.log("free: " + free_balance)
			// console.log("res: " + reserved_balance)
			// process.exit(0)
			// console.log(free_balance + reserved_balance)

			await api.tx.sudo.sudo(api.tx.balances.setBalance(address, free_balance.toString(), reserved_balance.toString())).signAndSend(sudo, { nonce: -1 })
			// nonce = nonce.add(new BN(1));
			// await api.tx.balances.setBalance(address, free_balance, reserved_balance).signAndSend(sudo)
			// let call =
			//   call.signAndSend(sudo)
			// console.log(call.registry)
			await api.tx.sudo.sudo(api.tx.relaySchedule.schedule(api.tx.balances.forceUnreserve(address, reserved_balance.toString()))).signAndSend(sudo, { nonce: -1 })
			console.log("address " + account.AccountId + " running transaction n° " + i + " with balance " + new_balance)
			// nonce = nonce.add(new BN(1));
			// break;
		    await new Promise(r => setTimeout(r, 500))
		}

		// console.log("setting treasury balance...")
		// //handle the treasury
		// let treasury_funds = converted_balances[config.edg_treasury].Total / 100;
		// treasury_funds -= total_crowdloan_contribution;
		// api.tx.balances.setBalance(treasuryAddress, treasury_funds, 0).signAndSend(sudo)

		// process.exit(0)

		console.log("creating remaining crowdloan accounts")
		// handle the rest of the crowdloan
		let j = 0;
		for (let address in converted_crowdloan) {
			j++;
			// address = "0x265a775a6d7ba9de83f9584dafe39e8329019c1e881b4c5097048fa72d392369"
			// if (address == "0x8898292c0ce12edf81e48834ee91d8431ee399c4454fcd982f6aae0080fcd114") {
			// 	sole.log("address " + address + " running crowdloan n° " + j);
			// 	console.log("AAAAAAAAAAAAAAAAAAAAAAAAAAH")
			// 	break;
			// } else {
			// 	continue
			// }
			const deposit = converted_crowdloan[address];

			// let new_balance = (deposit * 100 / total_crowdloan_contribution * kab_for_crowdloan) * 10 ** 12
			let new_balance = deposit * kab_per_ksm * 10 ** 12
			const free_balance = parseInt(new_balance * (3 / 10))
			const reserved_balance = parseInt(new_balance * (7 / 10))
			await api.tx.sudo.sudo(api.tx.balances.setBalance(address, 0, 0)).signAndSend(sudo, { nonce: -1 })
			await api.tx.sudo.sudo(api.tx.balances.setBalance(address, free_balance.toString(), reserved_balance.toString())).signAndSend(sudo, { nonce: -1 })
			await api.tx.sudo.sudo(api.tx.relaySchedule.schedule(api.tx.balances.forceUnreserve(address, reserved_balance.toString()))).signAndSend(sudo, { nonce: -1 })
			console.log("address " + address + " running crowdloan n° " + j + " with balance " + new_balance);
			// break;
		}

		// api.rpc.system.name

		process.exit(0)
	} catch (error) {
		console.log(error)
		process.exit(1)
	}
}

// setupAccounts();

// function compute_total_issuance() {
// 	let issuance = 0
// 	for (let account in balances) {
// 	  account = balances[account]
// 	  issuance += account.Total
// 	} 
// 	console.log("total issuance: " + issuance);
//   }

 // compute_total_issuance()