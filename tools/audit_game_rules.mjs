import fs from "node:fs";
import vm from "node:vm";

const sourcePath = process.argv[2] || "latest/FootballMind_VAN_BASTEN_BALLON_FIX_script.txt";
const source = fs.readFileSync(sourcePath, "utf8");

function extract(startToken, endToken) {
  const start = source.indexOf(startToken);
  const end = source.indexOf(endToken, start);
  if (start < 0 || end < 0) throw new Error(`Codeblok niet gevonden: ${startToken}`);
  return source.slice(start, end).trim();
}

const rulesCode = [
  extract("const FOOTBALLMIND_WINNING_LINES", "function ensureRulesUI")
].join("\n");

const context = {};
vm.createContext(context);
vm.runInContext(`${rulesCode}\nthis.testWin = findWinningLine;`, context);

const answer = (owner) => ({ owner });
const tests = [
  ["bovenste rij", { "0-0": answer(1), "0-1": answer(1), "0-2": answer(1) }, 1, true],
  ["middelste kolom", { "0-1": answer(2), "1-1": answer(2), "2-1": answer(2) }, 2, true],
  ["diagonaal links-rechts", { "0-0": answer(1), "1-1": answer(1), "2-2": answer(1) }, 1, true],
  ["diagonaal rechts-links", { "0-2": answer(2), "1-1": answer(2), "2-0": answer(2) }, 2, true],
  ["gemengde kleuren winnen niet", { "0-0": answer(1), "0-1": answer(2), "0-2": answer(1) }, 1, false],
  ["twee vakken winnen niet", { "2-0": answer(1), "2-1": answer(1) }, 1, false]
];

let failures = 0;
for (const [label, answers, player, expected] of tests) {
  const actual = Boolean(context.testWin(answers, player));
  if (actual !== expected) {
    failures += 1;
    console.error(`FOUT ${label}`);
  } else {
    console.log(`OK  ${label}`);
  }
}

const requiredIntegration = [
  "switchTurn();",
  "finishGameAfterCorrectAnswer(claimingPlayer)",
  "FootballMindData.evaluateAnswer(state.database",
  "Object.keys(state.answers).length === 9",
  "showEndGameModal(\"win\", player)",
  "Beurt overslaan"
];

for (const token of requiredIntegration) {
  if (!source.includes(token)) {
    failures += 1;
    console.error(`FOUT integratie ontbreekt: ${token}`);
  }
}

if (failures) process.exit(1);
console.log("\nAlle spelregeltests zijn geslaagd.");
