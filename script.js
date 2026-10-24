'use strict';

const SAVE_KEY = 'footballCareerInteractiveV2';
const TEAM_NAMES = ['FC Rivière Bleue','AC Montclair','Olympique des Pins','Stade de Valbrume','US Clairval','AS Montfaucon','Étoile du Lac','FC Hautes-Terres'];
const MARKET_FIRST_NAMES = ['Léo','Nolan','Ethan','Sacha','Milan','Yanis','Noam','Ilyes','Mathis','Enzo','Hugo','Tiago','Adam','Maël','Rayan','Evan','Tom','Amir','Lucas','Naël'];
const MARKET_LAST_NAMES = ['Moreau','Petit','Garnier','Roche','Caron','Aubert','Renard','Leroy','Faure','Chevalier','Marchand','Giraud','Blanc','Perrin','Legrand','Diallo','Costa','Bernard','Muller','Fontaine'];
const MARKET_POSITIONS = ['Gardien','Défenseur central','Arrière droit','Arrière gauche','Milieu défensif','Milieu central','Milieu offensif','Ailier','Attaquant'];
function makeMarketPlayer(id){
  const randMarket=max=>Math.floor(Math.random()*max);
  const rating=48+randMarket(31), position=MARKET_POSITIONS[randMarket(MARKET_POSITIONS.length)];
  const name=`${MARKET_FIRST_NAMES[randMarket(MARKET_FIRST_NAMES.length)]} ${MARKET_LAST_NAMES[randMarket(MARKET_LAST_NAMES.length)]}`;
  const multiplier=position==='Attaquant'||position==='Ailier'?1.2:position==='Gardien'?.85:1;
  return {id,name,position,rating,age:18+randMarket(13),fee:Math.round((rating*rating*0.00065+0.12)*multiplier*100)/100,salary:Math.round((rating-35)*420/100)*100};
}
function createManagerMarket(){
  const names=['Milan Costa','Lucas Perrin','Samir Diallo','Mathis Legrand','Noé Garnier','Enzo Morel','Ilyes Bernard','Tom Aubert','Hugo Caron','Evan Roche','Nolan Petit','Adam Faure','Tiago Renard','Maël Fontaine','Yanis Blanc','Sacha Muller'];
  const positions=['Gardien','Défenseur central','Défenseur central','Arrière droit','Arrière gauche','Milieu défensif','Milieu central','Milieu central','Milieu offensif','Ailier','Ailier','Attaquant','Attaquant','Milieu central','Défenseur central','Gardien'];
  const squad=names.map((name,i)=>({id:100+i,name,position:positions[i],rating:52+Math.floor(Math.random()*17),age:19+Math.floor(Math.random()*13),fee:Math.round((0.25+Math.floor(Math.random()*20)*0.1)*100)/100,salary:3500+Math.floor(Math.random()*95)*100}));
  return {budget:8.5,wageLimit:180000,squad,candidates:Array.from({length:6},(_,i)=>makeMarketPlayer(1000+i)),nextId:2000,history:[]};
}
const DEFAULT_STATE = () => ({
  player:{name:'Alex Martin',position:'Attaquant',number:9,club:'FC Rivière Bleue',shooting:55,physical:55,teamwork:55},
  season:1, currentFixture:0, coachMode:{formation:'4-4-2',mentality:'balanced',style:'possession',playerRole:'starter',captain:'Alex Martin',subMinute:65,lastReport:null,selectedLineup:[]}, stats:{apps:0,starts:0,goals:0,assists:0,minutes:0,ratings:[],actions:0},
  fixtures:[], standings:[], lastMatch:null, objectiveMatches:0, reputation:50, transferOffer:null, transferHistory:[], seasonHistory:[], cup:createCup(), cupTitles:0, cupHistory:[], international:createInternationalTournament(), nationalCareer:{nation:'République d’Aurélia',calledUp:false,caps:0,goals:0,assists:0,coachTrust:60,matches:[],awards:[]}, managerMarket:createManagerMarket()
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
function createCup(){
  const ids=TEAM_NAMES.map((_,id)=>id);
  for(let i=ids.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}
  const matches=[];
  for(let i=0;i<ids.length;i+=2)matches.push({homeId:ids[i],awayId:ids[i+1],homeGoals:null,awayGoals:null,played:false,winnerId:null,penalties:null,extraTime:false});
  return {rounds:[{name:'Quarts de finale',matches}],champion:null,lastWinner:null};
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
  $('seasonPill').textContent=`Saison ${state.season} · Fiction`;
  $('reputationValue').textContent=`${state.reputation}/100`;
  $('marketValue').textContent=`${Math.round((getOverall()*getOverall()*0.04)+20)} k€`;
  $('nextSeasonBtn').classList.toggle('hidden',!!getFixture());
  renderTransferOffer(); renderSeasonHistory();
}
function updatePreMatch(){
  const f=getFixture();
  $('preMatch').classList.remove('hidden'); $('liveMatch').classList.add('hidden'); $('postMatch').classList.add('hidden');
  if(!f){$('matchStatus').textContent='Saison terminée';$('matchRound').textContent='Fin de saison';$('homeTeam').textContent=state.player.club;$('awayTeam').textContent='Saison terminée';$('opponentInfo').textContent='Toutes les journées sont terminées. Consulte le classement puis clôture la saison pour continuer ta carrière.';$('startStarter').disabled=true;$('startSub').disabled=true;$('nextSeasonBtn').classList.remove('hidden');return;}
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
function renderAll(){refreshTeamNames();updatePlayerUI();updatePreMatch();renderFixtures();renderStandings();renderTransferOffer();renderSeasonHistory();renderCup();renderInternational();renderNationalCareer();renderCoachMode();}
function renderTransferOffer(){
  const box=$('transferOffer'); if(!box)return; const offer=state.transferOffer;
  if(!offer){box.innerHTML='<h3>Aucune offre pour le moment</h3><p class="muted">Tu peux demander à ton agent de sonder le marché.</p>';$('acceptOfferBtn').classList.add('hidden');$('declineOfferBtn').classList.add('hidden');return;}
  box.innerHTML=`<p class="eyebrow">OFFRE REÇUE</p><h3>${escapeHTML(offer.club)}</h3><p>Rôle proposé : <strong>${escapeHTML(offer.role)}</strong></p><p>Indemnité fictive : <strong>${offer.fee} k€</strong></p><p class="muted">Note générale minimale souhaitée : ${offer.requiredOverall}. ${getOverall()>=offer.requiredOverall?'Ton profil correspond aux attentes.':'Le club prend un risque en te recrutant.'}</p>`;
  $('acceptOfferBtn').classList.remove('hidden');$('declineOfferBtn').classList.remove('hidden');
}
function renderSeasonHistory(){
  const box=$('seasonHistory'); if(!box)return;
  if(!state.seasonHistory.length){box.innerHTML='<p class="muted">Aucune saison clôturée pour le moment.</p>';return;}
  box.innerHTML=state.seasonHistory.slice().reverse().map(item=>`<div class="history-item"><strong>Saison ${item.season} · ${escapeHTML(item.club)}</strong><span>Classement : ${item.position}e / ${TEAM_NAMES.length}</span><span>Champion : ${escapeHTML(item.champion)}</span><span>Bilan personnel : ${item.goals} but(s), ${item.assists} passe(s) décisive(s) en carrière</span></div>`).join('');
}
function cupTeamName(id){return teamName(id);}
function renderCup(){
  const cup=state.cup;
  if(!cup||!Array.isArray(cup.rounds)||!cup.rounds.length){state.cup=createCup();}
  $('cupSeasonPill').textContent=`Saison ${state.season} · Coupe`;
  $('cupTitles').textContent=state.cupTitles||0;
  $('cupLastWinner').textContent=state.cup.lastWinner||'—';
  const bracket=$('cupBracket');bracket.innerHTML='';
  state.cup.rounds.forEach((round,ri)=>{
    const col=document.createElement('div');col.className='cup-round';
    const title=document.createElement('h4');title.textContent=round.name;col.appendChild(title);
    round.matches.forEach((m,mi)=>{
      const card=document.createElement('div');card.className='cup-match';
      const h=document.createElement('div');h.className='cup-team-line'+(m.played&&m.winnerId===m.homeId?' winner':'');
      h.innerHTML=`<span>${escapeHTML(cupTeamName(m.homeId))}</span><span class="cup-match-score">${m.played?m.homeGoals:'—'}</span>`;
      const a=document.createElement('div');a.className='cup-team-line'+(m.played&&m.winnerId===m.awayId?' winner':'');
      a.innerHTML=`<span>${escapeHTML(cupTeamName(m.awayId))}</span><span class="cup-match-score">${m.played?m.awayGoals:'—'}</span>`;
      card.append(h,a);
      const info=document.createElement('small');
      info.textContent=m.played?(m.penalties?`Qualification aux tirs au but (${m.penalties})`:m.extraTime?'Qualification après prolongation':'Terminé'):'Match à jouer';card.appendChild(info);
      if(!m.played){const btn=document.createElement('button');btn.className='button secondary';btn.textContent='Jouer ce match';btn.addEventListener('click',()=>playCupMatch(ri,mi));card.appendChild(btn);}
      col.appendChild(card);
    });bracket.appendChild(col);
  });
  if(state.cup.champion){const champ=document.createElement('div');champ.className='cup-champion';champ.innerHTML=`🏆 Coupe remportée par<strong>${escapeHTML(state.cup.champion)}</strong><p class="muted">La compétition est terminée pour cette saison.</p>`;bracket.appendChild(champ);$('cupStatusTitle').textContent='Le trophée a trouvé son vainqueur !';$('cupStatusText').textContent=`${state.cup.champion} remporte la Coupe fictive de la saison ${state.season}.`;}
  else{$('cupStatusTitle').textContent='La course au trophée est ouverte';$('cupStatusText').textContent='Joue les rencontres dans l’ordre qui te convient. Les vainqueurs se qualifient pour le tour suivant.';}
  const next=state.cup.rounds.flatMap((r,ri)=>r.matches.map((m,mi)=>({r,ri,m,mi}))).find(x=>!x.m.played);
  $('cupPlayNext').disabled=!next;$('cupPlayNext').textContent=state.cup.champion?'Coupe terminée':next?`Jouer le prochain match : ${next.r.name}`:'Préparation du tour suivant…';
  const history=$('cupHistoryList');if(history){const items=Array.isArray(state.cupHistory)?state.cupHistory:[];history.innerHTML=items.length?items.slice().reverse().map(item=>`<p class="cup-history-item"><strong>Saison ${item.season}</strong><span>${escapeHTML(item.winner)}</span></p>`).join(''):'<p class="muted">Aucune coupe terminée pour le moment.</p>'; }
}
function playCupMatch(roundIndex,matchIndex){
  const round=state.cup.rounds[roundIndex],m=round&&round.matches[matchIndex];if(!m||m.played)return;
  let hg=random(4),ag=random(4),extraTime=false,penalties=null,winnerId;
  if(hg===ag){extraTime=true;hg+=random(2);ag+=random(2);if(hg===ag){const homePens=5+random(4),awayPens=5+random(4);if(homePens===awayPens){winnerId=Math.random()<.5?m.homeId:m.awayId;penalties=`${homePens+1}-${awayPens}`;}else{winnerId=homePens>awayPens?m.homeId:m.awayId;penalties=`${homePens}-${awayPens}`;}}else winnerId=hg>ag?m.homeId:m.awayId;}else winnerId=hg>ag?m.homeId:m.awayId;
  m.homeGoals=hg;m.awayGoals=ag;m.played=true;m.winnerId=winnerId;m.extraTime=extraTime;m.penalties=penalties;
  const playerInvolved=m.homeId===0||m.awayId===0;
  if(playerInvolved){
    state.stats.apps++;state.stats.starts++;state.stats.minutes+=extraTime?120:90;state.objectiveMatches++;
    const scored=(m.homeId===0?hg:ag);const conceded=(m.homeId===0?ag:hg);
    const playerGoals=Math.min(scored,random(3));state.stats.goals+=playerGoals;
    if(playerGoals>0)state.reputation=clamp(state.reputation+playerGoals*2+2,0,100);else state.reputation=clamp(state.reputation+(winnerId===0?3:0),0,100);
    const rating=clamp(5.8+playerGoals*.8+(winnerId===0?.5:0)+(conceded===0?.3:0)+(Math.random()*.8-.4),1,10);state.stats.ratings.push(Number(rating.toFixed(1)));
    $('cupMessage').textContent=`Ton équipe termine ${m.homeId===0?hg:ag}-${m.homeId===0?ag:hg}. ${winnerId===0?'Tu te qualifies pour le tour suivant !':'Ton équipe est éliminée de la coupe.'}`;
  }else $('cupMessage').textContent=`${cupTeamName(winnerId)} se qualifie pour le tour suivant.`;
  const allDone=round.matches.every(match=>match.played);
  if(allDone){
    if(roundIndex===0){state.cup.rounds.push({name:'Demi-finales',matches:makeCupNextRound(round.matches)});}
    else if(roundIndex===1){state.cup.rounds.push({name:'Finale',matches:makeCupNextRound(round.matches)});}
    else if(roundIndex===2){state.cup.champion=cupTeamName(winnerId);state.cup.lastWinner=state.cup.champion;if(winnerId===0){state.cupTitles=(state.cupTitles||0)+1;state.reputation=clamp(state.reputation+8,0,100);$('cupMessage').textContent='🏆 Incroyable ! Tu remportes la Coupe fictive !';}state.cupHistory=Array.isArray(state.cupHistory)?state.cupHistory:[];state.cupHistory.push({season:state.season,winner:state.cup.champion});}
  }
  saveState();updatePlayerUI();renderCup();
}
function makeCupNextRound(matches){
  const winners=matches.map(m=>m.winnerId);const next=[];
  for(let i=0;i<winners.length;i+=2)next.push({homeId:winners[i],awayId:winners[i+1],homeGoals:null,awayGoals:null,played:false,winnerId:null,penalties:null,extraTime:false});
  return next;
}
function playNextCupMatch(){
  const next=state.cup.rounds.flatMap((r,ri)=>r.matches.map((m,mi)=>({r,ri,m,mi}))).find(x=>!x.m.played);
  if(next)playCupMatch(next.ri,next.mi);
}
function generateTransferOffer(){
  if(live){$('transferMessage').textContent='Termine le match avant de rechercher un transfert.';return;}
  if(!getFixture()){$('transferMessage').textContent='Clôture la saison avant de négocier une nouvelle offre.';return;}
  const options=TEAM_NAMES.filter((name,id)=>id!==0&&name!==state.player.club);
  const club=options[random(options.length)]||'FC Nouvelle-Aube';
  const overall=getOverall(); const requiredOverall=clamp(45+random(30),45,74);
  const fee=Math.max(20,Math.round(overall*overall*(0.025+Math.random()*0.025)));
  const roles=['Rotation de l’effectif','Joueur important','Projet de titulaire','Renfort offensif'];
  state.transferOffer={club,requiredOverall,fee,role:roles[random(roles.length)]};
  $('transferMessage').textContent=`Ton agent a obtenu une proposition du ${club}.`;renderTransferOffer();saveState();
}
function acceptTransfer(){
  const offer=state.transferOffer;if(!offer)return;
  const previous=state.player.club;state.transferHistory.push({from:previous,to:offer.club,season:state.season,fee:offer.fee});
  state.player.club=offer.club;state.reputation=clamp(state.reputation+3,0,100);state.transferOffer=null;refreshTeamNames();renderAll();saveState();
  $('transferMessage').textContent=`Transfert confirmé ! Tu rejoins ${state.player.club}. Les résultats déjà joués restent inchangés.`;
}
function declineTransfer(){if(!state.transferOffer)return;const club=state.transferOffer.club;state.transferOffer=null;renderTransferOffer();saveState();$('transferMessage').textContent=`Tu as refusé l'offre de ${club} et tu restes dans ton club.`;}
function closeSeason(){
  if(getFixture())return;
  const ordered=state.standings.slice().sort((a,b)=>b.points-a.points||(b.for-b.against)-(a.for-a.against)||b.for-a.for);
  const position=Math.max(1,ordered.findIndex(t=>t.id===0)+1);
  state.seasonHistory.push({season:state.season,club:state.player.club,position,champion:ordered[0]?.name||'Champion fictif',goals:state.stats.goals,assists:state.stats.assists,apps:state.stats.apps});
  state.season++;state.fixtures=createFixtures();state.cup=createCup();state.international=createInternationalTournament();state.international.season=state.season;state.standings=TEAM_NAMES.map((name,id)=>({id,name:id===0?state.player.club:name,played:0,wins:0,draws:0,losses:0,for:0,against:0,points:0}));state.transferOffer=null;state.reputation=clamp(state.reputation+2,0,100);
  refreshTeamNames();renderAll();saveState();$('trainingMessage').textContent=`La saison ${state.season-1} est archivée. Bienvenue dans la saison ${state.season} !`;$('match').scrollIntoView({behavior:'smooth'});
}
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
  updateStandings(f);if(playerPlayed){state.reputation=clamp(state.reputation+Math.round((live.rating-6)*2)+(live.goals?2:0)+(live.assists?1:0),0,100);state.nationalCareer.coachTrust=clamp(state.nationalCareer.coachTrust+Math.round((live.rating-6)*2)+(live.goals?2:0)+(live.assists?1:0),0,100);if(live.rating>=8&& !state.nationalCareer.awards.some(a=>a.type==='match'&&a.season===state.season&&a.round===f.round)){state.nationalCareer.awards.push({type:'match',title:'Homme du match',detail:`${f.home} ${f.homeGoals}-${f.awayGoals} ${f.away}`,season:state.season,round:f.round});}}state.lastMatch={round:f.round,home:f.home,away:f.away,homeGoals:f.homeGoals,awayGoals:f.awayGoals,minutes:live.minutes,rating:live.rating,goals:live.goals,assists:live.assists};
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
// Version 7 : mode entraîneur, tactique et simulation de match.
const COACH_FORMATIONS = {
  '4-3-3': ['Gardien','Arrière droit','Défenseur central','Défenseur central','Arrière gauche','Milieu défensif','Milieu relayeur','Milieu offensif','Ailier droit','Avant-centre','Ailier gauche'],
  '4-4-2': ['Gardien','Arrière droit','Défenseur central','Défenseur central','Arrière gauche','Milieu droit','Milieu central','Milieu central','Milieu gauche','Attaquant','Attaquant'],
  '3-5-2': ['Gardien','Défenseur central','Défenseur central','Défenseur central','Piston droit','Milieu défensif','Milieu central','Milieu offensif','Piston gauche','Attaquant','Attaquant'],
  '5-3-2': ['Gardien','Arrière droit','Défenseur central','Défenseur central','Défenseur central','Arrière gauche','Milieu défensif','Milieu relayeur','Milieu offensif','Attaquant','Attaquant']
};
function ensureCoachMode(){
  if(!state.coachMode||typeof state.coachMode!=='object')state.coachMode={};
  state.coachMode={formation:'4-4-2',mentality:'balanced',style:'possession',playerRole:'starter',captain:state.player?.name||'Alex Martin',subMinute:65,lastReport:null,selectedLineup:[],...state.coachMode};
  if(!COACH_FORMATIONS[state.coachMode.formation])state.coachMode.formation='4-4-2';
  if(![55,65,75,80].includes(Number(state.coachMode.subMinute)))state.coachMode.subMinute=65;
  if(!Array.isArray(state.coachMode.selectedLineup))state.coachMode.selectedLineup=[];
  const squad=state.managerMarket?.squad||[];
  const validIds=new Set(squad.map(p=>String(p.id)));
  state.coachMode.selectedLineup=state.coachMode.selectedLineup.filter(id=>validIds.has(String(id))).map(String);
  while(state.coachMode.selectedLineup.length<11){
    const used=new Set(state.coachMode.selectedLineup);
    const next=squad.find(p=>!used.has(String(p.id)));
    if(!next)break;
    state.coachMode.selectedLineup.push(String(next.id));
  }
  state.coachMode.selectedLineup=state.coachMode.selectedLineup.slice(0,11);
}
function renderCoachMode(){
  if(!$('coachFormation'))return; ensureCoachMode(); const c=state.coachMode;
  $('coachFormation').value=c.formation;$('coachMentality').value=c.mentality;$('coachStyle').value=c.style;$('coachPlayerRole').value=c.playerRole;$('coachSubMinute').value=String(c.subMinute);
  const f=getFixture();
  $('coachFixtureTitle').textContent=f?`${f.home} — ${f.away}`:'Saison terminée';
  $('coachFixtureInfo').textContent=f?`Journée ${f.round} · ${f.homeId===0?'À domicile':'À l’extérieur'} · match fictif`:'Toutes les journées sont terminées. Clôture la saison pour continuer.';
  $('playCoachMatch').disabled=!f||!!live;
  $('playCoachMatch').textContent=!f?'Saison terminée':live?'Termine le match en cours':'Simuler le match comme entraîneur';
  const positions=COACH_FORMATIONS[c.formation]||COACH_FORMATIONS['4-4-2'];
  const squad=state.managerMarket?.squad||[];
  const lineup=$('coachLineup');lineup.innerHTML='';
  positions.forEach((position,i)=>{
    const item=document.createElement('div');item.className='lineup-player';
    const number=document.createElement('span');number.className='lineup-number';number.textContent=String(i+1).padStart(2,'0');
    const details=document.createElement('span');details.className='lineup-details';
    const role=document.createElement('strong');role.textContent=position;
    const picker=document.createElement('select');picker.className='lineup-picker';picker.setAttribute('aria-label',`Joueur pour le poste ${position}`);picker.setAttribute('data-lineup-index',String(i));
    const selected=String(c.selectedLineup[i]??'');
    const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='Choisir un joueur';picker.appendChild(placeholder);
    squad.forEach(p=>{const option=document.createElement('option');option.value=String(p.id);option.textContent=`${p.name} · ${p.rating}`;option.selected=String(p.id)===selected;picker.appendChild(option);});
    const usedElsewhere=new Set(c.selectedLineup.filter((id,j)=>j!==i).map(String));
    [...picker.options].forEach(option=>{if(option.value&&usedElsewhere.has(option.value))option.disabled=true;});
    details.append(role,picker);item.append(number,details);if(i===0)item.classList.add('lineup-keeper');lineup.appendChild(item);
  });
  const captain=$('coachCaptain');const currentCaptain=c.captain;captain.innerHTML='';
  [{name:state.player.name,id:'user'},...squad.map(p=>({name:p.name,id:String(p.id)}))].forEach(p=>{const option=document.createElement('option');option.value=p.name;option.textContent=p.name;option.selected=p.name===currentCaptain;captain.appendChild(option);});
  if(![...captain.options].some(o=>o.selected)){captain.value=state.player.name;c.captain=state.player.name;}
  $('coachResult').classList.toggle('hidden',!c.lastReport);
  if(c.lastReport){$('coachResultTitle').textContent=c.lastReport.title;$('coachResultScore').textContent=c.lastReport.score;$('coachResultSummary').textContent=c.lastReport.summary;$('coachResultEvents').innerHTML=c.lastReport.events.map(e=>`<p>${escapeHTML(e)}</p>`).join('');}
}
function saveCoachChoices(){ensureCoachMode();const c=state.coachMode;c.formation=$('coachFormation').value;c.mentality=$('coachMentality').value;c.style=$('coachStyle').value;c.playerRole=$('coachPlayerRole').value;c.captain=$('coachCaptain').value;c.subMinute=Number($('coachSubMinute').value);c.selectedLineup=[...document.querySelectorAll('[data-lineup-index]')].map(el=>el.value).filter(Boolean);c.lastReport=null;renderCoachMode();saveState();$('coachMessage').textContent='Consignes enregistrées. Le onze, les joueurs recrutés et la tactique sont prêts.';}
function playCoachMatch(){
  if(live){$('coachMessage').textContent='Termine d’abord le match interactif en cours.';return;}
  const f=getFixture();if(!f){$('coachMessage').textContent='La saison est terminée. Clôture-la pour jouer la saison suivante.';return;}
  ensureCoachMode();saveCoachChoicesSilently();
  const c=state.coachMode;const ownAtHome=f.homeId===0;
  const mentalityBonus={attack:.55,balanced:0,defend:-.25}[c.mentality]||0;
  const styleBonus={possession:.2,pressing:.4,counter:.15}[c.style]||0;
  const roleBonus=c.playerRole==='starter'?(getOverall()-55)/70:c.playerRole==='sub'?(getOverall()-55)/130:0;
  const formationBonus=c.formation==='4-3-3'?.18:c.formation==='3-5-2'?.1:c.formation==='5-3-2'?-.05:0;
  const squad=state.managerMarket?.squad||[];const chosen=(c.selectedLineup||[]).map(id=>squad.find(p=>String(p.id)===String(id))).filter(Boolean);const lineupRating=chosen.length?chosen.reduce((sum,p)=>sum+p.rating,0)/chosen.length:55;const teamQuality=(lineupRating-55)/100;const strength=clamp(teamQuality+mentalityBonus+styleBonus+roleBonus+formationBonus,-.7,1.1);events.push(`🧠 Onze sélectionné : note moyenne ${lineupRating.toFixed(1)}/100, avec ${chosen.length} joueur(s) de l’effectif du club.`);if(chosen.some(p=>p.id>=1000))events.push('🆕 Au moins une recrue du mercato figure dans ton onze de départ.');
  const homeAdvantage=ownAtHome?.25:-.05;
  const expected=clamp(1.15+strength+homeAdvantage,.25,3.4);
  const oppExpected=clamp(1.25-strength*.45+(c.mentality==='attack'?.2:c.mentality==='defend'?-.15:0),.2,2.8);
  const poisson=lambda=>{let L=Math.exp(-lambda),k=0,p=1;do{k++;p*=Math.random();}while(p>L&&k<12);return k-1;};
  let homeGoals=ownAtHome?poisson(expected):poisson(oppExpected);let awayGoals=ownAtHome?poisson(oppExpected):poisson(expected);
  const playerPlayed=c.playerRole!=='rest';let playerGoals=0,playerAssists=0;const events=[];
  if(playerPlayed){const minutes=c.playerRole==='starter'?90:Math.max(10,90-c.subMinute);const scoringChance=clamp((getOverall()/100)*minutes/100*(state.player.shooting/65),.05,.65);if(Math.random()<scoringChance){playerGoals=1;if(ownAtHome)homeGoals++;else awayGoals++;events.push(`⚽ ${state.player.name} marque après ${Math.min(88,random(75)+10)} minutes.`);}if(Math.random()<clamp(state.player.teamwork/160,.08,.5)){playerAssists=1;events.push(`🎯 ${state.player.name} délivre une passe décisive.`);}if(c.playerRole==='sub')events.push(`🔄 ${state.player.name} entre à la ${c.subMinute}e minute.`);else events.push(`${state.player.name} débute titulaire. Capitaine : ${c.captain}.`);}else events.push(`${state.player.name} est laissé au repos pour cette rencontre.`);
  if(c.style==='pressing')events.push('Le pressing haut récupère plusieurs ballons, mais laisse parfois des espaces.');if(c.style==='possession')events.push('La conservation du ballon aide l’équipe à contrôler le rythme.');if(c.style==='counter')events.push('Les transitions rapides créent des occasions en contre-attaque.');
  if(c.mentality==='attack')events.push('La mentalité offensive crée davantage d’occasions des deux côtés.');if(c.mentality==='defend')events.push('Le bloc défensif réduit les espaces et limite les risques.');
  f.homeGoals=homeGoals;f.awayGoals=awayGoals;f.played=true;updateStandings(f);if(playerPlayed){state.objectiveMatches++;state.stats.apps++;}if(c.playerRole==='starter')state.stats.starts++;if(playerPlayed){state.stats.goals+=playerGoals;state.stats.assists+=playerAssists;const mins=c.playerRole==='starter'?90:Math.max(10,90-c.subMinute);state.stats.minutes+=mins;const rating=clamp(6+strength*.7+playerGoals*.9+playerAssists*.45+(Math.random()*.9-.35),4,9.8);state.stats.ratings.push(Number(rating.toFixed(1)));events.push(`⭐ Note de ${state.player.name} : ${rating.toFixed(1)}/10.`);}else{state.stats.ratings.push(6);}
  const win=(ownAtHome?homeGoals>awayGoals:awayGoals>homeGoals),draw=homeGoals===awayGoals;
  state.reputation=clamp(state.reputation+(win?2:draw?1:-1)+(playerGoals?2:0),0,100);
  const ownName=state.player.club,opponent=ownAtHome?f.away:f.home,ownGoals=ownAtHome?homeGoals:awayGoals,oppGoals=ownAtHome?awayGoals:homeGoals;
  const result=win?'Victoire':draw?'Match nul':'Défaite';
  c.lastReport={title:`${result} · ${ownName}`,score:`${homeGoals} — ${awayGoals}`,summary:`${f.home} ${homeGoals}–${awayGoals} ${f.away}. ${ownName} : ${ownGoals} but(s), ${opponent} : ${oppGoals}. Tactique : ${c.formation}, ${c.mentality==='attack'?'offensive':c.mentality==='defend'?'défensive':'équilibrée'}, ${c.style==='pressing'?'pressing haut':c.style==='counter'?'contre-attaques':'possession'}.`,events};
  $('coachMessage').textContent=`Match terminé : ${result.toLowerCase()}. Le calendrier, le classement et tes statistiques ont été mis à jour.`;renderAll();saveState();$('coachResult').scrollIntoView({behavior:'smooth',block:'nearest'});
}
function saveCoachChoicesSilently(){const c=state.coachMode;c.formation=$('coachFormation').value;c.mentality=$('coachMentality').value;c.style=$('coachStyle').value;c.playerRole=$('coachPlayerRole').value;c.captain=$('coachCaptain').value;c.subMinute=Number($('coachSubMinute').value);c.selectedLineup=[...document.querySelectorAll('[data-lineup-index]')].map(el=>el.value).filter(Boolean);}

function train(type){if(live){$('trainingMessage').textContent='Termine le match avant de t’entraîner.';return;}if(type==='rest'){if(state.player.physical<100)state.player.physical=clamp(state.player.physical+1,0,100);$('trainingMessage').textContent='Repos effectué : tu récupères et reprends confiance.';}else{const old=state.player[type];state.player[type]=clamp(old+1,0,99);const labels={shooting:'Finition',physical:'Physique',teamwork:'Collectif'};$('trainingMessage').textContent=state.player[type]>old?`${labels[type]} améliorée : ${old} → ${state.player[type]}.`:'Cette compétence est déjà au maximum.';}updatePlayerUI();saveState();}
function saveProfile(){state.player.name=$('playerName').value.trim()||'Alex Martin';state.player.position=$('playerPosition').value;state.player.number=clamp(Number($('playerNumber').value)||9,1,99);state.player.club=$('clubName').value.trim()||'FC Rivière Bleue';refreshTeamNames();renderAll();saveState();$('trainingMessage').textContent='Profil enregistré.';}
function resetGame(){state=DEFAULT_STATE();state.fixtures=createFixtures();state.standings=TEAM_NAMES.map((name,id)=>({id,name,played:0,wins:0,draws:0,losses:0,for:0,against:0,points:0}));live=null;pendingResult=null;saveState();renderAll();$('confirmDialog').close();$('trainingMessage').textContent='Nouvelle carrière créée.';}

$('startStarter').addEventListener('click',()=>beginMatch(true));$('startSub').addEventListener('click',()=>beginMatch(false));$('advanceMatch').addEventListener('click',advanceTime);$('substituteMe').addEventListener('click',askToBeSubbed);document.querySelectorAll('[data-action]').forEach(btn=>btn.addEventListener('click',()=>takeAction(btn.dataset.action)));document.querySelectorAll('[data-training]').forEach(btn=>btn.addEventListener('click',()=>train(btn.dataset.training)));$('saveProfileBtn').addEventListener('click',saveProfile);$('cupPlayNext').addEventListener('click',playNextCupMatch);$('intlPlayNext').addEventListener('click',playInternationalNext);$('intlReset').addEventListener('click',()=>{state.international=createInternationalTournament();saveState();renderInternational();$('intlMessage').textContent='Nouvelle compétition internationale générée.';});$('generateOfferBtn').addEventListener('click',generateTransferOffer);$('acceptOfferBtn').addEventListener('click',acceptTransfer);$('declineOfferBtn').addEventListener('click',declineTransfer);$('nextSeasonBtn').addEventListener('click',closeSeason);$('finishMatch').addEventListener('click',()=>{live=null;renderAll();saveState();$('match').scrollIntoView({behavior:'smooth'});});$('resetGame').addEventListener('click',()=>{if(typeof $('confirmDialog').showModal==='function')$('confirmDialog').showModal();else if(confirm('Réinitialiser la carrière ?'))resetGame();});$('confirmReset').addEventListener('click',event=>{event.preventDefault();resetGame();});

// Version 5 : compétition internationale fictive avec qualifications en groupes.
const NATIONS = [
  'République d’Aurélia','Union de Belvar','Îles de Célestine','Duché de Dorval',
  'Fédération d’Estrane','Royaume de Floréal','Confédération de Galène','État d’Helvérie',
  'République d’Isoria','Union de Jorlande','Îles de Kalmérie','Duché de Lyranie',
  'Fédération de Morvane','Royaume de Norlande','Confédération d’Orsanie','République de Valdorie'
];
function shuffle(items){const a=[...items];for(let i=a.length-1;i>0;i--){const j=random(i+1);[a[i],a[j]]=[a[j],a[i]];}return a;}
function createInternationalTournament(){
  const shuffled=shuffle(NATIONS.map((name,id)=>({id,name})));
  const groups=[];
  for(let g=0;g<4;g++){
    const teams=shuffled.slice(g*4,g*4+4);
    const fixtures=[];
    for(let i=0;i<teams.length;i++)for(let j=i+1;j<teams.length;j++)fixtures.push({homeId:teams[i].id,awayId:teams[j].id,home:teams[i].name,away:teams[j].name,homeGoals:null,awayGoals:null,played:false});
    groups.push({name:String.fromCharCode(65+g),teams,fixtures});
  }
  return {groups,stage:'qualifiers',rounds:[],champion:null,history:[],season:1};
}
function nationName(id){return NATIONS[id]||'Sélection fictive';}
function internationalGroupTable(group){
  const rows=group.teams.map(t=>({...t,played:0,wins:0,draws:0,losses:0,for:0,against:0,points:0}));
  group.fixtures.filter(f=>f.played).forEach(f=>{const h=rows.find(t=>t.id===f.homeId),a=rows.find(t=>t.id===f.awayId);if(!h||!a)return;h.played++;a.played++;h.for+=f.homeGoals;h.against+=f.awayGoals;a.for+=f.awayGoals;a.against+=f.homeGoals;if(f.homeGoals>f.awayGoals){h.wins++;h.points+=3;a.losses++;}else if(f.homeGoals<f.awayGoals){a.wins++;a.points+=3;h.losses++;}else{h.draws++;a.draws++;h.points++;a.points++;}});
  return rows.sort((a,b)=>b.points-a.points||(b.for-b.against)-(a.for-a.against)||b.for-a.for||a.name.localeCompare(b.name));
}
function internationalRoundName(index){return ['Quarts de finale','Demi-finales','Finale'][index]||'Phase finale';}
function prepareInternationalKnockout(){
  const qualified=state.international.groups.map(internationalGroupTable).flatMap(table=>table.slice(0,2));
  // Cross-pair group winners and runners-up: A1-B2, B1-A2, C1-D2, D1-C2.
  const ordered=[];
  for(let i=0;i<4;i+=2){const a=internationalGroupTable(state.international.groups[i]);const b=internationalGroupTable(state.international.groups[i+1]);ordered.push(a[0],b[1],b[0],a[1]);}
  const matches=[];for(let i=0;i<ordered.length;i+=2)matches.push({homeId:ordered[i].id,awayId:ordered[i+1].id,homeGoals:null,awayGoals:null,played:false,winnerId:null,penalties:null,extraTime:false});
  state.international.rounds=[{name:'Quarts de finale',matches}];state.international.stage='knockout';
}
function playInternationalKnockoutMatch(roundIndex,matchIndex){
  const intl=state.international,round=intl.rounds[roundIndex],m=round&&round.matches[matchIndex];if(!m||m.played)return;
  let hg=random(4),ag=random(4),extraTime=false,penalties=null,winnerId;
  if(hg===ag){extraTime=true;hg+=random(2);ag+=random(2);if(hg===ag){let hp=5+random(4),ap=5+random(4);if(hp===ap){if(Math.random()<.5)hp++;else ap++;}penalties=`${hp}-${ap}`;winnerId=hp>ap?m.homeId:m.awayId;}else winnerId=hg>ag?m.homeId:m.awayId;}else winnerId=hg>ag?m.homeId:m.awayId;
  Object.assign(m,{homeGoals:hg,awayGoals:ag,played:true,winnerId,penalties,extraTime});
  $('intlMessage').textContent=`${nationName(winnerId)} se qualifie${penalties?' aux tirs au but':extraTime?' après prolongation':''}.`;
  if(round.matches.every(x=>x.played)){
    if(roundIndex===0||roundIndex===1){const winners=round.matches.map(x=>x.winnerId),matches=[];for(let i=0;i<winners.length;i+=2)matches.push({homeId:winners[i],awayId:winners[i+1],homeGoals:null,awayGoals:null,played:false,winnerId:null,penalties:null,extraTime:false});intl.rounds.push({name:internationalRoundName(roundIndex+1),matches});}
    else{intl.champion=nationName(winnerId);intl.stage='complete';intl.history=Array.isArray(intl.history)?intl.history:[];intl.history.push({season:state.season,winner:intl.champion});$('intlMessage').textContent=`🏆 ${intl.champion} remporte la Coupe des Nations imaginaires !`;}
  }
  saveState();renderInternational();
}
function playInternationalNext(){
  const intl=state.international;if(intl.stage==='qualifiers'){
    const group=intl.groups.find(g=>g.fixtures.some(f=>!f.played));if(!group){prepareInternationalKnockout();saveState();renderInternational();$('intlMessage').textContent='Qualifications terminées ! Les huit sélections qualifiées sont connues.';return;}
    const m=group.fixtures.find(f=>!f.played);m.homeGoals=random(4);m.awayGoals=random(4);m.played=true;
    $('intlMessage').textContent=`Groupe ${group.name} : ${m.home} ${m.homeGoals} – ${m.awayGoals} ${m.away}.`;
    if(intl.groups.every(g=>g.fixtures.every(f=>f.played))){prepareInternationalKnockout();$('intlMessage').textContent+=' Les huit qualifiés sont prêts pour les quarts de finale.';}
    saveState();renderInternational();return;
  }
  if(intl.stage==='knockout'){
    const next=intl.rounds.flatMap((r,ri)=>r.matches.map((m,mi)=>({r,ri,m,mi}))).find(x=>!x.m.played);
    if(next)playInternationalKnockoutMatch(next.ri,next.mi);
  }else $('intlMessage').textContent=`La compétition est terminée : ${intl.champion} est championne.`;
}
function renderInternational(){
  const intl=state.international;if(!intl||!Array.isArray(intl.groups))return;
  $('intlStagePill').textContent=`${intl.stage==='qualifiers'?'Qualifications':intl.stage==='knockout'?'Phase finale':'Terminée'} · Saison ${intl.season||state.season}`;
  $('intlStage').textContent=intl.stage==='qualifiers'?'Qualifications':intl.stage==='knockout'?'Élimination directe':'Terminée';
  const played=intl.groups.reduce((n,g)=>n+g.fixtures.filter(f=>f.played).length,0),total=intl.groups.reduce((n,g)=>n+g.fixtures.length,0);
  $('intlPlayed').textContent=intl.stage==='qualifiers'?`${played} / ${total}`:`${played} / ${total} + phase finale`;
  $('intlChampion').textContent=intl.champion||'—';
  $('intlTitle').textContent=intl.stage==='qualifiers'?'La route vers la phase finale commence ici':intl.stage==='knockout'?'Les huit qualifiés jouent le titre':'La compétition a son champion !';
  $('intlDescription').textContent=intl.stage==='qualifiers'?'16 sélections fictives, quatre groupes de qualification. Les deux premières de chaque groupe rejoignent les quarts de finale.':intl.stage==='knockout'?'Quarts de finale, demi-finales et finale. En cas d’égalité, prolongation puis tirs au but.':`${intl.champion} remporte la Coupe des Nations imaginaires.`;
  const groupsBox=$('intlGroups');groupsBox.innerHTML='';
  intl.groups.forEach(g=>{const card=document.createElement('div');card.className='intl-group-card';const title=document.createElement('h4');title.textContent=`Groupe ${g.name}`;card.appendChild(title);
    const table=document.createElement('table');table.innerHTML='<thead><tr><th>Sélection</th><th>J</th><th>Diff.</th><th>Pts</th></tr></thead>';const body=document.createElement('tbody');
    internationalGroupTable(g).forEach((t,i)=>{const tr=document.createElement('tr');if(intl.stage!=='qualifiers'&&i<2)tr.classList.add('qualified');tr.innerHTML=`<td>${escapeHTML(t.name)}${intl.stage!=='qualifiers'&&i<2?' ✓':''}</td><td>${t.played}</td><td>${t.for-t.against>0?'+':''}${t.for-t.against}</td><td><b>${t.points}</b></td>`;body.appendChild(tr);});table.appendChild(body);card.appendChild(table);
    const results=document.createElement('div');results.className='intl-results';g.fixtures.forEach(f=>{const p=document.createElement('p');p.textContent=f.played?`${f.home} ${f.homeGoals}–${f.awayGoals} ${f.away}`:`${f.home} – ${f.away} · à jouer`;results.appendChild(p);});card.appendChild(results);groupsBox.appendChild(card);
  });
  const ko=$('intlKnockout');ko.innerHTML='';ko.classList.toggle('hidden',intl.stage==='qualifiers');
  if(intl.stage!=='qualifiers')intl.rounds.forEach((round,ri)=>{const col=document.createElement('div');col.className='intl-round';const h=document.createElement('h4');h.textContent=round.name;col.appendChild(h);round.matches.forEach((m,mi)=>{const p=document.createElement('div');p.className='intl-ko-match';p.innerHTML=`<div>${escapeHTML(nationName(m.homeId))} <b>${m.played?m.homeGoals:'—'}</b></div><div>${escapeHTML(nationName(m.awayId))} <b>${m.played?m.awayGoals:'—'}</b></div><small>${m.played?(m.penalties?`Tirs au but ${m.penalties}`:m.extraTime?'Après prolongation':'Terminé'):'À jouer'}</small>`;if(m.played&&m.winnerId!==null){const winner=document.createElement('strong');winner.className='intl-winner';winner.textContent=`Qualifié : ${nationName(m.winnerId)}`;p.appendChild(winner);}col.appendChild(p);});ko.appendChild(col);});
  $('intlPlayNext').disabled=intl.stage==='complete';$('intlPlayNext').textContent=intl.stage==='qualifiers'?'Jouer le prochain match de qualification':intl.stage==='knockout'?'Jouer le prochain match à élimination directe':'Compétition terminée';
}

// Migration des sauvegardes V2 vers V3.
if(typeof state.reputation!=='number')state.reputation=50;
if(!Array.isArray(state.transferHistory))state.transferHistory=[];
if(!Array.isArray(state.seasonHistory))state.seasonHistory=[];
if(!('transferOffer' in state))state.transferOffer=null;
// Support older saves from the previous prototype: add any missing league data safely.
if(!state.fixtures.length)state.fixtures=createFixtures();
if(!state.standings.length)state.standings=TEAM_NAMES.map((name,id)=>({id,name,played:0,wins:0,draws:0,losses:0,for:0,against:0,points:0}));
if(!state.cup||!Array.isArray(state.cup.rounds))state.cup=createCup();if(typeof state.cupTitles!=='number')state.cupTitles=0;if(!Array.isArray(state.cupHistory))state.cupHistory=[];if(!state.international||!Array.isArray(state.international.groups))state.international=createInternationalTournament();
// Version 6 : sélection nationale fictive, confiance du sélectionneur et récompenses.
function renderNationalCareer(){
  const n=state.nationalCareer;
  if(!n)return;
  $('nationalitySelect').value=n.nation;
  $('nationalStatus').textContent=n.calledUp?'Convoqué':n.caps>0?'Ancien international':'À observer';
  $('nationalHeadline').textContent=n.calledUp?`Tu représentes ${n.nation}`:'Représente une nation fictive';
  $('coachTrust').textContent=`${n.coachTrust}/100`; $('coachTrustBar').style.width=`${n.coachTrust}%`;
  $('nationalCaps').textContent=n.caps; $('nationalGoals').textContent=n.goals; $('nationalAssists').textContent=n.assists;
  $('requestCallup').disabled=n.calledUp;
  $('playNationalMatch').disabled=!n.calledUp;
  $('requestCallup').textContent=n.calledUp?'Convocation obtenue':'Tenter d’obtenir une convocation';
  const card=$('nationalStatusCard');
  if(n.calledUp){card.innerHTML=`<strong>✅ Convocation obtenue avec ${escapeHTML(n.nation)}</strong><p>Le sélectionneur te fait confiance. Joue un match international pour améliorer ton bilan.</p>`;}
  else if(n.caps>0){card.innerHTML=`<strong>Carrière internationale en attente</strong><p>Tu as déjà ${n.caps} sélection(s). La confiance du coach est de ${n.coachTrust}/100. Tu peux demander une nouvelle convocation.</p>`;}
  else {card.innerHTML=`<strong>Pas encore convoqué</strong><p>Améliore ta réputation en club et réalise de bonnes performances pour attirer l'attention du sélectionneur. Réputation actuelle : ${state.reputation}/100.</p>`;}
  const list=$('awardsList');
  if(!n.awards.length){list.innerHTML='<p class="muted">Aucune récompense pour le moment. Une très bonne note peut te faire gagner une distinction.</p>';return;}
  list.innerHTML='<div class="award-list">'+n.awards.slice().reverse().map(a=>`<div class="award-item"><strong>🏅 ${escapeHTML(a.title)}</strong><span>${escapeHTML(a.detail)}</span><span>Saison ${a.season}</span></div>`).join('')+'</div>';
}
function requestNationalCallup(){
  const n=state.nationalCareer; if(n.calledUp){$('nationalMessage').textContent='Tu as déjà une convocation en attente.';return;}
  n.nation=$('nationalitySelect').value;
  const avg=state.stats.ratings.length?average(state.stats.ratings):6;
  const threshold=35+Math.random()*35;
  if(state.reputation>=threshold||avg>=7.2||state.reputation>=80){n.calledUp=true;n.coachTrust=clamp(n.coachTrust+5,0,100);$('nationalMessage').textContent=`Bonne nouvelle ! Le sélectionneur de ${n.nation} te convoque pour le prochain rassemblement fictif.`;}
  else {$('nationalMessage').textContent=`Pas de convocation cette fois. Le sélectionneur de ${n.nation} veut voir davantage de bonnes performances en club. Réputation requise pour cette tentative : ${Math.ceil(threshold)}/100.`;}
  renderNationalCareer();saveState();
}
function playNationalMatch(){
  const n=state.nationalCareer;if(!n.calledUp){$('nationalMessage').textContent='Tu dois obtenir une convocation avant de jouer.';return;}
  const opponents=shuffle(['République de Virelia','Union de Sarmonie','Îles de Bellune','Fédération de Cormélie','Royaume de Lestorie','État de Miravie']).filter(x=>x!==n.nation);
  const opponent=opponents[0]||'Sélection fictive';
  const strength=clamp((getOverall()-50)/100+(n.coachTrust-50)/250,-.25,.35);
  const ownGoals=random(3)+(Math.random()<.25+strength*.2?1:0);
  const opponentGoals=random(3)+(Math.random()<.35-strength*.2?1:0);
  const scored=ownGoals>0&&Math.random()<clamp(.25+getOverall()/180,.3,.8);
  const assisted=ownGoals>0&&Math.random()<.35;
  const rating=clamp(5.5+strength*3+Math.random()*2+(scored?.7:0)+(assisted?.3:0),4,9.8);
  n.caps++;if(scored)n.goals++;if(assisted)n.assists++;
  n.coachTrust=clamp(n.coachTrust+Math.round((rating-6)*3)+(scored?3:0)+(assisted?1:0),0,100);
  n.matches.push({season:state.season,opponent,ownGoals,opponentGoals,rating:Number(rating.toFixed(1)),scored,assisted});
  if(rating>=8)n.awards.push({type:'international',title:'Homme du match international',detail:`${n.nation} ${ownGoals}-${opponentGoals} ${opponent} · note ${rating.toFixed(1)}/10`,season:state.season});
  if(scored)n.awards.push({type:'international-goal',title:'Buteur international',detail:`But marqué contre ${opponent}`,season:state.season});
  n.calledUp=false;
  $('nationalMessage').textContent=`Résultat fictif : ${n.nation} ${ownGoals}–${opponentGoals} ${opponent}. Ta note : ${rating.toFixed(1)}/10${scored?' · Tu as marqué !':''}${assisted?' · Passe décisive !':''}`;
  renderNationalCareer();saveState();
}
// Migration compatible avec les sauvegardes de la V5.
if(!state.nationalCareer)state.nationalCareer={nation:'République d’Aurélia',calledUp:false,caps:0,goals:0,assists:0,coachTrust:60,matches:[],awards:[]};
state.nationalCareer={nation:'République d’Aurélia',calledUp:false,caps:0,goals:0,assists:0,coachTrust:60,matches:[],awards:[],...state.nationalCareer};
if(!Array.isArray(state.nationalCareer.matches))state.nationalCareer.matches=[];
if(!Array.isArray(state.nationalCareer.awards))state.nationalCareer.awards=[];
ensureCoachMode();
$('coachFormation').addEventListener('change',saveCoachChoices);$('coachMentality').addEventListener('change',saveCoachChoices);$('coachStyle').addEventListener('change',saveCoachChoices);$('coachPlayerRole').addEventListener('change',saveCoachChoices);$('coachCaptain').addEventListener('change',saveCoachChoices);$('coachSubMinute').addEventListener('change',saveCoachChoices);$('playCoachMatch').addEventListener('click',playCoachMatch);
$('coachLineup').addEventListener('change',event=>{if(event.target.matches('[data-lineup-index]')){saveCoachChoices();}});
$('requestCallup').addEventListener('click',requestNationalCallup);
$('playNationalMatch').addEventListener('click',playNationalMatch);
$('nationalitySelect').addEventListener('change',()=>{if(!state.nationalCareer.calledUp){state.nationalCareer.nation=$('nationalitySelect').value;saveState();}});

refreshTeamNames();renderAll();saveState();


// Version 8 : mercato du club, effectif, budget transferts et masse salariale.
function ensureManagerMarket(){
  if(!state.managerMarket||typeof state.managerMarket!=='object')state.managerMarket=createManagerMarket();
  const m=state.managerMarket;
  if(!Array.isArray(m.squad))m.squad=[];
  if(!Array.isArray(m.candidates))m.candidates=[];
  if(!Array.isArray(m.history))m.history=[];
  if(typeof m.budget!=='number')m.budget=8.5;
  if(typeof m.wageLimit!=='number')m.wageLimit=180000;
  if(typeof m.nextId!=='number')m.nextId=2000;
  if(!m.candidates.length)m.candidates=Array.from({length:6},(_,i)=>makeMarketPlayer(m.nextId+i));
}
function moneyM(value){return `${Number(value).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})} M€`;}
function euro(value){return `${Math.round(value).toLocaleString('fr-FR')} €`;}
function currentWageBill(){return state.managerMarket.squad.reduce((sum,p)=>sum+p.salary,0);}
function renderManagerMarket(){
  if(!$('clubTransferBudget'))return;ensureManagerMarket();const m=state.managerMarket;
  $('clubTransferBudget').textContent=moneyM(m.budget);$('clubWageBill').textContent=`${euro(currentWageBill())} / sem.`;$('clubWageLimit').textContent=`${euro(m.wageLimit)} / sem.`;$('clubSquadCount').textContent=m.squad.length;
  const candidates=$('clubMarketCandidates');candidates.innerHTML='';
  if(!m.candidates.length)candidates.innerHTML='<p class="market-empty">Aucun joueur disponible. Lance une nouvelle recherche.</p>';
  m.candidates.forEach(p=>{const card=document.createElement('article');card.className='market-player-card';const fee=Number(p.fee);const wage=currentWageBill()+p.salary;const affordable=m.budget>=fee&&wage<=m.wageLimit;card.innerHTML=`<h4>${escapeHTML(p.name)}</h4><span class="market-position">${escapeHTML(p.position)} · Note ${p.rating}</span><div class="market-price"><span>Indemnité</span><strong>${moneyM(fee)}</strong></div><p>Salaire : ${euro(p.salary)} / semaine<br>Âge fictif : ${p.age||22}${p.rating>=75?' · Profil confirmé':p.rating>=65?' · Joueur prometteur':' · Jeune joueur'}</p><button class="button primary" data-sign-player="${p.id}" ${affordable?'':'disabled'}>${m.budget<fee?'Budget insuffisant':wage>m.wageLimit?'Masse salariale dépassée':'Recruter ce joueur'}</button>`;candidates.appendChild(card);});
  const squad=$('clubSquadList');squad.innerHTML='';
  m.squad.forEach(p=>{const row=document.createElement('div');row.className='squad-row';row.innerHTML=`<strong>${escapeHTML(p.name)} <small class="muted">· Note ${p.rating}</small></strong><span>${escapeHTML(p.position)}</span><span>Valeur ${moneyM(p.fee)}</span><span>${euro(p.salary)} / sem.</span><button class="button secondary" data-sell-player="${p.id}" ${m.squad.length<=11?'disabled':''}>Vendre</button>`;squad.appendChild(row);});
  if(!m.squad.length)squad.innerHTML='<p class="market-empty">Ton effectif est vide.</p>';
}
function refreshClubMarket(){ensureManagerMarket();const m=state.managerMarket;m.candidates=Array.from({length:6},(_,i)=>makeMarketPlayer(m.nextId++));renderManagerMarket();saveState();$('clubMarketMessage').textContent='Nouvelle liste générée : les joueurs, prix et salaires sont fictifs.';}
function signClubPlayer(id){ensureManagerMarket();const m=state.managerMarket;const index=m.candidates.findIndex(p=>p.id===id);if(index<0)return;const p=m.candidates[index];if(m.budget<p.fee){$('clubMarketMessage').textContent='Budget insuffisant pour ce recrutement.';return;}if(currentWageBill()+p.salary>m.wageLimit){$('clubMarketMessage').textContent='Le recrutement dépasserait le plafond de masse salariale. Vends un joueur ou recrute un profil moins coûteux.';return;}if(m.squad.length>=30){$('clubMarketMessage').textContent='Effectif complet : limite fictive de 30 joueurs.';return;}m.budget=Math.round((m.budget-p.fee)*100)/100;m.squad.push({...p});m.candidates.splice(index,1);m.history.push({type:'arrivée',name:p.name,fee:p.fee});renderManagerMarket();saveState();$('clubMarketMessage').textContent=`${p.name} rejoint l'effectif pour ${moneyM(p.fee)} et ${euro(p.salary)} par semaine.`;}
function sellClubPlayer(id){ensureManagerMarket();const m=state.managerMarket;if(m.squad.length<=11){$('clubMarketMessage').textContent='Tu dois conserver au moins 11 joueurs dans l’effectif.';return;}const index=m.squad.findIndex(p=>p.id===id);if(index<0)return;const p=m.squad[index];const fee=Math.round(p.fee*.72*100)/100;m.budget=Math.round((m.budget+fee)*100)/100;m.squad.splice(index,1);m.history.push({type:'départ',name:p.name,fee});renderManagerMarket();saveState();$('clubMarketMessage').textContent=`${p.name} est vendu pour ${moneyM(fee)}. Son salaire est libéré.`;}
ensureManagerMarket();
$('refreshMarketBtn').addEventListener('click',refreshClubMarket);
$('clubMarketCandidates').addEventListener('click',event=>{const button=event.target.closest('[data-sign-player]');if(button&&!button.disabled)signClubPlayer(Number(button.dataset.signPlayer));});
$('clubSquadList').addEventListener('click',event=>{const button=event.target.closest('[data-sell-player]');if(button&&!button.disabled)sellClubPlayer(Number(button.dataset.sellPlayer));});
const previousRenderAll=renderAll;
renderAll=function(){previousRenderAll();renderManagerMarket();};
renderManagerMarket();saveState();
