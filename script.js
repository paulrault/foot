
const initialState = {
    age: 16,
    overall: 55,
    matches: 0,
    goals: 0,
    assists: 0,
    confidence: 50,
    energy: 100,
    shooting: 50,
    physical: 50,
    history: [
        {
            date: "DÉBUT DE CARRIÈRE",
            title: "Un rêve à construire",
            text: "Lucas rejoint le FC des Horizons à 16 ans. Il veut progresser, gagner la confiance de son entraîneur et aider ses coéquipiers."
        }
    ]
};

let career = copyState(initialState);

function copyState(value) {
    return JSON.parse(JSON.stringify(value));
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function addStory(title, text) {
    const date = new Date().toLocaleDateString("fr-FR");

    career.history.unshift({
        date: "JOURNAL · " + date,
        title,
        text
    });

    career.history = career.history.slice(0, 30);
}

function render() {
    document.getElementById("age").textContent =
        career.age + " ans";

    document.getElementById("overall").textContent =
        career.overall;

    document.getElementById("matches").textContent =
        career.matches;

    document.getElementById("goals").textContent =
        career.goals;

    document.getElementById("assists").textContent =
        career.assists;

    document.getElementById("confidence").textContent =
        career.confidence;

    document.getElementById("confidence-bar").style.width =
        career.confidence + "%";

    document.getElementById("energy").textContent =
        career.energy + " / 100";

    document.getElementById("energy-bar").style.width =
        career.energy + "%";

    document.querySelectorAll("[data-action]").forEach(button => {
        const action = button.dataset.action;

        const cost = {
            shooting: 25,
            physical: 30,
            rest: 0
        }[action];

        button.disabled =
            action === "rest" ||
            career.energy < cost ||
            career.overall >= 100;
    });

    document.getElementById("play-match").disabled =
        career.energy < 20;

    const story = document.getElementById("story");
    story.replaceChildren();

    career.history.forEach(entry => {
        const article = document.createElement("article");
        article.className = "story-entry";

        const date = document.createElement("span");
        date.className = "story-date";
        date.textContent = entry.date;

        const title = document.createElement("h3");
        title.textContent = entry.title;

        const paragraph = document.createElement("p");
        paragraph.textContent = entry.text;

        article.append(date, title, paragraph);
        story.appendChild(article);
    });
}

function train(type) {
    if (type === "rest") {
        const recovered = 100 - career.energy;

        if (recovered === 0) {
            showFeedback("Ton énergie est déjà au maximum.");
            return;
        }

        career.energy = 100;
        career.confidence = clamp(career.confidence + 2, 0, 100);

        addStory(
            "Une journée de récupération",
            "Lucas récupère son énergie et se prépare pour la suite de la saison."
        );

        showFeedback("Repos terminé : énergie restaurée !");
        render();
        return;
    }

    const sessions = {
        shooting: {
            cost: 25,
            property: "shooting",
            label: "la finition"
        },
        physical: {
            cost: 30,
            property: "physical",
            label: "le physique"
        }
    };

    const session = sessions[type];

    if (!session || career.energy < session.cost) {
        showFeedback("Pas assez d'énergie pour cet entraînement.");
        return;
    }

    career.energy -= session.cost;

    const previousLevel = career[session.property];
    career[session.property] = clamp(previousLevel + 3, 0, 100);

    career.overall = clamp(
        career.overall + (career[session.property] > previousLevel ? 1 : 0),
        1,
        100
    );

    career.confidence = clamp(career.confidence + 3, 0, 100);

    addStory(
        "Entraînement : " + session.label,
        "Lucas a travaillé " + session.label +
        ". Sa note générale est maintenant de " + career.overall + "/100."
    );

    showFeedback("Séance terminée ! Lucas progresse à l'entraînement.");
    render();
}

function playMatch() {
    if (career.energy < 20) {
        showFeedback("Lucas est trop fatigué. Il doit d'abord récupérer.");
        return;
    }

    career.energy -= 20;
    career.matches++;

    // Simulation fictive du match
    const performance = Math.random() * 100;
    let matchGoals = 0;
    let matchAssists = 0;

    if (performance < 12) {
        matchGoals = 2;
    } else if (performance < 40) {
        matchGoals = 1;
    }

    if (Math.random() < 0.20) {
        matchAssists = 1;
    }

    career.goals += matchGoals;
    career.assists += matchAssists;

    const scoreFor = Math.floor(Math.random() * 4);
    const scoreAgainst = Math.floor(Math.random() * 4);

    let result;

    if (scoreFor > scoreAgainst) {
        result = "victoire";
        career.confidence = clamp(career.confidence + 7, 0, 100);
    } else if (scoreFor < scoreAgainst) {
        result = "défaite";
        career.confidence = clamp(career.confidence - 5, 0, 100);
    } else {
        result = "match nul";
        career.confidence = clamp(career.confidence + 2, 0, 100);
    }

    if (matchGoals > 0 || matchAssists > 0) {
        career.overall = clamp(career.overall + 1, 1, 100);
    }

    const details = [];

    if (matchGoals > 0) {
        details.push(matchGoals + (matchGoals > 1 ? " buts" : " but"));
    }

    if (matchAssists > 0) {
        details.push("1 passe décisive");
    }

    const performanceText = details.length
        ? " Lucas a inscrit " + details.join(" et ") + "."
        : " Lucas n'a pas marqué ni délivré de passe décisive.";

    addStory(
        "Match contre l'AS des Collines",
        "Le FC des Horizons obtient un " + result +
        " sur le score de " + scoreFor + "-" + scoreAgainst + "." +
        performanceText
    );

    showFeedback(
        "Match terminé : " + scoreFor + "-" + scoreAgainst +
        ". " + result.charAt(0).toUpperCase() + result.slice(1) + " !"
    );

    render();
}

function chooseStory(choice) {
    const choices = {
        team: {
            confidence: 4,
            text: "Lucas privilégie le collectif. Ses coéquipiers apprécient son état d'esprit."
        },
        ambition: {
            confidence: -1,
            overall: 1,
            text: "Lucas se fixe des objectifs ambitieux et décide de travailler encore plus pour progresser."
        },
        coach: {
            confidence: 3,
            overall: 1,
            text: "Lucas écoute les conseils de son entraîneur et cherche à corriger ses erreurs."
        }
    };

    const selected = choices[choice];

    if (!selected) return;

    if (selected.confidence) {
        career.confidence = clamp(
            career.confidence + selected.confidence, 0, 100
        );
    }

    if (selected.overall) {
        career.overall = clamp(career.overall + selected.overall, 1, 100);
    }

    addStory("Une décision importante", selected.text);

    showFeedback(selected.text);
    render();
}

function showFeedback(message) {
    document.getElementById("choice-feedback").textContent = message;
}

function saveGame() {
    try {
        localStorage.setItem("footballCareerSave", JSON.stringify(career));
        document.getElementById("save-feedback").textContent =
            "Carrière sauvegardée dans ce navigateur.";
    } catch (error) {
        document.getElementById("save-feedback").textContent =
            "Sauvegarde impossible dans ce navigateur.";
    }
}

function loadGame() {
    try {
        const saved = localStorage.getItem("footballCareerSave");

        if (!saved) {
            document.getElementById("save-feedback").textContent =
                "Aucune sauvegarde trouvée.";
            return;
        }

        const parsed = JSON.parse(saved);

        // Vérification simple des données sauvegardées
        const valid =
            parsed &&
            Number.isInteger(parsed.age) &&
            Number.isInteger(parsed.overall) &&
            Number.isInteger(parsed.matches) &&
            Number.isInteger(parsed.goals) &&
            Number.isInteger(parsed.assists) &&
            Number.isInteger(parsed.confidence) &&
            Number.isInteger(parsed.energy) &&
            Number.isInteger(parsed.shooting) &&
            Number.isInteger(parsed.physical) &&
            Array.isArray(parsed.history) &&
            parsed.history.every(entry =>
                entry &&
                typeof entry.date === "string" &&
                typeof entry.title === "string" &&
                typeof entry.text === "string"
            );

        if (!valid) {
            document.getElementById("save-feedback").textContent =
                "La sauvegarde est invalide.";
            return;
        }

        career = {
            ...initialState,
            ...parsed,
            overall: clamp(parsed.overall, 1, 100),
            confidence: clamp(parsed.confidence, 0, 100),
            energy: clamp(parsed.energy, 0, 100),
            shooting: clamp(parsed.shooting, 0, 100),
            physical: clamp(parsed.physical, 0, 100),
            history: parsed.history.slice(0, 30)
        };

        render();

        document.getElementById("save-feedback").textContent =
            "Carrière chargée avec succès.";
    } catch (error) {
        document.getElementById("save-feedback").textContent =
            "Impossible de charger cette sauvegarde.";
    }
}

function resetGame() {
    const confirmed = confirm(
        "Commencer une nouvelle carrière ? La progression actuelle sera perdue si elle n'est pas sauvegardée."
    );

    if (!confirmed) return;

    career = copyState(initialState);
    render();

    document.getElementById("save-feedback").textContent =
        "Nouvelle carrière commencée.";
    showFeedback("Lucas commence une nouvelle aventure !");
}

// Relier les boutons à leurs actions
document.querySelectorAll("[data-action]").forEach(button => {
    button.addEventListener("click", () => train(button.dataset.action));
});

document.querySelectorAll("[data-choice]").forEach(button => {
    button.addEventListener("click", () => chooseStory(button.dataset.choice));
});

document.getElementById("play-match").addEventListener("click", playMatch);
document.getElementById("save-game").addEventListener("click", saveGame);
document.getElementById("load-game").addEventListener("click", loadGame);
document.getElementById("reset-game").addEventListener("click", resetGame);

// Afficher les données au chargement
render();
