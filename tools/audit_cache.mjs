import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import { createHash, webcrypto } from "node:crypto";
const require = createRequire(import.meta.url);
const data = require("../game/database.js");
const script = fs.readFileSync(new URL("../game/script.js", import.meta.url), "utf8");
let stored, closed = 0, block = false;
const context = vm.createContext({ FootballMindData: data, console: { warn() {} }, window: {} });
context.indexedDB = { open(_, version) {
  assert.equal(version, 5);
  const request = { result: {
    close() { closed++; },
    transaction(_, mode) {
      assert.equal(mode, "readonly");
      return { objectStore() { return { get(key) {
        assert.equal(key, "game-database-v7");
        const read = { result: stored };
        queueMicrotask(() => read.onsuccess());
        return read;
      } }; } };
    }
  } };
  queueMicrotask(() => {
    if (block) request.onblocked();
    request.onsuccess();
  });
  return request;
} };
vm.runInContext(script.slice(0, script.indexOf('getElement("newGame").addEventListener')), context);
for (const old of [
  { version: 3, normalizationVersion: data.REVISION },
  { version: data.VERSION, normalizationVersion: "2026-09-careers-v3" }
]) {
  stored = { data: old, savedAt: Date.now() };
  assert.equal(await vm.runInContext("getCachedFootballMindDatabase()", context), null);
}
stored = { data: { version: data.VERSION, normalizationVersion: data.REVISION }, savedAt: Date.now() };
assert.equal(await vm.runInContext("getCachedFootballMindDatabase()", context), stored);
stored.savedAt = Date.now() - 31 * 24 * 60 * 60 * 1000;
assert.equal(await vm.runInContext("getCachedFootballMindDatabase()", context), null);
const connection = await vm.runInContext("openFootballMindCache()", context);
connection.onversionchange();
assert.equal(closed, 1);
block = true;
assert.equal(await vm.runInContext("getCachedFootballMindDatabase()", context), null);
assert.equal(closed, 2);
console.log("OK: oude versies, oude normalisatie en verlopen caches geweigerd; nieuwe cache geaccepteerd; versie-upgrade sluit verbinding; geblokkeerde upgrade valt terug op actuele bronnen.");

// Exercise the real loader with current-version caches whose derived indexes
// are wrong or missing, while keeping the source fixture small.
const built = JSON.parse(fs.readFileSync(new URL("../data/FootballMind_game_database.json", import.meta.url), "utf8"));
const names = ["Wesley Sneijder", "Johan Cruijff", "Dennis Bergkamp", "Virgil van Dijk", "Kenneth Taylor", "Frenkie de Jong"];
const source = { version: 1, players: built.players.filter((p) => names.includes(p.name)) };
const config = JSON.parse(fs.readFileSync(new URL("../data/FootballMind_club_competitions.json", import.meta.url), "utf8"));
const texts = [source, { players: [] }, { players: [] }, config].map((item) => JSON.stringify(item));
const files = ["FootballMind_database.json", "FootballMind_legends.json", "FootballMind_career_corrections.json", "FootballMind_club_competitions.json"];
const inputRevision = createHash("sha256").update(texts.join("\n")).digest("hex");
context.crypto = webcrypto; context.TextEncoder = TextEncoder;
context.console.table = () => {};
context.fetch = async (url, options) => {
  assert.equal(options.cache, "no-store");
  const index = files.indexOf(url.split("/").at(-1));
  assert.ok(index >= 0);
  return { ok: true, text: async () => texts[index] };
};
vm.runInContext("getCachedFootballMindDatabase = async () => ({data: brokenCache}); saveFootballMindDatabaseToCache = async (data) => {globalThis.savedData = data;};", context);
for (const corrupt of [
  (db) => { db.cluePlayers["serie a"] = []; },
  (db) => { delete db.nameLookup; }
]) {
  const broken = data.build(source, { players: [] }, { players: [] }, config);
  broken.inputRevision = inputRevision; corrupt(broken); context.brokenCache = broken;
  const repaired = await vm.runInContext("loadGameDatabase()", context);
  assert.notEqual(repaired, broken);
  assert.equal(data.audit(repaired).failed, 0);
  assert.equal(context.savedData, repaired);
}
console.log("OK: corrupte én ontbrekende indexen in een actuele cache worden vanuit de bronnen hersteld en opnieuw opgeslagen.");
