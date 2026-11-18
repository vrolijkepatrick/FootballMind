# Spelersdatabase bijwerken

De game en de bouwer gebruiken dezelfde opbouw in `game/database.js`.

Bronbestanden:

- `data/FootballMind_database.json`: geïmporteerde spelers en carrièreclubs.
- `data/FootballMind_legends.json`: historische aanvullingen.
- `data/FootballMind_career_corrections.json`: blijvende, gecontroleerde aanvullingen, waaronder Kenneth Taylor → Ajax en Lazio. Deze laag blijft bestaan wanneer een import wordt vervangen.
- `data/FootballMind_club_competitions.json`: centrale clubnamen, aliassen en club-competitiekoppelingen.

Voer vanuit de projectmap `node tools/build_database.mjs` uit. Dit bouwt `playerLookup`, `nameLookup`, `cluePlayers`, `clubPlayers`, `countryPlayers` en `competitionPlayers` volledig opnieuw en schrijft `data/FootballMind_audit.json`. Bij een mislukte verplichte controle wordt de bestaande game-database niet vervangen. De bestaande Python-startknop gebruikt dezelfde bouwer; Node.js moet beschikbaar zijn.

Met `node tools/build_database.mjs --watch` wordt na elke wijziging in een bronbestand opnieuw gebouwd en geaudit. De importer bouwt en audit ook vóór opslaan of downloaden. Voor regressiecontroles: `node tools/audit_database.mjs`. Cacheversies, verlopen data en een door oude tabs geblokkeerde upgrade worden gecontroleerd met `node tools/audit_cache.mjs`.

De game leest bij het laden alle vier actuele bronbestanden met `no-store`. Alleen wanneer hun gezamenlijke SHA-256, databaseversie 5 en normalisatieversie gelijk blijven, wordt de database uit IndexedDB hergebruikt. Anders worden alle indexen opnieuw opgebouwd en geaudit. Daardoor kost starten een nieuwe broncontrole (circa 49 MB voor de hoofdbron), maar kan een oud gegenereerd bestand niet meer blijven hangen. Oude IndexedDB-inhoud wordt bij de versie-upgrade verwijderd; oude spelers-/legendesgegevens uit localStorage worden niet ingelezen. Persoonlijke spelinstellingen blijven behouden. Als een oude tab de upgrade blokkeert, wordt de cache overgeslagen en werkt de game met opnieuw opgebouwde indexen uit de actuele bronnen.

`FootballMindData.canonicalValue`, `clueKey` en `playerMatchesClue` verzorgen dezelfde normalisatie in bouwer, importer, audits en spel. Centrale aliassen staan uitsluitend in de clubconfiguratie; Real Madrid, Real Madrid CF en Real Madrid Club de Fútbol krijgen sleutel `real madrid`, en Nederland, Netherlands en Holland krijgen sleutel `nederland`. De audit van Cruijff, Bergkamp, Van Dijk, Taylor en Sneijder draait bij elke rebuild; de leesbare uitkomst staat in `data/FootballMind_player_audit.md`. De ontbrekende carrièreclubs van Sneijder zijn in zijn bestaande bronrecords aangevuld, met bronverwijzingen; er is geen nieuwe spelerfix toegevoegd.

Er geldt één canoniek record per bekend speler-ID. Records met hetzelfde ID worden samengevoegd; naamgenoten met verschillende bron-IDs blijven afzonderlijk. Aanvullingen zonder ID worden alleen gekoppeld wanneer naam, land en clubgegevens één kandidaat opleveren. Onzekere aanvullingen worden overgeslagen en expliciet in de audit gemeld. Hun gegevens moeten eerst van een gecontroleerd speler-ID worden voorzien. De volledige spelersnaam blijft behouden bij kiezen en antwoorden.

Alle beschikbare carrièreclubs blijven bewaard, ook buiten de bordselectie. Dit kan ontbrekende brongegevens niet reconstrueren. De club-competitiekoppeling is een centrale spelregel: een carrièreclub telt voor de opgegeven competitie, ongeacht het seizoen. Het is geen bewijs dat die speler zelf in een bepaald seizoen competitiewedstrijden speelde. Clubs zonder mapping blijven behouden en worden in het auditrapport vermeld; er wordt geen competitie gegokt.

De audit onderscheidt verplichte ontbrekende koppelingen (`failed`/`missingLinks`), clubs zonder mapping (`unmappedClubs`) en onzekere identiteiten (`ambiguousIdentities`). De bestaande bron bevat ook eerdere, onterecht over naamgenoten verspreide clubs; die kunnen niet betrouwbaar op basis van alleen de naam worden hersteld.

De interface en audit gebruiken dezelfde `evaluateAnswer`-functie. Een geselecteerde ID wordt uitsluitend via `playerLookup` naar het actuele canonieke record teruggeleid. De uitkomst bevat beide cluecontroles, indexlidmaatschappen en een reden-code. `window.FootballMindLastAnswerDebug` bevat de laatst gebruikte waarden en versies.

De zoekvolgorde blijft volledige naam, exacte achternaam, begin achternaam, overige treffers. Bij gelijkwaardige naamtreffers krijgt een speler met meer carrièreclubs uit de centrale competitiekoppeling voorrang; bordclues worden niet gebruikt voor deze rangschikking. Er zijn maximaal 30 spelers per pagina, met Vorige/Volgende zodat verdere treffers bereikbaar blijven.

`rules.allowPlayerReuse` staat centraal op `true`, overeenkomstig de openbare regels van PlayFootball.Games. Dezelfde speler mag daardoor in verschillende lege vakken passen. Bestaande vakken en afgelopen wedstrijden blijven geblokkeerd. Een oude cache die wel de juiste versie maar corrupte indexen bevat wordt bij de audit afgekeurd en opnieuw opgebouwd.

`firstTeamClubs` wordt alleen gevuld uit expliciete bronvelden (`firstTeamClubs` of `seniorClubs`). De bestaande carrièrelijst bewijst geen eerste-elftaloptredens; onbekende dekking wordt als zodanig gerapporteerd. FootballMind blijft carrièreclubs gebruiken voor de spelcontrole.

Volledige antwoordroute: `node tools/audit_answer_route.mjs`. Dit gebruikt een DOM/event-adapter met de echte zoekrenderer, echte resultaat-clicklistener, `submitAnswer`, cluecontrole, beurtwisseling en bordrenderer. Alleen niet-inhoudelijke foto-opvraging, beurtpaneelopmaak en timers zijn uitgeschakeld. Dit is geen screenshottest in een echte browser. Rapporten: `data/FootballMind_answer_route_before.json` en `data/FootballMind_answer_route_after.json`.

## Europese bekerfeiten (13 november 2026)

De keuze is volledige winnaarsselecties inclusief reserves. De gegevens zijn NOG NIET COMPLEET. De catalogus cupCompetitions in de clubconfiguratie bevat afzonderlijke historische edities en families: Europacup I/Champions League, UEFA Cup/Europa League, Europacup II, Conference League, UEFA Super Cup, UEFA Intertoto Cup en Jaarbeursstedenbeker. Een catalogusvermelding betekent niet dat selecties zijn ingevoerd. De Jaarbeursstedenbeker is geen UEFA Cup-editie; Conference League is geen opvolger van Europacup II.

Bekerfeiten staan als cupWins op gecontroleerde aanvullingen: competitionId, season (startjaar/eindjaar), club, membership=winning_squad en source (bron-URL). De bouwer bewaart deze gegevens, controleert het tijdvak en voegt dubbele speler/prijs/seizoen/club-feiten samen. Clubcarrières leveren NOOIT automatisch een bekerwinst op. De reguliere gridcategorieën zijn niet uitgebreid. Historische en moderne namen zijn afzonderlijk bewaard en hebben waar van toepassing dezelfde family.

Huidige nieuwe dekking: Moreno Torricelli en Fabrizio Ravanelli, Juventus, Champions League 1995/96 en UEFA Cup 1992/93. Hun carrièreclubs en Italië zijn aangevuld; naamgenoten blijven afzonderlijk. Dit is geen volledige Juventus-selectie en geen complete prijzenkast. De historische RSSSF-lijst met CL-optredens voldoet niet zelfstandig aan de gewenste volledigheid inclusief reserves. Alle overige selecties en prijzen moeten nog met bronverwijzingen worden gecontroleerd en ingevoerd; cupDataPolicy.complete blijft false.

Controle: node tools/audit_cup_facts.cjs. Bestaande rebuild voert tevens database- en antwoordroutecontroles uit.

## Solomodus 5×5
Kies Solo in het startscherm. De klok begint na het genereren van een bord waarvan ieder vak ten minste één geldig antwoord heeft (makkelijk: twee). Vanaf 13 goede antwoorden kan de speler stoppen en opslaan; 25 beëindigt de ronde automatisch. Foute antwoorden laten het vak open en de timer loopt door. De bestaande regel voor hergebruik van spelers blijft gelden. De klok loopt ook door in een inactief tabblad. Een lopende ronde verlaten vraagt bevestiging en levert geen klassementregel op.

Resultaten staan in localStorage onder footballmind-solo-results-v1, per browser en origin. Er is geen account of online synchronisatie. Score aflopend, daarna verstreken milliseconden oplopend; datum wordt lokaal weergegeven. Klassementen zijn gescheiden per moeilijkheid. Een opslagfout wordt expliciet getoond. De spelmodus staat in game/solo.js, met beperkte hooks in game/script.js en eigen responsive stijlen in game/solo.css. Het 3×3-spel blijft afzonderlijk.
