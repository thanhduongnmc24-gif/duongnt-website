import fs from "node:fs";

const packageFile = "package.json";

if (!fs.existsSync(packageFile)) {
  console.error("Khong tim thay package.json.");
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.copyFileSync(packageFile, `${packageFile}.bak-${stamp}`);

const packageJson = JSON.parse(fs.readFileSync(packageFile, "utf8"));
packageJson.scripts ||= {};
packageJson.scripts.build = "next build --webpack";
packageJson.scripts.start = "next start";
fs.writeFileSync(packageFile, `${JSON.stringify(packageJson, null, 2)}\n`, "utf8");

const configCandidates = [
  "next.config.ts",
  "next.config.mjs",
  "next.config.js",
];
const configFile = configCandidates.find((file) => fs.existsSync(file));

if (configFile) {
  fs.copyFileSync(configFile, `${configFile}.bak-${stamp}`);
  let source = fs.readFileSync(configFile, "utf8");

  if (!source.includes("cssChunking")) {
    const objectPattern = /const\s+nextConfig(?:\s*:\s*NextConfig)?\s*=\s*\{/;

    if (objectPattern.test(source)) {
      source = source.replace(
        objectPattern,
        (match) => `${match}\n  experimental: { cssChunking: "strict" },`
      );
      fs.writeFileSync(configFile, source, "utf8");
      console.log(`Da them cssChunking strict vao ${configFile}`);
    } else {
      console.log(`Khong tu dong sua duoc ${configFile}. Chi doi build sang webpack.`);
    }
  }
}

console.log("Da doi lenh build thanh: next build --webpack");
console.log("Hay xoa .next, build lai, commit va push.");
