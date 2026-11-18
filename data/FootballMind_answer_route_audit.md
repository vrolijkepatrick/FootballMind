# FootballMind — volledige antwoordroute

## Reproduceerbare oorzaken

1. De eerste vijf vereiste scenario's werkten al in een verse versie-4-database. Bij alleen Taylor kwam Kenneth Taylor op plaats 37 van 104 treffers en verdween hij buiten de 30 zichtbare resultaten. Dit was een zoek/selectieprobleem, geen fout in zijn Ajax/Serie A-koppeling.
2. Met Kenneth Taylor als volledige zoeknaam slaagde de eerste plaatsing, maar een tweede geldige plaatsing werd afgewezen met 'Kenneth Taylor is al gebruikt'. Beide cluecontroles waren true. De openbare regels van het originele spel staan hergebruik op hetzelfde bord toe.
3. Er was geen afzonderlijke landenindex. De antwoordroute bouwde bovendien een nieuw profiel uit de selectie, terwijl de audit het canonieke record controleerde. Dit gaf in de zes verse scenario's geen extra mismatch, maar is vervangen door één gedeelde ID-gebaseerde controle.

[Openbare regels van PlayFootball.Games](https://cdn.playfootball.games/footy-tic-tac-toe/) — een speler mag meermaals op hetzelfde bord gebruikt worden. De onderliggende spelersdatabase van dat spel is niet beschikbaar in dit project; identieke dekking voor alle spelers kan daarom niet worden aangetoond.

## Uitgevoerde route

Zoekterm → echte renderPlayerSearchResults → zichtbare resultaatknop klikken → echte submitAnswer → centrale evaluateAnswer → echte renderBoard → controle op GOED, naam en speler-ID in het vak. Foto-opvragingen, timers en de decoratieve beurtweergave zijn uitgeschakeld. De DOM/event-adapter is een simulatie; dit is geen visuele browsertest.

| Speler | Zoekterm | Clues | Resultaat | Canonieke ID |
| --- | --- | --- | --- | --- |
| Wesley Sneijder | Sneijder | Real Madrid + Nederland | GOED | LEGEND-WESLEY-SNEIJDER |
| Johan Cruijff | Cruijff | Ajax + Nederland | GOED | LEGACY-CRUIJFF |
| Dennis Bergkamp | Bergkamp | Arsenal + Nederland | GOED | LEGEND-DENNIS-BERGKAMP |
| Virgil van Dijk | van Dijk | Liverpool + Nederland | GOED | TM139208 |
| Kenneth Taylor | Kenneth Taylor | Ajax + Serie A | GOED | TM470394 |
| Kenneth Taylor | Taylor | Lazio + Nederland | GOED | TM470394 |

Aanvullend: 12 volledige-naam/voornaamroutes geslaagd. Hergebruik van Taylor op een tweede leeg vak: GOED. Bergkamp voor Real Madrid + Nederland: terecht FOUT (row_mismatch).

## Spelersgegevens

### Wesley Sneijder

ID: LEGEND-WESLEY-SNEIJDER.
Carrièreclubs: Ajax, Inter, Galatasaray, Real Madrid, OGC Nice, Al-Gharafa.
Nationaal team: Nederland.
Competities: Eredivisie, Serie A, Süper Lig, La Liga, Ligue 1.
Aliassen: geen.
Eerste-elftalclubs: niet afzonderlijk bewezen in de bron.

### Johan Cruijff

ID: LEGACY-CRUIJFF.
Carrièreclubs: Ajax, Barcelona, Feyenoord, Los Angeles Aztecs, Washington Diplomats, Levante.
Nationaal team: Nederland.
Competities: Eredivisie, La Liga, North American Soccer League.
Aliassen: Johan Cruyff.
Eerste-elftalclubs: niet afzonderlijk bewezen in de bron.

### Dennis Bergkamp

ID: LEGEND-DENNIS-BERGKAMP.
Carrièreclubs: Ajax, Arsenal, Inter.
Nationaal team: Nederland.
Competities: Eredivisie, Premier League, Serie A.
Aliassen: geen.
Eerste-elftalclubs: niet afzonderlijk bewezen in de bron.

### Virgil van Dijk

ID: TM139208.
Carrièreclubs: Celtic, FC Groningen, Liverpool, Southampton, WDS '19 Jeugd.
Nationaal team: Nederland.
Competities: Championship, Eredivisie, Premier League, Scottish Premiership, U21 Division 1 Fall.
Aliassen: geen.
Eerste-elftalclubs: niet afzonderlijk bewezen in de bron.

### Kenneth Taylor

ID: TM470394.
Carrièreclubs: Ajax, Lazio.
Nationaal team: Nederland.
Competities: Eredivisie, Keuken Kampioen Divisie, Serie A.
Aliassen: Kenneth Ina Dorothea Taylor.
Eerste-elftalclubs: niet afzonderlijk bewezen in de bron.

## Centrale verwerking

- Real Madrid, Real Madrid CF, Real Madrid Club de Fútbol → real madrid.
- Nederland, Netherlands, Holland → nederland.
- Internazionale, Inter → inter.
- Ajax, Ajax Amsterdam → ajax.
- Zoekvolgorde: volledige naam, exacte achternaam, begin achternaam, overige treffers. Bij gelijke naamovereenkomst telt centrale clubdekking mee; er is geen uitzondering voor een testspeler en bordclues bepalen de zoekvolgorde niet.
- Maximaal 30 resultaten per pagina; Vorige/Volgende maakt overige resultaten bereikbaar.
- De selectie draagt de speler-ID over. evaluateAnswer haalt uitsluitend het actuele canonieke record op; een oud selectie-object kan geen oude clubgegevens doorgeven.
- playerLookup, nameLookup, cluePlayers, clubPlayers, countryPlayers en competitionPlayers zijn volledig opnieuw gebouwd. De runtime-maps gebruiken exact dezelfde objecten uit players.
- Database/IndexedDB-versie: 5; normalisatie: 2026-11-player-identity-v2; cachesleutel: game-database-v7.
- Oude databaseversies worden genegeerd; de IndexedDB-store wordt bij upgrade vervangen. Actuele bronbestanden worden met no-store opgehaald en op inhoud gehasht. Een cache met corrupte indexen wordt opnieuw opgebouwd. Oude localStorage-legendes en oude game-JSON worden niet ingelezen door de actieve laadroute.

## Gewijzigde bestanden en functies

- game/database.js: searchEntry, search, build, evaluateAnswer (nieuw), audit; eerste-elftalvelden met expliciete bronstatus; landen- en ID-index; centrale hergebruikregel.
- game/script.js: renderPlayerSearchResults, openPlayerSearch, submitAnswer, hydratePrebuiltGameIndexes, loadGameDatabase; oude alternatieve netwerk-/legendesladers verwijderd.
- data/FootballMind_club_competitions.json: rules.allowPlayerReuse en versie; geen wijziging van individuele spelerrecords.
- game/index.html en Importer/index.html: assetversie 5.
- tools/answer_route_harness.mjs en tools/audit_answer_route.mjs: volledige selecteer-/indien-/bordroute, naamvarianten, negatief scenario en canonieke selectie.
- tools/build_database.mjs: voert bij iedere rebuild ook de volledige antwoordroute uit; schrijft pas bij succes de nieuwe game-database.
- tools/audit_database.mjs, tools/audit_cache.mjs, tools/audit_full_database.mjs en tools/audit_game_rules.mjs: versie-, identiteit-, cache- en integratiecontroles.
- tools/DATABASE.md: nieuwe structuur en opdrachten.
- data/FootballMind_game_database.json en bijbehorende auditrapporten: opnieuw gegenereerd.

## Diagnostiek en resterende beperking

FootballMind_answer_route_before.json bevat de daadwerkelijk mislukte routes vóór de wijziging. FootballMind_answer_route_after.json bevat per scenario speler-ID, canonieke naam, genormaliseerde zoeknaam, clubs, landen, competities, beide matches, reden, indexen en versies. window.FootballMindLastAnswerDebug bevat dezelfde gegevens bij een echte indiening.
Geen resterende blokkade voor de zes gevraagde scenario's. De bron bevat geen betrouwbare afzonderlijke eerste-elftaloptredens voor deze vijf spelers. Daarom blijven firstTeamClubs leeg met bronstatus 'niet afzonderlijk vastgelegd'; de bestaande carrièreclubs bepalen de spelgeldigheid. Er is geen bewijs toegevoegd dat niet in de bron staat.
