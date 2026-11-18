import fs from "node:fs";
import vm from "node:vm";

const sourcePath = "/workspace/scratch/671492226452/latest/FootballMind_VAN_BASTEN_BALLON_FIX_script.txt";
const outputPath = "/workspace/scratch/671492226452/build/data/FootballMind_career_corrections.json";
const source = fs.readFileSync(sourcePath, "utf8");

function literalBetween(startToken, endToken) {
  const start = source.indexOf(startToken);
  const end = source.indexOf(endToken, start + startToken.length);
  if (start < 0 || end < 0) throw new Error(`Codeblok niet gevonden: ${startToken}`);
  return source.slice(start + startToken.length, end).trim();
}

const legends = vm.runInNewContext(literalBetween(
  "const LEGEND_PLAYERS =",
  ";\n\nfunction mergeUniqueValues"
));
const fixes = vm.runInNewContext(literalBetween(
  "const FOOTBALLMIND_PLAYER_CAREER_FIXES =",
  ";\n\nfunction applyCareerFixesToDatabase"
));

const payload = {
  version: "2026-09-source-corrections-v1",
  source: "Gecontroleerde FootballMind-loopbaanaanvullingen",
  players: [...legends, ...fixes]
};

fs.mkdirSync(new URL("../build/data/", import.meta.url), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`${payload.players.length} loopbaancorrecties geëxporteerd naar ${outputPath}`);
