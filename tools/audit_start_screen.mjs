import fs from "node:fs";

const sourcePath = process.argv[2] || "latest/FootballMind_VAN_BASTEN_BALLON_FIX_script.txt";
const source = fs.readFileSync(sourcePath, "utf8");

const checks = [
  ["twee naamvelden", ["${[1, 2].map((player)", "id=\"fmPlayerName${player}\""]],
  ["zes voetbalpionnen", ["⚽", "👟", "🧤", "🏆", "🥅", "📣"]],
  ["drie moeilijkheidsgraden", ["data-start-difficulty=\"easy\"", "data-start-difficulty=\"medium\"", "data-start-difficulty=\"hard\""]],
  ["laden op de achtergrond", ["markStartScreenReady()", "state.databaseReady"]],
  ["startknop wacht op database", ["fmStartMatch", "button.disabled = false"]],
  ["namen en pionnen naar wedstrijd", ["state.players[player].name", "state.players[player].pawn"]],
  ["nieuw spel terug naar beginscherm", ["addEventListener(\"click\", showStartScreen)"]],
  ["rematch behoudt instellingen", ["fmPlayAgain", "refreshBoardWithEmotion(false)"]]
];

let failures = 0;
for (const [label, tokens] of checks) {
  const ok = tokens.every((token) => source.includes(token));
  if (ok) console.log(`OK  ${label}`);
  else {
    failures += 1;
    console.error(`FOUT ${label}`);
  }
}

if (failures) process.exit(1);
console.log("\nAlle beginschermcontroles zijn geslaagd.");
