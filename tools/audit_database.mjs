import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const data = require("../game/database.js");
const read = (name) => JSON.parse(fs.readFileSync(new URL("../data/" + name, import.meta.url), "utf8"));
const db = read("FootballMind_game_database.json");
const report = data.audit(db);
assert.equal(report.failed, 0);
const aliasConfig = read("FootballMind_club_competitions.json");
const madridNames = ["Real Madrid", "Real Madrid CF", "Real Madrid Club de Fútbol"];
const countryNames = ["Nederland", "Netherlands", "Holland"];
const aliasSource = { players: madridNames.flatMap((club, i) => countryNames.map((country, j) => ({ id: `alias-${i}-${j}`, name: `Test ${i} ${j}`, clubs: [club], internationalTeams: [country] }))) };
const aliasDatabase = data.build(aliasSource, { players: [] }, { players: [] }, aliasConfig);
for (const player of aliasDatabase.players) {
  assert.deepEqual(player.clubs, ["Real Madrid"]);
  assert.deepEqual(player.internationalTeams, ["Nederland"]);
  for (const club of madridNames) assert.equal(data.playerMatchesClue(player, club, aliasDatabase.clueAliases), true);
  for (const country of countryNames) assert.equal(data.playerMatchesClue(player, country, aliasDatabase.clueAliases), true);
  assert.equal(data.playerMatchesClue(player, "Real Madrid Castilla", aliasDatabase.clueAliases), false);
}
assert.equal(aliasDatabase.cluePlayers["real madrid"].length, 9);
assert.equal(aliasDatabase.cluePlayers.nederland.length, 9);
assert.equal(data.clueKey("  REAL   MADRID CLUB DE FUTBOL  ", db.clueAliases), "real madrid");
const entry = (name, id = name) => data.searchEntry({ id, name, aliases: [] });
const entries = [entry("Taylor Junior"), entry("Kenneth Taylorson"), entry("Kenneth Taylor"), entry("Taylor")];
assert.deepEqual(data.search(entries, "Taylor").map((e) => e.displayName), ["Taylor", "Kenneth Taylor", "Kenneth Taylorson", "Taylor Junior"]);
const crowded = Array.from({ length: 45 }, (_, i) => entry(`Cruijffsen ${i}`));
crowded.push(entry("Johan Cruijff"));
assert.equal(data.search(crowded, "Cruijff").length, 30);
assert.equal(data.search(crowded, "Cruijff")[0].displayName, "Johan Cruijff");
assert.equal(data.search([entry("Virgil van Dijk")], "  VAN   DIJK ")[0].displayName, "Virgil van Dijk");
assert.equal(data.search([entry("Kylian Mbappé")], "mbappe").length, 1);
assert.equal(data.search([entry("Kenneth Taylor")], "Taylor Kenneth").length, 1);
assert.equal(data.search([entry("Virgil van Dijk")], "van").length, 1);
assert.equal(data.search([entry("Aaron Ramsey", "one"), entry("Aaron Ramsey", "two")], "Ramsey").length, 2);
const config = { aliases: {}, playerAwards: {}, clubCompetitions: { Ajax: ["Eredivisie"], Lazio: ["Serie A"] } };
const input = { players: [{ id: "1", name: "Test Player", clubs: ["Ajax", "Small historic club"] }, { id: "1", name: "Test Player", clubs: ["Lazio"] }, { id: "2", name: "Test Player", clubs: ["Other club"] }] };
const rebuilt = data.build(input, { players: [] }, { players: [] }, config);
assert.equal(rebuilt.players.length, 2);
assert.deepEqual(rebuilt.players[0].clubs, ["Ajax", "Small historic club", "Lazio"]);
assert.ok(rebuilt.players[0].competitions.includes("Serie A"));
assert.deepEqual(rebuilt.nameLookup["test player"], [0, 1]);
assert.deepEqual(rebuilt.competitionPlayers["serie a"], [0]);
const again = data.build(rebuilt, { players: [] }, { players: [] }, config);
assert.deepEqual(again.players, rebuilt.players);

// Execute the real game functions, including selected-player validation and loader.
const source = fs.readFileSync(new URL("../game/script.js", import.meta.url), "utf8");
const context = vm.createContext({ FootballMindData: data, console: { log() {}, table() {}, warn() {} }, window: { setTimeout() {} }, setTimeout, TextEncoder });
vm.runInContext(source.slice(0, source.indexOf('getElement("newGame").addEventListener')), context);
context.database = db;
vm.runInContext("state.database = database; hydratePrebuiltGameIndexes(database);", context);
const runtimeAudits = data.auditPlayers(db, (player, clue) => {
  context.auditPlayer = player;
  context.auditClue = clue;
  return vm.runInContext("playerMatchesClue(auditPlayer, auditClue)", context);
});
assert.ok(runtimeAudits.every((audit) => audit.failed === 0));
for (const result of runtimeAudits) {
  context.auditPlayer = db.players.find((p) => p.id === result.id);
  context.auditClubs = result.clubs;
  assert.ok(vm.runInContext('auditClubs.every(club => validPlayers(club, "Netherlands").includes(auditPlayer))', context));
  assert.ok(vm.runInContext(`state.playerIndex.get(auditPlayer.id) === auditPlayer && state.nameIndex.get(normalise(auditPlayer.name)).includes(auditPlayer)
    && auditPlayer.clubs.every(club => state.clubIndex.get(clueKey(club)).includes(auditPlayer))
    && auditPlayer.internationalTeams.every(country => state.countryIndex.get(clueKey(country)).includes(auditPlayer))
    && auditPlayer.competitions.every(competition => state.competitionIndex.get(clueKey(competition)).includes(auditPlayer))`, context));
}
for (const alias of [...madridNames, ...countryNames]) {
  context.auditClue = alias;
  assert.equal(vm.runInContext("clueKey(auditClue)", context), data.clueKey(alias, db.clueAliases));
}
// Verify version upgrade destroys the old database store and recreates it.
const storeEvents = [];
context.indexedDB = { open(name, version) {
  assert.equal(name, "FootballMindCache");
  assert.equal(version, 5);
  let exists = true;
  const request = { result: {
    objectStoreNames: { contains: () => exists },
    deleteObjectStore(name) { storeEvents.push(`delete:${name}`); exists = false; },
    createObjectStore(name) { storeEvents.push(`create:${name}`); exists = true; }
  } };
  queueMicrotask(() => { request.onupgradeneeded(); request.onsuccess(); });
  return request;
} };
await vm.runInContext("openFootballMindCache()", context);
assert.deepEqual(storeEvents, ["delete:database", "create:database"]);
assert.ok(vm.runInContext('validPlayers("Serie A", "Ajax").some(p => p.name === "Kenneth Taylor")', context));
assert.ok(vm.runInContext('playerMatchesClue(state.database.players.find(p => p.name === "Kenneth Taylor"), "Serie A")', context));
context.document = { getElementById: () => ({ value: "Taylor", classList: { remove() {} } }) };
vm.runInContext(`
  state.selected = "0-0"; state.rows = ["Serie A"]; state.columns = ["Ajax"];
  showMessage = () => {}; renderBoard = () => {}; finishGameAfterCorrectAnswer = () => true;
  resolvePlayerPhoto = async () => "";
`, context);
await vm.runInContext('submitAnswer(state.database.players.find(p => p.id === "TM470394"))', context);
assert.equal(vm.runInContext('state.answers["0-0"].name', context), "Kenneth Taylor");
assert.ok(vm.runInContext('state.usedPlayerNames.has("TM470394")', context));

// Any changed source bypasses the old cache, and the generated file is never fetched.
let fetched = [], saved;
const sourceFiles = ["FootballMind_database.json", "FootballMind_legends.json", "FootballMind_career_corrections.json", "FootballMind_club_competitions.json"];
context.fetch = async (url, options) => {
  assert.equal(options.cache, "no-store");
  fetched.push(url);
  return { ok: true, text: async () => fs.readFileSync(new URL("../data/" + url.split("/").at(-1), import.meta.url), "utf8") };
};
context.cached = { data: { ...db, inputRevision: "outdated", players: [] } };
context.saved = (value) => { saved = value; };
context.crypto = (await import("node:crypto")).webcrypto;
vm.runInContext('getCachedFootballMindDatabase = async () => cached; saveFootballMindDatabaseToCache = async (value) => saved(value);', context);
const fresh = await vm.runInContext("loadGameDatabase()", context);
assert.equal(fetched.length, sourceFiles.length);
assert.ok(fetched.every((url) => !url.includes("game_database")));
assert.equal(fresh.version, data.VERSION);
assert.ok(saved.inputRevision && saved.inputRevision !== "outdated");
context.cached = { data: saved };
const reused = await vm.runInContext("loadGameDatabase()", context);
assert.equal(reused, saved);
console.log("OK: rangschikking, 30-resultatenlimiet, accenten, tussenvoegsels, naamgenoten, canonieke IDs, carrièrebehoud, indexen, herhaalbare rebuild, echte antwoordcontrole en cacheverversing.");
console.log(`Database-audit: ${report.passed} geslaagd, ${report.failed} ontbrekend.`);
