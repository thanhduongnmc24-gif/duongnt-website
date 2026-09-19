import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const target = path.join(
  root,
  "scripts/install-youtube-stack.mjs",
);

const stamp = new Date()
  .toISOString()
  .replace(/[:.]/g, "-");

console.log("");
console.log("==========================================");
console.log(" DuongTube - Fix yt-dlp JS runtime test");
console.log("==========================================");
console.log("");

if (!fs.existsSync(target)) {
  console.error(
    "Khong tim thay scripts/install-youtube-stack.mjs",
  );

  console.error(
    "Hay dat file nay o thu muc goc project.",
  );

  process.exit(1);
}


/*
 * =====================================================
 * Backup
 * =====================================================
 */

const backup =
  `${target}.bak-${stamp}`;

fs.copyFileSync(
  target,
  backup,
);

console.log(
  "Backup:",
  path.basename(backup),
);


/*
 * =====================================================
 * Doc installer hien tai
 * =====================================================
 */

let source =
  fs.readFileSync(
    target,
    "utf8",
  );


/*
 * =====================================================
 * Tim block Test plugin
 * =====================================================
 */

const startMarker =
`  /*
   * Test plugin.
   */`;


const start =
  source.indexOf(
    startMarker,
  );


if (start < 0) {
  console.error(
    "Khong tim thay block 'Test plugin'.",
  );

  process.exit(1);
}


/*
 * Block test ket thuc ngay truoc
 * console.log thong bao thanh cong.
 */

const endMarker =
`


  console.log("");`;


const end =
  source.indexOf(
    endMarker,
    start,
  );


if (end < 0) {
  console.error(
    "Khong tim thay diem ket thuc block test.",
  );

  process.exit(1);
}


/*
 * =====================================================
 * Block test moi
 * =====================================================
 *
 * Quan trong:
 *
 * 1. Truyen:
 *
 *    --js-runtimes node:/duong/dan/node
 *
 *    de yt-dlp giai signature challenge.
 *
 * 2. Test dung dung format ma app can:
 *
 *    m4a/bestaudio/best
 *
 * 3. Neu YouTube tam thoi chan test video,
 *    BUILD VAN TIEP TUC.
 *
 * Runtime that cua /api/youtube/audio
 * van xu ly loi khi nguoi dung bam video.
 */

const newBlock =
`  /*
   * Test plugin + Node JS runtime.
   *
   * Day chi la smoke test.
   * Khong duoc lam ca deployment that bai
   * chi vi YouTube tam thoi chan video test.
   */

  console.log("");
  console.log(
    "=== Test yt-dlp + POT + Node JS runtime ===",
  );

  console.log(
    "Node runtime:",
    process.execPath,
  );


  const smokeArgs = [
    "-m",
    "yt_dlp",

    "-v",

    "--simulate",

    /*
     * QUAN TRONG:
     *
     * Log cu bao:
     *
     * JS runtimes: none
     *
     * nen signature challenge khong giai duoc.
     */

    "--js-runtimes",

    "node:" +
      process.execPath,

    /*
     * Test dung format audio
     * ma DuongTube se dung.
     */

    "-f",

    "m4a/bestaudio/best",

    /*
     * mweb + POT
     */

    "--extractor-args",

    "youtube:player-client=mweb",

    "--extractor-args",

    "youtubepot-bgutilscript:server_home=" +
      server,

    /*
     * Chi test metadata/format,
     * khong download file.
     */

    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  ];


  console.log(
    ">",
    python,
    ...smokeArgs,
  );


  const smoke =
    spawnSync(
      python,
      smokeArgs,
      {
        cwd:
          root,

        stdio:
          "inherit",

        shell:
          false,

        env: {
          ...process.env,

          TOKEN_TTL:
            "6",

          NO_COLOR:
            "1",
        },
      },
    );


  if (
    smoke.error
  ) {

    console.warn("");
    console.warn(
      "[CANH BAO] Smoke test khong chay duoc:",
    );

    console.warn(
      smoke.error.message,
    );

    console.warn(
      "Build se tiep tuc.",
    );

  } else if (
    smoke.status !== 0
  ) {

    console.warn("");
    console.warn(
      "==========================================",
    );

    console.warn(
      "[CANH BAO] YouTube smoke test that bai.",
    );

    console.warn(
      "Exit code:",
      smoke.status,
    );

    console.warn("");
    console.warn(
      "Dieu nay KHONG co nghia la Next.js build bi loi.",
    );

    console.warn(
      "YouTube co the dang chan IP Render hoac video test.",
    );

    console.warn(
      "Build se tiep tuc de website van deploy.",
    );

    console.warn(
      "==========================================",
    );

  } else {

    console.log("");
    console.log(
      "==========================================",
    );

    console.log(
      " YT-DLP + POT + NODE JS TEST OK",
    );

    console.log(
      "==========================================",
    );
  }
`;


/*
 * =====================================================
 * Ghi lai installer
 * =====================================================
 */

source =
  source.slice(
    0,
    start,
  ) +
  newBlock +
  source.slice(
    end,
  );


fs.writeFileSync(
  target,
  source,
  "utf8",
);


console.log("");
console.log(
  "Da sua:",
  "scripts/install-youtube-stack.mjs",
);


/*
 * =====================================================
 * Kiem tra audio route
 * =====================================================
 */

const audioRoute =
  path.join(
    root,
    "src/app/api/youtube/audio/route.ts",
  );


if (
  fs.existsSync(
    audioRoute,
  )
) {

  const audio =
    fs.readFileSync(
      audioRoute,
      "utf8",
    );


  if (
    audio.includes(
      '"--js-runtimes"',
    ) &&
    audio.includes(
      '"node:" +',
    )
  ) {

    console.log(
      "OK: audio runtime da co --js-runtimes node.",
    );

  } else {

    console.warn("");
    console.warn(
      "CANH BAO:",
    );

    console.warn(
      "src/app/api/youtube/audio/route.ts",
    );

    console.warn(
      "chua thay --js-runtimes node.",
    );

    console.warn(
      "Gui file/log cho minh neu gap loi sau deploy.",
    );
  }
}


/*
 * =====================================================
 * Hoan thanh
 * =====================================================
 */

console.log("");
console.log(
  "==========================================",
);

console.log(
  " HOAN THANH",
);

console.log(
  "==========================================",
);

console.log("");
console.log(
  "Bay gio chay:",
);

console.log("");
console.log(
  "  npm run build",
);

console.log("");
console.log(
  "Sau khi push len GitHub, Render deploy lai.",
);

console.log("");
console.log(
  "Trong log moi, tim dong:",
);

console.log("");
console.log(
  "  JS runtimes: node",
);

console.log("");
console.log(
  "thay vi:",
);

console.log("");
console.log(
  "  JS runtimes: none",
);

console.log("");