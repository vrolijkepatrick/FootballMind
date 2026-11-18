let activeDatabase = { version: 1, answerType: "player", players: [], categories: {} };
let sourceDatabase = null;
let resultPlayers = [];
let resultPage = 1;
const resultsPerPage = 30;
let editingPlayerId = null;
let databaseFileHandle = null;

const $ = (id) => document.getElementById(id);
const foldText = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();


async function connectDatabaseFile() {
  if (!("showOpenFilePicker" in window)) {
    writeLog("Automatisch opslaan wordt in deze browser niet ondersteund. Gebruik Chrome of Edge en open de importer via localhost.");
    return;
  }

  try {
    const [handle] = await window.showOpenFilePicker({
      multiple: false,
      types: [{
        description: "FootballMind database",
        accept: { "application/json": [".json"] }
      }]
    });

    databaseFileHandle = handle;
    const file = await handle.getFile();
    const loaded = JSON.parse(await file.text());

    activeDatabase = loaded;
    activeDatabase.players = playersFrom(activeDatabase).map(normalisePlayer);

    updateCount();
    $("databaseStatus").textContent = `${activeDatabase.players.length} spelers · database gekoppeld`;
    $("saveStatus").textContent = `Gekoppeld: ${file.name}`;
    writeLog("Database gekoppeld. Wijzigingen worden vanaf nu direct in dit bestand opgeslagen.");
    showResults(activeDatabase.players);
  } catch (error) {
    if (error && error.name === "AbortError") return;
    writeLog(`Database koppelen mislukt: ${error.message}`);
  }
}

async function saveDatabaseDirectly(message = "Database automatisch opgeslagen.") {
  try {
    await prepareDatabaseUpdate();
  } catch (error) {
    writeLog(`Database niet opgeslagen: ${error.message}`);
    return false;
  }
  if (!databaseFileHandle) {
    writeLog(`${message.replace("opgeslagen", "aangepast")} Koppel eerst FootballMind_database.json voor automatisch opslaan, of gebruik DOWNLOAD DATABASE.`);
    return false;
  }

  try {
    const permission = await databaseFileHandle.queryPermission({ mode: "readwrite" });
    if (permission !== "granted") {
      const requested = await databaseFileHandle.requestPermission({ mode: "readwrite" });
      if (requested !== "granted") {
        writeLog("Geen toestemming om de database te overschrijven.");
        return false;
      }
    }

    const writable = await databaseFileHandle.createWritable();
    await writable.write(JSON.stringify(activeDatabase, null, 2));
    await writable.close();

    $("saveStatus").textContent = "✓ Automatisch opgeslagen";
    writeLog(message);
    return true;
  } catch (error) {
    writeLog(`Automatisch opslaan mislukt: ${error.message}`);
    return false;
  }
}

async function prepareDatabaseUpdate() {
  const extras = await Promise.all(["FootballMind_legends.json", "FootballMind_career_corrections.json", "FootballMind_club_competitions.json"].map(async (name) => {
    const response = await fetch("../data/" + name, { cache: "no-store" });
    if (!response.ok) throw new Error("Bronbestand ontbreekt: " + name);
    return response.json();
  }));
  const rebuilt = FootballMindData.build(activeDatabase, ...extras);
  const report = FootballMindData.audit(rebuilt);
  writeLog(`Audit: ${report.passed} geslaagd, ${report.failed} ontbrekend. ${report.unmappedClubs.length} clubs zonder competitiekoppeling; ${report.ambiguousIdentities.length} aanvullingen zonder zekere identiteit.`);
  for (const check of report.checks) writeLog(`${check.ok ? "OK" : "ONTBREEKT"} ${check.label}`);
  if (report.failed) throw new Error("Los eerst de ontbrekende auditkoppelingen op.");
  activeDatabase = { ...activeDatabase, ...rebuilt };
  updateCount();
}

function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try { resolve(JSON.parse(reader.result)); }
      catch (error) { reject(new Error("Dit bestand bevat geen geldige JSON.")); }
    };
    reader.onerror = () => reject(new Error("Het bestand kon niet worden gelezen."));
    reader.readAsText(file, "utf-8");
  });
}

function playersFrom(data) { return Array.isArray(data) ? data : (data.players || []); }

function cleanList(values) {
  return [...new Set((values || []).map((value) => String(value).trim()).filter(Boolean))];
}

function normalisePlayer(player, index) {
  const name = String(player.name || player.naam || player.player || "").trim();
  return {
    id: String(player.id || player.player_id || `IMP${String(index).padStart(4, "0")}`),
    name,
    aliases: cleanList([...(player.aliases || []), name]),
    clubs: cleanList([...(player.clubs || []), ...(player.teams || [])]),
    internationalTeams: cleanList([...(player.internationalTeams || []), ...(player.nationalTeams || []), ...(player.internationals || [])]),
    awards: cleanList(player.awards),
    competitions: cleanList([...(player.competitions || []), ...(player.tournaments || [])]),
    legend: Boolean(player.legend)
  };
}

function merge() {
  if (!sourceDatabase) return writeLog("Kies eerst een bronbestand.");
  const players = new Map(activeDatabase.players.map((player) => [player.name.toLocaleLowerCase(), player]));
  playersFrom(sourceDatabase).map(normalisePlayer).forEach((incoming) => {
    if (!incoming.name) return;
    const key = incoming.name.toLocaleLowerCase();
    const old = players.get(key);
    if (!old) players.set(key, incoming);
    else {
      ["aliases", "clubs", "internationalTeams", "awards", "competitions"].forEach((field) => {
        old[field] = cleanList([...(old[field] || []), ...(incoming[field] || [])]);
      });
      old.legend = Boolean(old.legend || incoming.legend);
    }
  });
  activeDatabase = { ...activeDatabase, version: (activeDatabase.version || 1) + 1, players: [...players.values()] };
  updateCount();
  writeLog(`Import geslaagd. ${activeDatabase.players.length} spelers in de actieve database.`);
  showResults(activeDatabase.players);
}

function validate() {
  const counts = {};
  activeDatabase.players.forEach((player) => ["clubs", "internationalTeams", "awards", "competitions"].forEach((field) => (player[field] || []).forEach((value) => { counts[`${field}: ${value}`] = (counts[`${field}: ${value}`] || 0) + 1; })));
  const sparse = Object.entries(counts).filter(([, count]) => count < 2);
  writeLog(sparse.length ? `Controle klaar. ${sparse.length} categorieën hebben nog minder dan twee antwoorden.` : "Controle geslaagd: alle gebruikte categorieën hebben minimaal twee antwoorden.");
}

function commaList(id) {
  return cleanList($(id).value.split(","));
}

async function addPlayer() {
  const name = $("newName").value.trim();
  if (!name) return writeLog("Vul minimaal een spelersnaam in.");
  const fields = {
    name,
    aliases: [name],
    clubs: commaList("newClubs"),
    internationalTeams: commaList("newInternationals"),
    awards: commaList("newAwards"),
    competitions: commaList("newCompetitions")
  };
  if (editingPlayerId) {
    const player = activeDatabase.players.find((item) => item.id === editingPlayerId);
    if (!player) return writeLog("Deze speler kon niet meer worden gevonden.");
    Object.assign(player, fields);
    writeLog(`${name} aangepast. Klik op DOWNLOAD DATABASE om op te slaan.`);
    editingPlayerId = null;
    $("addPlayer").textContent = "SPELER TOEVOEGEN";
    $("cancelEdit").hidden = true;
  } else {
    if (activeDatabase.players.some((player) => player.name.toLocaleLowerCase() === name.toLocaleLowerCase())) return writeLog("Deze speler staat al in de database.");
    activeDatabase.players.push({ id: `MAN${String(activeDatabase.players.length + 1).padStart(4, "0")}`, ...fields });
    writeLog(`${name} toegevoegd. Klik op DOWNLOAD DATABASE om op te slaan.`);
  }
  updateCount();
  showResults(activeDatabase.players);
  ["newName", "newClubs", "newInternationals", "newAwards", "newCompetitions"].forEach((id) => { $(id).value = ""; });

  await saveDatabaseDirectly(`${name} opgeslagen in FootballMind_database.json.`);
}

function editPlayer(playerId) {
  const player = activeDatabase.players.find((item) => item.id === playerId);
  if (!player) return;
  editingPlayerId = player.id;
  $("newName").value = player.name || "";
  $("newClubs").value = (player.clubs || []).join(", ");
  $("newInternationals").value = (player.internationalTeams || []).join(", ");
  $("newAwards").value = (player.awards || []).join(", ");
  $("newCompetitions").value = (player.competitions || []).join(", ");
  $("addPlayer").textContent = "SPELER OPSLAAN";
  $("cancelEdit").hidden = false;
  $("newName").focus();
}


function listFromValue(id) {
  const element = $(id);
  return cleanList(element ? element.value.split(",") : []);
}

function findPlayerByNameOrAlias(name) {
  const key = foldText(name);
  return activeDatabase.players.find((player) =>
    foldText(player.name) === key ||
    (player.aliases || []).some((alias) => foldText(alias) === key)
  );
}

function clearLegendForm() {
  ["legendName", "legendAliases", "legendClubs", "legendInternationals"].forEach((id) => {
    if ($(id)) $(id).value = "";
  });
}

async function addOrUpdateLegend() {
  const name = $("legendName").value.trim();
  if (!name) return writeLog("Vul eerst de naam van de legend in.");

  const incoming = {
    name,
    aliases: cleanList([name, ...listFromValue("legendAliases")]),
    clubs: listFromValue("legendClubs"),
    internationalTeams: listFromValue("legendInternationals"),
    awards: [],
    competitions: [],
    legend: true
  };

  const existing = findPlayerByNameOrAlias(name);

  if (existing) {
    ["aliases", "clubs", "internationalTeams"].forEach((field) => {
      existing[field] = cleanList([...(existing[field] || []), ...(incoming[field] || [])]);
    });
    existing.legend = true;
    writeLog(`${existing.name} als legend aangevuld. Klik op DOWNLOAD DATABASE om op te slaan.`);
  } else {
    activeDatabase.players.push({
      id: `LEG${String(activeDatabase.players.length + 1).padStart(5, "0")}`,
      ...incoming
    });
    writeLog(`${name} als nieuwe legend toegevoegd. Klik op DOWNLOAD DATABASE om op te slaan.`);
  }

  activeDatabase.version = (activeDatabase.version || 1) + 1;
  updateCount();
  showResults(activeDatabase.players);
  clearLegendForm();

  await saveDatabaseDirectly(`${name} als legend opgeslagen in FootballMind_database.json.`);
}

async function loadActiveDatabase() {
  try {
    let response = await fetch("../data/FootballMind_database.json");
    if (!response.ok) response = await fetch("data/FootballMind_database.json");
    if (!response.ok) throw new Error("Database niet gevonden");
    activeDatabase = await response.json();
    activeDatabase.players = playersFrom(activeDatabase).map(normalisePlayer);
    updateCount();
    $("databaseStatus").textContent = `${activeDatabase.players.length} spelers automatisch geladen`;
    writeLog("Actieve database automatisch geladen.");
    showResults(activeDatabase.players);
  } catch (error) {
    $("databaseStatus").textContent = "Database niet gevonden";
    writeLog("Plaats FootballMind_database.json in de map data.");
  }
}

async function fetchApiPlayers() {
  const apiKey = $("apiKey").value.trim();
  const teamId = $("teamId").value.trim();
  const season = $("season").value.trim();
  if (!apiKey || !teamId || !season) return writeLog("Vul API-key, Team-ID en seizoen in.");
  writeLog("Spelers worden opgehaald. Dit kan even duren...");
  try {
    const imported = [];
    let totalPages = 1;
    const maxPagesFreePlan = 3;
    for (let page = 1; page <= totalPages; page += 1) {
      const url = `https://v3.football.api-sports.io/players?team=${encodeURIComponent(teamId)}&season=${encodeURIComponent(season)}&page=${page}`;
      const response = await fetch(url, { headers: { "x-apisports-key": apiKey } });
      const data = await response.json();
      if (!response.ok || data.errors && Object.keys(data.errors).length) throw new Error(JSON.stringify(data.errors || { status: response.status }));
      totalPages = Math.min(Number(data.paging?.total || 1), maxPagesFreePlan);
      (data.response || []).forEach((item) => imported.push({
        id: `API${item.player.id}`,
        name: item.player.name,
        aliases: [item.player.name, item.player.firstname, item.player.lastname].filter(Boolean),
        clubs: (item.statistics || []).map((stat) => stat.team && stat.team.name).filter(Boolean),
        nationalTeams: [],
        awards: [],
        competitions: (item.statistics || []).map((stat) => stat.league && stat.league.name).filter(Boolean),
        nationality: item.player.nationality || "",
        source: "API-Football"
      }));
      writeLog(`Pagina ${page} van ${totalPages} opgehaald (${imported.length} spelers)...`);
      if (page < totalPages) await new Promise((resolve) => setTimeout(resolve, 6500));
    }
    sourceDatabase = { players: imported };
    merge();
    writeLog(`${imported.length} spelers opgehaald en automatisch aan de actieve database toegevoegd. Klik op DOWNLOAD DATABASE om op te slaan.`);
  } catch (error) {
    writeLog(`API-fout: ${error.message}`);
  }
}

async function importTikiTakaDatabase() {
  writeLog("Startdatabase wordt opgehaald. Dit kan even duren...");
  try {
    const [playersResponse, categoriesResponse] = await Promise.all([
      fetch("https://cdn.playfootball.games/api/footy-tic-tac-toe/eu1/players.json"),
      fetch("https://cdn.playfootball.games/api/footy-tic-tac-toe/eu1/gameData.json")
    ]);
    if (!playersResponse.ok || !categoriesResponse.ok) throw new Error("De startdatabase kon niet worden opgehaald.");
    const playerData = await playersResponse.json();
    const categoryData = await categoriesResponse.json();
    const categories = new Map((categoryData.gameData?.categories || []).map((category) => [Number(category.id), category]));
    const imported = (playerData.players || []).map((player, index) => {
      const values = (player.v || []).map(Number).filter((id) => id > 0).map((id) => categories.get(id)).filter(Boolean);
      return {
        id: `TTT${String(index + 1).padStart(5, "0")}`,
        name: player.n,
        aliases: [player.n],
        clubs: values.filter((category) => category.type === 2).map((category) => category.name),
        nationalTeams: values.filter((category) => category.type === 1).map((category) => category.name),
        awards: values.filter((category) => category.type === 6 || category.type === 8).map((category) => category.name),
        competitions: values.filter((category) => category.type === 3).map((category) => category.name),
        source: "Tiki-Taka-Toe"
      };
    });
    sourceDatabase = { players: imported };
    merge();
    writeLog(`${imported.length} spelers uit de startdatabase toegevoegd. Klik op DOWNLOAD DATABASE om op te slaan.`);
  } catch (error) {
    writeLog(`Startdatabase-fout: ${error.message}`);
  }
}

function loadSavedApiKey() {
  const savedKey = localStorage.getItem("footballmind_api_key");
  if (savedKey) $("apiKey").value = savedKey;
}

function updateCount() { $("count").textContent = `${activeDatabase.players.length} spelers`; }
function writeLog(message) { $("log").textContent = message; }
function showResults(players) {
  resultPlayers = players;
  resultPage = 1;
  renderResults();
}

function renderResults() {
  const start = (resultPage - 1) * resultsPerPage;
  const visible = resultPlayers.slice(start, start + resultsPerPage);
  $("results").innerHTML = visible.map((p) => `<div class="result"><strong>${p.legend ? "⭐ " : ""}${p.name}</strong><button class="secondary edit-player" data-player-id="${p.id}">BEWERK</button><small>${(p.clubs || []).join(", ")} · ${(p.internationalTeams || []).join(", ")}</small></div>`).join("") || "<p>Geen spelers gevonden.</p>";
  $("results").querySelectorAll(".edit-player").forEach((button) => button.addEventListener("click", () => editPlayer(button.dataset.playerId)));
  const totalPages = Math.max(1, Math.ceil(resultPlayers.length / resultsPerPage));
  $("resultsPager").innerHTML = resultPlayers.length > resultsPerPage ? `<button class="secondary" data-page="${Math.max(1, resultPage - 1)}" ${resultPage === 1 ? "disabled" : ""}>VORIGE</button><span>Pagina ${resultPage} van ${totalPages}</span><button class="secondary" data-page="${Math.min(totalPages, resultPage + 1)}" ${resultPage === totalPages ? "disabled" : ""}>VOLGENDE</button>` : `<span>${resultPlayers.length} spelers zichtbaar</span>`;
  $("resultsPager").querySelectorAll("button[data-page]").forEach((button) => button.addEventListener("click", () => { resultPage = Number(button.dataset.page); renderResults(); }));
}

$("connectDatabase").addEventListener("click", connectDatabaseFile);
$("merge").addEventListener("click", merge);
$("seedImport").addEventListener("click", importTikiTakaDatabase);
$("validate").addEventListener("click", validate);
$("download").addEventListener("click", async () => { try { await prepareDatabaseUpdate(); } catch (error) { writeLog(error.message); return; } const blob = new Blob([JSON.stringify(activeDatabase, null, 2)], { type: "application/json" }); const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "FootballMind_database.json"; link.click(); URL.revokeObjectURL(link.href); });
$("addPlayer").addEventListener("click", addPlayer);
$("addLegend").addEventListener("click", addOrUpdateLegend);
$("cancelEdit").addEventListener("click", () => { editingPlayerId = null; $("addPlayer").textContent = "SPELER TOEVOEGEN"; $("cancelEdit").hidden = true; ["newName", "newClubs", "newInternationals", "newAwards", "newCompetitions"].forEach((id) => { $(id).value = ""; }); });
$("fetchApi").addEventListener("click", fetchApiPlayers);
$("apiKey").addEventListener("input", (event) => {
  localStorage.setItem("footballmind_api_key", event.target.value.trim());
});
$("clearApiKey").addEventListener("click", () => {
  localStorage.removeItem("footballmind_api_key");
  $("apiKey").value = "";
  writeLog("API-key lokaal verwijderd.");
});
$("search").addEventListener("input", (event) => { const query = foldText(event.target.value); showResults(activeDatabase.players.filter((p) => foldText(JSON.stringify(p)).includes(query))); });
updateCount();
loadActiveDatabase();
loadSavedApiKey();
