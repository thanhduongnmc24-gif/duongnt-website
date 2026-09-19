import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const inputCandidates = [
  "cookies.txt",
  "youtube-cookies.txt",
];

const inputName =
  inputCandidates.find((name) =>
    fs.existsSync(
      path.join(root, name),
    ),
  );

console.log("");
console.log("========================================");
console.log(" Tao YOUTUBE_COOKIES_B64 cho Render");
console.log("========================================");
console.log("");

if (!inputName) {
  console.error(
    "Khong tim thay cookies.txt hoac youtube-cookies.txt",
  );

  console.error("");
  console.error(
    "Hay dat file cookie YouTube vao thu muc nay.",
  );

  process.exit(1);
}

const inputPath =
  path.join(
    root,
    inputName,
  );

const raw =
  fs.readFileSync(
    inputPath,
    "utf8",
  );


/*
 * Kiem tra format Netscape.
 */

const validHeader =
  raw.startsWith(
    "# Netscape HTTP Cookie File",
  ) ||
  raw.startsWith(
    "# HTTP Cookie File",
  );


if (!validHeader) {
  console.error(
    "Cookie khong dung Netscape format.",
  );

  console.error("");
  console.error(
    "Dong dau tien phai la:",
  );

  console.error(
    "# Netscape HTTP Cookie File",
  );

  process.exit(1);
}


/*
 * Dam bao day la cookie YouTube.
 */

if (
  !raw.includes(
    ".youtube.com",
  ) &&
  !raw.includes(
    "youtube.com",
  )
) {
  console.error(
    "File cookie khong co youtube.com.",
  );

  process.exit(1);
}


/*
 * Dem mot so cookie quan trong.
 *
 * Khong in gia tri cookie ra terminal.
 */

const important = [
  "SID",
  "HSID",
  "SSID",
  "APISID",
  "SAPISID",
  "__Secure-1PSID",
  "__Secure-3PSID",
  "LOGIN_INFO",
];

const found =
  important.filter(
    (name) =>
      raw
        .split(/\r?\n/)
        .some(
          (line) =>
            line
              .split("\t")
              .includes(name),
        ),
  );


console.log(
  "File:",
  inputName,
);

console.log(
  "Kich thuoc:",
  Buffer.byteLength(
    raw,
  ),
  "bytes",
);

console.log(
  "Cookie dang nhap tim thay:",
  found.length,
  "/",
  important.length,
);


/*
 * Base64.
 */

const encoded =
  Buffer
    .from(
      raw,
      "utf8",
    )
    .toString(
      "base64",
    );


const outputName =
  ".youtube-cookies-b64.txt";

const outputPath =
  path.join(
    root,
    outputName,
  );


fs.writeFileSync(
  outputPath,
  encoded,
  {
    encoding:
      "utf8",
    mode:
      0o600,
  },
);


/*
 * Them file nhay cam vao .gitignore.
 */

const gitignorePath =
  path.join(
    root,
    ".gitignore",
  );

let gitignore =
  fs.existsSync(
    gitignorePath,
  )
    ? fs.readFileSync(
        gitignorePath,
        "utf8",
      )
    : "";


const ignoreLines = [
  "cookies.txt",
  "youtube-cookies.txt",
  ".youtube-cookies-b64.txt",
];


for (
  const line of
    ignoreLines
) {
  const current =
    gitignore
      .split(/\r?\n/)
      .map(
        (x) =>
          x.trim(),
      );

  if (
    !current.includes(
      line,
    )
  ) {
    gitignore +=
      (gitignore.endsWith("\n") ||
      gitignore.length === 0
        ? ""
        : "\n") +
      line +
      "\n";
  }
}


fs.writeFileSync(
  gitignorePath,
  gitignore,
  "utf8",
);


console.log("");
console.log(
  "DA TAO:",
  outputName,
);

console.log("");
console.log(
  "Gia tri cookie KHONG duoc in ra terminal.",
);

console.log("");
console.log(
  "========================================",
);

console.log(
  " TIEP THEO",
);

console.log(
  "========================================",
);

console.log("");
console.log(
  "1. Mo file:",
);

console.log("");
console.log(
  `   ${outputName}`,
);

console.log("");
console.log(
  "2. Copy TOAN BO noi dung file.",
);

console.log("");
console.log(
  "3. Vao Render -> duongnt-website -> Environment",
);

console.log("");
console.log(
  "4. Tao Environment Variable:",
);

console.log("");
console.log(
  "   Key:",
);

console.log(
  "   YOUTUBE_COOKIES_B64",
);

console.log("");
console.log(
  "   Value:",
);

console.log(
  "   [paste noi dung Base64 vao day]",
);

console.log("");
console.log(
  "5. Save Changes va Redeploy.",
);

console.log("");
console.log(
  "6. Sau khi Render chay thanh cong,",
);

console.log(
  "   XOA 2 file local nhay cam:",
);

console.log("");
console.log(
  `   ${inputName}`,
);

console.log(
  `   ${outputName}`,
);

console.log("");
console.log(
  "KHONG git add 2 file nay.",
);

console.log(
  "KHONG gui cookie cho bat ky ai.",
);

console.log(
  "KHONG paste cookie vao ChatGPT.",
);

console.log("");