var fs = require('fs');
var path = require('path');

function analyze() {
  var filePath = 'd:\\pqs-rtn-hybrid-storage\\src\\example\\full_example\\RtnUnits.md';
  var content = fs.readFileSync(filePath, 'utf8');
  var lines = content.split('\n');

  var level2Units = []; // 2xx0000
  var allUnits = new Set();
  var hierarchyErrors = [];

  lines.forEach(function (line) {
    // Expected format: | 2000000 | ... | ... |
    var match = line.match(/^\|\s*(\d{7})\s*\|/);
    if (match) {
      var code = match[1];
      allUnits.add(code);

      // Log Level 2
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
  var unitPrefixes = level2Units.map(function (u) { return parseInt(u.substring(1, 3)); });
  var minPrefix = Math.min.apply(null, unitPrefixes);
  var maxPrefix = Math.max.apply(null, unitPrefixes);

  console.log("Min Level 2 Prefix: " + minPrefix);
  console.log("Max Level 2 Prefix: " + maxPrefix);

  // Check if 2270000 exists
  console.log("2270000 Exists: " + allUnits.has('2270000'));
}

analyze();
