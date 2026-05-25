const fs = require("fs");
const files = fs.readdirSync(".");
files.filter(f => /^(add-|check-|patch-|fix-).*\.cjs$/.test(f)).forEach(f => {
  fs.unlinkSync(f);
  console.log("Removed:", f);
});
