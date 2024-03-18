#!/bin/bash

# Define file paths
snapshot1="./AH-balances-new-dwellir-5355206.json"
snapshot2="./BH-balances-new-dwellir-1675172.json"
snapshot3="./COL-balances-new-dwellir-2883666.json"
snapshot4="dot-balances-new-dwellir5.json"
mergedFilePath="./mergedSnapshot.json"
auditFilePath="./AUDITmergedSnapshot.txt"



echo "creating snapshot"
echo "[1/9]running snapshotAndAddTotals.cjs  "
node utils/snapshotAndAddTotals.cjs
echo "[2/9]running assethub snapshot  "
node snapshot/snapshot-dot-assethub.cjs     
echo "[3/9]running bridgehub snapshot  "
node snapshot/snapshot-dot-bridgehub.cjs    
echo "[4/9]running collectives snapshot  "
node snapshot/snapshot-dot-collectives.cjs
echo "[5/9] running addTotals.cjs"
node utils/adt.cjs
echo "[6/9] "merge snapshots together
node ./snapshot/mergeSnapshot

# Merge snapshots
echo "Merging snapshots..."
node mergeSnapshots.js "$snapshot1" "$snapshot2" "$mergedFilePath" "$auditFilePath"
node mergeSnapshots.js "$mergedFilePath" "$snapshot3" "$mergedFilePath" "$auditFilePath"
node mergeSnapshots.js "$mergedFilePath" "$snapshot4" "$mergedFilePath" "$auditFilePath"

echo "All snapshots merged into $mergedFilePath"

echo "[7/9] Getting nomination pool addresses"
node ./nominationPools/fetchPoolMembers.cjs
echo "[8/9]  re-allocate nomination pool member balances with main snapshot"
node ./nominationPools/addPoolMembersToSnapshot.cjs
echo "[9/9]  remove nomation pools from snapshot"
node ./nominationPools/addPoolMembersToSnapshot.cjs
echo "[!] Snapshot done"
echo "done"