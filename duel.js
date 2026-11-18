// Hiphop-duellen – 2 spillere + 1 quizmaster der taster svarene ind.
const STORAGE_KEY = "hiphop-duel-state";
const NAMES_KEY = "hiphop-duel-names";
const LETTERS = ["A", "B", "C", "D"];
const PLAYERS = ["p1", "p2"];
const KEYMAP = {
  p1: { 1: 0, 2: 1, 3: 2, 4: 3 },
  p2: { 7: 0, 8: 1, 9: 2, 0: 3 },
};
const COUNTRY = { dk: "🇩🇰 Dansk", us: "🇺🇸 Amerikansk" };
const DECADE = { 80: "80'erne", 90: "90'erne", "00": "00'erne" };

// ---------- Små hjælpere ----------
const $ = (id) => document.getElementById(id);

const store = {
  get(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

// ---------- Spiltilstand ----------
// answers[runde] = { p1: originalIndex | null, p2: originalIndex | null }
// originalIndex 0 er altid det rigtige svar (se duel-questions.js)
let state = null;

function newGame(names, shuffleOrder) {
  const indices = DUEL_QUESTIONS.map((_, i) => i);
  state = {
    names,
    order: shuffleOrder ? shuffle(indices) : indices,
    optionOrder: DUEL_QUESTIONS.map(() => shuffle([0, 1, 2, 3])),
    round: 0,
    revealed: false,
    answers: DUEL_QUESTIONS.map(() => ({ p1: null, p2: null })),
    finished: false,
  };
  save();
}

function save() {
  if (state) store.set(STORAGE_KEY, state);
}

function currentQuestion() {
  return DUEL_QUESTIONS[state.order[state.round]];
}

function currentAnswers() {
  return state.answers[state.round];
}

function scoreFor(player, uptoRound = state.round, includeCurrent = state.revealed) {
  let score = 0;
  const last = includeCurrent ? uptoRound : uptoRound - 1;
  for (let r = 0; r <= last && r < state.answers.length; r++) {
    if (state.answers[r][player] === 0) score++;
  }
  return score;
}

// ---------- Spotify-afspiller (iFrame API – kræver ingen login eller Premium) ----------
const spotify = {
  apiPromise: null,
  controller: null,
  controllerPromise: null,
  loadedUri: null,
  playing: false,
  position: 0,

  loadApi() {
    this.apiPromise ??= new Promise((resolve, reject) => {
      window.onSpotifyIframeApiReady = resolve;
      const script = document.createElement("script");
      script.src = "https://open.spotify.com/embed/iframe-api/v1";
      script.async = true;
      script.onerror = () => reject(new Error("Kunne ikke hente Spotify-afspilleren"));
      document.head.appendChild(script);
    });
    return this.apiPromise;
  },

  async ensureController(uri) {
    if (this.controller) return this.controller;
    this.controllerPromise ??= this.loadApi().then(
      (api) =>
        new Promise((resolve) => {
          api.createController($("embed-target"), { uri, width: "100%", height: 80 }, (controller) => {
            controller.addListener("playback_update", (e) => {
              const d = e.data || {};
              if (d.isBuffering) return;
              this.playing = !d.isPaused;
              this.position = d.position || 0;
              updatePlayUi();
            });
            this.loadedUri = uri;
            this.controller = controller;
            resolve(controller);
          });
        })
    );
    return this.controllerPromise;
  },

  // Forbered et nummer uden at starte det
  async cue(uri) {
    this.playing = false;
    updatePlayUi();
    try {
      const controller = await this.ensureController(uri);
      if (this.loadedUri !== uri) {
        controller.loadUri(uri);
        this.loadedUri = uri;
      }
    } catch (err) {
      console.warn(err);
    }
  },

  async toggle(uri) {
    const controller = await this.ensureController(uri);
    if (this.loadedUri !== uri) {
      controller.loadUri(uri);
      this.loadedUri = uri;
      controller.play();
      return;
    }
    if (this.playing) controller.pause();
    else if (this.position > 0) controller.resume();
    else controller.play();
  },

  async restart(uri) {
    const controller = await this.ensureController(uri);
    if (this.loadedUri !== uri) {
      controller.loadUri(uri);
      this.loadedUri = uri;
    }
    controller.seek(0);
    controller.play();
  },

  async skip(seconds) {
    if (!this.controller) return;
    this.controller.seek(Math.round(this.position / 1000) + seconds);
    if (!this.playing) this.controller.resume();
  },

  pause() {
    if (this.controller && this.playing) this.controller.pause();
  },
};

function trackUri(q) {
  return `spotify:track:${q.track}`;
}

function updatePlayUi() {
  $("play-btn").textContent = spotify.playing ? "⏸ Pause" : "▶ Afspil";
  $("equalizer").classList.toggle("playing", spotify.playing);
}

// ---------- Skærme ----------
const screens = ["setup-screen", "game-screen", "result-screen"];
function showScreen(id) {
  screens.forEach((s) => ($(s).hidden = s !== id));
  window.scrollTo(0, 0);
}

// ---------- Opsætning ----------
function initSetup() {
  const saved = store.get(NAMES_KEY);
  if (saved) {
    $("name-p1").value = saved.p1 || "";
    $("name-p2").value = saved.p2 || "";
    $("name-host").value = saved.host || "";
  }
  const previous = store.get(STORAGE_KEY);
  $("resume-btn").hidden = !(previous && !previous.finished && previous.answers?.length === DUEL_QUESTIONS.length);
}

function readNames() {
  const names = {
    p1: $("name-p1").value.trim() || "Spiller 1",
    p2: $("name-p2").value.trim() || "Spiller 2",
    host: $("name-host").value.trim() || "Quizmaster",
  };
  store.set(NAMES_KEY, names);
  return names;
}

function startGame() {
  newGame(readNames(), $("opt-shuffle").checked);
  enterGame();
}

function resumeGame() {
  state = store.get(STORAGE_KEY);
  if (!state) return;
  enterGame();
}

function enterGame() {
  PLAYERS.forEach((p) => {
    $(`sb-name-${p}`).textContent = state.names[p];
    $(`pad-name-${p}`).textContent = state.names[p];
  });
  showScreen("game-screen");
  renderRound();
}

// ---------- Runde ----------
function renderRound() {
  const q = currentQuestion();
  const perm = state.optionOrder[state.order[state.round]];
  const answers = currentAnswers();
  const total = DUEL_QUESTIONS.length;

  $("round-label").textContent = `${state.round + 1} / ${total}`;
  $("progress-fill").style.width = `${((state.round + (state.revealed ? 1 : 0)) / total) * 100}%`;
  $("tag-country").textContent = COUNTRY[q.country];
  $("tag-decade").textContent = DECADE[q.decade];
  $("question").textContent = q.q;
  $("open-spotify").href = `https://open.spotify.com/track/${q.track}`;
  renderScores();

  // Svarmuligheder
  const list = $("options");
  list.innerHTML = "";
  list.classList.toggle("revealed", state.revealed);
  perm.forEach((orig, pos) => {
    const li = document.createElement("li");
    li.className = "option";
    if (state.revealed) {
      if (orig === 0) li.classList.add("correct");
      else if (PLAYERS.some((p) => answers[p] === orig)) li.classList.add("wrong");
    }
    li.innerHTML = `<span class="letter">${LETTERS[pos]}</span><span class="text">${escapeHtml(q.options[orig])}</span><span class="pickers"></span>`;
    const pickers = li.querySelector(".pickers");
    PLAYERS.forEach((p) => {
      if (answers[p] === orig) {
        const chip = document.createElement("span");
        chip.className = `picker ${p}`;
        chip.textContent = state.names[p];
        pickers.appendChild(chip);
      }
    });
    list.appendChild(li);
  });

  // Svar-pads
  PLAYERS.forEach((p) => {
    const pad = document.querySelector(`.pad.${p}`);
    const wrap = pad.querySelector(".pad-buttons");
    wrap.innerHTML = "";
    perm.forEach((orig, pos) => {
      const btn = document.createElement("button");
      btn.className = "pad-btn";
      btn.textContent = LETTERS[pos];
      btn.disabled = state.revealed;
      if (answers[p] === orig) btn.classList.add("selected");
      btn.addEventListener("click", () => {
        setAnswer(p, pos);
        btn.blur();
      });
      wrap.appendChild(btn);
    });
    pad.classList.toggle("locked", state.revealed);
    pad.classList.toggle("right", state.revealed && answers[p] === 0);
    pad.classList.toggle("wrong", state.revealed && answers[p] !== 0);

    let status = answers[p] === null ? "venter…" : "✔ svaret";
    if (state.revealed) status = answers[p] === 0 ? "+1 point 🎉" : answers[p] === null ? "intet svar" : "forkert";
    $(`pad-status-${p}`).textContent = status;
  });

  // Afsløring
  $("reveal").hidden = !state.revealed;
  if (state.revealed) {
    const right = PLAYERS.filter((p) => answers[p] === 0).map((p) => state.names[p]);
    $("reveal-result").textContent =
      right.length === 2 ? "Begge svarede rigtigt! 🔥" : right.length === 1 ? `${right[0]} tager pointet! 🏆` : "Ingen fik den… 😬";
    const year = q.year ? ` (${q.year})` : "";
    $("reveal-track").innerHTML = `<b>${escapeHtml(q.artist)}</b> – ${escapeHtml(q.title)}${year}`;
    $("reveal-fact").textContent = q.fact || "";
  }

  $("reveal-btn").hidden = state.revealed;
  $("next-btn").hidden = !state.revealed;
  $("next-btn").textContent = state.round === total - 1 ? "Se resultatet 🏁" : "Næste nummer →";
  updateRevealButton();

  // Afspiller: skjul igen og forbered nummeret
  setPlayerVisible(state.revealed);
  spotify.cue(trackUri(q));
}

function renderScores() {
  PLAYERS.forEach((p) => ($(`sb-score-${p}`).textContent = scoreFor(p)));
}

function setAnswer(player, pos) {
  if (state.revealed) return;
  const orig = state.optionOrder[state.order[state.round]][pos];
  const answers = currentAnswers();
  answers[player] = answers[player] === orig ? null : orig; // tryk igen for at fortryde
  save();
  renderAnswerState();
}

// Opdatér kun valg-markeringer (uden at genindlæse afspilleren)
function renderAnswerState() {
  const perm = state.optionOrder[state.order[state.round]];
  const answers = currentAnswers();
  PLAYERS.forEach((p) => {
    document.querySelectorAll(`.pad.${p} .pad-btn`).forEach((btn, pos) => {
      btn.classList.toggle("selected", answers[p] === perm[pos]);
    });
    $(`pad-status-${p}`).textContent = answers[p] === null ? "venter…" : "✔ svaret";
  });
  document.querySelectorAll("#options .option").forEach((li, pos) => {
    const pickers = li.querySelector(".pickers");
    pickers.innerHTML = "";
    PLAYERS.forEach((p) => {
      if (answers[p] === perm[pos]) {
        const chip = document.createElement("span");
        chip.className = `picker ${p}`;
        chip.textContent = state.names[p];
        pickers.appendChild(chip);
      }
    });
  });
  updateRevealButton();
}

function updateRevealButton() {
  const answers = currentAnswers();
  const missing = PLAYERS.filter((p) => answers[p] === null).length;
  $("reveal-btn").textContent = missing === 0 ? "Afslør svaret 🎯" : `Afslør svaret (mangler ${missing} svar)`;
}

function reveal() {
  if (state.revealed) return;
  const answers = currentAnswers();
  const missing = PLAYERS.filter((p) => answers[p] === null).map((p) => state.names[p]);
  if (missing.length && !confirm(`${missing.join(" og ")} har ikke svaret endnu. Afslør alligevel?`)) return;
  state.revealed = true;
  save();
  renderRound();
  PLAYERS.forEach((p) => {
    if (answers[p] === 0) {
      const card = document.querySelector(`.scoreboard .score-card.${p}`);
      card.classList.remove("bump");
      void card.offsetWidth;
      card.classList.add("bump");
    }
  });
}

function next() {
  if (!state.revealed) return;
  spotify.pause();
  if (state.round >= DUEL_QUESTIONS.length - 1) {
    finish();
    return;
  }
  state.round++;
  state.revealed = false;
  save();
  renderRound();
}

function setPlayerVisible(visible) {
  $("embed-wrap").classList.toggle("covered", !visible);
  $("show-player-btn").textContent = visible ? "🙈 Skjul afspiller" : "👁 Vis afspiller";
}

// ---------- Resultat ----------
function finish() {
  state.finished = true;
  save();
  const s1 = scoreFor("p1");
  const s2 = scoreFor("p2");
  const { p1, p2, host } = state.names;

  $("winner").textContent = s1 === s2 ? `Uafgjort! 🤝` : `${s1 > s2 ? p1 : p2} 👑`;
  $("final-name-p1").textContent = p1;
  $("final-name-p2").textContent = p2;
  $("final-score-p1").textContent = s1;
  $("final-score-p2").textContent = s2;
  $("host-credit").textContent = `Quizmaster: ${host} · ${DUEL_QUESTIONS.length} numre`;
  $("recap-p1").textContent = p1;
  $("recap-p2").textContent = p2;

  const body = $("recap-body");
  body.innerHTML = "";
  state.order.forEach((qi, r) => {
    const q = DUEL_QUESTIONS[qi];
    const a = state.answers[r];
    const mark = (v) => (v === 0 ? "✅" : v === null ? "–" : "❌");
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r + 1}</td>
      <td><a href="https://open.spotify.com/track/${q.track}" target="_blank" rel="noopener">${escapeHtml(q.artist)} – ${escapeHtml(q.title)}</a>
        <div class="meta">${COUNTRY[q.country]} · ${DECADE[q.decade]} · Svar: ${escapeHtml(q.options[0])}</div></td>
      <td class="res">${mark(a.p1)}</td>
      <td class="res">${mark(a.p2)}</td>`;
    body.appendChild(tr);
  });
  showScreen("result-screen");
}

// ---------- Hændelser ----------
$("start-btn").addEventListener("click", startGame);
$("resume-btn").addEventListener("click", resumeGame);
$("reveal-btn").addEventListener("click", reveal);
$("next-btn").addEventListener("click", next);
$("play-btn").addEventListener("click", () => spotify.toggle(trackUri(currentQuestion())).catch(playError));
$("restart-btn").addEventListener("click", () => spotify.restart(trackUri(currentQuestion())).catch(playError));
$("skip-btn").addEventListener("click", () => spotify.skip(15));
$("show-player-btn").addEventListener("click", () => setPlayerVisible($("embed-wrap").classList.contains("covered")));
$("quit-btn").addEventListener("click", () => {
  if (!confirm("Vil du afslutte spillet? Det nuværende spil kan fortsættes senere fra forsiden.")) return;
  spotify.pause();
  initSetup();
  showScreen("setup-screen");
});
$("again-btn").addEventListener("click", () => {
  newGame(state.names, $("opt-shuffle").checked);
  enterGame();
});
$("menu-btn").addEventListener("click", () => {
  initSetup();
  showScreen("setup-screen");
});

function playError(err) {
  console.warn(err);
  alert("Spotify-afspilleren kunne ikke starte. Prøv “Vis afspiller” og tryk play direkte i den – eller brug “Åbn i Spotify”.");
}

document.addEventListener("keydown", (e) => {
  if ($("game-screen").hidden || e.target.matches("input, textarea") || e.metaKey || e.ctrlKey || e.altKey) return;
  for (const p of PLAYERS) {
    if (e.key in KEYMAP[p]) {
      setAnswer(p, KEYMAP[p][e.key]);
      return;
    }
  }
  if (e.key === " ") {
    e.preventDefault();
    $("play-btn").click();
  } else if (e.key === "Enter") {
    e.preventDefault();
    state.revealed ? next() : reveal();
  }
});

initSetup();
spotify.loadApi().catch(() => {});
