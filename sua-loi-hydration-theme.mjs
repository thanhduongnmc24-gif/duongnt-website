import fs from "node:fs";

const tepThemeCss = "src/components/theme/theme-css.tsx";
const tepLayout = "src/app/layout.tsx";

if (!fs.existsSync(tepThemeCss) || !fs.existsSync(tepLayout)) {
  console.error("Khong tim thay theme-css.tsx hoac layout.tsx.");
  process.exit(1);
}

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
fs.copyFileSync(tepThemeCss, `${tepThemeCss}.bak-${stamp}`);
fs.copyFileSync(tepLayout, `${tepLayout}.bak-${stamp}`);

const themeCss = `import { layThemeWebsite } from "@/lib/theme/theme";

export async function ThemeCss() {
  const theme = await layThemeWebsite();

  const css = \`
    :root {
      --theme-primary: \${theme.mauChinh};
      --theme-secondary: \${theme.mauPhu};
      --theme-background: \${theme.mauNen};
      --theme-text: \${theme.mauChu};
      --theme-radius: \${theme.ma === "minimal-light" ? "6px" : "16px"};
      --theme-shadow: \${theme.ma === "minimal-light" ? "none" : "0 10px 30px rgba(15,23,42,.10)"};
    }

    body {
      background: var(--theme-background);
      color: var(--theme-text);
    }

    .theme-primary { color: var(--theme-primary) !important; }
    .theme-primary-bg {
      background: var(--theme-primary) !important;
      color: white !important;
    }
    .theme-card {
      border-radius: var(--theme-radius);
      box-shadow: var(--theme-shadow);
    }

    html[data-theme="dark-tech"] body {
      background: #020617;
      color: #e2e8f0;
    }
    html[data-theme="dark-tech"] .bg-white {
      background-color: #0f172a !important;
    }
    html[data-theme="dark-tech"] .text-slate-900 {
      color: #f8fafc !important;
    }
    html[data-theme="dark-tech"] .text-slate-600,
    html[data-theme="dark-tech"] .text-slate-500 {
      color: #94a3b8 !important;
    }
    html[data-theme="dark-tech"] .border-slate-200,
    html[data-theme="dark-tech"] .border-slate-300 {
      border-color: #334155 !important;
    }
    html[data-theme="dark-tech"] input,
    html[data-theme="dark-tech"] textarea,
    html[data-theme="dark-tech"] select {
      background: #111827;
      color: #f8fafc;
    }

    html[data-theme="minimal-light"] * {
      box-shadow: none !important;
    }
  \`;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
`;

fs.writeFileSync(tepThemeCss, themeCss, "utf8");

let layout = fs.readFileSync(tepLayout, "utf8");
const importTheme = 'import { layThemeWebsite } from "@/lib/theme/theme";';

if (!layout.includes(importTheme)) {
  layout = `${importTheme}\n${layout}`;
}

layout = layout.replace(
  /export default function RootLayout\(/,
  "export default async function RootLayout("
);

if (!layout.includes("const theme = await layThemeWebsite();")) {
  const viTri = layout.indexOf("  return (");

  if (viTri < 0) {
    console.error("Khong tim thay khoi return trong layout.tsx.");
    process.exit(1);
  }

  layout =
    layout.slice(0, viTri) +
    "  const theme = await layThemeWebsite();\n\n" +
    layout.slice(viTri);
}

layout = layout.replace(
  /<html\s+lang="vi"(?:\s+data-theme=\{theme\.ma\})?>/,
  '<html lang="vi" data-theme={theme.ma}>'
);

fs.writeFileSync(tepLayout, layout, "utf8");
console.log("Da sua loi hydration theme.");
console.log("Theme duoc gan truc tiep tren server vao the html.");
