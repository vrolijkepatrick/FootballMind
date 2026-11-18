/* Solo rounds reuse the canonical database, search and answer route. */
const FootballMindSolo = (() => {
  const storageKey = 'footballmind-solo-results-v1';
  let startedAt = null, elapsed = 0, ticker = null, roundId = null, finished = false;
  let difficulty = 'medium';
  const score = () => Object.keys(state.answers).length;
  const duration = () => startedAt === null ? elapsed : performance.now() - startedAt;
  const formatTime = ms => {
    const seconds = Math.floor(ms / 1000);
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  };
  function results() {
    try {
      const list = JSON.parse(localStorage.getItem(storageKey) || '[]');
      return Array.isArray(list) ? list.filter(r => r && typeof r.id === 'string' && typeof r.name === 'string' && Number.isInteger(r.score) && r.score >= 13 && r.score <= 25 && Number.isFinite(r.elapsedMs) && r.elapsedMs >= 0 && ['easy','medium','hard'].includes(r.difficulty) && Number.isFinite(Date.parse(r.date))) : [];
    } catch { return []; }
  }
  const ranked = level => results().filter(r => r.difficulty === level).sort((a,b) => b.score-a.score || a.elapsedMs-b.elapsedMs || a.date.localeCompare(b.date));
  function stopClock() {
    elapsed = duration(); startedAt = null;
    clearInterval(ticker); ticker = null;
  }
  function generateBoard(level = difficulty) {
    const clubs = availableClues(['Ajax','PSV','Feyenoord','Barcelona','Real Madrid','Manchester United','Liverpool','Arsenal','Chelsea','Manchester City','Bayern München','Borussia Dortmund','Juventus','AC Milan','Inter','Paris Saint-Germain'], ['clubs']);
    const nations = availableClues(['Nederland','Engeland','Frankrijk','Duitsland','Spanje','Italië','Portugal','Brazilië','Argentinië','Denemarken','België','Zweden','Servië','Kroatië','Uruguay'], ['internationalTeams']);
    const extra = level === 'easy' ? [] : availableClues(['Champions League winnaar',"Ballon d'Or",'Topscorer Eredivisie','Topscorer Premier League','Topscorer Serie A','Topscorer Bundesliga','Topscorer Ligue 1'], ['awards']);
    const minimum = level === 'easy' ? 2 : 1;
    for (let attempt = 0; attempt < 500; attempt++) {
      const columns = shuffled(clubs).slice(0,5);
      const rows = shuffled([...nations, ...extra]).filter(row => columns.every(col => countValidPlayers(row,col,minimum) >= minimum)).slice(0,5);
      if(columns.length === 5 && rows.length === 5) return { rows, columns };
    }
    throw new Error('Geen volledig oplosbaar 5×5-bord gevonden. Probeer opnieuw.');
  }
  function update() {
    const count = score();
    document.getElementById('fmSoloTime').textContent = formatTime(duration());
    document.getElementById('fmSoloScore').textContent = `${count} / 25`;
    const stop = document.getElementById('fmSoloFinish');
    stop.disabled = count < 13 || state.gameOver;
    document.getElementById('fmSoloStop').disabled = state.gameOver;
    const hint = state.gameOver ? 'Ronde afgelopen' : count < 13 ? `Je kunt altijd stoppen. Nog ${13-count} goede antwoorden om je score te kunnen opslaan.` : 'Je kunt stoppen en opslaan, of doorspelen voor een hogere score.';
    if(document.getElementById('fmSoloHint').textContent !== hint) document.getElementById('fmSoloHint').textContent = hint;
  }
  function start() {
    difficulty = document.getElementById('fmStartScreen').dataset.difficulty || 'medium';
    let board;
    try { board = generateBoard(); }
    catch(error) { document.getElementById('fmSoloStartHint').textContent = error.message; return; }
    clearInterval(ticker);
    elapsed = 0; startedAt = null; finished = false;
    roundId = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
    document.body.classList.remove('fm-teams-active');
    state.mode = 'solo'; state.rows = board.rows; state.columns = board.columns;
    state.answers = {}; state.selected = null; state.currentPlayer = 1;
    state.usedPlayerNames = new Set(); state.gameOver = false; state.winningLine = [];
    state.revealWinningLine = false; state.justCorrect = null; state.winner = null;
    state.matchStarted = true; state.consecutivePasses = 0;
    state.players[1].name = cleanPlayerName(document.getElementById('fmPlayerName1').value) || 'Speler 1';
    document.getElementById('difficulty').value = difficulty;
    document.getElementById('difficulty').disabled = true;
    document.getElementById('levelText').textContent = difficultyName(difficulty);
    document.body.classList.add('fm-solo-active');
    closePlayerSearch(); closeWinnerModal();
    renderBoard();
    document.getElementById('fmStartScreen').classList.add('closed');
    startedAt = performance.now();
    ticker = setInterval(update, 200);
    update(); showMessage('Vul zoveel mogelijk vakken. De tijd loopt!');
  }
  function finish({save = true} = {}) {
    if (state.mode !== 'solo' || !state.matchStarted || finished || (save && score() < 13)) return false;
    stopClock(); finished = true; state.gameOver = true;
    closePlayerSearch();
    const result = {id:roundId, name:state.players[1].name, score:score(), elapsedMs:Math.floor(elapsed), date:new Date().toISOString(), difficulty};
    let saved = false;
    try { if(save) { const list=results(); if(!list.some(r=>r.id===roundId)) {list.push(result);localStorage.setItem(storageKey,JSON.stringify(list));} saved = true; } }
    catch { saved = false; }
    renderBoard(); update();
    const message = !save ? 'Ronde gestopt. Je score is niet opgeslagen.' : saved ? 'Je resultaat is opgeslagen.' : 'Opslaan is niet gelukt: lokale opslag is niet beschikbaar. Noteer je resultaat.';
    showLeaderboard(`${result.score}/25 goed in ${formatTime(result.elapsedMs)}. ${message}`, difficulty);
    return true;
  }
  function afterAnswer() { update(); if(score() === 25) return finish(); return false; }
  function leave() {
    if (state.mode === 'solo' && state.matchStarted && !state.gameOver && !confirm('Deze ronde verlaten? Je huidige resultaat wordt niet opgeslagen.')) return false;
    stopClock(); state.mode = 'duel';
    document.body.classList.remove('fm-solo-active');
    document.getElementById('difficulty').disabled = false;
    return true;
  }
  function showLeaderboard(message = '', level = difficulty) {
    const dialog = document.getElementById('fmSoloLeaderboard');
    document.getElementById('fmSoloMissedAnswers').hidden = state.mode !== 'solo' || !state.gameOver || score() >= 25;
    document.getElementById('fmSoloResult').textContent = message;
    document.getElementById('fmSoloRankingLevel').value = level;
    paintLeaderboard();
    if(!dialog.open) dialog.showModal();
  }
  function paintLeaderboard() {
    const list=ranked(document.getElementById('fmSoloRankingLevel').value);
    const body=document.getElementById('fmSoloRankingRows'); body.replaceChildren();
    document.getElementById('fmSoloEmpty').hidden = list.length > 0;
    for(const [i,result] of list.entries()) {
      const tr=document.createElement('tr');
      for(const value of [i+1,result.name,`${result.score}/25`,formatTime(result.elapsedMs),new Date(result.date).toLocaleDateString('nl-NL')]) {
        const td=document.createElement('td');td.textContent=value;tr.appendChild(td);
      }
      body.appendChild(tr);
    }
  }
  function init() {
    const screen=document.getElementById('fmStartScreen');
    const modes=document.createElement('div');modes.className='fm-solo-mode-picker';
    modes.innerHTML='<button type="button" data-play-mode="duel" aria-pressed="true">Samen · 3×3</button><button type="button" data-play-mode="solo" aria-pressed="false">Solo · 5×5</button><button type="button" data-play-mode="teams" aria-pressed="false">Teams · 5×5</button><button type="button" id="fmSoloScoresStart">Mijn klassement</button><p id="fmSoloStartHint">Solo: de tijd loopt op. Je kunt altijd stoppen. Vanaf 13 goede antwoorden kun je je score opslaan. Bij 25 stopt de ronde vanzelf. Fouten kosten alleen tijd; dezelfde speler mag in meerdere passende vakken.</p>';
    screen.querySelector('.fm-start-setup').before(modes);
    screen.dataset.mode='duel';
    modes.querySelectorAll('[data-play-mode]').forEach(button=>button.addEventListener('click',()=>{
      screen.dataset.mode=button.dataset.playMode;
      document.body.classList.toggle('fm-teams-active', screen.dataset.mode === 'teams');
      for (const number of [1,2]) {
        screen.querySelector('.player-'+number+' .fm-start-player-top strong').textContent = (screen.dataset.mode === 'teams' ? 'TEAM ' : 'SPELER ') + number;
      }
      if (screen.dataset.mode !== 'solo') {
        try {
          const key = screen.dataset.mode === 'teams' ? 'footballmind-team-setup-v1' : 'footballmind-match-setup-v1';
          const saved = JSON.parse(localStorage.getItem(key) || 'null');
          for (const number of [1,2]) document.getElementById('fmPlayerName'+number).value = saved?.players?.[number]?.name || (screen.dataset.mode === 'teams' ? 'Team ' : 'Speler ') + number;
        } catch {}
      }
      screen.classList.toggle('fm-solo-setup',screen.dataset.mode==='solo');
      modes.querySelectorAll('[data-play-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    }));
    const panel=document.createElement('section');panel.id='fmSoloPanel';panel.className='fm-panel';
    panel.innerHTML='<h2>SOLO · 5×5</h2><div class="fm-solo-metrics"><div><small>GOED</small><strong id="fmSoloScore">0 / 25</strong></div><div><small>TIJD</small><strong id="fmSoloTime" role="timer">0:00</strong></div></div><p id="fmSoloHint" aria-live="polite"></p><button id="fmSoloFinish" type="button" disabled>Stoppen & opslaan</button><button id="fmSoloScores" type="button">Mijn klassement</button><p>Zoek een speler die bij rij én kolom past. Fout? Probeer opnieuw. De klok loopt door, ook als je het tabblad verlaat.</p><p>Op je telefoon kun je het bord zijwaarts schuiven.</p>';
    document.querySelector('.fm-sidebar').prepend(panel);
    const dialog=document.createElement('dialog');dialog.id='fmSoloLeaderboard';
    dialog.innerHTML='<h2>Jouw soloklassement</h2><p id="fmSoloResult" role="status"></p><p>Hoogste score eerst; bij gelijke score telt de snelste tijd. Resultaten worden op dit apparaat in deze browser bewaard.</p><label>Niveau <select id="fmSoloRankingLevel"><option value="easy">Makkelijk</option><option value="medium">Gemiddeld</option><option value="hard">Moeilijk</option></select></label><div class="fm-solo-table"><table><thead><tr><th>Plek</th><th>Naam</th><th>Goed</th><th>Tijd</th><th>Datum</th></tr></thead><tbody id="fmSoloRankingRows"></tbody></table></div><p id="fmSoloEmpty">Nog geen resultaten op dit niveau. Haal minstens 13 goede antwoorden.</p><form method="dialog"><button>Sluiten</button></form>';
    document.body.appendChild(dialog);
    const missedAnswers = document.createElement('button');
    missedAnswers.id = 'fmSoloMissedAnswers';
    missedAnswers.type = 'button';
    missedAnswers.textContent = 'Gemiste antwoorden';
    missedAnswers.hidden = true;
    missedAnswers.style.cssText = 'float:none;margin:12px 0';
    missedAnswers.addEventListener('click', () => {
      if (state.mode !== 'solo' || !state.gameOver) return;
      dialog.close();
      showMissedFootballMindAnswers();
    });
    dialog.querySelector('form').before(missedAnswers);
    document.getElementById('fmSoloRankingLevel').addEventListener('change',paintLeaderboard);
    const stopButton = document.createElement('button');
    stopButton.id = 'fmSoloStop';
    stopButton.type = 'button';
    stopButton.textContent = 'Stoppen';
    document.getElementById('fmSoloFinish').before(stopButton);
    stopButton.addEventListener('click', () => finish({save:false}));
    document.getElementById('fmSoloFinish').addEventListener('click', () => finish());
    for(const id of ['fmSoloScores','fmSoloScoresStart']) document.getElementById(id).addEventListener('click',()=>showLeaderboard());
    const teamsButton = document.createElement('button');
    teamsButton.type = 'button';
    teamsButton.textContent = 'Teams 5×5';
    teamsButton.addEventListener('click', () => {
      showStartScreen();
      if (!screen.classList.contains('closed')) modes.querySelector('[data-play-mode="teams"]').click();
    });
    document.querySelector('.fm-mode-buttons').appendChild(teamsButton);
    document.querySelector('.fm-mode-buttons button:first-child').addEventListener('click', () => {
      showStartScreen();
      if (!screen.classList.contains('closed')) modes.querySelector('[data-play-mode="duel"]').click();
    });
    const teamsStyle = document.createElement('style');
    teamsStyle.textContent = '.fm-teams-active .fm-pitch-shell{overflow-x:auto;max-width:100%}.fm-teams-active #board{grid-template-columns:105px repeat(5,minmax(100px,1fr));grid-template-rows:90px repeat(5,110px);min-width:660px;gap:5px}.fm-teams-active #board .fm-clue-label{font-size:11px;overflow-wrap:anywhere}.fm-teams-active #board .fm-clue-icon{font-size:30px}.fm-teams-active #board .fm-correct-name{font-size:12px;white-space:normal}.fm-teams-active #board .fm-correct-photo-wrap{width:44px;height:44px;flex-basis:44px}.fm-mode-buttons{flex-wrap:wrap}';
    document.head.appendChild(teamsStyle);
    const soloButton=document.querySelector('.fm-mode-buttons button:nth-child(2)');soloButton.disabled=false;
    soloButton.textContent='Solo 5 × 5';soloButton.addEventListener('click',()=>{showStartScreen();if(!screen.classList.contains('closed')) modes.querySelector('[data-play-mode="solo"]').click();});
    window.addEventListener('beforeunload',event=>{if(state.mode==='solo' && state.matchStarted && !state.gameOver){event.preventDefault();event.returnValue='';}});
  }
  return {init,start,update,finish,afterAnswer,leave,formatTime,ranked,generateBoard};
})();
FootballMindSolo.init();

