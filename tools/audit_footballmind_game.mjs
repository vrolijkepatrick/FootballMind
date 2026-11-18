import fs from "node:fs";
import vm from "node:vm";

const scriptPath = "/workspace/scratch/671492226452/latest/FootballMind_VAN_BASTEN_BALLON_FIX_script.txt";
const legendsPath = "/workspace/scratch/671492226452/build/data/FootballMind_legends.json";
const source = fs.readFileSync(scriptPath, "utf8");
const external = JSON.parse(fs.readFileSync(legendsPath, "utf8")).players;

function normalise(value) {
  return String(value || "")
    .toLocaleLowerCase("nl-NL")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function literalBetween(startToken, endToken) {
  const start = source.indexOf(startToken);
  const end = source.indexOf(endToken, start + startToken.length);
  if (start < 0 || end < 0) throw new Error(`Codeblok niet gevonden: ${startToken}`);
  return source.slice(start + startToken.length, end).trim();
}

const awardMap = vm.runInNewContext(`(${literalBetween(
  "const FOOTBALLMIND_PLAYER_AWARDS =",
  ";\n\nconst FOOTBALLMIND_CHAMPIONS_LEAGUE_WINNERS"
)})`);

const champions = new Set(
  vm.runInNewContext(`[${literalBetween(
    "const FOOTBALLMIND_CHAMPIONS_LEAGUE_WINNERS = new Set([",
    "].map(normalise));"
  )}]`).map(normalise)
);

const hardcoded = vm.runInNewContext(literalBetween(
  "const LEGEND_PLAYERS =",
  ";\n\nfunction mergeUniqueValues"
));

const careerFixes = vm.runInNewContext(literalBetween(
  "const FOOTBALLMIND_PLAYER_CAREER_FIXES =",
  ";\n\nfunction applyCareerFixesToDatabase"
));

const clubAliases = new Map([
  ["rangers fc", "rangers"],
  ["glasgow rangers", "rangers"],
  ["glasgow rangers fc", "rangers"],
  ["inter milan", "inter"],
  ["internazionale", "inter"],
  ["internazionale milano", "inter"],
  ["bayern munich", "bayern munchen"],
  ["fc bayern munchen", "bayern munchen"]
]);

function clueKey(value) {
  const key = normalise(value);
  return clubAliases.get(key) || key;
}

function addUnique(target, values) {
  for (const value of values || []) {
    if (!target.some((item) => normalise(item) === normalise(value))) target.push(value);
  }
}

const players = new Map();
for (const raw of [...hardcoded, ...external, ...careerFixes]) {
  const key = normalise(raw.name);
  const player = players.get(key) || {
    name: raw.name,
    aliases: [],
    clubs: [],
    internationalTeams: [],
    awards: [],
    competitions: []
  };
  for (const field of ["aliases", "clubs", "internationalTeams", "awards", "competitions"]) {
    addUnique(player[field], raw[field]);
  }
  addUnique(player.awards, awardMap[key]);
  if (champions.has(key)) addUnique(player.awards, ["Champions League winnaar"]);
  players.set(key, player);
}

function matches(player, clue) {
  return ["clubs", "internationalTeams", "awards", "competitions"].some((field) =>
    player[field].some((value) => clueKey(value) === clueKey(clue))
  );
}

const tests = [
  ["Denzel Dumfries", "Inter", "Nederland"],
  ["Denzel Dumfries", "Inter Milan", "Nederland"],
  ["Fernando Ricksen", "Glasgow Rangers", "Nederland"],
  ["Dennis Bergkamp", "Internazionale", "Topscorer Eredivisie"],
  ["Johan Cruijff", "Ajax", "Champions League winnaar"],
  ["Thierry Henry", "Arsenal", "Champions League winnaar"],
  ["Javier Zanetti", "Inter", "Champions League winnaar"],
  ["Andriy Shevchenko", "AC Milan", "Topscorer Serie A"],
  ["Cristiano Ronaldo", "Manchester United", "Topscorer Premier League"]
  , ["Marouane Fellaini", "Manchester United", "België"]
  , ["Marouane Fallaini", "Manchester United", "België"]
  , ["Marc Overmars", "Arsenal", "Nederland"]
  , ["Renato Sanches", "Bayern Munich", "Portugal"]
  , ["Renato Sanchez", "FC Bayern München", "Portugal"]
];

let failed = 0;
for (const [name, row, column] of tests) {
  const nameKey = normalise(name);
  const player = players.get(nameKey) || [...players.values()].find((candidate) =>
    candidate.aliases.some((alias) => normalise(alias) === nameKey)
  );
  const ok = Boolean(player && matches(player, row) && matches(player, column));
  console.log(`${ok ? "OK" : "FOUT"}  ${name} — ${row} × ${column}`);
  if (!ok) failed += 1;
}

if (failed) {
  console.error(`\n${failed} automatische speltest(s) mislukt.`);
  process.exit(1);
}

console.log(`\nAlle ${tests.length} automatische speltests zijn geslaagd.`);
