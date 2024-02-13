echo "creating snapshot"
echo "[1/8]running snapshotAndAddTotals.cjs  "
node utils/snapshotAndAddTotals.cjs
echo "[2/8]running assethub snapshot  "
node snapshot/snapshot-dot-assethub.cjs     
echo "[3/8]running bridgehub snapshot  "
node snapshot/snapshot-dot-bridgehub.cjs    
echo "[4/8]running collectives snapshot  "
node snapshot/snapshot-dot-collectives.cjs
echo "[5/8] running addTotals.cjs"
node utils/adt.cjs
echo "[6/8] Crowdloan time! Running crowdloan/findAndFetchCrowdloan.cjs"
node crowdloan/findAndFetchCrowdloan.cjs
echo "[7/8] Getting nomination pool addresses"
node ./nominationPools/fetchPoolMembers.cjs
echo "[8/8]  re-allocate nomination pool member balances with main snapshot"
node addPoolMembersToSnapshot.cjs
echo "[!] Snapshot done"
echo "done"
