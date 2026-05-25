const fs = require("fs");
const c = fs.readFileSync("src/screens/LandingScreen.jsx", "utf8");
console.log("Has Helmet:", c.includes("import { Helmet }"));
console.log("Has videoModalOpen:", c.includes("videoModalOpen"));
console.log("Has useTheme:", c.includes("useTheme"));
console.log("Has video-modal:", c.includes("lp-video-modal"));
console.log("Total lines:", c.split("\n").length);
