const { readFile, writeFile } = require("node:fs/promises");
const path = require("node:path");

interface PackageJson {
  version?: string;
}

const userscriptStart = "// ==UserScript==";
const userscriptEnd = "// ==/UserScript==";

const metadataBlockPattern = new RegExp(
  `^\\s*${escapeRegExp(userscriptStart)}[\\s\\S]*?${escapeRegExp(userscriptEnd)}\\s*\\r?\\n?`
);

async function buildUserscript(): Promise<void> {
  const projectRoot = path.resolve(__dirname, "..");
  const packageJsonPath = path.join(projectRoot, "package.json");
  const userscriptPath = path.join(
    projectRoot,
    "dist",
    "doubao-prompt-helper.user.js"
  );

  const packageJson = JSON.parse(
    await readFile(packageJsonPath, "utf8")
  ) as PackageJson;
  const version = packageJson.version ?? "0.0.0";

  const source = await readFile(userscriptPath, "utf8");
  const body = source.replace(/^\uFEFF/, "").replace(metadataBlockPattern, "");
  const output = `${createMetadata(version)}\n${body}`;

  await writeFile(userscriptPath, output, "utf8");
}

function createMetadata(version: string): string {
  return [
    userscriptStart,
    "// @name         豆包 Prompt 助手",
    "// @namespace    https://github.com/your-name/doubao-prompt-helper",
    `// @version      ${version}`,
    "// @description  在豆包网页中快速调用本地 prompt 模板",
    "// @match        https://www.doubao.com/*",
    "// @match        https://doubao.com/*",
    "// @grant        GM_setValue",
    "// @grant        GM_getValue",
    "// @grant        GM_deleteValue",
    "// @grant        GM_xmlhttpRequest",
    "// @grant        GM_setClipboard",
    "// @connect      raw.githubusercontent.com",
    "// @connect      *",
    "// @license      MIT",
    userscriptEnd
  ].join("\n");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

buildUserscript().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
