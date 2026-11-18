import fs from "node:fs";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { runRoutes } from "./answer_route_harness.mjs";
const require = createRequire(import.meta.url);
const data = require("../game/database.js");
const directory = new URL("../data/", import.meta.url);
const files = ["FootballMind_database.json", "FootballMind_legends.json", "FootballMind_career_corrections.json", "FootballMind_club_competitions.json"];
export async function rebuild() {
  const texts = files.map((file) => fs.readFileSync(new URL(file, directory), "utf8"));
  const database = data.build(...texts.map(JSON.parse));
  database.inputRevision = createHash("sha256").update(texts.join("\n")).digest("hex");
  const report = data.audit(database);
  fs.writeFileSync(new URL("FootballMind_audit.json", directory), JSON.stringify(report, null, 2) + "\n");
  fs.writeFileSync(new URL("FootballMind_player_audit.json", directory), JSON.stringify(report.playerAudits, null, 2) + "\n");
  fs.writeFileSync(new URL("FootballMind_player_audit.md", directory), [
    "# Audit van vijf spelers", "",
    `Databaseversie ${database.version}; normalisatie ${database.normalizationVersion}.`, "",
    "| Speler | Canonieke records | Geslaagd | Ontbrekend | Real Madrid + Nederland |",
    "| --- | ---: | ---: | ---: | --- |",
    ...report.playerAudits.map((r) => `| ${r.name} | ${r.recordCount} | ${r.passed} | ${r.failed} | ${r.realMadridNetherlands} |`), "",
    "Real Madrid + Nederland hoort alleen voor Sneijder true te zijn. De andere spelers worden ook getest op hun eigen club + Nederland: Ajax (Cruijff), Inter (Bergkamp), Liverpool (Van Dijk) en Lazio (Taylor).", "",
    "Centrale sleutels: Real Madrid / Real Madrid CF / Real Madrid Club de Fútbol → `real madrid`; Nederland / Netherlands / Holland → `nederland`.", "",
    ...report.playerAudits.flatMap((r) => [
      `## ${r.name}`, "", `ID: ${r.id}.`, "",
      `Carrièreclubs in de database: ${r.clubs.join(", ")}.`,
      `Nationaal team: ${r.internationalTeams.join(", ")}.`, "",
      ...r.checks.map((c) => `- ${c.ok ? "OK" : "ONTBREEKT"}: ${c.label}`), ""
    ]),
    "## Bronnen voor de ontbrekende carrièregegevens van Sneijder", "",
    "De bestaande bronrecords zijn aangevuld. Er is geen speleruitzondering aan de matching of correctielaag toegevoegd.", "",
    "- [Real Madrid: Sneijder, 2007–2009](https://www.realmadrid.com/es-ES/el-club/historia/leyendas-futbol/wesley-benjamin-sneijder)",
    "- [OGC Nice: spelersprofiel Sneijder](https://www.ogcnice.com/fr/fiche/1349/wesley-sneijder.html)",
    "- [UEFA: Nederland en Al-Gharafa](https://www.uefa.com/uefanationsleague/news/0253-0d821289f992-2e8f666fa91e-1000--wesley-sneijder-calls-time-on-netherlands-career/)", "",
    "De audit van vóór deze wijziging staat in FootballMind_player_audit_before.json. Globale datagaten buiten deze vijf spelers blijven zichtbaar in FootballMind_audit.json.", ""
  ].join("\n"));
  fs.writeFileSync(new URL("FootballMind_audit.md", directory), [
    "# FootballMind database-audit", "",
    `${database.playerCount.toLocaleString("nl-NL")} canonieke records. ${report.passed} controles geslaagd; ${report.failed} verplichte controles mislukt.`, "",
    ...report.checks.map((check) => `- ${check.ok ? "OK" : "ONTBREEKT"}: ${check.label}`), "",
    `Ontbrekende afgeleide koppelingen bij geconfigureerde clubs: ${report.missingLinks.length}.`,
    `Nog zonder centrale competitiekoppeling: ${report.unmappedClubs.length.toLocaleString("nl-NL")} verschillende clubnamen uit de volledige bron (inclusief jeugd- en amateurclubs).`,
    `Onzekere aanvullingen: ${report.ambiguousIdentities.length}; deze zijn overgeslagen om naamgenoten niet verkeerd samen te voegen.`, "",
    "Alle beschikbare carrièreclubs blijven behouden; volledigheid van de oorspronkelijke carrières is niet extern voor alle spelers gecontroleerd.", "",
    "De volledige lijsten staan in FootballMind_audit.json. Werkwijze: tools/DATABASE.md.", ""
  ].join("\n"));
  for (const check of report.checks) console.log(`${check.ok ? "OK" : "ONTBREEKT"} ${check.label}`);
  console.log(`${database.playerCount} spelers; ${report.passed} geslaagd; ${report.failed} mislukt; ${report.unmappedClubs.length} clubs zonder centrale competitiekoppeling; ${report.ambiguousIdentities.length} onzekere identiteiten.`);
  if (report.failed) throw new Error("Audit mislukt; de vorige game-database blijft behouden.");
  const routeReport = await runRoutes(database);
  fs.writeFileSync(new URL("FootballMind_answer_route_after.json", directory), JSON.stringify(routeReport, null, 2) + "\n");
  const routeFailures = [...routeReport.results, ...routeReport.nameVariants, routeReport.repeatedTaylor].filter((r) => r.result !== "GOED" || !r.boardShowsCorrect || !r.sameCanonicalObject);
  if (routeFailures.length || routeReport.negative.result !== "FOUT") throw new Error("Audit van de volledige antwoordroute mislukt; zie FootballMind_answer_route_after.json.");
  const uniqueProfiles = [...new Map(routeReport.results.map((r) => [r.selectedPlayerId, r])).values()];
  fs.writeFileSync(new URL("FootballMind_answer_route_audit.md", directory), [
    "# FootballMind — volledige antwoordroute", "",
    "## Reproduceerbare oorzaken", "",
    "1. De eerste vijf vereiste scenario's werkten al in een verse versie-4-database. Bij alleen Taylor kwam Kenneth Taylor op plaats 37 van 104 treffers en verdween hij buiten de 30 zichtbare resultaten. Dit was een zoek/selectieprobleem, geen fout in zijn Ajax/Serie A-koppeling.",
    "2. Met Kenneth Taylor als volledige zoeknaam slaagde de eerste plaatsing, maar een tweede geldige plaatsing werd afgewezen met 'Kenneth Taylor is al gebruikt'. Beide cluecontroles waren true. De openbare regels van het originele spel staan hergebruik op hetzelfde bord toe.",
    "3. Er was geen afzonderlijke landenindex. De antwoordroute bouwde bovendien een nieuw profiel uit de selectie, terwijl de audit het canonieke record controleerde. Dit gaf in de zes verse scenario's geen extra mismatch, maar is vervangen door één gedeelde ID-gebaseerde controle.", "",
    "[Openbare regels van PlayFootball.Games](https://cdn.playfootball.games/footy-tic-tac-toe/) — een speler mag meermaals op hetzelfde bord gebruikt worden. De onderliggende spelersdatabase van dat spel is niet beschikbaar in dit project; identieke dekking voor alle spelers kan daarom niet worden aangetoond.", "",
    "## Uitgevoerde route", "",
    "Zoekterm → echte renderPlayerSearchResults → zichtbare resultaatknop klikken → echte submitAnswer → centrale evaluateAnswer → echte renderBoard → controle op GOED, naam en speler-ID in het vak. Foto-opvragingen, timers en de decoratieve beurtweergave zijn uitgeschakeld. De DOM/event-adapter is een simulatie; dit is geen visuele browsertest.", "",
    "| Speler | Zoekterm | Clues | Resultaat | Canonieke ID |",
    "| --- | --- | --- | --- | --- |",
    ...routeReport.results.map((r) => `| ${r.canonicalPlayerName} | ${r.scenario.query} | ${r.scenario.row} + ${r.scenario.column} | ${r.result} | ${r.selectedPlayerId} |`), "",
    `Aanvullend: ${routeReport.nameVariants.length} volledige-naam/voornaamroutes geslaagd. Hergebruik van Taylor op een tweede leeg vak: ${routeReport.repeatedTaylor.result}. Bergkamp voor Real Madrid + Nederland: terecht ${routeReport.negative.result} (${routeReport.negative.debug?.reason}).`, "",
    "## Spelersgegevens", "",
    ...uniqueProfiles.flatMap((r) => [`### ${r.canonicalPlayerName}`, "", `ID: ${r.selectedPlayerId}.`,
      `Carrièreclubs: ${r.clubs.join(", ")}.`, `Nationaal team: ${r.internationalTeams.join(", ")}.`,
      `Competities: ${r.competitions.join(", ")}.`, `Aliassen: ${r.aliases.join(", ") || "geen"}.`,
      `Eerste-elftalclubs: ${r.firstTeamClubs?.length ? r.firstTeamClubs.join(", ") : "niet afzonderlijk bewezen in de bron"}.`, ""]),
    "## Centrale verwerking", "",
    "- Real Madrid, Real Madrid CF, Real Madrid Club de Fútbol → real madrid.",
    "- Nederland, Netherlands, Holland → nederland.",
    "- Internazionale, Inter → inter.",
    "- Ajax, Ajax Amsterdam → ajax.",
    "- Zoekvolgorde: volledige naam, exacte achternaam, begin achternaam, overige treffers. Bij gelijke naamovereenkomst telt centrale clubdekking mee; er is geen uitzondering voor een testspeler en bordclues bepalen de zoekvolgorde niet.",
    "- Maximaal 30 resultaten per pagina; Vorige/Volgende maakt overige resultaten bereikbaar.",
    "- De selectie draagt de speler-ID over. evaluateAnswer haalt uitsluitend het actuele canonieke record op; een oud selectie-object kan geen oude clubgegevens doorgeven.",
    "- playerLookup, nameLookup, cluePlayers, clubPlayers, countryPlayers en competitionPlayers zijn volledig opnieuw gebouwd. De runtime-maps gebruiken exact dezelfde objecten uit players.",
    `- Database/IndexedDB-versie: ${database.version}; normalisatie: ${database.normalizationVersion}; cachesleutel: game-database-v7.`,
    "- Oude databaseversies worden genegeerd; de IndexedDB-store wordt bij upgrade vervangen. Actuele bronbestanden worden met no-store opgehaald en op inhoud gehasht. Een cache met corrupte indexen wordt opnieuw opgebouwd. Oude localStorage-legendes en oude game-JSON worden niet ingelezen door de actieve laadroute.", "",
    "## Gewijzigde bestanden en functies", "",
    "- game/database.js: searchEntry, search, build, evaluateAnswer (nieuw), audit; eerste-elftalvelden met expliciete bronstatus; landen- en ID-index; centrale hergebruikregel.",
    "- game/script.js: renderPlayerSearchResults, openPlayerSearch, submitAnswer, hydratePrebuiltGameIndexes, loadGameDatabase; oude alternatieve netwerk-/legendesladers verwijderd.",
    "- data/FootballMind_club_competitions.json: rules.allowPlayerReuse en versie; geen wijziging van individuele spelerrecords.",
    "- game/index.html en Importer/index.html: assetversie 5.",
    "- tools/answer_route_harness.mjs en tools/audit_answer_route.mjs: volledige selecteer-/indien-/bordroute, naamvarianten, negatief scenario en canonieke selectie.",
    "- tools/build_database.mjs: voert bij iedere rebuild ook de volledige antwoordroute uit; schrijft pas bij succes de nieuwe game-database.",
    "- tools/audit_database.mjs, tools/audit_cache.mjs, tools/audit_full_database.mjs en tools/audit_game_rules.mjs: versie-, identiteit-, cache- en integratiecontroles.",
    "- tools/DATABASE.md: nieuwe structuur en opdrachten.",
    "- data/FootballMind_game_database.json en bijbehorende auditrapporten: opnieuw gegenereerd.", "",
    "## Diagnostiek en resterende beperking", "",
    "FootballMind_answer_route_before.json bevat de daadwerkelijk mislukte routes vóór de wijziging. FootballMind_answer_route_after.json bevat per scenario speler-ID, canonieke naam, genormaliseerde zoeknaam, clubs, landen, competities, beide matches, reden, indexen en versies. window.FootballMindLastAnswerDebug bevat dezelfde gegevens bij een echte indiening.",
    "Geen resterende blokkade voor de zes gevraagde scenario's. De bron bevat geen betrouwbare afzonderlijke eerste-elftaloptredens voor deze vijf spelers. Daarom blijven firstTeamClubs leeg met bronstatus 'niet afzonderlijk vastgelegd'; de bestaande carrièreclubs bepalen de spelgeldigheid. Er is geen bewijs toegevoegd dat niet in de bron staat.", ""
  ].join("\n"));
  console.log("Alle zes volledige UI-antwoordroutes, naamvarianten en hergebruik geslaagd.");
  const target = new URL("FootballMind_game_database.json", directory);
  const temporary = new URL("FootballMind_game_database.json.tmp", directory);
  fs.writeFileSync(temporary, JSON.stringify(database));
  fs.renameSync(temporary, target);
  return database;
}
await rebuild();
if (process.argv.includes("--watch")) {
  let timer;
  let pending = Promise.resolve();
  fs.watch(fileURLToPath(directory), (_, file) => {
    if (!files.includes(String(file))) return;
    clearTimeout(timer);
    timer = setTimeout(() => { pending = pending.then(rebuild).catch((error) => console.error(error)); }, 500);
  });
  console.log("Databasebewaking actief: elke bronwijziging bouwt alle indexen en voert de audit uit.");
}
