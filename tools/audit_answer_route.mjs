import fs from "node:fs";
import assert from "node:assert/strict";
import vm from "node:vm";
import { createRequire } from "node:module";
import { runRoutes, createHarness } from "./answer_route_harness.mjs";
const require = createRequire(import.meta.url);
const engine = require("../game/database.js");
const database = JSON.parse(fs.readFileSync(new URL("../data/FootballMind_game_database.json", import.meta.url), "utf8"));
const report = await runRoutes(database);
const suffix = process.argv.includes("--baseline") ? "before" : "after";
fs.writeFileSync(new URL(`../data/FootballMind_answer_route_${suffix}.json`, import.meta.url), JSON.stringify(report, null, 2) + "\n");
for (const test of [...report.results, report.repeatedTaylor]) console.log(`${test.result}: ${test.scenario.name} — ${test.scenario.row} + ${test.scenario.column}${test.reason ? " — " + test.reason : ""}`);
if (suffix === "after" && [...report.results, report.repeatedTaylor].some((r) => r.result !== "GOED" || !r.boardShowsCorrect || !r.sameCanonicalObject)) process.exitCode = 1;
if (suffix === "after") {
  if (report.nameVariants.some((r) => r.result !== "GOED")) { console.error("FOUT naamvarianten", report.nameVariants.filter((r) => r.result !== "GOED")); process.exitCode = 1; }
  if (report.negative.result !== "FOUT" || report.negative.debug?.reason !== "row_mismatch") { console.error("FOUT negatieve controle", report.negative); process.exitCode = 1; }
  console.log(`${report.nameVariants.length} controles op volledige naam/voornaam; ongeldige combinatie terecht afgewezen met debuggegevens.`);
  const harness = createHarness(database);
  harness.reset(["Ajax"], ["Serie A"]);
  harness.context.stalePlayer = { id: "TM470394", name: "Kenneth Taylor", clubs: [], internationalTeams: [], competitions: [] };
  vm.runInContext('state.selected = "0-0"', harness.context);
  const res = await vm.runInContext('submitAnswer(stalePlayer, {query: "Taylor"})', harness.context);
  assert.equal(res.accepted, true);
  assert.equal(res.player, database.players[database.playerLookup.TM470394]);
  const strict = { ...database, rules: { allowPlayerReuse: false } };
  const repeat = engine.evaluateAnswer(strict, { playerId: "TM470394", row: "Ajax", column: "Serie A", usedPlayerIds: ["TM470394"] });
  assert.equal(repeat.reason, "already_used");
  assert.equal(engine.evaluateAnswer(database, { playerId: "missing", row: "Ajax", column: "Serie A" }).reason, "player_not_found");
  assert.equal(engine.evaluateAnswer(database, { playerId: "TM470394", row: "Ajax", column: "Serie A", cellAvailable: false }).reason, "cell_unavailable");
  console.log("Verouderd selectie-object gebruikt actuele canonieke ID; onbekende ID en bezet vak worden afgewezen; optionele hergebruikregel gecontroleerd.");
}
