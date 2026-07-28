import fs from "node:fs";

const postcssFile = "postcss.config.mjs";
const cssFile = "src/app/globals.css";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");

if (!fs.existsSync(cssFile)) {
  console.error(`Khong tim thay: ${cssFile}`);
  process.exit(1);
}

if (fs.existsSync(postcssFile)) {
  fs.copyFileSync(postcssFile, `${postcssFile}.bak-${stamp}`);
}

fs.copyFileSync(cssFile, `${cssFile}.bak-${stamp}`);

const postcssConfig = `const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
`;

fs.writeFileSync(postcssFile, postcssConfig, "utf8");

let css = fs.readFileSync(cssFile, "utf8");

if (!/^@import\s+["']tailwindcss["'];/m.test(css)) {
  css = `@import "tailwindcss";\n\n${css}`;
}

css = css.replace(
  /--font-sans:\s*var\(--font-geist-sans\);/g,
  "--font-sans: var(--font-inter), Arial, Helvetica, sans-serif;"
);

css = css.replace(
  /--font-mono:\s*var\(--font-geist-mono\);/g,
  "--font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;"
);

css = css.replace(
  /body\s*\{\s*background:\s*var\(--background\);\s*color:\s*var\(--foreground\);\s*font-family:\s*Arial, Helvetica, sans-serif;\s*\}/m,
  `body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-inter), Arial, Helvetica, sans-serif;
}`
);

fs.writeFileSync(cssFile, css, "utf8");

console.log("Da tao postcss.config.mjs cho Tailwind CSS 4.");
console.log("Da giu @import tailwindcss va dong bo font Inter.");
console.log("Hay xoa .next va build lai.");
