

const takeSnapshot = require('../snapshot/snapshot-dot.cjs').takeSnapshot;
const sumTotalsInSnapshot = require('./addTotals.cjs').sumTotalsInSnapshot;
const getTotalIssuance = require('./totalIssuance.cjs').getTotalIssuance;

async function main() {
    try {
        let blockNumber = 18871235; 
        let snapshotFileName = `./BH-balances-new-dwellir-${blockNumber}.json`;
        let lastKeyFileName = `./lastKeyDwellir-${blockNumber}.txt`;

        console.log(`Starting process for block number: ${blockNumber}`);

        // 1. Take snapshot
        console.log("📸 ⛓ Taking snapshot...");
        await takeSnapshot(blockNumber, snapshotFileName, lastKeyFileName);
        console.log("✅ 🛎️ 📸 Snapshot taken successfully.");

        // 2. Sum totals in the snapshot
        console.log("Summing totals in snapshot...");
        let totalSum = await sumTotalsInSnapshot(snapshotFileName);
        console.log(`Total sum from snapshot: ${totalSum}`);

        // 3. Get total issuance
        console.log("Fetching total issuance from blockchain...");
        let totalIssuance = await getTotalIssuance(blockNumber);
        console.log(`Total issuance at block ${blockNumber}: ${totalIssuance}`);

        // 4. Calculate and display the discrepancy
        let discrepancy = BigInt(totalIssuance) - BigInt(totalSum);
        console.log(`Discrepancy between total issuance and snapshot totals: ${discrepancy.toString()}`);
    } catch (error) {
        console.error(`Error in main execution: ${error}`);
    }
}

main();

