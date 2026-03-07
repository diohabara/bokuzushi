import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { BALL_FINAL_TIER, CONTROL_HINTS, README_RULES, TIER_CONTENT, WORLD_CONTENT } from "../src/gameContent";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const readmePath = path.join(rootDir, "README.md");
const packageJsonPath = path.join(rootDir, "package.json");

function replaceBlock(content: string, marker: string, replacement: string): string {
  const start = `<!-- ${marker}:start -->`;
  const end = `<!-- ${marker}:end -->`;
  const pattern = new RegExp(`${start}[\\s\\S]*?${end}`, "m");
  return content.replace(pattern, `${start}\n${replacement}\n${end}`);
}

async function main() {
  const shouldCheck = process.argv.includes("--check");
  const readme = await readFile(readmePath, "utf8");
  const pkg = JSON.parse(await readFile(packageJsonPath, "utf8")) as {
    scripts: Record<string, string>;
  };

  const colors = [...TIER_CONTENT.map((tier) => tier.label), BALL_FINAL_TIER.label].join(" < ");
  const worldTable = [
    "| ワールド | テーマ | ブロック色範囲 |",
    "|---|---|---|",
    ...WORLD_CONTENT.map((world) => `| ${world.name} | ${world.docsTheme} | ${world.docsRange} |`),
  ].join("\n");

  const gameplaySection = [
    "## ゲームシステム",
    "",
    `- **色の強さ**: ${colors}`,
    ...README_RULES.map((rule) => `- ${rule}`),
    "",
    "## ワールド",
    "",
    worldTable,
    "",
    "前のワールドを制覇すると次が解放される。",
  ].join("\n");

  const commandsSection = [
    "## 開発コマンド",
    "",
    "| コマンド | 説明 |",
    "|---|---|",
    `| \`npm install\` | 依存関係をインストール |`,
    `| \`npm run dev\` | 開発サーバーを起動 |`,
    `| \`npm run build\` | TypeScript ビルドと Vite ビルドを実行 |`,
    `| \`npm run test\` | Vitest をウォッチ実行 |`,
    `| \`npm run test:run\` | Vitest を一回実行 |`,
    `| \`npm run docs:generate\` | README の生成ブロックを更新 |`,
    `| \`npm run docs:check\` | README の生成ブロック差分を検査 |`,
    `| \`npm run ci\` | build / test / docs:check をまとめて実行 |`,
    "",
    "## 操作",
    "",
    ...CONTROL_HINTS.map((hint) => `- ${hint}`),
    "",
    "## 自動ドキュメント更新",
    "",
    `README の生成対象は \`npm run docs:generate\` で更新され、CI では \`${pkg.scripts["docs:check"]}\` を実行して更新漏れを検出する。`,
  ].join("\n");

  const next = replaceBlock(
    replaceBlock(readme, "GENERATED_GAMEPLAY", gameplaySection),
    "GENERATED_COMMANDS",
    commandsSection
  );

  if (shouldCheck) {
    if (next !== readme) {
      process.stderr.write("README.md is out of date. Run `npm run docs:generate`.\n");
      process.exitCode = 1;
    }
    return;
  }

  await writeFile(readmePath, next);
}

main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});
