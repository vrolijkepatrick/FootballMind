import fs from "node:fs";

const databasePath = process.argv[2] ||
  new URL("../data/FootballMind_game_database.json", import.meta.url);
const database = JSON.parse(fs.readFileSync(databasePath, "utf8"));
const players = database.players || [];

function normalise(value) {
  return String(value || "")
    .toLocaleLowerCase("nl-NL")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const clueAliases = new Map([
  ["inter milan", "inter"], ["internazionale", "inter"],
  ["man utd", "manchester united"], ["manchester utd", "manchester united"],
  ["man city", "manchester city"],
  ["rangers fc", "rangers"], ["glasgow rangers", "rangers"],
  ["bayern munich", "bayern munchen"], ["fc bayern munchen", "bayern munchen"]
]);

function clueKey(value) {
  const key = normalise(value);
  return clueAliases.get(key) || key;
}

function findPlayer(name) {
  const key = normalise(name);
  return players.find((player) =>
    [player.name, ...(player.aliases || [])].some((value) => normalise(value) === key)
  );
}

function matches(player, clue) {
  return ["clubs", "internationalTeams", "awards", "competitions"].some((field) =>
    (player[field] || []).some((value) => clueKey(value) === clueKey(clue))
  );
}

const structuralTests = [
  ["databaseversie is 5", database.version === 5],
  ["legendes zijn ingebouwd", database.legendsIntegrated === true],
  ["geen technische nummers achter spelersnamen", !players.some((p) => /\s\(\d+\)$/.test(p.name || ""))],
  ["geen samengeplakte dubbele nationaliteiten", !players.some((p) =>
    (p.internationalTeams || []).some((country) => /\s{2,}/.test(country))
  )],
  ["vooraf gebouwde naamindex aanwezig", Object.keys(database.nameLookup || {}).length > 10000],
  ["vooraf gebouwde aanwijzingenindex aanwezig", Object.keys(database.cluePlayers || {}).length >= 25]
];

const playerTests = [
  ["Denzel Dumfries", "Inter", "Nederland"],
  ["Marouane Fellaini", "Manchester United", "België"],
  ["Fernando Ricksen", "Rangers", "Nederland"],
  ["Dennis Bergkamp", "Inter", "Topscorer Eredivisie"],
  ["Ruud Geels", "Ajax", "Topscorer Eredivisie"],
  ["Mateja Kežman", "PSV", "Topscorer Eredivisie"],
  ["Luca Toni", "Bayern München", "Topscorer Serie A"],
  ["Grafite", "Brazilië", "Topscorer Bundesliga"],
  ["Sonny Anderson", "Brazilië", "Topscorer Ligue 1"],
  ["Marc Overmars", "Arsenal", "Nederland"],
  ["Renato Sanches", "Bayern München", "Portugal"]
];

let failed = 0;
for (const [label, ok] of structuralTests) {
  console.log(`${ok ? "OK" : "FOUT"}  ${label}`);
  if (!ok) failed += 1;
}

for (const [name, clueA, clueB] of playerTests) {
  const player = findPlayer(name);
  const ok = Boolean(player && matches(player, clueA) && matches(player, clueB));
  console.log(`${ok ? "OK" : "FOUT"}  ${name} — ${clueA} × ${clueB}`);
  if (!ok) failed += 1;
}

const clubChecks = [
  "Ajax", "PSV", "Feyenoord", "Barcelona", "Real Madrid", "Manchester United",
  "Manchester City", "Liverpool", "Arsenal", "Chelsea", "Bayern München",
  "Juventus", "AC Milan", "Inter", "Paris Saint-Germain", "Rangers"
];
for (const club of clubChecks) {
  const count = (database.cluePlayers || {})[normalise(club)]?.length || 0;
  const ok = count >= 20;
  console.log(`${ok ? "OK" : "FOUT"}  clubdekking ${club}: ${count} spelers`);
  if (!ok) failed += 1;
}

console.log(`\nGame-database: ${players.length.toLocaleString("nl-NL")} spelers.`);
if (failed) {
  console.error(`${failed} volledige-databasecontrole(s) mislukt.`);
  process.exit(1);
}
console.log("Alle volledige-databasecontroles zijn geslaagd.");
