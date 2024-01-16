const fs = require('fs');
const { parser } = require('stream-json');
const { streamArray } = require('stream-json/streamers/StreamArray');


const filePath = './dot-balances-new-dwellir.json'; // Replace with your file path
const outputFilePath = 'ordered-dot-dwellir.json'; // Path for the sorted output file

const pipeline = fs.createReadStream(filePath)
  .pipe(parser())
  .pipe(streamArray());

let dataArray = [];

pipeline.on('data', data => {
    dataArray.push(data.value); // Assuming each entry is an object
});

pipeline.on('end', () => {
    dataArray.sort((a, b) => {
        // Replace with your sorting logic, e.g., by Total
        return b.Total - a.Total;
    });

    // Write sorted data back to a file
    fs.writeFileSync(outputFilePath, JSON.stringify(dataArray, null, 2));
    console.log(`Sorted data saved to ${outputFilePath}`);
});

pipeline.on('error', error => {
    console.error('Error processing JSON stream:', error);
});
