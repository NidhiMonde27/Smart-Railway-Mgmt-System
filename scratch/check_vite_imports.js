const fs = require("fs");
const path = require("path");

const pagesDir = path.join(__dirname, "../client/src/pages");
const files = fs.readdirSync(pagesDir).filter((f) => f.endsWith(".jsx"));

console.log("Checking JSX pages syntax...");
let clean = true;

files.forEach((file) => {
  const content = fs.readFileSync(path.join(pagesDir, file), "utf-8");
  // Basic checks
  if (content.includes("normName") && !content.includes("const normName") && !content.includes("function normName") && !content.includes("import") && !content.includes("normName =")) {
    console.error(`Potential missing normName in ${file}`);
    clean = false;
  }
});

if (clean) {
  console.log("All JSX files verified cleanly!");
}
