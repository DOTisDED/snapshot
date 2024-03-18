# Snapshot and Upload Distribution


-----

TO VERIFY THE LIVE SNAPSHOT FOLLOW THIS EXACT GUIDE (after installing the dependencies):

1. snapshot DOT on polkadot: 

`node ./utils/snapshotAndAddTotals.cjs`;

2. then remove zero balances from snapshot, run:

 `node ./distribution/Asset/removeZeroBalances.cjs`

3. extract balances from nomination pools:

`node ./nominationPools/addPoolMembersToSnapshot.cjs`

4. remove nomination pools 

`node ./nominationPools/removePoolsFromSnapshot.cjs`

5. Then go to the file that is already in the root directory called `DOT-balances-live-dwellir-19952000_NoZB_NomPoolDone`, search for the treasury (`5EYCAe5ijiYfyeZ2JJCGq56LmPyNRAKzpG4QkoQkkQNB5e6Z`) and remove it. 

Then you should have exactly the same snapshot file as the file `DOT-balances-live-dwellir-19952000_NoZB_NomPoolTreasuryDone.json` in the root directory!


----------








This repo lets you take a snapshot of chains based on a "Snapshot Blocknumber", as well as other utilities such as:

- finding keyless accounts 
- re-allocating funds to accessible accounts, 
- removing keyless accounts from the snapshot distribution 
- merging multiple snapshots into one
- making sure there are no duplicate accounts (as one would likely overwrite the other)
- uploading a distribution as a token asset on Asset Hub
- verifying your distribution, by snapshotting a new disitrubtion and comparing against an original snapshot to ensure perfect distribution


## Prerequisites

Before cloning and working with this repository, ensure you have Git and Git LFS installed on your machine.

### Installing Git LFS
Git Large File Storage (LFS) is used in this repository to efficiently manage large files. Follow the steps below to install Git LFS:

1. Download and Install Git LFS

Visit the [Git LFS website](https://git-lfs.com/) and download the version compatible with your operating system.
Follow the installation instructions for your platform.

2. Setup Git LFS

Once Git LFS is installed, set it up by running the following command in your terminal:
```
git lfs install
````
This command needs to be run once per user account.

For verifiers, when adding new large files, ensure they are tracked by Git LFS using:

```
git lfs track "path/to/large/file"
```

## Install

Clone repo:

`git clone https://github.com/decentration/snapshot-upload.git`

Install:

`yarn`


## Commands

# 1. Enter info in the config file

go to config.cjs and enter the info the snapshot. 


# 2. Execute Snapshot 

run the below command to execute a snapshot based on the files. Each file is for a different chain. 
```
node ./`NAME_OF_SNAPSHOT_FILE.cjs // name the file in the localConfig within the snapshot-dot.cjs file.
``` 

_For Polkadot blockchain this takes around 10 minutes._

## Snapshots for System Chains

With the system chain files such as `./snapshot/snapshot-dot-assethub.cjs` we first need to get the parachain blocknumber that is connected to our relay chain snapshot number. 

We need to get the paraHead and look at the backedCandidates to find the blockHash for the system chain we want to snapshot. The script gets `rpc -> chain -> getBlockHash(blockNumber)` and then `rpc ->  chain -> getBlock(hash)` and then gets the paraHead (aka blockHash) from backedCandidates. 


Just change the rpc and name of the output file to produce snapshots for the different chains. 


## Count number of accounts in a snapshot

Go to `utils/addTotals.cjs` and change the `snapshotFileName` to a local file path. and uncomment the function call at the bottom of the page so you can run the script directly from the command line.

`node ./utils/addTotals.cjs`



# 3. Crowdloan Handling

find which crowdloans are active at the snapshot blocknumber then reallocate the funds to the depositor address fro distribution to uses, and to incentivise the parachain to make hrmp channel with Asset Hub. 

## 1. Get Active Crowdloans
```
node ./crowdloan/findAndFetchCrowdloan.cjs
// this checks the active crowdloans at the snapshot number
```

## 2. Manually get crowdloans 

manually check how much crowdloan was raised and who were the depositors. 

find the amount raised (at that snapshot blocknumbder / blockhash) and deposit the funds to the crowdloan creator depositor account. You can update the snapshot file or you can do this manually after, because it will be less than 10 addresses to manage. 

### Example
in test snapshot block the block hash is `0x51d501fb2aab8e611c183d14e05cd5e263729a44f89edbe6232ef5bf710910ab` and para id `2025` raised 324,577,083,699,479
and their depositor was `14Q22opa2mR3SsCZkHbDoSkN6iQpJPk6dDYwaQibufh41g3k` then add the amount to the current depositor balance. 

```
// For test snapshot block number
Contributions for paraId 3357 saved.
Contributions for paraId 2025 saved.
Contributions for paraId 2002 saved.
Contributions for paraId 3341 saved.
Contributions for paraId 3350 saved.
Contributions for paraId 3356 saved.
Contributions for paraId 3354 saved.
```

# 4. Nomination Pool Management

Because nomination pools are keylesses address we need to reallocate the funds back to its users. 

## 1. Take Nomination Pools Snapshot

first we get the pool members `node ./nominationPools/fetchPoolMembers.cjs` which saved it into `accountsFromPools.json`


## 2. re-allocate nomination pool member balances with main snapshot
 then we run `node ./nominationPools/addPoolMembersToSnapshot.cjs` which creates a new snapshot file which:
 - gets the balances from the `accountsFromPool.json` file.
 - adds the balances of the snapshot with the pool balances re-allocated to the accounts into a new snapshot file. 
 - It also creates an audit file. `./nominationPools/auditFile.json`. 
 _The auditFile generated by the script provides a record of the changes made to each account's balance after incorporating the pool data. it is useful for verification and auditing purposes, as it tracks and documents the balance adjustments made during the execution of this script._


## 3. Remove nomination pool addresses fom Snapshot 

1. We need to get the pool IDs, a list of 600 nomination pools are stored in `poolAddresses.json`.
- We called `node ./nominationPools/fetchPoolIds.cjs`. _Be sure to update the file with information related to your own chain._

- If you find there is (now) more than 600 pool addresses then you need to re fetch and increase the numbder of account for more pool IDs.

2. Then we will use these IDs and remove them from our snapshot. 
Once we have the pool IDs we need to run a script that finds the addresses in the snapshot, and if that pool ID address exists in the snapshot then we remove the address. Why? Because the total funds are already accounted for when we re-allocate funds back to users. `node ./nominationPools/removePoolsFromSnapshot.cjs`

# 5. Merge Accounts

Merge system chain balances to snapshot



# 6. Pure Proxy Management 

re-allocating funds in a pure proxy back to its owner(s)

Pure Proxies (previously anonymous proxies) are keyless accounts that we need to handle. 

# 7. Bounty Management 

find all the proposers of the bounties and provide them the funds. there are not that many. 

```
bounties -> bounties(u32): Option<PalletBountiesBounty>
```

# 7. Replace keyless accounts

Replace the keyless addresses that become inaccessible once they are added as a AssetHub token asset. 
Replace for a new accessible address. Like a sudo key or a multisig. Then you can use that to redistribute elsewhere. 

keyless accounts we cover:

- crowdloans
- nominationPools
- Treasury (will not touch)
- pureProxy / anonymousProxy
- Sovereign Accounts (accessible if hrmp channel connected)



# 8. Distribute Snapshot to Chain

There are 3 main stages to distribution: Distribute EDs, and then frozen balances and thereafter thaw balances. 

## Distribute EDs

First we distribute EDs onchain with the `node ./distribution/distributeEDs.cjs`. This will send batchAll transactions contain a batch of transfers. 

### Check EDs

Not all batches will be successful the first time. So we run `node ./distribution/checkEDsOnChain.cjs` this will create a file `./logs/batchAnalysis.txt`. 

### Cross Referencing Batches (finding left overs)

Once we have our batchAnalysis file we can run the `findLeftOvers.cjs` file which will produce a new snapshot with all the accounts that still need to be added on chain in batches. 

## Add frozen balances

## Thaw balances 

# 9. Check distribution on Chain

### Get OnChain Balances

1.  use ` node ./distribution/Asset/checkisAssetIsOnChain.cjs`, make sure to add the correct snapshot file path, then it will check all balances in the snapshot and see if they are on chain. A new file will be created adding a field `onChainBalance` so that it can be compared. 

### Check is there is any difference between snapshot and OnChain balances. 

1. use `node ./distribution/Asset/separateDiffFromNonDiff.cjs` to see if there any discrepencies. If there are, then a file will be created to show the discrepencies. 

# Utils

Add Totals in snapshot by calling `node ./utils/addTotals.cjs`

Add mnemonic phrase to .env file to produce private key, or:
Add private key to env file which can be used to distribute funds on-chain. 

# FAQ

- If the snapshot download stops you can restart it and it will continue from where it paused using a "lastKey".
- when re-attempting a snapshot, dont forget to delete or rename the file and delete the lastKey.json so that it starts again. 

# TODO
- script to get para head and save it. 

# Improvements
- Automate through all scripts
- replace manual work for scripted
- update common JS. 
- Create CLI app? called Subsnap, an app to snapshot any substrate chain and disitribute as an asset (or as a genesis distribution on another chain). 
