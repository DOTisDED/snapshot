const fs = require('fs');
const readline = require('readline');
const path = require('path');

// Assuming your nomination pools file is located similarly and named appropriately
const nominationPoolsFilePath = path.join(__dirname, './accountsFromPoolsLIVELuckyFriday.json');

async function sumAndCountUnbondingAmounts() {
    const fileStream = fs.createReadStream(nominationPoolsFilePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let totalUnbondingSum = BigInt(0);
    let totalPointsSum = BigInt(0); // To sum up the Total points
    let totalSum = BigInt(0); // To sum up the TotalSum field
    let accountCount = 0; // Counter for the number of accounts processed
    let unbondingGreaterThanZeroCount = 0; // Counter for UnbondingAmounts greater than zero

    for await (const line of rl) {
        if (line.trim()) { // Skip empty lines
            try {
                const accountData = JSON.parse(line);
                const unbondingAmount = BigInt(accountData.UnbondingAmount || "0");
                const total = BigInt(accountData.Total || "0"); // Get the Total points
                const totalSumValue = BigInt(accountData.TotalSum || "0"); // Get the TotalSum

                // Sum up the values
                totalUnbondingSum += unbondingAmount;
                totalPointsSum += total; // Add to the total points sum
                totalSum += totalSumValue; // Add to the total sum

                accountCount++;

                // Check if UnbondingAmount is greater than zero and increment counter
                if (unbondingAmount > 0) {
                    unbondingGreaterThanZeroCount++;
                }
            } catch (err) {
                console.error(`Error parsing line: ${err}`);
            }
        }
    }

    // Output the sums and counts
    console.log(`Sum total of 'UnbondingAmount' values: ${totalUnbondingSum.toString()}`);
    console.log(`Sum total of 'Total' values: ${totalPointsSum.toString()}`);
    console.log(`Sum total of 'TotalSum' values: ${totalSum.toString()}`);
    console.log(`Number of accounts processed: ${accountCount}`);
    console.log(`Number of 'UnbondingAmounts' greater than zero: ${unbondingGreaterThanZeroCount}`);
}

sumAndCountUnbondingAmounts().catch(console.error);
