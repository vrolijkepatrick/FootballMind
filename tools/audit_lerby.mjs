import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHarness } from './answer_route_harness.mjs';
const db=JSON.parse(fs.readFileSync(new URL('../data/FootballMind_game_database.json',import.meta.url),'utf8'));
const harness=createHarness(db);
for(const query of ['Lerby','Soren Lerby','Søren Lerby','Sören Lerby']) {
 for(const column of ['Champions League','UEFA Champions League','Champions League winnaar']) {
  const r=await harness.run({name:'Søren Lerby',query,row:'PSV',column});
  assert.equal(r.result,'GOED',query+' / '+column);assert(r.boardShowsCorrect);assert(r.sameCanonicalObject);
 }
}
const negative=await harness.run({name:'Søren Lerby',query:'Lerby',row:'AC Milan',column:'Champions League winnaar'});
assert.equal(negative.result,'FOUT');
assert.equal(db.players.filter(p=>/lerby/i.test(p.name)).length,1);
console.log('OK: 12 Lerby search/click/answer/board routes; AC Milan rejected; one canonical record.');
