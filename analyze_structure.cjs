const fs = require('fs');
const path = require('path');

function analyze() {
  const filePath = 'd:\\pqs-rtn-hybrid-storage\\src\\example\\full_example\\RtnUnits.md';
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');

  let level2Units = []; // 2xx0000
  let allUnits = new Set();

  lines.forEach(function (line) {
    // Expected format: | 2000000 | ... | ... |
    const match = line.match(/^\|\s*(\d{7})\s*\|/);
    if (match) {
      const code = match[1];
      allUnits.add(code);

      // Logic: Starts with 2, ends with 0000, is NOT root
      if (code.startsWith('2') && code.endsWith('0000') && code !== '2000000') {
        level2Units.push(code);
      }
    }
  });

  console.log("Total Units Found: " + allUnits.size);
  console.log("Level 1 (Root): 2000000 - " + (allUnits.has('2000000') ? "Found" : "Missing"));
  console.log("Level 2 (Department/Direct Reporting) Count: " + level2Units.length);
  console.log("Sample Level 2 Units: " + level2Units.slice(0, 5).join(', '));

  // Check coverage of user request: "2nd-3rd digits are 01-54"
  if (level2Units.length > 0) {
    let prefixes = level2Units.map(function (u) { return parseInt(u.substring(1, 3)); });
    let minPrefix = Math.min.apply(null, prefixes);
    let maxPrefix = Math.max.apply(null, prefixes);
    console.log("Min Level 2 Prefix Index: " + minPrefix);
    console.log("Max Level 2 Prefix Index: " + maxPrefix);
  }

  // Specific check for 2270000
  console.log("2270000 Exists: " + allUnits.has('2270000'));
}

analyze();
