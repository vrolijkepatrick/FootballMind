import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const engine = require("../game/database.js");
export const scenarios = [
  { name: "Wesley Sneijder", query: "Sneijder", row: "Real Madrid", column: "Nederland" },
  { name: "Johan Cruijff", query: "Cruijff", row: "Ajax", column: "Nederland" },
  { name: "Dennis Bergkamp", query: "Bergkamp", row: "Arsenal", column: "Nederland" },
  { name: "Virgil van Dijk", query: "van Dijk", row: "Liverpool", column: "Nederland" },
  { name: "Kenneth Taylor", query: "Kenneth Taylor", row: "Ajax", column: "Serie A" },
  { name: "Kenneth Taylor", query: "Taylor", row: "Lazio", column: "Nederland" }
];

// Minimal event/DOM adapter. Search rendering, result click callbacks, submitAnswer,
// clue validation, turn switching, winning checks and board rendering are real code.
class Element {
  constructor(tag = "div") {
    this.tagName = tag; this.children = []; this.listeners = {}; this.style = {}; this.dataset = {}; this.value = ""; this.textContent = "";
    this.classList = { add() {}, remove() {}, toggle() {} };
  }
  set innerHTML(value) { this.html = value; this.children = []; }
  get innerHTML() { return this.html || ""; }
  appendChild(child) { this.children.push(child); return child; }
  addEventListener(type, listener) { (this.listeners[type] ||= []).push(listener); }
  async dispatch(type, event = {}) { for (const listener of this.listeners[type] || []) await listener(event); }
  async click() { await this.dispatch("click"); }
  insertAdjacentHTML(_, html) { this.html = this.innerHTML + html; }
  querySelectorAll() { return []; }
  setAttribute() {}
  focus() {}
}

export function createHarness(database) {
  const nodes = new Map(["playerSearchModal", "fmPlayerSearchInput", "fmPlayerResults", "fmPlayerSearchPages", "fmPlayerFeedback", "fmPlayerMatchup", "board", "filled", "message"].map((id) => [id, new Element()]));
  const context = vm.createContext({ FootballMindData: engine, database, console: { log() {}, table() {}, warn() {}, error() {} },
    window: { setTimeout() {} }, setTimeout() {}, TextEncoder,
    document: { getElementById: (id) => nodes.get(id) || null, createElement: (tag) => new Element(tag), querySelector: () => null }
  });
  const script = fs.readFileSync(new URL("../game/script.js", import.meta.url), "utf8");
  vm.runInContext(script.slice(0, script.indexOf('getElement("newGame").addEventListener')), context);
  vm.runInContext(`
    state.database = database; hydratePrebuiltGameIndexes(database);
    updateTurnUI = () => {}; hydratePlayerPhoto = () => {}; resolvePlayerPhoto = async () => "";
    const originalSubmit = submitAnswer;
    submitAnswer = async (...args) => { globalThis.submittedSelection = args[0]; const result = await originalSubmit(...args); globalThis.lastSubmission = result; return result; };
    document.getElementById("fmPlayerSearchInput").addEventListener("input", renderPlayerSearchResults);
  `, context);
  function reset(rows = [], columns = []) {
    context.rows = rows; context.columns = columns;
    vm.runInContext(`state.rows = rows; state.columns = columns; state.answers = {}; state.usedPlayerNames = new Set(); state.matchStarted = true; state.gameOver = false; state.currentPlayer = 1; state.winningLine = []; state.selected = null;`, context);
  }
  async function run(spec, { resetBoard = true, cell = "0-0" } = {}) {
    context.submittedSelection = null;
    context.lastSubmission = null;
    context.window.FootballMindLastAnswerDebug = null;
    if (resetBoard) reset([spec.row], [spec.column]);
    context.cell = cell;
    vm.runInContext("openPlayerSearch(cell)", context);
    const input = nodes.get("fmPlayerSearchInput"); input.value = spec.query;
    await input.dispatch("input");
    let results = nodes.get("fmPlayerResults").children;
    const findButton = () => results.find((element) => element.children.some((child) => child.textContent === spec.name));
    let button = findButton(), pagesVisited = 1;
    while (!button && pagesVisited < 100) {
      const next = nodes.get("fmPlayerSearchPages").children.find((child) => child.textContent === "Volgende" && !child.disabled);
      if (!next) break;
      await next.click(); pagesVisited++;
      results = nodes.get("fmPlayerResults").children;
      button = findButton();
    }
    let error = null;
    try { if (button) await button.click(); else error = "Speler ontbreekt in de zichtbare zoekresultaten"; } catch (e) { error = e.stack; }
    const player = context.submittedSelection && typeof context.submittedSelection === "object" ? context.submittedSelection : database.players.find((p) => p.id === context.submittedSelection);
    context.selectedPlayer = player;
    const answer = vm.runInContext("state.answers[cell] || null", context);
    const first = player ? engine.playerMatchesClue(player, spec.row, database.clueAliases) : false;
    const second = player ? engine.playerMatchesClue(player, spec.column, database.clueAliases) : false;
    const key = (v) => engine.clueKey(v, database.clueAliases);
    const index = database.players.indexOf(player);
    const trace = {
      scenario: spec, selectedPlayerId: player?.id || null, canonicalPlayerName: player?.name || null,
      normalizedSearchName: engine.norm(spec.query), normalizedAnswerName: engine.norm(player?.name),
      clubs: player?.clubs || [], firstTeamClubs: player?.firstTeamClubs ?? null,
      firstTeamEvidence: player?.firstTeamClubsSource || "Niet afzonderlijk vastgelegd in de bron",
      internationalTeams: player?.internationalTeams || [], competitions: player?.competitions || [], aliases: player?.aliases || [],
      normalizedClues: [key(spec.row), key(spec.column)], playerMatchesClue: [first, second],
      sameCanonicalObject: Boolean(player && database.players[index] === player && (!context.lastSubmission?.player || context.lastSubmission.player === player)),
      usedIndex: { playerIndex: index, nameLookup: database.nameLookup[engine.norm(player?.name)] || [],
        cluePlayers: [spec.row, spec.column].map((clue) => ({ key: key(clue), containsPlayer: database.cluePlayers[key(clue)]?.includes(index) || false })),
        countryPlayers: database.countryPlayers?.nederland?.includes(index) ?? null },
      versions: { database: database.version, normalization: database.normalizationVersion, cache: vm.runInContext("FOOTBALLMIND_DB_CACHE.version", context), cacheKey: vm.runInContext("FOOTBALLMIND_DB_CACHE.key", context), inputRevision: database.inputRevision || null },
      result: answer?.playerId === player?.id && Boolean(answer) ? "GOED" : "FOUT",
      reason: error || (answer ? null : nodes.get("message").textContent),
      cell: answer, boardShowsCorrect: Boolean(answer && nodes.get("board").innerHTML.includes("fm-correct-label\">GOED") && nodes.get("board").innerHTML.includes(spec.name)),
      visibleResults: results.length,
      pagesVisited,
      debug: context.window.FootballMindLastAnswerDebug || null
    };
    return trace;
  }
  return { context, reset, run, nodes };
}

export async function runRoutes(database) {
  const harness = createHarness(database);
  const results = [];
  for (const spec of scenarios) results.push(await harness.run(spec));
  harness.reset(["Ajax", "Lazio"], ["Serie A", "Nederland"]);
  const firstTaylor = await harness.run(scenarios[4], { resetBoard: false, cell: "0-0" });
  const repeatedTaylor = await harness.run({ ...scenarios[5], query: "Kenneth Taylor" }, { resetBoard: false, cell: "1-1" });
  const nameVariants = [];
  for (const spec of scenarios) for (const query of [spec.name, spec.name.split(" ")[0]]) nameVariants.push(await harness.run({ ...spec, query }));
  const negative = await harness.run({ name: "Dennis Bergkamp", query: "Bergkamp", row: "Real Madrid", column: "Nederland" });
  return { results, firstTaylor, repeatedTaylor, nameVariants, negative };
}
