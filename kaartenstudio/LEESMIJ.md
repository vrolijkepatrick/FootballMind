# Nederlandse Voetballegendes — Kaartenstudio 0.1

Open `index.html` in je browser. Voor een vast lokaal adres kun je met Node.js `node server.cjs` uitvoeren vanuit deze map en http://127.0.0.1:4178 openen. Gebruik steeds dezelfde browser en hetzelfde adres om je opgeslagen collectie terug te vinden.

## Deze basis

- Spelers toevoegen, zoeken en bewerken.
- Eén vast zwart-goud template met de vakverdeling van het Cruijff-voorbeeld in `assets/cruijff-referentie.jpeg`.
- Clubcarrière, telwijze, interlands, prijzen, biografie en citaatbron.
- Originele JPG/PNG/WebP-foto’s lokaal bewaren zonder de pixels te veranderen. Foto’s verschijnen pas na ingevulde bron, rechten en controlebevestiging.
- Automatisch bewaren in de browser (IndexedDB). Wis je browseropslag niet zonder back-up.
- Back-up als JSON met alle foto’s; import vult alleen lege velden aan en voegt nieuwe spelers toe. Bestaande ingevulde waarden worden niet overschreven. Import is samenvoegen, geen terugzetten naar een oudere versie.
- Afdrukken / PDF via het browservenster. Kies A4, schakel kop- en voetteksten uit en achtergrondafbeeldingen in. Onvolledige kaarten dragen het label CONCEPT.

## Bewuste grenzen van versie 0.1

Dit is de functionele basis, geen definitieve reproductie van de Cruijff-kaart. De collage, echte skyline, logo’s, handtekening en drukwerkafwerking moeten nog verder worden uitgewerkt. Het sjabloon verzint geen handtekeningen of spelerbeelden. De meegeleverde Hans-foto uit de eerdere chat is alleen een referentiebestand: maker, herkomst en rechten zijn nog niet vastgelegd, dus hij wordt niet automatisch geplaatst.

Hans begint als onvolledig concept. Er zijn geen ongecontroleerde wedstrijdcijfers ingevuld. Een aangevinkte controle is een gebruikersbevestiging en geen automatische feitencheck. Het programma controleert aanwezigheid van velden, niet de waarheid van de inhoud of een licentie.

Automatische Wikipedia-import, bronnen per afzonderlijk feit, PNG-export en uitgebreid collagebeheer zijn volgende bouwstappen. Lettertypes worden optioneel via Google Fonts geladen; zonder internet gebruikt de studio lokale vervangende lettertypes.

Tests: `node --test core.test.cjs`.
