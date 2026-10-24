
"use strict";

// ================================================
// FOOTBALL CAREER - MOTEUR DU JEU
// Tous les clubs et résultats sont fictifs.
// ================================================

const STORAGE_KEY = "footballCareerCompleteV1";

const INITIAL_TEAMS = [
  "FC des Horizons",
  "AS des Collines",
  "ES du Littoral",
  "Stade des Vallons",
  "Olympique du Bocage",
  "FC des Rives",
  "Union Sportive des Landes",
  "Sporting de la Forêt"
];

const TRANSFER_CLUBS = [
  { name: "Athletic de la Côte", level: 57, description: "Un projet ambitieux dans un club en développement." },
  { name: "FC Métropole", level: 64, description: "Un niveau supérieur et une concurrence plus forte." },
  { name: "Académie des Étoiles", level: 72, description: "Un projet de formation exigeant." }
];

function freshState() {
  const teams = INITIAL_TEAMS.map((name, id) => ({
    id,
    name: id === 0 ? "FC des Horizons" : name
  }));

  return {
    player: {
      name: "Lucas Morel",
      clubId: 0,
      age: 16,
      overall: 55,
      energy: 100,
      confidence: 50,
      shooting: 50,
      physical: 50,
      teamwork: 50,
      matches: 0,
      starts: 0,
      substituteApps: 0,
      goals: 0,
      assists: 0,
      minutes: 0,
      ratingTotal: 0,
      ratingCount: 0,
      status: "Remplaçant"
    },
    teams,
    fixtures: createFixtures(teams.length),
    history: [{
      title: "Le début d'une aventure",
      text: "Lucas rejoint son club et découvre les exigences du championnat. Son objectif : progresser et gagner sa place.",
      date: "Début de carrière"
    }],
    transfersSeen: [],
    season: "2026-2027",
    nextRound: 1,
    choicesMade: [],
    seasonFinished: false
  };
}

// Création d'un championnat aller simple.
// 8 équipes : 7 journées aller et 7 journées retour.
// Chaque équipe rencontre toutes les autres deux fois.

function createFixtures(teamCount) {
  let rotation = Array.from({ length: teamCount }, (_, i) => i);
  const firstHalf = [];

  for (let round = 0; round < teamCount - 1; round++) {
    const games = [];

    for (let i = 0; i < teamCount / 2; i++) {
      let home = rotation[i];
      let away = rotation[teamCount - 1 - i];

      if ((round + i) % 2 === 1) {
        [home, away] = [away, home];
      }

      games.push({
        round: round + 1,
        home,
        away,
        homeGoals: null,
        awayGoals: null,
        played: false
      });
    }

    firstHalf.push(...games);

    // L'équipe 0 reste fixe ; les autres tournent.
    rotation = [
      rotation[0],
      rotation[rotation.length - 1],
      ...rotation.slice(1, -1)
    ];
  }

  const secondHalf = firstHalf.map(game => ({
    round: game.round + teamCount - 1,
    home: game.away,
    away: game.home,
    homeGoals: null,
    awayGoals: null,
    played: false
  }));

  return [...firstHalf, ...secondHalf];
}

let state = freshState();

const $ = id => document.getElementById(id);

function currentClub() {
  return state.teams.find(team => team.id === state.player.clubId);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addStory(title, text) {
  state.history.unshift({
    title,
    text,
    date: new Date().toLocaleDateString("fr-FR")
  });

  state.history = state.history.slice(0, 60);
}

function updateOverall() {
  const p = state.player;

  // La note générale reflète les compétences du joueur.
  p.overall = clamp(
    Math.round(
      p.shooting * 0.45 +
      p.physical * 0.30 +
      p.teamwork * 0.25
    ),
    1,
    100
  );
}

function getStandings() {
  const table = state.teams.map(team => ({
    id: team.id,
    name: team.name,
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    gf: 0,
    ga: 0,
    points: 0
  }));

  for (const fixture of state.fixtures) {
    if (!fixture.played) continue;

    const home = table.find(t => t.id === fixture.home);
    const away = table.find(t => t.id === fixture.away);

    home.played++;
    away.played++;

    home.gf += fixture.homeGoals;
    home.ga += fixture.awayGoals;
    away.gf += fixture.awayGoals;
    away.ga += fixture.homeGoals;

    if (fixture.homeGoals > fixture.awayGoals) {
      home.wins++;
      away.losses++;
      home.points += 3;
    } else if (fixture.homeGoals < fixture.awayGoals) {
      away.wins++;
      home.losses++;
      away.points += 3;
    } else {
      home.draws++;
      away.draws++;
      home.points++;
      away.points++;
    }
  }

  return table.sort((a, b) =>
    b.points - a.points ||
    (b.gf - b.ga) - (a.gf - a.ga) ||
    b.gf - a.gf ||
    a.name.localeCompare(b.name, "fr")
  );
}

function nextFixture() {
  return state.fixtures.find(
    f => f.round === state.nextRound && !f.played &&
      (f.home === state.player.clubId || f.away === state.player.clubId)
  );
}

function teamName(id) {
  return state.teams.find(t => t.id === id)?.name || "Club inconnu";
}

// ================================================
// AFFICHAGE
// ================================================

function renderProfile() {
  const p = state.player;

  $("player-name-input").value = p.name;
  $("club-name-input").value = currentClub().name;
  $("overall").textContent = p.overall;
  $("age").textContent = p.age + " ans";
  $("energy").textContent = p.energy + "/100";
  $("confidence").textContent = p.confidence + "/100";
  $("energy-bar").style.width = p.energy + "%";

  $("player-status").textContent = p.status;
  $("matches").textContent = p.matches;
  $("starts").textContent = p.starts;
  $("goals").textContent = p.goals;
  $("assists").textContent = p.assists;
  $("minutes").textContent = p.minutes;

  $("average").textContent = p.ratingCount
    ? (p.ratingTotal / p.ratingCount).toFixed(1) + "/10"
    : "—";

  $("career-status").textContent = state.seasonFinished
    ? "Saison terminée"
    : "Carrière en cours";
}

function renderNextMatch() {
  const fixture = nextFixture();

  $("round-label").textContent =
    state.seasonFinished ? "Saison terminée" : "Journée " + state.nextRound;

  if (!fixture) {
    $("next-match").textContent = "Aucune rencontre disponible.";
    $("play-match").disabled = true;
    return;
  }

  const home = teamName(fixture.home);
  const away = teamName(fixture.away);

  $("next-match").replaceChildren();

  const left = document.createElement("div");
  const right = document.createElement("div");
  const vs = document.createElement("div");

  left.innerHTML = `<small>DOMICILE</small><strong></strong>`;
  left.querySelector("strong").textContent = home;

  right.innerHTML = `<small>EXTÉRIEUR</small><strong></strong>`;
  right.querySelector("strong").textContent = away;

  vs.className = "vs";
  vs.textContent = "VS";

  $("next-match").append(left, vs, right);

  $("play-match").disabled =
    state.seasonFinished || state.player.energy < 20;
}

function renderFixtures() {
  const body = $("fixtures-body");
  body.replaceChildren();

  for (let round = 1; round <= 14; round++) {
    const games = state.fixtures.filter(f => f.round === round);

    for (const game of games) {
      const tr = document.createElement("tr");

      if (
        game.home === state.player.clubId ||
        game.away === state.player.clubId
      ) {
        tr.classList.add("user-team");
      }

      const values = [
        round,
        `${teamName(game.home)} - ${teamName(game.away)}`,
        game.played ? `${game.homeGoals} - ${game.awayGoals}` : "—",
        game.played ? "Terminé" : "À jouer"
      ];

      values.forEach((value, index) => {
        const td = document.createElement("td");
        td.textContent = value;

        if (index === 2 && game.played) {
          if (game.homeGoals > game.awayGoals) td.className = "result-win";
          if (game.homeGoals < game.awayGoals) td.className = "result-loss";
        }

        tr.appendChild(td);
      });

      body.appendChild(tr);
    }
  }
}

function renderStandings() {
  const body = $("standings-body");
  body.replaceChildren();

  getStandings().forEach((team, index) => {
    const tr = document.createElement("tr");

    if (team.id === state.player.clubId) {
      tr.classList.add("user-team");
    }

    const values = [
      index + 1,
      team.name,
      team.played,
      team.wins,
      team.draws,
      team.losses,
      team.gf,
      team.ga,
      team.gf - team.ga,
      team.points
    ];

    values.forEach(value => {
      const td = document.createElement("td");
      td.textContent = value;
      tr.appendChild(td);
    });

    body.appendChild(tr);
  });
}

function renderHistory() {
  const container = $("story");
  container.replaceChildren();

  state.history.forEach(entry => {
    const article = document.createElement("article");
    article.className = "story-entry";

    const time = document.createElement("time");
    time.textContent = entry.date;

    const title = document.createElement("h3");
    title.textContent = entry.title;

    const text = document.createElement("p");
    text.textContent = entry.text;

    article.append(time, title, text);
    container.appendChild(article);
  });
}

function render() {
  renderProfile();
  renderNextMatch();
  renderFixtures();
  renderStandings();
  renderHistory();
}

// ================================================
// PROFIL PERSONNALISABLE
// ================================================

$("apply-profile").addEventListener("click", () => {
  const playerName = $("player-name-input").value.trim();
  const clubName = $("club-name-input").value.trim();

  if (!playerName || !clubName) {
    $("match-feedback").textContent =
      "Le nom du joueur et le nom du club sont obligatoires.";
    return;
  }

  state.player.name = playerName.slice(0, 40);
  currentClub().name = clubName.slice(0, 50);

  addStory(
    "Une nouvelle identité",
    `${state.player.name} poursuit sa carrière avec ${currentClub().name}.`
  );

  $("match-feedback").textContent = "Profil mis à jour.";
  render();
});

// ================================================
// ENTRAÎNEMENTS
// ================================================

document.querySelectorAll("[data-training]").forEach(button => {
  button.addEventListener("click", () => {
    if (state.seasonFinished) {
      $("match-feedback").textContent =
        "La saison est terminée. Commence une nouvelle carrière pour continuer.";
      return;
    }

    const p = state.player;
    const type = button.dataset.training;

    if (type === "rest") {
      if (p.energy === 100) {
        $("match-feedback").textContent =
          "Ton énergie est déjà au maximum.";
        return;
      }

      p.energy = 100;
      p.confidence = clamp(p.confidence + 2, 0, 100);

      addStory(
        "Récupération",
        `${p.name} prend le temps de récupérer avant le prochain match.`
      );
    } else {
      const cost = type === "shooting" ? 25 : 30;

      if (p.energy < cost) {
        $("match-feedback").textContent =
          "Pas assez d'énergie. Choisis une séance de récupération.";
        return;
      }

      p.energy -= cost;

      if (type === "shooting") {
        p.shooting = clamp(p.shooting + 3, 0, 100);
        p.teamwork = clamp(p.teamwork + 1, 0, 100);
      } else {
        p.physical = clamp(p.physical + 3, 0, 100);
      }

      p.confidence = clamp(p.confidence + 3, 0, 100);
      updateOverall();

      addStory(
        type === "shooting" ? "Travail devant le but" : "Préparation physique",
        `${p.name} progresse à l'entraînement. Sa note générale atteint ${p.overall}/100.`
      );
    }

    $("match-feedback").textContent = "Séance terminée.";
    render();
  });
});

// ================================================
// MATCHS ET CLASSEMENT
// ================================================

function simulateTeamGoals(teamId) {
  const team = state.teams.find(t => t.id === teamId);
  const isPlayerTeam = teamId === state.player.clubId;

  let strength = isPlayerTeam
    ? state.player.overall / 20
    : 1.5 + Math.random() * 1.4;

  return clamp(Math.floor(Math.random() * 3 + strength - 2), 0, 5);
}

function simulateOtherFixtures(round, playerFixture) {
  for (const game of state.fixtures) {
    if (game.round !== round || game === playerFixture) continue;

    game.homeGoals = simulateTeamGoals(game.home);
    game.awayGoals = simulateTeamGoals(game.away);
    game.played = true;
  }
}

$("play-match").addEventListener("click", () => {
  const p = state.player;
  const fixture = nextFixture();

  if (!fixture || state.seasonFinished || p.energy < 20) return;

  const role = $("role-select").value;
  const isStarter = role === "starter";
  const minutes = isStarter ? 90 : 30;

  const attackingChance = clamp(
    (p.shooting * 0.45 + p.overall * 0.55) / 100,
    0.05,
    0.95
  );

  // Les buts du joueur sont simulés séparément du score collectif.
  let playerGoals = 0;
  let playerAssists = 0;

  if (Math.random() < attackingChance * minutes / 90) playerGoals++;
  if (Math.random() < attackingChance * 0.2 * minutes / 90) playerGoals++;
  if (Math.random() < p.teamwork / 100 * 0.35 * minutes / 90) playerAssists++;

  const isHome = fixture.home === p.clubId;

  let ourGoals = simulateTeamGoals(p.clubId);
  let theirGoals = simulateTeamGoals(isHome ? fixture.away : fixture.home);

  // Une performance offensive peut influencer le score du club.
  ourGoals = Math.min(5, ourGoals + playerGoals);

  fixture.homeGoals = isHome ? ourGoals : theirGoals;
  fixture.awayGoals = isHome ? theirGoals : ourGoals;
  fixture.played = true;

  simulateOtherFixtures(state.nextRound, fixture);

  p.matches++;
  if (isStarter) {
    p.starts++;
    p.status = "Titulaire";
  } else {
    p.substituteApps++;
    p.status = "Entré en jeu";
  }

  p.minutes += minutes;
  p.goals += playerGoals;
  p.assists += playerAssists;
  p.energy = clamp(p.energy - (isStarter ? 35 : 20), 0, 100);

  const performanceRating = clamp(
    5.5 + Math.random() * 2 +
    playerGoals * 1.2 + playerAssists * 0.6 +
    (isStarter ? 0.2 : 0),
    1,
    10
  );

  p.ratingTotal += performanceRating;
  p.ratingCount++;

  const won = ourGoals > theirGoals;
  const lost = ourGoals < theirGoals;

  p.confidence = clamp(
    p.confidence + (won ? 7 : lost ? -4 : 2) +
    playerGoals * 2,
    0,
    100
  );

  if (playerGoals > 0) {
    p.shooting = clamp(p.shooting + 1, 0, 100);
  }

  if (p.matches >= 3 && p.overall >= 58) {
    p.status = "Dans la rotation";
  }

  updateOverall();

  const opponentId = isHome ? fixture.away : fixture.home;
  const resultText = won ? "victoire" : lost ? "défaite" : "match nul";

  addStory(
    `Journée ${state.nextRound} : ${resultText}`,
    `${p.name} a joué ${minutes} minutes contre ${teamName(opponentId)}. Score : ${ourGoals}-${theirGoals}. Note du match : ${performanceRating.toFixed(1)}/10. Buts : ${playerGoals}. Passes décisives : ${playerAssists}.`
  );

  $("match-feedback").textContent =
    `${resultText.charAt(0).toUpperCase() + resultText.slice(1)} ${ourGoals}-${theirGoals}. ` +
    `${p.name} : ${minutes} minutes, ${playerGoals} but(s), ${playerAssists} passe(s) décisive(s).`;

  state.nextRound++;

  if (state.nextRound > 14) {
    state.seasonFinished = true;

    const position = getStandings().findIndex(t => t.id === p.clubId) + 1;

    addStory(
      "Fin de saison",
      `${p.name} termine sa première saison à la ${position}e place du championnat. Une nouvelle étape se prépare.`
    );

    $("match-feedback").textContent +=
      ` Saison terminée : ton club termine ${position}e.`;
  }

  render();
});

// ================================================
// CHOIX NARRATIFS
// ================================================

const narrativeChoices = {
  team: {
    confidence: 5,
    teamwork: 4,
    title: "Le choix du collectif",
    text: "Lucas privilégie le jeu collectif. Il cherche à mieux combiner avec ses coéquipiers."
  },
  ambition: {
    confidence: -2,
    shooting: 4,
    title: "Une ambition affirmée",
    text: "Lucas se fixe des objectifs plus élevés et décide de travailler davantage sa finition."
  },
  coach: {
    confidence: 3,
    physical: 2,
    title: "L'écoute de l'entraîneur",
    text: "Lucas écoute les conseils du coach et travaille avec sérieux pour gagner sa place."
  }
};

document.querySelectorAll("[data-choice]").forEach(button => {
  button.addEventListener("click", () => {
    if (state.seasonFinished) {
      $("choice-feedback").textContent =
        "Cette saison est terminée. Tu pourras prendre de nouvelles décisions lors de la prochaine carrière.";
      return;
    }

    const choice = button.dataset.choice;

    if (state.choicesMade.includes(choice)) {
      $("choice-feedback").textContent =
        "Tu as déjà pris cette décision. Choisis une autre orientation.";
      return;
    }

    const option = narrativeChoices[choice];
    if (!option) return;

    state.choicesMade.push(choice);

    state.player.confidence = clamp(
      state.player.confidence + option.confidence, 0, 100
    );

    state.player.teamwork = clamp(
      state.player.teamwork + (option.teamwork || 0), 0, 100
    );

    state.player.shooting = clamp(
      state.player.shooting + (option.shooting || 0), 0, 100
    );

    state.player.physical = clamp(
      state.player.physical + (option.physical || 0), 0, 100
    );

    updateOverall();
    addStory(option.title, option.text);

    $("choice-feedback").textContent = option.text;
    render();
  });
});

// ================================================
// TRANSFERTS
// ================================================

$("check-transfers").addEventListener("click", () => {
  const p = state.player;
  const list = $("transfer-list");
  list.replaceChildren();

  if (state.seasonFinished === false && p.matches < 3 && p.overall < 60) {
    $("transfer-intro").textContent =
      "Les recruteurs attendent davantage de performances. Joue au moins trois matchs ou améliore ta note générale.";
    return;
  }

  const available = TRANSFER_CLUBS.filter(club =>
    club.level <= p.overall + 12 &&
    !state.transfersSeen.includes(club.name) &&
    club.name !== currentClub().name
  );

  if (available.length === 0) {
    $("transfer-intro").textContent =
      "Aucune nouvelle proposition pour le moment. Continue à progresser ou vérifie à nouveau après tes prochains matchs.";
    return;
  }

  $("transfer-intro").textContent =
    "Des clubs fictifs s'intéressent à ton joueur. À toi de décider.";

  available.forEach(club => {
    const card = document.createElement("article");
    card.className = "panel";

    const title = document.createElement("h3");
    title.textContent = club.name;

    const level = document.createElement("p");
    level.textContent = `Niveau sportif estimé : ${club.level}/100`;

    const description = document.createElement("p");
    description.textContent = club.description;

    const accept = document.createElement("button");
    accept.className = "button";
    accept.textContent = "Accepter le transfert";

    accept.addEventListener("click", () => {
      const oldClub = currentClub().name;
      currentClub().name = club.name;
      p.energy = 100;
      p.confidence = clamp(p.confidence + 5, 0, 100);
      p.status = "Nouvelle recrue";

      state.transfersSeen.push(club.name);

      addStory(
        "Un nouveau chapitre",
        `${p.name} quitte ${oldClub} pour rejoindre ${club.name}. Un nouveau défi commence !`
      );

      $("transfer-intro").textContent =
        `Transfert accepté : ${p.name} rejoint ${club.name}.`;

      list.replaceChildren();
      render();
    });

    card.append(title, level, description, accept);
    list.appendChild(card);
  });
});

// ================================================
// SAUVEGARDE ET CHARGEMENT
// ================================================

$("save-game").addEventListener("click", () => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    $("save-feedback").textContent =
      "Carrière sauvegardée dans ce navigateur.";
  } catch {
    $("save-feedback").textContent =
      "Sauvegarde impossible. Vérifie les paramètres du navigateur.";
  }
});

$("load-game").addEventListener("click", () => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);

    if (!saved) {
      $("save-feedback").textContent = "Aucune sauvegarde trouvée.";
      return;
    }

    const parsed = JSON.parse(saved);

    if (
      !parsed ||
      !parsed.player ||
      !Array.isArray(parsed.teams) ||
      !Array.isArray(parsed.fixtures) ||
      !Array.isArray(parsed.history) ||
      !Number.isInteger(parsed.nextRound) ||
      parsed.nextRound < 1 ||
      parsed.nextRound > 15 ||
      parsed.teams.length !== 8 ||
      parsed.fixtures.length !== 56 ||
      !parsed.teams.some(t => t.id === parsed.player.clubId) ||
      !parsed.fixtures.every(f =>
        Number.isInteger(f.round) &&
        f.round >= 1 && f.round <= 14 &&
        Number.isInteger(f.home) &&
        Number.isInteger(f.away) &&
        typeof f.played === "boolean" &&
        (f.played
          ? Number.isInteger(f.homeGoals) &&
            Number.isInteger(f.awayGoals) &&
            f.homeGoals >= 0 && f.homeGoals <= 5 &&
            f.awayGoals >= 0 && f.awayGoals <= 5
          : f.homeGoals === null && f.awayGoals === null)
      )
    ) {
      throw new Error("Sauvegarde invalide");
    }

    state = parsed;
    render();
    $("save-feedback").textContent = "Carrière chargée.";
  } catch {
    $("save-feedback").textContent =
      "Impossible de charger cette sauvegarde.";
  }
});

$("reset-game").addEventListener("click", () => {
  if (!confirm("Recommencer ? La carrière en cours sera remplacée.")) return;

  state = freshState();
  render();

  $("transfer-list").replaceChildren();
  $("transfer-intro").textContent =
    "Joue des matchs et progresse pour attirer l'attention d'autres clubs.";

  $("save-feedback").textContent =
    "Nouvelle carrière créée. Pense à la sauvegarder.";
  $("match-feedback").textContent = "";
  $("choice-feedback").textContent =
    "Tes décisions influencent ta progression.";
});

// Initialisation
render();
