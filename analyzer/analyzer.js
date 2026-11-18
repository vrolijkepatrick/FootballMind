'use strict';

// FootballMind Analyzer v3.5 Oranje Legacy – canonical club matching fix
const DB_PATH = '../data/FootballMind_database.json';
const ACH_PATH = '../data/FootballMind_achievements.json';

const PLAY_POOL = {
  'Nederland': [
    { name: 'Ajax', aliases: ['Ajax', 'Ajax Amsterdam'] },
    { name: 'PSV', aliases: ['PSV Eindhoven'] },
    { name: 'Feyenoord', aliases: ['Feyenoord', 'Feyenoord Rotterdam'] },
    { name: 'FC Twente', aliases: ['Twente FC', 'Twente Enschede FC', 'FC Twente'] },
    { name: 'AZ', aliases: ['AZ Alkmaar'] },
    { name: 'FC Utrecht', aliases: ['FC Utrecht'] },
    { name: 'FC Groningen', aliases: ['FC Groningen'] },
    { name: 'ADO Den Haag', aliases: ['ADO Den Haag'] },
    { name: 'Sparta Rotterdam', aliases: ['Sparta R.', 'Sparta Rotterdam'] },
    { name: 'sc Heerenveen', aliases: ['Heerenveen', 'SC Heerenveen'] },
    { name: 'NEC', aliases: ['NEC Nijmegen'] }
  ],
  'Engeland': [
    { name: 'Manchester City', aliases: ['Manchester City', 'Man City'] },
    { name: 'Chelsea', aliases: ['Chelsea', 'Chelsea FC'] },
    { name: 'Newcastle United', aliases: ['Newcastle', 'Newcastle United'] },
    { name: 'Everton', aliases: ['Everton', 'Everton FC'] },
    { name: 'Arsenal', aliases: ['Arsenal', 'Arsenal FC'] },
    { name: 'Manchester United', aliases: ['Manchester United', 'Man Utd'] },
    { name: 'Liverpool', aliases: ['Liverpool', 'Liverpool FC'] },
    { name: 'Aston Villa', aliases: ['Aston Villa'] },
    { name: 'Tottenham Hotspur', aliases: ['Tottenham', 'Tottenham Hotspur'] }
  ],
  'Spanje': [
    { name: 'Real Madrid', aliases: ['Real Madrid'] },
    { name: 'FC Barcelona', aliases: ['Barcelona', 'FC Barcelona'] },
    { name: 'Atlético Madrid', aliases: ['Atlético Madrid', 'Atletico Madrid', 'Atlético de Madrid'] },
    { name: 'Sevilla', aliases: ['Sevilla FC', 'Sevilla'] },
    { name: 'Valencia', aliases: ['Valencia', 'Valencia CF'] }
  ],
  'Italië': [
    { name: 'AS Roma', aliases: ['AS Roma'] },
    { name: 'Inter', aliases: ['Inter', 'Inter Milan', 'Internazionale'] },
    { name: 'AC Milan', aliases: ['AC Milan', 'Milan'] },
    { name: 'Juventus', aliases: ['Juventus', 'Juventus FC'] },
    { name: 'Lazio', aliases: ['Lazio', 'SS Lazio'] },
    { name: 'Napoli', aliases: ['Napoli', 'SSC Napoli'] }
  ],
  'Duitsland': [
    { name: 'Bayern München', aliases: ['Bayern Munich', 'Bayern München'] },
    { name: 'RB Leipzig', aliases: ['RB Leipzig'] },
    { name: 'Borussia Dortmund', aliases: ['Bor. Dortmund', 'Borussia Dortmund'] },
    { name: 'Bayer Leverkusen', aliases: ['Bayer 04 Leverkusen', 'Bayer Leverkusen'] },
    { name: 'Hamburger SV', aliases: ['Hamburger SV'] },
    { name: 'Werder Bremen', aliases: ['Werder Bremen', 'SV Werder Bremen'] },
    { name: 'Schalke 04', aliases: ['FC Schalke 04', 'Schalke 04'] },
    { name: 'VfB Stuttgart', aliases: ['VfB Stuttgart'] }
  ],
  'Frankrijk': [
    { name: 'AS Monaco', aliases: ['Monaco', 'AS Monaco'] },
    { name: 'Lille', aliases: ['LOSC Lille', 'Lille'] },
    { name: 'Olympique Lyon', aliases: ['Olympique Lyon', 'Olympique Lyonnais'] },
    { name: 'Olympique Marseille', aliases: ['Marseille', 'Olympique Marseille'] },
    { name: 'Paris Saint-Germain', aliases: ['Paris SG', 'Paris Saint-Germain', 'PSG'] }
  ],
  'Portugal': [
    { name: 'Benfica', aliases: ['Benfica', 'SL Benfica'] },
    { name: 'FC Porto', aliases: ['FC Porto'] },
    { name: 'Sporting CP', aliases: ['Sporting CP'] }
  ],
  'Turkije': [
    { name: 'Galatasaray', aliases: ['Galatasaray'] },
    { name: 'Fenerbahçe', aliases: ['Fenerbahce', 'Fenerbahçe'] },
    { name: 'Beşiktaş', aliases: ['Besiktas', 'Besiktas JK', 'Beşiktaş'] }
  ],
  'Schotland': [
    { name: 'Celtic', aliases: ['Celtic', 'Celtic FC'] },
    { name: 'Rangers FC', aliases: ['Rangers', 'Rangers FC'] }
  ],
  'België': [
    { name: 'Anderlecht', aliases: ['RSC Anderlecht', 'Anderlecht'] },
    { name: 'Club Brugge', aliases: ['Club Brugge', 'Club Brugge KV'] },
    { name: 'KV Mechelen', aliases: ['KV Mechelen'] },
    { name: 'Standard Luik', aliases: ['Standard Liège', 'Standard Liege', 'Standard Luik'] },
    { name: 'KAA Gent', aliases: ['KAA Gent'] },
    { name: 'KRC Genk', aliases: ['KRC Genk'] }
  ],
  'Saudi-Arabië': [
    { name: 'Al-Nassr', aliases: ['Al-Nassr', 'Al-Nassr FC'] },
    { name: 'Al-Hilal', aliases: ['Al-Hilal', 'Al-Hilal SFC'] },
    { name: 'Al-Ittihad', aliases: ['Al-Ittihad', 'Al-Ittihad Club'] },
    { name: 'Al-Ahli', aliases: ['Al-Ahli', 'Al-Ahli SFC'] }
  ]
};

const BLOCKED_EXACT = new Set([
  'career break', 'retired', 'retirement', 'without club', 'without club since',
  'free agent', 'free transfer', 'end of career', 'unknown', 'no club', 'unattached'
]);
const BLOCKED_PATTERNS = [
  /career\s*break/i, /without\s*(a\s*)?club/i, /end of career/i,
  /retired/i, /free agent/i, /unattached/i
];
const YOUTH_COMPETITION_PATTERNS = [
  /primavera/i, /u\s?-?\d{2}/i, /under\s?\d{2}/i, /youth/i, /junior/i,
  /reserve/i, /res\.$/i, /premier league 2/i, /liga revelação/i
];

let DB = null;
let ACH = null;
let players = [];
let achievementCategories = [];
let legacyCount = 0;
let clubIndex = new Map();
let competitionIndex = new Map();
let internationalIndex = new Map();
let awardIndex = new Map();
let poolCategories = [];
let suspiciousValues = [];

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const fmt = (n) => new Intl.NumberFormat('nl-NL').format(n);
const normalize = (v='') => String(v).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim().replace(/\s+/g,' ');
const identityName = (v='') => normalize(String(v).replace(/^\*\s*/, '').replace(/\s*\(\d+\)\s*$/, ''));

// Curated historic careers for Oranje players that are missing from the Transfermarkt bulk dataset.
// Only first-team clubs relevant to FootballMind's play pool are listed here.
const LEGACY_CAREERS = {
  'jan jongbloed': [],
  'john nicolaas rep': ['Ajax'],
  'johan cruijff': ['Ajax','FC Barcelona','Feyenoord'],
  'arie haan': ['Ajax','Anderlecht','Standard Luik','PSV'],
  'willem van hanegem': ['Feyenoord','AZ','FC Utrecht'],
  'johan neeskens': ['Ajax','FC Barcelona','FC Groningen'],
  'rob rensenbrink': ['Club Brugge','Anderlecht'],
  'wim rijsbergen': ['Feyenoord'],
  'wim suurbier': ['Ajax','Schalke 04'],
  'ruud krol': ['Ajax','Napoli'],
  'wim jansen': ['Feyenoord','Ajax'],
  'ruud geels': ['Feyenoord','Ajax','PSV','Anderlecht','Club Brugge'],
  'kees van ierssel': ['FC Twente'],
  'rinus israel': ['Feyenoord'],
  'piet keizer': ['Ajax'],
  'rene van de kerkhof': ['PSV'],
  'willy van de kerkhof': ['PSV'],
  'piet schrijvers': ['FC Twente','Ajax'],
  'pleun strik': ['PSV','NEC'],
  'eddy treijtel': ['Feyenoord','AZ'],
  'harry vos': ['ADO Den Haag','Feyenoord'],
  'theo de jong': ['Feyenoord'],
  // EK 1988 - complete careers within FootballMind's playable club pool
  'hans van breukelen': ['FC Utrecht','PSV'],
  'joop hiele': ['Feyenoord'],
  'adri van tiggelen': ['Sparta Rotterdam','Anderlecht','PSV'],
  'sjaak troost': ['Feyenoord'],
  'ronald koeman': ['FC Groningen','Ajax','PSV','FC Barcelona','Feyenoord'],
  'aron winter': ['Ajax','Lazio','Inter'],
  'berry van aerle': ['PSV'],
  'gerald vanenburg': ['Ajax','PSV','FC Utrecht'],
  'arnold muhren': ['Ajax'],
  'john bosman': ['Ajax','PSV','FC Twente','AZ','Anderlecht'],
  'ruud gullit': ['Feyenoord','PSV','AC Milan','Chelsea'],
  "john van 't schip": ['Ajax'],
  'marco van basten': ['Ajax','AC Milan'],
  'erwin koeman': ['FC Groningen','PSV'],
  'willem kieft': ['Ajax','PSV','Torino'],
  'wim koevermans': ['FC Groningen'],
  'wilbert suvrijn': [],
  'frank rijkaard': ['Ajax','AC Milan'],
  'hendrie kruzen': ['PSV'],
  'jan wouters': ['FC Utrecht','Ajax','Bayern München','PSV']
};

function addToIndex(map, raw, playerId) {
  const key = normalize(raw);
  if (!key) return;
  if (!map.has(key)) map.set(key, new Set());
  map.get(key).add(playerId);
}
function unionSets(sets) {
  const out = new Set();
  for (const s of sets) if (s) for (const id of s) out.add(id);
  return out;
}
function intersect(a, b) {
  if (!a || !b) return new Set();
  const [small, big] = a.size <= b.size ? [a,b] : [b,a];
  const out = new Set();
  for (const id of small) if (big.has(id)) out.add(id);
  return out;
}
function clubSet(club) {
  // Match both the FootballMind canonical club name and all database aliases.
  // Legacy careers are stored with canonical names (e.g. 'PSV'), while the raw
  // database may use an alias (e.g. 'PSV Eindhoven'). Using both prevents
  // valid Legacy players from disappearing from combinations.
  return unionSets([club.name, ...(club.aliases || [])].map(a => clubIndex.get(normalize(a))));
}

function categorySet(cat) {
  if (cat.kind === 'club') return clubSet(cat.club);
  const index = cat.kind === 'competition' ? competitionIndex : cat.kind === 'country' ? internationalIndex : awardIndex;
  return index.get(normalize(cat.value)) || new Set();
}
function difficultyForCount(count) {
  // V1: bewust voorlopige grenzen; later tunen met echte speltests.
  if (count <= 1) return { key:'reject', label:'AFKEUREN' };
  if (count <= 4) return { key:'hard', label:'MOEILIJK' };
  if (count <= 12) return { key:'medium', label:'GEMIDDELD' };
  return { key:'easy', label:'MAKKELIJK' };
}
function knownnessTier(club) {
  // Bekendheid is bewust handmatig binnen onze gekozen pool.
  const easyNames = new Set(['Ajax','PSV','Feyenoord','Manchester City','Chelsea','Arsenal','Manchester United','Liverpool','Real Madrid','FC Barcelona','Atlético Madrid','Inter','AC Milan','Juventus','Bayern München','Borussia Dortmund','Paris Saint-Germain','Benfica','FC Porto','Sporting CP']);
  const hardNames = new Set(['ADO Den Haag','NEC','KV Mechelen','Standard Luik','KAA Gent','KRC Genk','Lille','Hamburger SV','Werder Bremen','Schalke 04','VfB Stuttgart']);
  if (easyNames.has(club.name)) return 'easy';
  if (hardNames.has(club.name)) return 'hard';
  return 'medium';
}

async function loadDatabase() {
  try {
    const [r, ar] = await Promise.all([
      fetch(DB_PATH, { cache:'no-store' }),
      fetch(ACH_PATH, { cache:'no-store' })
    ]);
    if (!r.ok) throw new Error(`Spelersdatabase HTTP ${r.status}`);
    if (!ar.ok) throw new Error(`Achievements HTTP ${ar.status}`);
    DB = await r.json();
    ACH = await ar.json();
    players = Array.isArray(DB.players) ? DB.players : [];
    achievementCategories = [...new Set((Array.isArray(ACH?.records) ? ACH.records : [])
      .map(r => r?.category)
      .filter(Boolean))].sort((a,b) => a.localeCompare(b, 'nl'));
    buildIndexes();
    mergeAchievements();
    buildPoolCategories();
    scanIssues();
    renderAll();
    $('#loadBadge').textContent = `V3.5 Oranje Legacy klaar • ${fmt(players.length)} spelers • ${fmt(legacyCount)} legacy • ${fmt(achievementCategories.length)} achievements`;
    $('#loadBadge').className = 'badge badge-ok';
    $('#analyzeComboBtn').disabled = false;
    $('#generateGridBtn').disabled = false;
    $('#exportPoolBtn').disabled = false;
  } catch (err) {
    console.error(err);
    $('#loadBadge').textContent = 'Database kon niet laden';
    $('#loadBadge').className = 'badge badge-error';
    $('#poolGroups').innerHTML = `<div class="result"><strong>Data kon niet worden geladen.</strong><br><br>Controleer of <code>data/FootballMind_database.json</code> én <code>data/FootballMind_achievements.json</code> bestaan en start via Live Server.<br><small>${err.message}</small></div>`;
  }
}

function buildIndexes() {
  players.forEach((p, id) => {
    (p.clubs || []).forEach(v => addToIndex(clubIndex, v, id));
    (p.competitions || []).forEach(v => addToIndex(competitionIndex, v, id));
    (p.internationalTeams || []).forEach(v => addToIndex(internationalIndex, v, id));
    (p.awards || []).forEach(v => addToIndex(awardIndex, v, id));
  });
}

function mergeAchievements() {
  const nameMap = new Map();
  players.forEach((p,id) => {
    for (const n of [p.name, ...(p.aliases||[])]) {
      const k=identityName(n); if (!k) continue;
      if (!nameMap.has(k)) nameMap.set(k, []);
      nameMap.get(k).push(id);
    }
  });
  const legacyByIdentity = new Map();
  const records = Array.isArray(ACH?.records) ? ACH.records : [];
  const clubMatchesPlayer = (playerId, clubName) => {
    if (!clubName) return false;
    const wanted=normalize(clubName);
    return (players[playerId]?.clubs||[]).some(c=>normalize(c)===wanted);
  };
  const makeLegacy = (identityKey, displayName) => {
    if (legacyByIdentity.has(identityKey)) return legacyByIdentity.get(identityKey);
    const id=players.length;
    const curatedClubs = [...(LEGACY_CAREERS[identityName(displayName)] || [])];
    players.push({id:`LEGACY-${identityKey}`,name:displayName,aliases:[displayName],clubs:curatedClubs,internationalTeams:[],awards:[],competitions:[],source:'FootballMind Legacy'});
    curatedClubs.forEach(c => addToIndex(clubIndex,c,id));
    legacyByIdentity.set(identityKey,id); legacyCount++; return id;
  };
  for (const rec of records) {
    const key=identityName(rec.player); if (!key || !rec.category) continue;
    const ids=[...new Set(nameMap.get(key)||[])];
    let id=null, displayName=rec.player;
    if (key==='luis suarez' && rec.category==='Ballon d’Or-winnaar' && String(rec.season)==='1960') {
      displayName='Luis Suárez Miramontes';
      id=makeLegacy('luis-suarez-miramontes-1935',displayName);
    } else if (ids.length===1) {
      id=ids[0];
    } else if (ids.length>1 && rec.club_at_award) {
      const clubIds=ids.filter(pid=>clubMatchesPlayer(pid,rec.club_at_award));
      if (clubIds.length===1) id=clubIds[0];
    }
    if (id===null) {
      const identity=ids.length>1 ? `${key}|${normalize(rec.club_at_award||'unknown')}` : key;
      id=makeLegacy(identity,displayName);
    }
    const p=players[id];
    const curated = LEGACY_CAREERS[key] || [];
    if (!p.clubs) p.clubs=[];
    for (const c of curated) {
      if (!p.clubs.some(x=>normalize(x)===normalize(c))) { p.clubs.push(c); addToIndex(clubIndex,c,id); }
    }
    if (!p.awards) p.awards=[];
    if (!p.awards.includes(rec.category)) p.awards.push(rec.category);
    addToIndex(awardIndex,rec.category,id);
    if (rec.club_at_award && !p.clubs.some(c=>normalize(c)===normalize(rec.club_at_award))) {
      p.clubs.push(rec.club_at_award); addToIndex(clubIndex,rec.club_at_award,id);
    }
  }
}

function buildPoolCategories() {
  poolCategories = [];
  Object.entries(PLAY_POOL).forEach(([country, clubs]) => clubs.forEach(club => {
    poolCategories.push({ id:`club:${country}:${club.name}`, kind:'club', label:club.name, country, club, knownness:knownnessTier(club) });
  }));
  achievementCategories.forEach(value => poolCategories.push({id:`award:${value}`,kind:'award',label:value,value,knownness:'medium'}));
}

function scanIssues() {
  const counts = new Map();
  const inspect = (value, type) => {
    const n = normalize(value);
    let reason = null;
    if (BLOCKED_EXACT.has(n) || BLOCKED_PATTERNS.some(rx => rx.test(value))) reason = 'Geen echte clubstatus/categorie';
    else if (type === 'competition' && YOUTH_COMPETITION_PATTERNS.some(rx => rx.test(value))) reason = 'Jeugd/reservecompetitie';
    if (!reason) return;
    const key = `${type}|${value}`;
    const old = counts.get(key) || { type, value, reason, count:0 };
    old.count++;
    counts.set(key, old);
  };
  for (const p of players) {
    (p.clubs || []).forEach(v => inspect(v,'club'));
    (p.competitions || []).forEach(v => inspect(v,'competition'));
  }
  suspiciousValues = [...counts.values()].sort((a,b)=>b.count-a.count);
}

function renderAll() {
  $('#statPlayers').textContent = fmt(players.length);
  $('#statPoolClubs').textContent = fmt(poolCategories.length);
  $('#statCompetitions').textContent = fmt(competitionIndex.size);
  $('#statSuspicious').textContent = fmt(suspiciousValues.length);
  renderPool(); renderSelects(); renderIssues();
}
function renderPool() {
  $('#poolGroups').innerHTML = Object.entries(PLAY_POOL).map(([country, clubs]) => `
    <section class="country"><h3>${country} · ${clubs.length} clubs</h3><div class="club-list">
      ${clubs.map(club => {
        const set = clubSet(club); const diff = knownnessTier(club);
        return `<div class="club-row"><div><b>${club.name}</b><br><small>${club.aliases.join(' · ')}</small></div><div><strong>${fmt(set.size)}</strong><br><span class="pill ${diff}">${diff === 'easy' ? 'bekend' : diff === 'medium' ? 'midden' : 'specifieker'}</span></div></div>`;
      }).join('')}
    </div></section>`).join('');
}
function renderSelects() {
  const awards = `<optgroup label="Achievements">${achievementCategories.map(a=>`<option value="award:${encodeURIComponent(a)}">${a}</option>`).join('')}</optgroup>`;
  const clubs = Object.entries(PLAY_POOL).map(([country, cs]) => `<optgroup label="${country}">${cs.map(c=>`<option value="club:${country}:${encodeURIComponent(c.name)}">${c.name}</option>`).join('')}</optgroup>`).join('');
  $('#comboA').innerHTML = clubs + awards;
  $('#comboB').innerHTML = clubs + awards;
  if ($('#comboB').options.length > 1) $('#comboB').selectedIndex = 1;
}
function decodeSelect(value) {
  if (value.startsWith('award:')) { const v=decodeURIComponent(value.slice(6)); return {kind:'award',label:v,value:v}; }
  const [, country, encodedName] = value.split(':');
  const name = decodeURIComponent(encodedName);
  const club = PLAY_POOL[country]?.find(c => c.name === name);
  return { kind:'club', label:name, country, club };
}
function analyzeCombo() {
  const a = decodeSelect($('#comboA').value), b = decodeSelect($('#comboB').value);
  const ids = intersect(categorySet(a), categorySet(b));
  const diff = difficultyForCount(ids.size);
  const names = [...ids].slice(0,80).map(id => players[id]?.name).filter(Boolean).sort((x,y)=>x.localeCompare(y,'nl'));
  $('#comboResult').className = 'result';
  $('#comboResult').innerHTML = `<div class="result-head"><div><strong>${a.label} × ${b.label}</strong><br><small>${fmt(ids.size)} geldige spelers gevonden</small></div><span class="pill ${diff.key}">${diff.label}</span></div>${names.length ? `<ol class="player-list">${names.map(n=>`<li>${n}</li>`).join('')}</ol>${ids.size>80?`<p>Alleen de eerste 80 namen worden getoond.</p>`:''}` : '<p>Geen geldige spelers gevonden.</p>'}`;
}

function weightedPool(target) {
  const wanted = target === 'easy' ? ['easy','medium'] : target === 'medium' ? ['easy','medium','hard'] : ['medium','hard','easy'];
  return poolCategories.filter(c => wanted.includes(c.knownness));
}
function pickDistinct(arr, n, excludeCountries = new Set()) {
  const pool = arr.filter(x=>!excludeCountries.has(x.country));
  const shuffled = [...pool].sort(()=>Math.random()-.5); const out=[]; const used=new Set();
  for (const x of shuffled) { if (used.has(x.label)) continue; out.push(x); used.add(x.label); if(out.length===n) break; }
  return out;
}
function generateGrid() {
  const target = $('#gridTargetDifficulty').value;
  const source = weightedPool(target);
  let best = null;
  for (let attempt=0; attempt<250; attempt++) {
    const cols = pickDistinct(source,3);
    const rows = pickDistinct(source,3,new Set());
    if (cols.length<3 || rows.length<3) continue;
    const duplicate = rows.some(r=>cols.some(c=>r.label===c.label)); if(duplicate) continue;
    const cells=[]; let rejected=0, easy=0, medium=0, hard=0; let min=Infinity, total=0;
    for (const r of rows) for (const c of cols) {
      const count=intersect(categorySet(r),categorySet(c)).size; const d=difficultyForCount(count); cells.push({r,c,count,d}); total+=count; min=Math.min(min,count); if(d.key==='reject')rejected++; else if(d.key==='easy')easy++; else if(d.key==='medium')medium++; else hard++;
    }
    const targetPenalty = target==='easy' ? (hard*25 + medium*5) : target==='medium' ? (easy*2 + hard*6) : (easy*8 + medium*2);
    const score = rejected*1000 + targetPenalty - Math.min(total,300)/30;
    if (!best || score < best.score) best={rows,cols,cells,rejected,easy,medium,hard,min,total,score};
    if (rejected===0 && ((target==='easy'&&hard===0) || (target==='medium'&&hard<=2) || (target==='hard'&&hard>=3))) break;
  }
  renderGrid(best,target);
}
function renderGrid(g,target) {
  if(!g) return;
  const label = g.rejected ? 'AFKEUREN' : g.hard>=3 ? 'MOEILIJK' : g.medium>=3 ? 'GEMIDDELD' : 'MAKKELIJK';
  const cls = g.rejected ? 'reject' : label==='MOEILIJK'?'hard':label==='GEMIDDELD'?'medium':'easy';
  $('#gridSummary').className='grid-summary';
  $('#gridSummary').innerHTML=`<div class="result-head"><div><strong>Bordadvies: ${label}</strong><br><small>Doel: ${target==='easy'?'Makkelijk':target==='medium'?'Gemiddeld':'Moeilijk'} · minimum ${g.min} antwoorden in één vak · ${g.rejected} afgekeurde vakken</small></div><span class="pill ${cls}">${label}</span></div>`;
  let html='<div class="grid-cell header corner">×</div>'+g.cols.map(c=>`<div class="grid-cell header">${c.label}</div>`).join('');
  for(const r of g.rows){ html+=`<div class="grid-cell header">${r.label}</div>`; for(const c of g.cols){ const cell=g.cells.find(x=>x.r===r&&x.c===c); html+=`<div class="grid-cell"><small>${r.label} × ${c.label}</small><span class="count">${cell.count}</span><span class="pill ${cell.d.key}">${cell.d.label}</span></div>`; } }
  $('#gridBoard').innerHTML=html;
}
function renderIssues() {
  if (!suspiciousValues.length) { $('#issuesList').innerHTML='<div class="result">Geen verdachte waarden gevonden.</div>'; return; }
  $('#issuesList').innerHTML=suspiciousValues.slice(0,150).map(x=>`<div class="issue"><div><strong>${x.value}</strong><br><small>${x.reason}</small></div><small>${x.type}</small><strong>${fmt(x.count)}×</strong></div>`).join('');
}
function exportPoolCounts() {
  const data = Object.entries(PLAY_POOL).flatMap(([country,clubs])=>clubs.map(club=>({country,club:club.name,players:clubSet(club).size,aliases:club.aliases,knownness:knownnessTier(club)})));
  const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download='footballmind_pool_analyse.json'; a.click(); setTimeout(()=>URL.revokeObjectURL(a.href),1000);
}

$$('.tab').forEach(btn=>btn.addEventListener('click',()=>{ $$('.tab').forEach(x=>x.classList.remove('active')); $$('.panel').forEach(x=>x.classList.remove('active')); btn.classList.add('active'); $(`#panel-${btn.dataset.tab}`).classList.add('active'); }));
$('#analyzeComboBtn').addEventListener('click',analyzeCombo);
$('#generateGridBtn').addEventListener('click',generateGrid);
$('#exportPoolBtn').addEventListener('click',exportPoolCounts);

loadDatabase();
