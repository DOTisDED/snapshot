# Script to upload KAB distribution

This repo is used along with Relay Scheduler pallet to upload the distribution to Kabocha network. 

## Install
To install after you clone the repo:

`yarn`

## Install and set the relay scheduler
Add the custom Relay Scheduler pallet also in the Kabocha repos. 
set `atBlockNumberNumber` which is the blocknumber when all balances will be unreserved. 

## Adjust Parameters

adjust endpoint, crowdloan.json, balances.json to needs.

## Commands

`node --experimental-json-modules setup.js`
