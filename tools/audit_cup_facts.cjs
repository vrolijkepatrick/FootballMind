const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const data = require('../game/database.js');
const read = file => JSON.parse(fs.readFileSync(path.join(__dirname, '../data', file), 'utf8'));
const db = read('FootballMind_game_database.json');
const config = read('FootballMind_club_competitions.json');
const entries = db.players.map(data.searchEntry);
for (const [name, surname, otherName] of [['Moreno Torricelli', 'Torricelli', 'Lapo Torricelli'], ['Fabrizio Ravanelli', 'Ravanelli', 'Luca Ravanelli']]) {
  const matches = data.search(entries, surname, Infinity);
  const selected = matches.filter(e => e.player.name === name);
  assert.equal(selected.length, 1);
  const player = selected[0].player;
  assert.equal(player.cupWins.length, 2);
  assert.equal(data.evaluateAnswer(db, {playerId: player.id, row: 'Juventus', column: 'Champions League winnaar'}).accepted, true);
  assert.equal(data.evaluateAnswer(db, {playerId: player.id, row: 'Juventus', column: 'Italië'}).accepted, true);
  const other = matches.find(e => e.player.name === otherName).player;
  assert.notEqual(player.id, other.id);
  assert.equal(other.cupWins?.length || 0, 0);
}
const fact = {competitionId: 'uefa_cup', season: '1992/93', club: 'Juventus', membership: 'winning_squad', source: 'https://example.org/source'};
const source = {players: [{id: 'A', name: 'First Player', clubs: ['Juventus']}, {id: 'B', name: 'Other Player', clubs: ['Juventus']}]};
const corrections = {players: [{id:'A', name:'First Player', cupWins:[fact, fact]}]};
const rebuilt = data.build(source, {players:[]}, corrections, config);
assert.equal(rebuilt.players.find(p=>p.id==='A').cupWins.length, 1);
assert.equal(rebuilt.players.find(p=>p.id==='B').cupWins, undefined);
for (const bad of [{...fact, competitionId:'conference_league'}, {...fact, source:''}, {...fact, season:'1992/95'}, {...fact, competitionId:'missing'}]) {
  assert.throws(()=>data.build(source,{players:[]},{players:[{id:'A', name:'First Player', cupWins:[bad]}]},config), /Ongeldig bekerfeit/);
}
assert.equal(config.cupCompetitions.find(c=>c.id==='uefa_cup').family, config.cupCompetitions.find(c=>c.id==='europa_league').family);
assert.notEqual(config.cupCompetitions.find(c=>c.id==='cup_winners_cup').family, config.cupCompetitions.find(c=>c.id==='conference_league').family);
assert.equal(db.cupDataPolicy.complete, false);
console.log('OK: both players searchable, Juventus/country/CL answers, namesakes isolated, source facts preserved, duplicate facts collapsed, invalid eras rejected. Full squad coverage remains incomplete.');
