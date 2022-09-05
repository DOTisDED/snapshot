# Snapshot and upload distribution

The features here allow you to take a snpashot of a current chain and put them in a file that can then be used to upload to a new chain that has the custom relay scheduler pallet.

This repo is used along with Relay Scheduler pallet to snapshot a upload the distribution to Kabocha network. 

## Install

Clone repo:

`git clone https://github.com/decentration/snapshot-upload.git`

Install:

`yarn`

## Install and setup the relay scheduler
Add the custom Relay Scheduler pallet also in the Kabocha repos. 
set `atBlockNumberNumber` which is the blocknumber when all balances will be unreserved. 

## Adjust Parameters

adjust endpoint, crowdloan.json, balances.json to needs.

## Commands

`node --experimental-json-modules setup.js`

## Node version

Works with `v14.18.1`