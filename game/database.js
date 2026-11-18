/* Shared by the browser, database builder and audits. No browser dependencies. */
(function (root) {
  "use strict";
  const VERSION = 5;
  const REVISION = "2026-11-player-identity-v2";
  const fields = ["clubs", "internationalTeams", "awards", "competitions"];
  const norm = (value) => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  const clean = (value) => String(value || "").replace(/\s*\(\d+\)\s*$/, "").trim();
  const unique = (values) => [...new Map(values.filter(Boolean).map((v) => [norm(v), v])).values()];

  function canonicalValue(value, aliases = {}) {
    let result = String(value || "").replace(/\s+/g, " ").trim();
    const seen = new Set();
    while (Object.hasOwn(aliases, norm(result)) && !seen.has(norm(result))) {
      seen.add(norm(result));
      result = aliases[norm(result)];
    }
    return result;
  }

  function clueKey(value, aliases = {}) {
    return norm(canonicalValue(value, aliases));
  }

  function playerMatchesClue(player, clue, aliases = {}) {
    const key = clueKey(clue, aliases);
    return Boolean(key) && fields.some((field) => (player[field] || []).some((value) => clueKey(value, aliases) === key));
  }

  function searchEntry(player) {
    const names = unique([player.name, ...(player.aliases || [])].map(clean)).map(norm);
    const surnames = unique(names.flatMap((name) => {
      const words = name.split(" ");
      const last = words.at(-1);
      let start = words.length - 1;
      while (start > 0 && /^(van|von|de|den|der|ten|ter|te|da|das|do|dos|del|della|di|du|la|le|el|al)$/.test(words[start - 1])) start--;
      return [last, words.slice(start).join(" ")];
    }).concat([player.lastName, player.surname].filter(Boolean).map(norm)));
    return { player, displayName: player.name, names, surnames, priority: player.searchPriority || 0 };
  }

  function searchScore(entry, query) {
    if (entry.names.includes(query)) return 0;
    if (entry.surnames.includes(query)) return 1;
    if (entry.surnames.some((name) => name.startsWith(query))) return 2;
    const words = query.split(" ");
    if (entry.names.some((name) => words.every((word) => name.includes(word)))) return 3;
    return Infinity;
  }

  function search(entries, text, limit = 30) {
    const query = norm(text);
    if (query.length < 2) return [];
    return entries.map((entry) => ({ ...entry, score: searchScore(entry, query) }))
      .filter((entry) => Number.isFinite(entry.score))
      .sort((a, b) => a.score - b.score || b.priority - a.priority || a.displayName.localeCompare(b.displayName, "nl") || String(a.player.id).localeCompare(String(b.player.id)))
      .slice(0, limit);
  }

  function build(source, legends, corrections, config) {
    const canonical = (value) => canonicalValue(value, config.aliases);
    const players = [], byId = new Map(), byName = new Map(), ambiguities = [];
    const register = (player) => {
      for (const name of [player.name, ...(player.aliases || [])]) {
        const key = norm(clean(name));
        if (!byName.has(key)) byName.set(key, new Set());
        byName.get(key).add(player);
      }
      for (const id of player.sourceIds) byId.set(id, player);
    };
    for (const [layer, records] of [["source", source.players || []], ["legend", legends.players || []], ["correction", corrections.players || []]]) {
      for (const record of records) {
        // Reviewed identity corrections survive a replacement of the imported source.
        const raw = { ...record, ...(corrections.identityOverrides?.[record.id] || {}) };
        const name = clean(raw.name);
        if (!name) continue;
        const names = unique([name, ...(raw.aliases || []), ...(raw.matchNames || [])].map(clean));
        const ids = unique([raw.id, ...(raw.sourceIds || [])]);
        let player = ids.map((id) => byId.get(id)).find(Boolean);
        if (!player) {
          let candidates = [...new Set(names.flatMap((n) => [...(byName.get(norm(n)) || [])]))];
          // Different source IDs can be different people with the same name.
          if (layer === "source" && ids.length) candidates = candidates.filter((p) => !p.hasSourceId);
          if (raw.identityKey) candidates = candidates.filter((p) => !p.identityKey || p.identityKey === raw.identityKey);
          if (candidates.length > 1) {
            const countries = (raw.internationalTeams || []).map(canonical).map(norm);
            const matching = candidates.filter((p) => p.internationalTeams.some((c) => countries.includes(norm(c))));
            if (matching.length) candidates = matching;
          }
          if (candidates.length > 1) {
            const clubs = (raw.clubs || []).map(canonical).map(norm);
            const scores = candidates.map((p) => ({ p, score: p.clubs.filter((c) => clubs.includes(norm(c))).length }));
            const best = Math.max(...scores.map((x) => x.score));
            const matching = scores.filter((x) => best > 0 && x.score === best).map((x) => x.p);
            if (matching.length) candidates = matching;
          }
          if (candidates.length === 1) player = candidates[0];
          else if (candidates.length > 1) {
            ambiguities.push({ name, layer, candidates: candidates.map((p) => p.id) });
            // Keep identified source players separate. Do not invent an extra player
            // or spread unidentifiable supplemental facts over every namesake.
            continue;
          }
        }
        if (!player) {
          player = { id: raw.id || `FM-${layer}-${players.length}`, name, aliases: [], sourceIds: [], clubs: [], firstTeamClubs: [], internationalTeams: [], awards: [], competitions: [], legend: false };
          players.push(player);
        }
        player.hasSourceId ||= layer === "source" && ids.length > 0;
        player.sourceIds = unique([...player.sourceIds, ...ids]);
        player.aliases = unique([...player.aliases, ...names]).filter((n) => norm(n) !== norm(player.name));
        for (const field of fields) player[field] = unique([...player[field], ...(raw[field] || []).map((v) => canonical(field === "internationalTeams" ? String(v).split(/\s{2,}/)[0] : v))]);
        // Preserve explicit senior-team evidence. An unqualified career-club list
        // is not proof that the player appeared for its first team.
        player.firstTeamClubs = unique([...player.firstTeamClubs, ...(raw.firstTeamClubs || raw.seniorClubs || []).map(canonical)]);
        player.clubs = unique([...player.clubs, ...player.firstTeamClubs]);
        player.legend ||= layer === "legend" || Boolean(raw.legend);
        if (raw.identityKey) player.identityKey = raw.identityKey;
        if (raw.surname || raw.lastName) player.surname = raw.surname || raw.lastName;
        // Cup wins are sourced season facts, not inferred from career club membership.
        if (raw.cupWins?.length) {
          const wins = new Map((player.cupWins || []).map((win) => [JSON.stringify([win.competitionId, win.season, win.club]), win]));
          for (const win of raw.cupWins) {
            const competition = (config.cupCompetitions || []).find((cup) => cup.id === win.competitionId);
            const year = Number(String(win.season).slice(0, 4));
            if (!competition || !/^\d{4}\/\d{2}$/.test(win.season) ||
                Number(win.season.slice(-2)) !== (year + 1) % 100 ||
                year < competition.firstSeasonStart ||
                (competition.lastSeasonStart !== null && year > competition.lastSeasonStart) ||
                !win.club || !/^https?:\/\//.test(win.source || '') || win.membership !== 'winning_squad') {
              throw new Error('Ongeldig bekerfeit: ' + name + ' / ' + win.competitionId);
            }
            const fact = { ...win, club: canonical(win.club) };
            wins.set(JSON.stringify([fact.competitionId, fact.season, fact.club]), fact);
          }
          player.cupWins = [...wins.values()];
        }
        if (raw.sources?.length) player.sources = unique([...(player.sources || []), ...raw.sources]);
        if (raw.photoPage) player.photoPage = raw.photoPage;
        player.image ||= raw.image || raw.imageUrl || raw.photo || null;
        register(player);
      }
    }
    const clubCompetitions = Object.fromEntries(Object.entries(config.clubCompetitions).map(([club, leagues]) => [norm(canonical(club)), leagues]));
    for (const player of players) {
      delete player.hasSourceId;
      player.competitions = unique([...player.competitions, ...player.clubs.flatMap((club) => clubCompetitions[norm(club)] || [])]);
      player.searchPriority = player.clubs.filter((club) => clubCompetitions[norm(club)]).length;
      player.firstTeamClubsSource = player.firstTeamClubs.length ? "expliciete bronvelden" : "niet afzonderlijk vastgelegd";
      for (const name of [player.name, ...player.aliases]) player.awards = unique([...player.awards, ...(config.playerAwards[norm(name)] || [])]);
    }
    players.sort((a, b) => norm(a.name).localeCompare(norm(b.name), "nl") || a.id.localeCompare(b.id));
    const nameLookup = {}, playerLookup = {}, cluePlayers = {}, clubPlayers = {}, countryPlayers = {}, competitionPlayers = {};
    const add = (index, key, i) => { (index[key] ||= []).push(i); };
    players.forEach((player, i) => {
      playerLookup[player.id] = i;
      for (const name of new Set([player.name, ...player.aliases].map(norm))) add(nameLookup, name, i);
      for (const key of new Set(fields.flatMap((f) => player[f]).map(norm))) add(cluePlayers, key, i);
      for (const club of player.clubs) add(clubPlayers, norm(club), i);
      for (const country of player.internationalTeams) add(countryPlayers, norm(country), i);
      for (const league of player.competitions) add(competitionPlayers, norm(league), i);
    });
    const clueAliases = Object.fromEntries(Object.entries(config.aliases).map(([key, value]) => [norm(key), clueKey(value, config.aliases)]));
    return { cupCompetitions: config.cupCompetitions || [], cupDataPolicy: config.cupDataPolicy || null, version: VERSION, normalizationVersion: REVISION, sourceVersion: source.version, legendsIntegrated: true, careerCorrectionsIntegrated: true, playerCount: players.length, players, playerLookup, nameLookup, cluePlayers, clubPlayers, countryPlayers, competitionPlayers, clubCompetitions, clueAliases, rules: { allowPlayerReuse: config.rules?.allowPlayerReuse !== false }, ambiguities };
  }

  function evaluateAnswer(database, attempt) {
    const index = database.playerLookup?.[attempt.playerId];
    const player = Number.isInteger(index) ? database.players[index] : null;
    const clues = [attempt.row, attempt.column];
    const keys = clues.map((clue) => clueKey(clue, database.clueAliases));
    const matches = clues.map((clue) => Boolean(player && playerMatchesClue(player, clue, database.clueAliases)));
    const indexed = keys.map((key) => Boolean(player && database.cluePlayers[key]?.includes(index)));
    let reason = null;
    if (attempt.gameOver) reason = "game_over";
    else if (attempt.cellAvailable === false) reason = "cell_unavailable";
    else if (!player || player.id !== attempt.playerId) reason = "player_not_found";
    else if (!matches[0]) reason = "row_mismatch";
    else if (!matches[1]) reason = "column_mismatch";
    else if (!indexed.every(Boolean)) reason = "index_mismatch";
    else if (database.rules?.allowPlayerReuse === false && new Set(attempt.usedPlayerIds || []).has(player.id)) reason = "already_used";
    const debug = {
      selectedPlayerId: attempt.playerId || null, canonicalPlayerId: player?.id || null, canonicalPlayerName: player?.name || null,
      normalizedSearchName: norm(attempt.query), normalizedAnswerName: norm(player?.name),
      clubs: player?.clubs || [], firstTeamClubs: player?.firstTeamClubs || [], firstTeamClubsSource: player?.firstTeamClubsSource || "niet afzonderlijk vastgelegd",
      internationalTeams: player?.internationalTeams || [], competitions: player?.competitions || [], aliases: player?.aliases || [],
      clues, normalizedClues: keys, playerMatchesClue: matches, reason,
      usedIndex: { playerLookup: index ?? null, nameLookup: database.nameLookup[norm(player?.name)] || [],
        cluePlayers: indexed, clubPlayers: keys.map((key) => database.clubPlayers[key]?.includes(index) || false),
        countryPlayers: keys.map((key) => database.countryPlayers[key]?.includes(index) || false),
        competitionPlayers: keys.map((key) => database.competitionPlayers[key]?.includes(index) || false) },
      versions: { database: database.version, normalization: database.normalizationVersion, inputRevision: database.inputRevision || null },
      allowPlayerReuse: database.rules?.allowPlayerReuse !== false
    };
    return { accepted: !reason, reason, player, debug };
  }

  const PLAYER_AUDIT_CASES = [
    { name: "Johan Cruijff", query: "Cruijff", clubs: ["Ajax", "Barcelona", "Feyenoord", "Los Angeles Aztecs", "Washington Diplomats", "Levante"], club: "Ajax", realMadrid: false },
    { name: "Dennis Bergkamp", query: "Bergkamp", clubs: ["Ajax", "Internazionale", "Arsenal"], club: "Internazionale", realMadrid: false },
    { name: "Virgil van Dijk", query: "van Dijk", clubs: ["FC Groningen", "Celtic", "Southampton", "Liverpool"], club: "Liverpool", realMadrid: false },
    { name: "Kenneth Taylor", query: "Kenneth Taylor", clubs: ["Ajax", "Lazio"], club: "Lazio", realMadrid: false },
    { name: "Wesley Sneijder", query: "Sneijder", clubs: ["Ajax", "Real Madrid", "Internazionale", "Galatasaray", "OGC Nice", "Al-Gharafa"], club: "Real Madrid", realMadrid: true }
  ];

  function auditPlayers(database, matches = (player, clue) => playerMatchesClue(player, clue, database.clueAliases)) {
    const entries = database.players.map(searchEntry);
    return PLAYER_AUDIT_CASES.map((spec) => {
      const ids = database.nameLookup[norm(spec.name)] || [];
      const actual = database.players.map((p, i) => norm(p.name) === norm(spec.name) || (p.aliases || []).some((a) => norm(a) === norm(spec.name)) ? i : -1).filter((i) => i >= 0);
      const player = ids.length === 1 ? database.players[ids[0]] : null;
      const checks = [];
      const check = (label, ok) => checks.push({ label: `${spec.name}: ${label}`, ok: Boolean(ok) });
      const key = (value) => clueKey(value, database.clueAliases);
      const inIndex = (index, value) => Boolean(player && database[index]?.[key(value)]?.includes(ids[0]));
      check("één canoniek record en één juiste nameLookup-verwijzing", ids.length === 1 && actual.length === 1 && ids[0] === actual[0]);
      check(`zoeken op ${spec.query}`, search(entries, spec.query).some((entry) => entry.player.id === player?.id));
      for (const club of spec.clubs) {
        check(`carrièreclub ${club}`, player?.clubs.some((value) => key(value) === key(club)));
        check(`playerMatchesClue(${club}) = true`, player && matches(player, club));
        check(`cluePlayers en clubPlayers bevatten ${club}`, inIndex("cluePlayers", club) && inIndex("clubPlayers", club));
      }
      for (const country of ["Nederland", "Netherlands", "Holland"]) {
        check(`${country}: sleutel nederland, nationaal team, match en index`, key(country) === "nederland" && player?.internationalTeams.some((value) => key(value) === "nederland") && matches(player, country) && inIndex("cluePlayers", country));
      }
      for (const club of ["Real Madrid", "Real Madrid CF", "Real Madrid Club de Fútbol"]) {
        check(`${club}: sleutel real madrid`, key(club) === "real madrid");
        check(`${club}: match en index = ${spec.realMadrid}`, player && matches(player, club) === spec.realMadrid && inIndex("cluePlayers", club) === spec.realMadrid);
      }
      const realMadridNetherlands = Boolean(player && matches(player, "Real Madrid") && matches(player, "Nederland"));
      check(`Real Madrid + Nederland = ${spec.realMadrid}`, realMadridNetherlands === spec.realMadrid);
      check(`${spec.club} + Nederland = true`, player && matches(player, spec.club) && matches(player, "Nederland") && inIndex("cluePlayers", spec.club) && inIndex("cluePlayers", "Nederland"));
      check("alle aanwezige carrièreclubs in clubPlayers en cluePlayers", player && player.clubs.every((club) => inIndex("clubPlayers", club) && inIndex("cluePlayers", club)));
      return { name: spec.name, id: player?.id || null, recordCount: actual.length, clubs: player?.clubs || [], internationalTeams: player?.internationalTeams || [], realMadridNetherlands, passed: checks.filter((c) => c.ok).length, failed: checks.filter((c) => !c.ok).length, checks };
    });
  }

  function audit(database) {
    const entries = database.players.map(searchEntry), checks = [];
    const check = (label, ok) => checks.push({ label, ok: Boolean(ok) });
    for (const [query, expected] of [["Cruijff", "Johan Cruijff"], ["Bergkamp", "Dennis Bergkamp"], ["van Dijk", "Virgil van Dijk"], ["de Jong", "Frenkie de Jong"], ["Kenneth Taylor", "Kenneth Taylor"]]) {
      check(`Zoeken ${query} → ${expected}`, search(entries, query).some((e) => norm(e.displayName) === norm(expected)));
    }
    const taylor = database.nameLookup["kenneth taylor"] || [];
    check("Eén canonieke Kenneth Taylor", taylor.length === 1);
    for (const club of ["ajax", "lazio"]) check(`Kenneth Taylor → ${club}`, taylor.length === 1 && database.clubPlayers[club]?.includes(taylor[0]));
    check("Lazio → Serie A", database.clubCompetitions.lazio?.includes("Serie A"));
    check("Kenneth Taylor → Serie A + Ajax", taylor.length === 1 && database.cluePlayers["serie a"]?.includes(taylor[0]) && database.cluePlayers.ajax?.includes(taylor[0]));
    check("Unieke canonieke IDs", new Set(database.players.map((p) => p.id)).size === database.players.length);
    const missingLinks = [];
    const competitionSets = Object.fromEntries(Object.entries(database.competitionPlayers).map(([key, ids]) => [key, new Set(ids)]));
    database.players.forEach((p, i) => {
      for (const club of p.clubs) for (const league of database.clubCompetitions[norm(club)] || []) {
        if (!competitionSets[norm(league)]?.has(i)) missingLinks.push({ player: p.name, club, league });
      }
    });
    check("Alle centrale club-competitiekoppelingen geïndexeerd", missingLinks.length === 0);
    check("Alle spelersvelden gebruiken centrale clue-sleutels", database.players.every((player) => fields.every((field) => player[field].every((value) => norm(value) === clueKey(value, database.clueAliases)))));
    check("Alle club-, landen-, competitie- en clue-indexen gebruiken centrale sleutels", [database.clubPlayers, database.countryPlayers, database.competitionPlayers, database.cluePlayers].every((index) => Object.keys(index || {}).every((key) => key === clueKey(key, database.clueAliases))));
    check("Alle speler-IDs wijzen naar hun canonieke record", database.players.every((p, i) => database.playerLookup?.[p.id] === i));
    const countrySets = Object.fromEntries(Object.entries(database.countryPlayers || {}).map(([key, indexes]) => [key, new Set(indexes)]));
    check("Landenindex bevat ieder nationaal team", database.players.every((p, i) => p.internationalTeams.every((country) => countrySets[norm(country)]?.has(i))));
    const routeCases = [
      ["Sneijder", "Wesley Sneijder", "Real Madrid", "Nederland"],
      ["Cruijff", "Johan Cruijff", "Ajax", "Nederland"],
      ["Bergkamp", "Dennis Bergkamp", "Arsenal", "Nederland"],
      ["van Dijk", "Virgil van Dijk", "Liverpool", "Nederland"],
      ["Kenneth Taylor", "Kenneth Taylor", "Ajax", "Serie A"],
      ["Taylor", "Kenneth Taylor", "Lazio", "Nederland"]
    ];
    for (const [query, name, row, column] of routeCases) {
      const selected = search(entries, query).find((entry) => entry.player.name === name);
      const answer = evaluateAnswer(database, { query, playerId: selected?.player.id, row, column });
      check(`Gedeelde antwoordroute: ${query} → ${name} → ${row} + ${column}`, answer.accepted);
    }
    const playerAudits = auditPlayers(database);
    checks.push(...playerAudits.flatMap((result) => result.checks));
    const unmappedClubs = [...new Set(database.players.flatMap((p) => p.clubs).filter((c) => !database.clubCompetitions[norm(c)]))].sort();
    return { passed: checks.filter((c) => c.ok).length, failed: checks.filter((c) => !c.ok).length, checks, playerAudits, missingLinks, unmappedClubs, ambiguousIdentities: database.ambiguities };
  }
  const api = { VERSION, REVISION, norm, clean, canonicalValue, clueKey, playerMatchesClue, evaluateAnswer, searchEntry, searchScore, search, build, audit, auditPlayers };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.FootballMindData = api;
})(globalThis);
