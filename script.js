'use strict';

const SAVE_KEY = 'footballCareerInteractiveV2';
const TEAM_NAMES = ['FC Rivière Bleue','AC Montclair','Olympique des Pins','Stade de Valbrume','US Clairval','AS Montfaucon','Étoile du Lac','FC Hautes-Terres'];
const DEFAULT_STATE = () => ({
  player:{name:'Alex Martin',position:'Attaquant',number:9,club:'FC Rivière Bleue',shooting:55,physical:55,teamwork:55},
  season:1, currentFixture:0, stats:{apps:0,starts:0,goals:0,assists:0,minutes:0,ratings:[],actions:0},
  fixtures:[], standings:[], lastMatch:null, objectiveMatches:0
});
let state = loadState();
let live = null;
let pendingResult = null;

const $ = id => document.getElementById(id);
const clamp = (n,min,max) => Math.max(min,Math.min(max,n));
const random = max => Math.floor(Math.random()*max);
const average = arr => arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0;

function createFixtures(){
  const teams = [...TEAM_NAMES];
  // Round-robin circle algorithm: 7 rounds, then reverse fixtures for a 14-round season.
  const rotation = teams.map((name,id)=>({id,name}));
  const firstHalf=[];
  for(let round=0;round<teams.length-1;round++){
    const games=[];
    for(let i=0;i<teams.length/2;i++){
      const a=rotation[i], b=rotation[teams.length-1-i];
      const home=(round+i)%2===0?a:b, away=home===a?b:a;
      games.push({round:round+1,homeId:home.id,awayId:away.id,home:home.name,away:away.name,homeGoals:null,awayGoals:null,played:false});
    }
    firstHalf.push(...games);
    const fixed=rotation[0]; const tail=rotation.pop(); rotation.splice(1,0,tail); rotation[0]=fixed;
  }
  const secondHalf=firstHalf.map(f=>({round:f.round+7,homeId:f.awayId,awayId:f.homeId,home:f.away,away:f.home,homeGoals:null,awayGoals:null,played:false}));
  return [...firstHalf,...secondHalf];
}
function loadState(){
  try{
    const saved=JSON.parse(localStorage.getItem(SAVE_KEY));
    if(saved && saved.player && Array.isArray(saved.fixtures) && Array.isArray(saved.standings)){
      const base=DEFAULT_STATE();
      return {...base,...saved,player:{...base.player,...saved.player},stats:{...base.stats,...saved.stats}};
    }
  }catch(err){ console.warn('Sauvegarde non chargée :',err); }
  const fresh=DEFAULT_STATE(); fresh.fixtures=createFixtures(); fresh.standings=TEAM_NAMES.map((name,id)=>({id,name,played:0,wins:0,draws:0,losses:0,for:0,against:0,points:0})); return fresh;
}
function saveState(){try{localStorage.setItem(SAVE_KEY,JSON.stringify(state));}catch(err){console.warn('Sauvegarde locale impossible :',err);}}
function getOverall(){return Math.round((state.player.shooting+state.player.physical+state.player.teamwork)/3);}
function getFixture(){return state.fixtures.find(f=>!f.played) || null;}
function teamName(id){return id===0?state.player.club:TEAM_NAMES[id]||'Club fictif';}
function refreshTeamNames(){state.fixtures.forEach(f=>{f.home=teamName(f.homeId);f.away=teamName(f.awayId);});if(state.standings[0])state.standings[0].name=state.player.club;}
function updatePlayerUI(){
  $('playerName').value=state.player.name; $('playerPosition').value=state.player.position; $('playerNumber').value=state.player.number; $('clubName').value=state.player.club;
  const overall=getOverall(); $('overall').textContent=overall; $('overallBar').style.width=overall+'%';
  ['shooting','physical','teamwork'].forEach(key=>{$(key+'Value').textContent=state.player[key];$(key+'Bar').style.width=state.player[key]+'%';});
  $('playerStatus').textContent=overall>=80?'Cadre de l’équipe · très haut niveau':overall>=65?'Joueur important · en progression':'Jeune espoir · prêt à faire ses preuves';
  $('apps').textContent=state.stats.apps; $('starts').textContent=state.stats.starts; $('goals').textContent=state.stats.goals; $('assists').textContent=state.stats.assists; $('minutes').textContent=state.stats.minutes; $('averageRating').textContent=state.stats.ratings.length?average(state.stats.ratings).toFixed(1):'—';
  $('objectiveProgress').textContent=`${state.objectiveMatches} / 5 matchs joués`; $('objectiveBar').style.width=Math.min(100,state.objectiveMatches/5*100)+'%';
  $('objectiveTitle').textContent=state.objectiveMatches>=5?'Objectif atteint !':'Gagner ta place';
  $('objectiveText').textContent=state.objectiveMatches>=5?'Tu as participé à cinq rencontres. Continue à progresser pour devenir un joueur incontournable.':'Participe à cinq rencontres pour atteindre ton premier objectif de carrière.';
}
function updatePreMatch(){
  const f=getFixture();
  $('preMatch').classList.remove('hidden'); $('liveMatch').classList.add('hidden'); $('postMatch').classList.add('hidden');
  if(!f){$('matchStatus').textContent='Saison terminée';$('matchRound').textContent='Fin de saison';$('homeTeam').textContent=state.player.club;$('awayTeam').textContent='Fin de saison';$('opponentInfo').textContent='Toutes les journées sont terminées. Réinitialise la carrière pour recommencer.';$('startStarter').disabled=true;$('startSub').disabled=true;return;}
  $('startStarter').disabled=false;$('startSub').disabled=false;
  $('matchStatus').textContent='À préparer'; $('matchRound').textContent=`Journée ${f.round}`; $('homeTeam').textContent=f.home; $('awayTeam').textContent=f.away;
  const isHome=f.homeId===0; $('matchVenue').textContent=isHome?'À domicile':'À l’extérieur'; $('kickoff').textContent='Coup d’envoi à venir';
  $('opponentInfo').textContent=`${isHome?'Tu joues à domicile contre':'Tu te déplaces chez'} ${isHome?f.away:f.home}. Prépare-toi à faire la différence.`;
}
function renderFixtures(){
  const body=$('fixtureTable'); body.innerHTML='';
  state.fixtures.forEach((f,index)=>{const tr=document.createElement('tr');let score='—',status='À jouer';if(f.played){score=`${f.homeGoals} - ${f.awayGoals}`;status='Terminé';}else if(live && live.fixtureIndex===index){status='En direct';}
    tr.innerHTML=`<td>${f.round}</td><td class="team-cell">${escapeHTML(f.home)} <span class="muted">vs</span> ${escapeHTML(f.away)}</td><td class="score-cell">${score}</td><td>${status}</td>`;body.appendChild(tr);});
  $('fixtureCount').textContent=`${state.fixtures.filter(f=>f.played).length} / ${state.fixtures.length} matchs terminés`;
}
function renderStandings(){
  const rows=state.standings.map(t=>({...t,name:t.id===0?state.player.club:t.name})).sort((a,b)=>b.points-a.points||(b.for-b.against)-(a.for-a.against)||b.for-a.for||a.name.localeCompare(b.name));
  $('standingsTable').innerHTML=''; rows.forEach((t,i)=>{const tr=document.createElement('tr');if(t.id===0)tr.classList.add('current-team');tr.innerHTML=`<td>${i+1}</td><td class="team-cell">${escapeHTML(t.name)}${t.id===0?' <span class="muted">(toi)</span>':''}</td><td>${t.played}</td><td>${t.wins}</td><td>${t.draws}</td><td>${t.losses}</td><td>${t.for-t.against>0?'+':''}${t.for-t.against}</td><td><b>${t.points}</b></td>`;$('standingsTable').appendChild(tr);});
}
function renderAll(){refreshTeamNames();updatePlayerUI();updatePreMatch();renderFixtures();renderStandings();}
function escapeHTML(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function beginMatch(asStarter){
  if(live)return; const f=getFixture(); if(!f)return;
  const playerHome=f.homeId===0;
  live={fixtureIndex:state.fixtures.indexOf(f),fixture:f,asStarter,minute:asStarter?1:1,playerOnPitch:!!asStarter,entered:!!asStarter,subbedOff:false,homeGoals:0,awayGoals:0,fatigue:0,rating:6.0,actions:0,successful:0,goals:0,assists:0,minutes:0,events:[],lastAction:null,ended:false};
  $('preMatch').classList.add('hidden');$('postMatch').classList.add('hidden');$('liveMatch').classList.remove('hidden');$('matchStatus').textContent='En direct';
  $('liveHomeName').textContent=f.home;$('liveAwayName').textContent=f.away;$('homeScore').textContent='0';$('awayScore').textContent='0';$('matchMinute').textContent='1\'';$('matchProgress').style.width='1%';$('liveMinutes').textContent='0 min';$('liveRating').textContent='6.0';$('liveFatigue').textContent='0%';$('actionFeedback').textContent='';$('commentary').innerHTML='';
  if(asStarter){setEvent('Coup d’envoi !',`Tu es titulaire avec ${state.player.club}. Le ballon circule au milieu de terrain. Choisis tes actions pour peser sur le match.`);addCommentary('Coup d’envoi ! Tu débutes la rencontre sur le terrain.');}
  else {setEvent('Sur le banc',`Tu commences remplaçant. Observe le match et clique sur « Continuer le match » pour faire avancer le temps jusqu’à une occasion d’entrer en jeu.`);addCommentary('Tu prends place sur le banc. Le coach pourrait faire appel à toi.');}
  updateLiveUI();
}
function setEvent(title,description){$('eventTitle').textContent=title;$('eventDescription').textContent=description;}
function addCommentary(text){const p=document.createElement('p');p.textContent=text;$('commentary').prepend(p);while($('commentary').children.length>8)$('commentary').lastElementChild.remove();}
function updateLiveUI(){
  if(!live)return;
  $('matchMinute').textContent=`${Math.min(90,live.minute)}'`; $('homeScore').textContent=live.homeGoals; $('awayScore').textContent=live.awayGoals; $('matchProgress').style.width=Math.min(100,live.minute/90*100)+'%';$('liveMinutes').textContent=`${live.minutes} min`;$('liveRating').textContent=live.rating.toFixed(1);$('liveFatigue').textContent=live.fatigue+'%';
  const actionsEnabled=live.playerOnPitch && !live.ended;
  document.querySelectorAll('[data-action]').forEach(btn=>btn.disabled=!actionsEnabled);
  $('advanceMatch').classList.toggle('hidden',live.ended);$('substituteMe').classList.toggle('hidden',!live.playerOnPitch||live.ended||live.subbedOff);
}
function advanceTime(){
  if(!live||live.ended)return;
  const step=live.minute<15?8:live.minute<70?10:7;live.minute=Math.min(90,live.minute+step);
  if(live.playerOnPitch){live.minutes+=step;live.fatigue=clamp(live.fatigue+Math.max(2,Math.round(step/3)),0,100);}
  const f=live.fixture; const homeAttack=Math.random()<.5;
  // A non-player event can change the score occasionally; all scores are generated fictionally.
  if(Math.random()<.28){const goal=Math.random()<.18;const team=homeAttack?f.home:f.away;if(goal){if(homeAttack)live.homeGoals++;else live.awayGoals++;const line=`${live.minute}' — BUT pour ${team} ! ${live.homeGoals}-${live.awayGoals}.`;addCommentary(line);setEvent('BUUUT !',line);live.rating=clamp(live.rating+(live.playerOnPitch&&((homeAttack&&f.homeId===0)||(!homeAttack&&f.awayId===0))?.1:0),4,10);}else{const line=`${live.minute}' — ${team} tente de construire une attaque, mais la défense reste solide.`;addCommentary(line);setEvent('Le jeu se poursuit',line);}}
  else {const line=`${live.minute}' — Le jeu se déroule au milieu de terrain. Le score reste ${live.homeGoals}-${live.awayGoals}.`;setEvent('Le match se poursuit',line);addCommentary(line);}
  if(!live.entered && live.minute>=55){live.entered=true;live.playerOnPitch=true;live.minutes=0;live.fatigue=0;setEvent('Le coach t’appelle !',`Tu entres en jeu à la ${live.minute}e minute. Profite de tes minutes pour aider ${state.player.club}.`);addCommentary(`${live.minute}' — Changement : tu entres sur le terrain !`);$('actionFeedback').textContent='Tu es entré en jeu. À toi de faire la différence !';}
  if(live.minute>=90){endMatch();return;}
  updateLiveUI();
}
function takeAction(action){
  if(!live||!live.playerOnPitch||live.ended)return;
  live.actions++;state.stats.actions++;
  const fatiguePenalty=live.fatigue*.12;
  const skill=action==='shoot'?state.player.shooting:action==='dribble'?state.player.physical:state.player.teamwork;
  const base=clamp(.42+(skill-50)/150-fatiguePenalty/100,.12,.88);
  let success=Math.random()<base;let msg='';
  if(action==='shoot'){
    if(success){const goalChance=.18+(state.player.shooting/100)*.28;if(Math.random()<goalChance){scoreForPlayerTeam();live.goals++;state.stats.goals++;live.rating=clamp(live.rating+.65,1,10);msg='BUT ! Tu conclus l’action avec sang-froid. Le public se lève !';addCommentary(`${live.minute}' — BUT de ${state.player.name} !`);setEvent('⚽ BUT !',msg);}else{live.rating=clamp(live.rating+.15,1,10);msg='Belle frappe cadrée, mais le gardien repousse le ballon.';addCommentary(`${live.minute}' — Ta frappe est arrêtée par le gardien.`);setEvent('Belle occasion',msg);}}
    else{live.rating=clamp(live.rating-.1,1,10);msg='Ta frappe est contrée par un défenseur. Replace-toi et tente une autre action.';addCommentary(`${live.minute}' — Frappe contrée.`);setEvent('Frappe contrée',msg);}
  }else if(action==='pass'){
    if(success){live.successful++;live.rating=clamp(live.rating+.18,1,10);if(Math.random()<.15){scoreForPlayerTeam();live.assists++;state.stats.assists++;live.rating=clamp(live.rating+.55,1,10);msg='Passe décisive ! Ton coéquipier transforme ton ballon en but.';addCommentary(`${live.minute}' — Passe décisive de ${state.player.name} !`);setEvent('Passe décisive !',msg);}else{msg='Passe réussie : tu trouves un partenaire entre les lignes et l’équipe conserve le ballon.';addCommentary(`${live.minute}' — Bonne passe vers un partenaire.`);setEvent('Bonne circulation',msg);}}
    else{msg='La passe est interceptée. L’adversaire récupère le ballon.';live.rating=clamp(live.rating-.12,1,10);addCommentary(`${live.minute}' — Passe interceptée.`);setEvent('Ballon perdu',msg);}
  }else if(action==='dribble'){
    if(success){live.successful++;live.rating=clamp(live.rating+.22,1,10);msg='Dribble réussi ! Tu élimines ton adversaire et fais avancer le jeu.';addCommentary(`${live.minute}' — ${state.player.name} réussit un joli dribble.`);setEvent('Adversaire éliminé',msg);if(Math.random()<.14){scoreForPlayerTeam();live.assists++;state.stats.assists++;msg+=' Tu délivres ensuite une passe décisive !';setEvent('Percée décisive',msg);}}
    else{live.rating=clamp(live.rating-.18,1,10);msg='Le défenseur a bien lu ton geste et récupère le ballon.';addCommentary(`${live.minute}' — Dribble stoppé par la défense.`);setEvent('Dribble stoppé',msg);}
  }else{
    if(success){live.successful++;live.rating=clamp(live.rating+.2,1,10);msg='Excellent choix collectif : tu aides l’équipe à garder le contrôle du ballon.';addCommentary(`${live.minute}' — Jeu collectif propre de ${state.player.name}.`);setEvent('Bon choix collectif',msg);if(Math.random()<.09){scoreForPlayerTeam();live.assists++;state.stats.assists++;msg+=' L’action se termine par une passe décisive !';setEvent('Action collective décisive',msg);}}
    else{msg='L’équipe perd le ballon dans la circulation. Replie-toi rapidement.';addCommentary(`${live.minute}' — Perte de balle au milieu.`);setEvent('Attention à la transition',msg);}
  }
  live.lastAction=action;live.fatigue=clamp(live.fatigue+6,0,100);$('actionFeedback').textContent=msg;updateLiveUI();
  // Each player action advances the match a few minutes without requiring an extra click.
  live.minute=Math.min(90,live.minute+4);live.minutes+=4;live.fatigue=clamp(live.fatigue+2,0,100);
  if(live.minute>=90){endMatch();return;}updateLiveUI();
}
function scoreForPlayerTeam(){if(live.fixture.homeId===0)live.homeGoals++;else live.awayGoals++;}
function askToBeSubbed(){if(!live||!live.playerOnPitch||live.ended)return;live.playerOnPitch=false;live.subbedOff=true;setEvent('Tu es remplacé',`Tu quittes le terrain après ${live.minutes} minutes de jeu. Encourage tes coéquipiers jusqu’au coup de sifflet final.`);addCommentary(`${live.minute}' — Tu es remplacé. Fin de ton match personnel.`);$('actionFeedback').textContent='Tu as terminé ton match. Tu peux suivre la fin de la rencontre.';updateLiveUI();}
function endMatch(){
  if(!live||live.ended)return;live.ended=true;live.minute=90;
  const f=live.fixture;f.played=true;f.homeGoals=live.homeGoals;f.awayGoals=live.awayGoals;
  const playerPlayed=live.entered&&live.minutes>0;
  if(playerPlayed){state.stats.apps++;state.stats.minutes+=live.minutes;state.stats.ratings.push(Number(live.rating.toFixed(1)));state.objectiveMatches++;if(live.asStarter)state.stats.starts++;}
  updateStandings(f);state.lastMatch={round:f.round,home:f.home,away:f.away,homeGoals:f.homeGoals,awayGoals:f.awayGoals,minutes:live.minutes,rating:live.rating,goals:live.goals,assists:live.assists};
  saveState();$('matchStatus').textContent='Terminé';$('liveMatch').classList.add('hidden');$('preMatch').classList.add('hidden');$('postMatch').classList.remove('hidden');
  const playerGoals=live.goals;let headline=f.homeGoals>f.awayGoals?`${f.home} remporte le match !`:f.homeGoals<f.awayGoals?`${f.away} remporte le match !`:'Match nul';$('finalHeadline').textContent=headline;$('finalHomeScore').textContent=f.homeGoals;$('finalAwayScore').textContent=f.awayGoals;
  $('finalSummary').textContent=playerPlayed?`${state.player.name} a joué ${live.minutes} minutes et termine avec une note de ${live.rating.toFixed(1)}/10.`:`Tu n’es pas entré en jeu lors de cette rencontre.`;
  $('finalMinutes').textContent=`${live.minutes} min`;$('finalRating').textContent=playerPlayed?`${live.rating.toFixed(1)}/10`:'Non noté';$('finalActions').textContent=`${live.successful}/${live.actions}`;
  const highlights=[];if(playerGoals)highlights.push(`⚽ ${playerGoals} but(s) marqué(s) par ${state.player.name}.`);if(live.assists)highlights.push(`🎯 ${live.assists} passe(s) décisive(s).`);highlights.push(`📊 Score final : ${f.home} ${f.homeGoals} - ${f.awayGoals} ${f.away}.`);highlights.push(playerPlayed?`⭐ Note individuelle : ${live.rating.toFixed(1)}/10.`:'🪑 Rencontre suivie depuis le banc.');$('matchHighlights').innerHTML=highlights.map(t=>`<p>${escapeHTML(t)}</p>`).join('');
  live=null;refreshTeamNames();updatePlayerUI();renderFixtures();renderStandings();saveState();
}
function updateStandings(f){
  const h=state.standings.find(t=>t.id===f.homeId),a=state.standings.find(t=>t.id===f.awayId);if(!h||!a)return;
  h.played++;a.played++;h.for+=f.homeGoals;h.against+=f.awayGoals;a.for+=f.awayGoals;a.against+=f.homeGoals;
  if(f.homeGoals>f.awayGoals){h.wins++;h.points+=3;a.losses++;}else if(f.homeGoals<f.awayGoals){a.wins++;a.points+=3;h.losses++;}else{h.draws++;a.draws++;h.points++;a.points++;}
}
function train(type){if(live){$('trainingMessage').textContent='Termine le match avant de t’entraîner.';return;}if(type==='rest'){if(state.player.physical<100)state.player.physical=clamp(state.player.physical+1,0,100);$('trainingMessage').textContent='Repos effectué : tu récupères et reprends confiance.';}else{const old=state.player[type];state.player[type]=clamp(old+1,0,99);const labels={shooting:'Finition',physical:'Physique',teamwork:'Collectif'};$('trainingMessage').textContent=state.player[type]>old?`${labels[type]} améliorée : ${old} → ${state.player[type]}.`:'Cette compétence est déjà au maximum.';}updatePlayerUI();saveState();}
function saveProfile(){state.player.name=$('playerName').value.trim()||'Alex Martin';state.player.position=$('playerPosition').value;state.player.number=clamp(Number($('playerNumber').value)||9,1,99);state.player.club=$('clubName').value.trim()||'FC Rivière Bleue';refreshTeamNames();renderAll();saveState();$('trainingMessage').textContent='Profil enregistré.';}
function resetGame(){state=DEFAULT_STATE();state.fixtures=createFixtures();state.standings=TEAM_NAMES.map((name,id)=>({id,name,played:0,wins:0,draws:0,losses:0,for:0,against:0,points:0}));live=null;pendingResult=null;saveState();renderAll();$('confirmDialog').close();$('trainingMessage').textContent='Nouvelle carrière créée.';}

$('startStarter').addEventListener('click',()=>beginMatch(true));$('startSub').addEventListener('click',()=>beginMatch(false));$('advanceMatch').addEventListener('click',advanceTime);$('substituteMe').addEventListener('click',askToBeSubbed);document.querySelectorAll('[data-action]').forEach(btn=>btn.addEventListener('click',()=>takeAction(btn.dataset.action)));document.querySelectorAll('[data-training]').forEach(btn=>btn.addEventListener('click',()=>train(btn.dataset.training)));$('saveProfileBtn').addEventListener('click',saveProfile);$('finishMatch').addEventListener('click',()=>{live=null;renderAll();saveState();$('match').scrollIntoView({behavior:'smooth'});});$('resetGame').addEventListener('click',()=>{if(typeof $('confirmDialog').showModal==='function')$('confirmDialog').showModal();else if(confirm('Réinitialiser la carrière ?'))resetGame();});$('confirmReset').addEventListener('click',event=>{event.preventDefault();resetGame();});

// Support older saves from the previous prototype: add any missing league data safely.
if(!state.fixtures.length)state.fixtures=createFixtures();
if(!state.standings.length)state.standings=TEAM_NAMES.map((name,id)=>({id,name,played:0,wins:0,draws:0,losses:0,for:0,against:0,points:0}));
refreshTeamNames();renderAll();saveState();
