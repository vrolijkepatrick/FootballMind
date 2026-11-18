# Audit van vijf spelers

Databaseversie 5; normalisatie 2026-11-player-identity-v2.

| Speler | Canonieke records | Geslaagd | Ontbrekend | Real Madrid + Nederland |
| --- | ---: | ---: | ---: | --- |
| Johan Cruijff | 1 | 32 | 0 | false |
| Dennis Bergkamp | 1 | 23 | 0 | false |
| Virgil van Dijk | 1 | 26 | 0 | false |
| Kenneth Taylor | 1 | 20 | 0 | false |
| Wesley Sneijder | 1 | 32 | 0 | true |

Real Madrid + Nederland hoort alleen voor Sneijder true te zijn. De andere spelers worden ook getest op hun eigen club + Nederland: Ajax (Cruijff), Inter (Bergkamp), Liverpool (Van Dijk) en Lazio (Taylor).

Centrale sleutels: Real Madrid / Real Madrid CF / Real Madrid Club de Fútbol → `real madrid`; Nederland / Netherlands / Holland → `nederland`.

## Johan Cruijff

ID: LEGACY-CRUIJFF.

Carrièreclubs in de database: Ajax, Barcelona, Feyenoord, Los Angeles Aztecs, Washington Diplomats, Levante.
Nationaal team: Nederland.

- OK: Johan Cruijff: één canoniek record en één juiste nameLookup-verwijzing
- OK: Johan Cruijff: zoeken op Cruijff
- OK: Johan Cruijff: carrièreclub Ajax
- OK: Johan Cruijff: playerMatchesClue(Ajax) = true
- OK: Johan Cruijff: cluePlayers en clubPlayers bevatten Ajax
- OK: Johan Cruijff: carrièreclub Barcelona
- OK: Johan Cruijff: playerMatchesClue(Barcelona) = true
- OK: Johan Cruijff: cluePlayers en clubPlayers bevatten Barcelona
- OK: Johan Cruijff: carrièreclub Feyenoord
- OK: Johan Cruijff: playerMatchesClue(Feyenoord) = true
- OK: Johan Cruijff: cluePlayers en clubPlayers bevatten Feyenoord
- OK: Johan Cruijff: carrièreclub Los Angeles Aztecs
- OK: Johan Cruijff: playerMatchesClue(Los Angeles Aztecs) = true
- OK: Johan Cruijff: cluePlayers en clubPlayers bevatten Los Angeles Aztecs
- OK: Johan Cruijff: carrièreclub Washington Diplomats
- OK: Johan Cruijff: playerMatchesClue(Washington Diplomats) = true
- OK: Johan Cruijff: cluePlayers en clubPlayers bevatten Washington Diplomats
- OK: Johan Cruijff: carrièreclub Levante
- OK: Johan Cruijff: playerMatchesClue(Levante) = true
- OK: Johan Cruijff: cluePlayers en clubPlayers bevatten Levante
- OK: Johan Cruijff: Nederland: sleutel nederland, nationaal team, match en index
- OK: Johan Cruijff: Netherlands: sleutel nederland, nationaal team, match en index
- OK: Johan Cruijff: Holland: sleutel nederland, nationaal team, match en index
- OK: Johan Cruijff: Real Madrid: sleutel real madrid
- OK: Johan Cruijff: Real Madrid: match en index = false
- OK: Johan Cruijff: Real Madrid CF: sleutel real madrid
- OK: Johan Cruijff: Real Madrid CF: match en index = false
- OK: Johan Cruijff: Real Madrid Club de Fútbol: sleutel real madrid
- OK: Johan Cruijff: Real Madrid Club de Fútbol: match en index = false
- OK: Johan Cruijff: Real Madrid + Nederland = false
- OK: Johan Cruijff: Ajax + Nederland = true
- OK: Johan Cruijff: alle aanwezige carrièreclubs in clubPlayers en cluePlayers

## Dennis Bergkamp

ID: LEGEND-DENNIS-BERGKAMP.

Carrièreclubs in de database: Ajax, Arsenal, Inter.
Nationaal team: Nederland.

- OK: Dennis Bergkamp: één canoniek record en één juiste nameLookup-verwijzing
- OK: Dennis Bergkamp: zoeken op Bergkamp
- OK: Dennis Bergkamp: carrièreclub Ajax
- OK: Dennis Bergkamp: playerMatchesClue(Ajax) = true
- OK: Dennis Bergkamp: cluePlayers en clubPlayers bevatten Ajax
- OK: Dennis Bergkamp: carrièreclub Internazionale
- OK: Dennis Bergkamp: playerMatchesClue(Internazionale) = true
- OK: Dennis Bergkamp: cluePlayers en clubPlayers bevatten Internazionale
- OK: Dennis Bergkamp: carrièreclub Arsenal
- OK: Dennis Bergkamp: playerMatchesClue(Arsenal) = true
- OK: Dennis Bergkamp: cluePlayers en clubPlayers bevatten Arsenal
- OK: Dennis Bergkamp: Nederland: sleutel nederland, nationaal team, match en index
- OK: Dennis Bergkamp: Netherlands: sleutel nederland, nationaal team, match en index
- OK: Dennis Bergkamp: Holland: sleutel nederland, nationaal team, match en index
- OK: Dennis Bergkamp: Real Madrid: sleutel real madrid
- OK: Dennis Bergkamp: Real Madrid: match en index = false
- OK: Dennis Bergkamp: Real Madrid CF: sleutel real madrid
- OK: Dennis Bergkamp: Real Madrid CF: match en index = false
- OK: Dennis Bergkamp: Real Madrid Club de Fútbol: sleutel real madrid
- OK: Dennis Bergkamp: Real Madrid Club de Fútbol: match en index = false
- OK: Dennis Bergkamp: Real Madrid + Nederland = false
- OK: Dennis Bergkamp: Internazionale + Nederland = true
- OK: Dennis Bergkamp: alle aanwezige carrièreclubs in clubPlayers en cluePlayers

## Virgil van Dijk

ID: TM139208.

Carrièreclubs in de database: Celtic, FC Groningen, Liverpool, Southampton, WDS '19 Jeugd.
Nationaal team: Nederland.

- OK: Virgil van Dijk: één canoniek record en één juiste nameLookup-verwijzing
- OK: Virgil van Dijk: zoeken op van Dijk
- OK: Virgil van Dijk: carrièreclub FC Groningen
- OK: Virgil van Dijk: playerMatchesClue(FC Groningen) = true
- OK: Virgil van Dijk: cluePlayers en clubPlayers bevatten FC Groningen
- OK: Virgil van Dijk: carrièreclub Celtic
- OK: Virgil van Dijk: playerMatchesClue(Celtic) = true
- OK: Virgil van Dijk: cluePlayers en clubPlayers bevatten Celtic
- OK: Virgil van Dijk: carrièreclub Southampton
- OK: Virgil van Dijk: playerMatchesClue(Southampton) = true
- OK: Virgil van Dijk: cluePlayers en clubPlayers bevatten Southampton
- OK: Virgil van Dijk: carrièreclub Liverpool
- OK: Virgil van Dijk: playerMatchesClue(Liverpool) = true
- OK: Virgil van Dijk: cluePlayers en clubPlayers bevatten Liverpool
- OK: Virgil van Dijk: Nederland: sleutel nederland, nationaal team, match en index
- OK: Virgil van Dijk: Netherlands: sleutel nederland, nationaal team, match en index
- OK: Virgil van Dijk: Holland: sleutel nederland, nationaal team, match en index
- OK: Virgil van Dijk: Real Madrid: sleutel real madrid
- OK: Virgil van Dijk: Real Madrid: match en index = false
- OK: Virgil van Dijk: Real Madrid CF: sleutel real madrid
- OK: Virgil van Dijk: Real Madrid CF: match en index = false
- OK: Virgil van Dijk: Real Madrid Club de Fútbol: sleutel real madrid
- OK: Virgil van Dijk: Real Madrid Club de Fútbol: match en index = false
- OK: Virgil van Dijk: Real Madrid + Nederland = false
- OK: Virgil van Dijk: Liverpool + Nederland = true
- OK: Virgil van Dijk: alle aanwezige carrièreclubs in clubPlayers en cluePlayers

## Kenneth Taylor

ID: TM470394.

Carrièreclubs in de database: Ajax, Lazio.
Nationaal team: Nederland.

- OK: Kenneth Taylor: één canoniek record en één juiste nameLookup-verwijzing
- OK: Kenneth Taylor: zoeken op Kenneth Taylor
- OK: Kenneth Taylor: carrièreclub Ajax
- OK: Kenneth Taylor: playerMatchesClue(Ajax) = true
- OK: Kenneth Taylor: cluePlayers en clubPlayers bevatten Ajax
- OK: Kenneth Taylor: carrièreclub Lazio
- OK: Kenneth Taylor: playerMatchesClue(Lazio) = true
- OK: Kenneth Taylor: cluePlayers en clubPlayers bevatten Lazio
- OK: Kenneth Taylor: Nederland: sleutel nederland, nationaal team, match en index
- OK: Kenneth Taylor: Netherlands: sleutel nederland, nationaal team, match en index
- OK: Kenneth Taylor: Holland: sleutel nederland, nationaal team, match en index
- OK: Kenneth Taylor: Real Madrid: sleutel real madrid
- OK: Kenneth Taylor: Real Madrid: match en index = false
- OK: Kenneth Taylor: Real Madrid CF: sleutel real madrid
- OK: Kenneth Taylor: Real Madrid CF: match en index = false
- OK: Kenneth Taylor: Real Madrid Club de Fútbol: sleutel real madrid
- OK: Kenneth Taylor: Real Madrid Club de Fútbol: match en index = false
- OK: Kenneth Taylor: Real Madrid + Nederland = false
- OK: Kenneth Taylor: Lazio + Nederland = true
- OK: Kenneth Taylor: alle aanwezige carrièreclubs in clubPlayers en cluePlayers

## Wesley Sneijder

ID: LEGEND-WESLEY-SNEIJDER.

Carrièreclubs in de database: Ajax, Inter, Galatasaray, Real Madrid, OGC Nice, Al-Gharafa.
Nationaal team: Nederland.

- OK: Wesley Sneijder: één canoniek record en één juiste nameLookup-verwijzing
- OK: Wesley Sneijder: zoeken op Sneijder
- OK: Wesley Sneijder: carrièreclub Ajax
- OK: Wesley Sneijder: playerMatchesClue(Ajax) = true
- OK: Wesley Sneijder: cluePlayers en clubPlayers bevatten Ajax
- OK: Wesley Sneijder: carrièreclub Real Madrid
- OK: Wesley Sneijder: playerMatchesClue(Real Madrid) = true
- OK: Wesley Sneijder: cluePlayers en clubPlayers bevatten Real Madrid
- OK: Wesley Sneijder: carrièreclub Internazionale
- OK: Wesley Sneijder: playerMatchesClue(Internazionale) = true
- OK: Wesley Sneijder: cluePlayers en clubPlayers bevatten Internazionale
- OK: Wesley Sneijder: carrièreclub Galatasaray
- OK: Wesley Sneijder: playerMatchesClue(Galatasaray) = true
- OK: Wesley Sneijder: cluePlayers en clubPlayers bevatten Galatasaray
- OK: Wesley Sneijder: carrièreclub OGC Nice
- OK: Wesley Sneijder: playerMatchesClue(OGC Nice) = true
- OK: Wesley Sneijder: cluePlayers en clubPlayers bevatten OGC Nice
- OK: Wesley Sneijder: carrièreclub Al-Gharafa
- OK: Wesley Sneijder: playerMatchesClue(Al-Gharafa) = true
- OK: Wesley Sneijder: cluePlayers en clubPlayers bevatten Al-Gharafa
- OK: Wesley Sneijder: Nederland: sleutel nederland, nationaal team, match en index
- OK: Wesley Sneijder: Netherlands: sleutel nederland, nationaal team, match en index
- OK: Wesley Sneijder: Holland: sleutel nederland, nationaal team, match en index
- OK: Wesley Sneijder: Real Madrid: sleutel real madrid
- OK: Wesley Sneijder: Real Madrid: match en index = true
- OK: Wesley Sneijder: Real Madrid CF: sleutel real madrid
- OK: Wesley Sneijder: Real Madrid CF: match en index = true
- OK: Wesley Sneijder: Real Madrid Club de Fútbol: sleutel real madrid
- OK: Wesley Sneijder: Real Madrid Club de Fútbol: match en index = true
- OK: Wesley Sneijder: Real Madrid + Nederland = true
- OK: Wesley Sneijder: Real Madrid + Nederland = true
- OK: Wesley Sneijder: alle aanwezige carrièreclubs in clubPlayers en cluePlayers

## Bronnen voor de ontbrekende carrièregegevens van Sneijder

De bestaande bronrecords zijn aangevuld. Er is geen speleruitzondering aan de matching of correctielaag toegevoegd.

- [Real Madrid: Sneijder, 2007–2009](https://www.realmadrid.com/es-ES/el-club/historia/leyendas-futbol/wesley-benjamin-sneijder)
- [OGC Nice: spelersprofiel Sneijder](https://www.ogcnice.com/fr/fiche/1349/wesley-sneijder.html)
- [UEFA: Nederland en Al-Gharafa](https://www.uefa.com/uefanationsleague/news/0253-0d821289f992-2e8f666fa91e-1000--wesley-sneijder-calls-time-on-netherlands-career/)

De audit van vóór deze wijziging staat in FootballMind_player_audit_before.json. Globale datagaten buiten deze vijf spelers blijven zichtbaar in FootballMind_audit.json.
