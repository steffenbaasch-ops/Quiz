// ---------- Konfiguration ----------
// Udfyld med dit eget Spotify Client ID, så dine venner ikke selv skal indtaste et.
const SPOTIFY_CLIENT_ID = "";
const SCOPES = [
  "streaming",
  "user-read-email",
  "user-read-private",
  "user-read-playback-state",
  "user-modify-playback-state",
];
const REDIRECT_URI = location.origin + location.pathname;
const QUESTION_TIME = 30; // sekunder pr. spørgsmål
const KEYS = {
  clientId: "hhq-client-id",
  token: "hhq-token",
  verifier: "hhq-verifier",
  authState: "hhq-auth-state",
  cache: "hhq-track-cache",
  settings: "hhq-settings",
  highscore: "hhq-highscore",
};

// ---------- Hjælpefunktioner ----------
const store = {
  get(key, fallback = null) {
    try {
      const value = localStorage.getItem(key);
      return value === null ? fallback : JSON.parse(value);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // Privat vindue el.lign. – appen virker stadig, den husker bare ikke noget.
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
    } catch {}
  },
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function normalize(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function randomString(length) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

function base64url(buffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`Kunne ikke hente ${src}`));
    document.head.appendChild(script);
  });
}

// ---------- Spotify-login (Authorization Code med PKCE – ingen server nødvendig) ----------
const auth = {
  token: store.get(KEYS.token),
  refreshing: null,

  clientId() {
    return SPOTIFY_CLIENT_ID || store.get(KEYS.clientId, "");
  },

  isLoggedIn() {
    return Boolean(this.token?.refresh_token);
  },

  async login() {
    if (!window.crypto?.subtle) {
      throw new Error("Siden skal åbnes via https:// eller http://127.0.0.1 – ikke som en lokal fil.");
    }
    const clientId = this.clientId();
    if (!clientId) throw new Error("Indtast dit Spotify Client ID først.");

    const verifier = randomString(64);
    const challenge = base64url(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier)));
    const state = randomString(16);
    store.set(KEYS.verifier, verifier);
    store.set(KEYS.authState, state);

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      scope: SCOPES.join(" "),
      code_challenge_method: "S256",
      code_challenge: challenge,
      redirect_uri: REDIRECT_URI,
      state,
    });
    location.href = `https://accounts.spotify.com/authorize?${params}`;
  },

  // Kaldes når Spotify sender brugeren tilbage med ?code=… i adressen.
  async handleRedirect() {
    const params = new URLSearchParams(location.search);
    const code = params.get("code");
    const error = params.get("error");
    if (!code && !error) return;

    history.replaceState(null, "", REDIRECT_URI);
    if (error) throw new Error(`Spotify-login blev afbrudt (${error}).`);
    if (params.get("state") !== store.get(KEYS.authState)) {
      throw new Error("Ugyldigt svar fra Spotify – prøv at logge ind igen.");
    }

    await this.requestToken({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: store.get(KEYS.verifier),
    });
    store.remove(KEYS.verifier);
    store.remove(KEYS.authState);
  },

  async requestToken(body) {
    const res = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ client_id: this.clientId(), ...body }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error_description || data.error || `Login-fejl (${res.status})`);

    this.token = {
      access_token: data.access_token,
      refresh_token: data.refresh_token || this.token?.refresh_token,
      expires_at: Date.now() + (data.expires_in - 60) * 1000,
    };
    store.set(KEYS.token, this.token);
  },

  async getAccessToken(forceRefresh = false) {
    if (!this.token) throw new Error("Du er ikke logget ind på Spotify.");
    if (forceRefresh || Date.now() >= this.token.expires_at) {
      this.refreshing ??= this.requestToken({
        grant_type: "refresh_token",
        refresh_token: this.token.refresh_token,
      }).finally(() => {
        this.refreshing = null;
      });
      try {
        await this.refreshing;
      } catch {
        this.logout();
        throw new Error("Dit Spotify-login er udløbet – log ind igen.");
      }
    }
    return this.token.access_token;
  },

  logout() {
    this.token = null;
    store.remove(KEYS.token);
  },
};

async function spotify(path, { method = "GET", body, retry = true } = {}) {
  const token = await auth.getAccessToken();
  const res = await fetch(`https://api.spotify.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401 && retry) {
    await auth.getAccessToken(true);
    return spotify(path, { method, body, retry: false });
  }
  if (res.status === 429 && retry) {
    await sleep(Number(res.headers.get("Retry-After") || 2) * 1000);
    return spotify(path, { method, body, retry: false });
  }

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {}

  if (!res.ok) {
    const err = new Error(data?.error?.message || `Spotify-fejl (${res.status})`);
    err.status = res.status;
    err.reason = data?.error?.reason;
    throw err;
  }
  return data;
}

// ---------- Find numrene på Spotify ----------
const songKey = (song) => `${song.artist}|${song.title}`;
const songDecade = (song) => (song.year < 2000 ? "90" : "00");
const fullArtist = (song) => (song.feat ? `${song.artist} feat. ${song.feat}` : song.artist);
const UNWANTED_VERSION = /instrumental|karaoke|acapella|a cappella|remix|live|tribute|cover/i;

function scoreCandidate(song, item) {
  const wantArtist = normalize(song.artist);
  const wantTitle = normalize(song.title);
  const name = normalize(item.name);
  const artistMatch = item.artists.some((a) => {
    const n = normalize(a.name);
    return n.includes(wantArtist) || wantArtist.includes(n);
  });
  if (!artistMatch) return -1;

  let score = 1;
  if (name.includes(wantTitle) || wantTitle.includes(name)) score += 2;
  if (UNWANTED_VERSION.test(item.name) && !UNWANTED_VERSION.test(song.title)) score -= 2;
  return score;
}

async function resolveTrack(song) {
  const cache = store.get(KEYS.cache, {});
  if (cache[songKey(song)]) return cache[songKey(song)];

  const title = song.title.replace(/"/g, "");
  const queries = [song.query, `track:${title} artist:${song.artist}`, `${title} ${song.artist}`].filter(Boolean);

  for (const q of queries) {
    const params = new URLSearchParams({ q, type: "track", limit: "10" });
    const data = await spotify(`/search?${params}`);
    const ranked = (data?.tracks?.items || [])
      .map((item) => ({ item, score: scoreCandidate(song, item) }))
      .filter((c) => c.score > 0)
      .sort((a, b) => b.score - a.score);
    if (!ranked.length) continue;

    const { item } = ranked[0];
    const images = item.album.images || [];
    const track = {
      id: item.id,
      uri: item.uri,
      album: item.album.name,
      cover: (images[1] || images[0])?.url || "",
      duration: item.duration_ms,
    };
    const fresh = store.get(KEYS.cache, {});
    fresh[songKey(song)] = track;
    store.set(KEYS.cache, fresh);
    return track;
  }
  return null;
}

// ---------- Afspilning ----------
// Tre måder at spille på:
//   "browser" – Spotify Web Playback SDK direkte i siden (kræver Premium, virker ikke på mobil)
//   "device:<id>" – en af dine Spotify Connect-enheder (telefon, højttaler, …) – kræver Premium
//   "embed" – Spotifys indlejrede afspiller (virker også uden Premium, evt. kun 30 sek. preview)
const playback = {
  mode: "browser",
  deviceId: null,
  sdkPlayer: null,
  embedController: null,
  playing: false,

  async prepare(mode) {
    this.mode = mode;
    el.embedWrap.hidden = mode !== "embed";
    if (mode !== "embed") this.embedController?.pause();
    if (mode === "browser") {
      this.deviceId = await connectSdk(this);
    } else if (mode.startsWith("device:")) {
      this.deviceId = mode.slice("device:".length);
    } else {
      await loadEmbedApi();
    }
  },

  async play(track, startMs) {
    if (this.mode === "embed") {
      await embedPlay(this, track.uri, Math.round(startMs / 1000));
    } else {
      await playOnDevice(this.deviceId, track.uri, startMs);
    }
    this.playing = true;
  },

  async pause() {
    if (!this.playing) return;
    this.playing = false;
    if (this.mode === "embed") this.embedController?.pause();
    else if (this.mode === "browser") await this.sdkPlayer?.pause();
    else await spotify(`/me/player/pause?device_id=${encodeURIComponent(this.deviceId)}`, { method: "PUT" }).catch(() => {});
  },

  async resume() {
    if (this.playing) return;
    this.playing = true;
    if (this.mode === "embed") this.embedController?.resume();
    else if (this.mode === "browser") await this.sdkPlayer?.resume();
    else await spotify(`/me/player/play?device_id=${encodeURIComponent(this.deviceId)}`, { method: "PUT" });
  },
};

let sdkReady = null;
function loadSdk() {
  sdkReady ??= new Promise((resolve, reject) => {
    window.onSpotifyWebPlaybackSDKReady = resolve;
    loadScript("https://sdk.scdn.co/spotify-player.js").catch(reject);
  });
  return sdkReady;
}

async function connectSdk(pb) {
  if (pb.sdkPlayer && pb.deviceId) return pb.deviceId;
  await loadSdk();

  const player = new Spotify.Player({
    name: "Hiphop-quiz 🎤",
    getOAuthToken: (cb) => auth.getAccessToken().then(cb).catch(() => {}),
    volume: 0.8,
  });

  try {
    const deviceId = await new Promise((resolve, reject) => {
      player.addListener("ready", ({ device_id }) => resolve(device_id));
      player.addListener("initialization_error", () =>
        reject(new Error("Din browser kan ikke afspille Spotify direkte (fx på mobil).")));
      player.addListener("authentication_error", () => reject(new Error("Spotify afviste login – log ind igen.")));
      player.addListener("account_error", () => reject(new Error("Afspilning i browseren kræver Spotify Premium.")));
      player.addListener("playback_error", ({ message }) => console.warn("Spotify:", message));
      player.connect().then((ok) => {
        if (!ok) reject(new Error("Kunne ikke forbinde til Spotify-afspilleren."));
      });
      setTimeout(() => reject(new Error("Spotify-afspilleren svarede ikke.")), 15000);
    });
    pb.sdkPlayer = player;
    return deviceId;
  } catch (err) {
    player.disconnect();
    throw err;
  }
}

async function playOnDevice(deviceId, uri, positionMs) {
  const path = `/me/player/play?device_id=${encodeURIComponent(deviceId)}`;
  const body = { uris: [uri], position_ms: positionMs };
  try {
    await spotify(path, { method: "PUT", body });
  } catch (err) {
    if (err.reason === "PREMIUM_REQUIRED" || err.status === 403) {
      throw new Error("Styring af afspilning kræver Spotify Premium – vælg “Spotify-afspiller i siden”.");
    }
    if (err.status !== 404) throw err;
    // Enheden er ikke aktiv endnu – overfør afspilningen til den og prøv igen.
    await spotify("/me/player", { method: "PUT", body: { device_ids: [deviceId], play: false } });
    await sleep(800);
    await spotify(path, { method: "PUT", body });
  }
}

let embedApiReady = null;
function loadEmbedApi() {
  embedApiReady ??= new Promise((resolve, reject) => {
    window.onSpotifyIframeApiReady = resolve;
    loadScript("https://open.spotify.com/embed/iframe-api/v1").catch(reject);
  });
  return embedApiReady;
}

function waitForEmbedReady(controller) {
  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (!done) {
        done = true;
        resolve();
      }
    };
    controller.addListener("ready", finish);
    setTimeout(finish, 4000);
  });
}

async function embedPlay(pb, uri, startSec) {
  const api = await loadEmbedApi();
  el.embedWrap.hidden = false;
  if (!pb.embedController) {
    pb.embedController = await new Promise((resolve) => {
      api.createController(el.embedTarget, { uri, width: "100%", height: 80 }, resolve);
    });
    // Hold knappen/equalizeren i sync, hvis man trykker play/pause direkte i Spotify-afspilleren
    pb.embedController.addListener("playback_update", (event) => {
      if (pb.mode !== "embed" || event.data.isBuffering) return;
      pb.playing = !event.data.isPaused;
      setPlayingUi(pb.playing);
    });
    await waitForEmbedReady(pb.embedController);
  } else {
    const ready = waitForEmbedReady(pb.embedController);
    pb.embedController.loadUri(uri, false, startSec);
    await ready;
  }
  pb.embedController.play();
}

// ---------- Brugerflade ----------
const screens = {
  setup: document.getElementById("setup-screen"),
  loading: document.getElementById("loading-screen"),
  game: document.getElementById("game-screen"),
  result: document.getElementById("result-screen"),
};

const el = {
  loginBox: document.getElementById("login-box"),
  clientIdRow: document.getElementById("client-id-row"),
  clientId: document.getElementById("client-id"),
  redirectUri: document.getElementById("redirect-uri"),
  loginBtn: document.getElementById("login-btn"),
  accountBox: document.getElementById("account-box"),
  accountName: document.getElementById("account-name"),
  logoutBtn: document.getElementById("logout-btn"),
  typeChecks: document.querySelectorAll('input[name="types"]'),
  deviceSelect: document.getElementById("device-select"),
  refreshDevices: document.getElementById("refresh-devices"),
  deviceHint: document.getElementById("device-hint"),
  startBtn: document.getElementById("start-btn"),
  highscore: document.getElementById("highscore"),
  setupError: document.getElementById("setup-error"),
  loadingText: document.getElementById("loading-text"),
  round: document.getElementById("round"),
  points: document.getElementById("points"),
  progressFill: document.getElementById("progress-fill"),
  equalizer: document.getElementById("equalizer"),
  toggleBtn: document.getElementById("toggle-btn"),
  embedWrap: document.getElementById("embed-wrap"),
  embedTarget: document.getElementById("embed-target"),
  timerFill: document.getElementById("timer-fill"),
  question: document.getElementById("question"),
  questionHint: document.getElementById("question-hint"),
  answers: document.getElementById("answers"),
  reveal: document.getElementById("reveal"),
  revealCover: document.getElementById("reveal-cover"),
  revealResult: document.getElementById("reveal-result"),
  revealTitle: document.getElementById("reveal-title"),
  revealMeta: document.getElementById("reveal-meta"),
  revealLink: document.getElementById("reveal-link"),
  nextBtn: document.getElementById("next-btn"),
  finalPoints: document.getElementById("final-points"),
  finalCorrect: document.getElementById("final-correct"),
  finalMessage: document.getElementById("final-message"),
  playedList: document.getElementById("played-list"),
  againBtn: document.getElementById("again-btn"),
  menuBtn: document.getElementById("menu-btn"),
};

const settings = {
  decade: "all",
  count: "10",
  types: ["artist", "title", "year"],
  playback: "browser",
  ...store.get(KEYS.settings, {}),
};

let account = null;
let game = null;
let timer = null;

function showScreen(name) {
  for (const [key, screen] of Object.entries(screens)) {
    screen.hidden = key !== name;
  }
}

function showError(message) {
  el.setupError.textContent = message;
  el.setupError.hidden = !message;
}

function saveSettings() {
  store.set(KEYS.settings, settings);
}

function renderSettings() {
  document.querySelectorAll(".segmented").forEach((group) => {
    for (const btn of group.children) {
      btn.classList.toggle("active", btn.dataset.value === settings[group.dataset.setting]);
    }
  });
  el.typeChecks.forEach((check) => {
    check.checked = settings.types.includes(check.value);
  });
  renderHighscore();
}

const highscoreKey = () => `${settings.decade}-${settings.count}`;

function renderHighscore() {
  const best = store.get(KEYS.highscore, {})[highscoreKey()];
  const label = { 90: "90'erne", "00": "00'erne", all: "begge årtier" }[settings.decade];
  el.highscore.textContent = best ? `🏆 Rekord (${settings.count} numre, ${label}): ${best} point` : "";
}

async function renderDevices() {
  const isPremium = account?.product === "premium";
  const options = [];
  options.push({ value: "browser", label: "Denne browser" + (isPremium ? "" : " (kræver Premium)") });
  try {
    const data = await spotify("/me/player/devices");
    for (const device of data?.devices || []) {
      if (device.is_restricted || device.name.startsWith("Hiphop-quiz")) continue;
      options.push({ value: `device:${device.id}`, label: `📱 ${device.name} (${device.type})` });
    }
  } catch {
    // Enhedslisten er en bonus – fejler den, kan man stadig spille i browseren.
  }
  options.push({ value: "embed", label: "Spotify-afspiller i siden (virker uden Premium)" });

  el.deviceSelect.innerHTML = "";
  for (const opt of options) {
    const option = document.createElement("option");
    option.value = opt.value;
    option.textContent = opt.label;
    el.deviceSelect.appendChild(option);
  }

  let preferred = settings.playback;
  if (!options.some((o) => o.value === preferred)) preferred = isPremium ? "browser" : "embed";
  if (!isPremium && preferred !== "embed") preferred = "embed";
  el.deviceSelect.value = preferred;
  settings.playback = preferred;
  renderDeviceHint();
}

function renderDeviceHint() {
  const value = el.deviceSelect.value;
  const hints = {
    browser: "Musikken spiller direkte her i browseren. Virker ikke på mobil – vælg da din telefon eller højttaler.",
    embed: "Uden Premium afspiller Spotify ofte kun et 30 sekunders uddrag. Log ind på open.spotify.com i samme browser for hele numre.",
  };
  el.deviceHint.textContent =
    hints[value] ?? "Musikken spiller på den valgte enhed. Tip: Læg telefonen med skærmen nedad, så ingen snyder 😉";
}

async function renderSetup() {
  showScreen("setup");
  renderSettings();
  el.redirectUri.textContent = REDIRECT_URI;

  if (!auth.isLoggedIn()) {
    el.loginBox.hidden = false;
    el.accountBox.hidden = true;
    el.clientIdRow.hidden = Boolean(SPOTIFY_CLIENT_ID);
    el.clientId.value = store.get(KEYS.clientId, "");
    return;
  }

  el.loginBox.hidden = true;
  el.accountBox.hidden = false;
  try {
    account ??= await spotify("/me");
    const premium = account.product === "premium" ? " · Premium" : "";
    el.accountName.textContent = `🎧 ${account.display_name || account.id}${premium}`;
  } catch (err) {
    if (!auth.isLoggedIn()) return renderSetup();
    if (err.status === 403) {
      showError(
        "Spotify afviste adgangen. Er din konto tilføjet under “User Management” i din app på developer.spotify.com?",
      );
    } else {
      showError(err.message);
    }
  }
  await renderDevices();
}

// ---------- Spørgsmål ----------
function pickDistinct(candidates, count, isTooClose) {
  const picked = [];
  for (const candidate of shuffle(candidates)) {
    if (picked.length === count) break;
    if (!isTooClose(candidate) && !picked.some((p) => normalize(p) === normalize(candidate))) {
      picked.push(candidate);
    }
  }
  return picked;
}

function buildQuestion(song, type, pool) {
  const sameDecade = pool.filter((s) => songDecade(s) === songDecade(song));
  const others = (list) => list.filter((s) => s !== song);

  if (type === "artist") {
    const banned = [song.artist, ...(song.feat ? song.feat.split(/\s*&\s*/) : [])].map(normalize);
    const isTooClose = (name) => banned.some((b) => normalize(name).includes(b) || b.includes(normalize(name)));
    let wrong = pickDistinct(others(sameDecade).map((s) => s.artist), 3, isTooClose);
    if (wrong.length < 3) wrong = pickDistinct(others(SONGS).map((s) => s.artist), 3, isTooClose);
    return { text: "Hvem er kunstneren?", hint: "", correct: song.artist, options: shuffle([song.artist, ...wrong]) };
  }

  if (type === "title") {
    const isTooClose = (title) => normalize(title) === normalize(song.title);
    let wrong = pickDistinct(others(sameDecade).map((s) => s.title), 3, isTooClose);
    if (wrong.length < 3) wrong = pickDistinct(others(SONGS).map((s) => s.title), 3, isTooClose);
    return {
      text: "Hvad hedder nummeret?",
      hint: `Kunstner: ${song.artist}`,
      correct: song.title,
      options: shuffle([song.title, ...wrong]),
    };
  }

  // Årstal: tre forkerte år tæt på det rigtige
  const offsets = shuffle([-4, -3, -2, -1, 1, 2, 3, 4]);
  const wrongYears = [];
  for (const offset of offsets) {
    if (wrongYears.length === 3) break;
    const year = song.year + offset;
    if (year >= 1988 && year <= 2011) wrongYears.push(year);
  }
  return {
    text: "Hvilket år udkom nummeret?",
    hint: `${song.artist} – ${song.title}`,
    correct: String(song.year),
    options: shuffle([song.year, ...wrongYears]).map(String),
  };
}

// ---------- Spillet ----------
async function startGame() {
  showError("");
  if (!settings.types.length) {
    showError("Vælg mindst én type spørgsmål.");
    return;
  }

  const pool = settings.decade === "all" ? SONGS : SONGS.filter((s) => songDecade(s) === settings.decade);
  const count = Number(settings.count);
  showScreen("loading");
  el.loadingText.textContent = "Forbinder til Spotify…";

  try {
    try {
      await playback.prepare(settings.playback);
    } catch (err) {
      if (settings.playback !== "browser") throw err;
      // Browser-afspilning virker ikke (mobil / ikke Premium) – brug den indlejrede afspiller i stedet.
      console.warn(err);
      await playback.prepare("embed");
    }
    playback.sdkPlayer?.activateElement?.();

    const picked = [];
    for (const song of shuffle(pool)) {
      if (picked.length === count) break;
      el.loadingText.textContent = `Finder numre på Spotify… (${picked.length}/${count})`;
      const track = await resolveTrack(song).catch((err) => {
        if (err.status === 401 || err.status === 403) throw err;
        return null;
      });
      if (track) picked.push({ song, track });
    }
    if (picked.length < 4) throw new Error("Kunne ikke finde nok numre på Spotify. Prøv igen om lidt.");

    game = {
      pool,
      rounds: picked.map(({ song, track }) => ({
        song,
        track,
        question: buildQuestion(song, settings.types[Math.floor(Math.random() * settings.types.length)], pool),
        correct: false,
        points: 0,
      })),
      current: 0,
      points: 0,
    };
    showScreen("game");
    await playRound();
  } catch (err) {
    await renderSetup();
    showError(err.message);
  }
}

async function playRound() {
  const round = game.rounds[game.current];
  const { question } = round;

  el.round.textContent = `Nummer ${game.current + 1} af ${game.rounds.length}`;
  el.points.textContent = `${game.points} point`;
  el.progressFill.style.width = `${(game.current / game.rounds.length) * 100}%`;
  el.question.textContent = question.text;
  el.questionHint.textContent = question.hint;
  el.questionHint.hidden = !question.hint;
  el.reveal.hidden = true;
  el.nextBtn.hidden = true;
  el.answers.innerHTML = "";

  question.options.forEach((option, index) => {
    const btn = document.createElement("button");
    btn.textContent = option;
    btn.dataset.key = index + 1;
    btn.addEventListener("click", () => answer(option));
    el.answers.appendChild(btn);
  });

  // Start et stykke inde i nummeret, så man ikke kun hører introen
  const maxStart = Math.max(0, round.track.duration - 45000);
  const startMs = Math.min(maxStart, 20000 + Math.floor(Math.random() * 30000));
  try {
    await playback.play(round.track, startMs);
  } catch (err) {
    console.error(err);
    el.questionHint.hidden = false;
    el.questionHint.textContent = `⚠️ ${err.message}`;
  }
  setPlayingUi(playback.playing);
  startTimer();
}

function startTimer() {
  clearInterval(timer);
  const started = Date.now();
  game.deadline = started + QUESTION_TIME * 1000;
  el.timerFill.style.width = "100%";
  timer = setInterval(() => {
    const left = Math.max(0, game.deadline - Date.now());
    el.timerFill.style.width = `${(left / (QUESTION_TIME * 1000)) * 100}%`;
    if (left === 0) answer(null);
  }, 100);
}

function answer(choice) {
  const round = game.rounds[game.current];
  if (round.answered) return;
  round.answered = true;
  clearInterval(timer);

  const left = Math.max(0, game.deadline - Date.now()) / (QUESTION_TIME * 1000);
  round.correct = choice === round.question.correct;
  round.points = round.correct ? Math.round(200 + 800 * left) : 0;
  game.points += round.points;
  el.points.textContent = `${game.points} point`;

  for (const btn of el.answers.children) {
    btn.disabled = true;
    if (btn.textContent === round.question.correct) btn.classList.add("correct");
    else if (btn.textContent === choice) btn.classList.add("wrong");
  }

  const { song, track } = round;
  el.revealResult.textContent = round.correct
    ? `✅ Rigtigt! +${round.points} point`
    : choice === null
      ? "⏰ Tiden løb ud"
      : "❌ Forkert";
  el.revealTitle.textContent = `${song.title} – ${fullArtist(song)}`;
  el.revealMeta.textContent = `${song.year} · ${track.album}`;
  el.revealCover.src = track.cover;
  el.revealCover.hidden = !track.cover;
  el.revealLink.href = `https://open.spotify.com/track/${track.id}`;
  el.reveal.hidden = false;

  const isLast = game.current === game.rounds.length - 1;
  el.nextBtn.textContent = isLast ? "Se resultat" : "Næste nummer";
  el.nextBtn.hidden = false;
  el.nextBtn.focus();
}

async function nextRound() {
  el.nextBtn.hidden = true;
  game.current++;
  if (game.current < game.rounds.length) {
    await playRound();
  } else {
    await showResult();
  }
}

async function showResult() {
  clearInterval(timer);
  await playback.pause().catch(() => {});
  setPlayingUi(false);

  const correct = game.rounds.filter((r) => r.correct).length;
  const total = game.rounds.length;
  el.finalPoints.textContent = `${game.points} point`;
  el.finalCorrect.textContent = `${correct} af ${total} rigtige`;

  const highscores = store.get(KEYS.highscore, {});
  const isRecord = game.points > (highscores[highscoreKey()] || 0);
  if (isRecord) {
    highscores[highscoreKey()] = game.points;
    store.set(KEYS.highscore, highscores);
  }

  const ratio = correct / total;
  let message;
  if (ratio === 1) message = "Fejlfrit! Du er en ægte OG 👑";
  else if (ratio >= 0.7) message = "Respekt – du kender dine klassikere 🔥";
  else if (ratio >= 0.4) message = "Ikke dårligt, men der skal lyttes flere mixtapes 📼";
  else message = "Tid til at støve den gamle discman af 💿";
  el.finalMessage.textContent = isRecord ? `${message} · Ny rekord! 🏆` : message;

  el.playedList.innerHTML = "";
  for (const round of game.rounds) {
    const li = document.createElement("li");
    const mark = document.createElement("span");
    mark.className = "mark";
    mark.textContent = round.correct ? "✅" : "❌";
    const link = document.createElement("a");
    link.href = `https://open.spotify.com/track/${round.track.id}`;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = `${round.song.title} – ${fullArtist(round.song)} (${round.song.year})`;
    li.append(mark, link);
    el.playedList.appendChild(li);
  }

  showScreen("result");
}

function setPlayingUi(isPlaying) {
  el.equalizer.classList.toggle("playing", isPlaying);
  el.toggleBtn.textContent = isPlaying ? "⏸" : "▶";
  el.toggleBtn.setAttribute("aria-label", isPlaying ? "Pause" : "Afspil");
}

async function togglePlayback() {
  try {
    if (playback.playing) await playback.pause();
    else await playback.resume();
  } catch (err) {
    console.error(err);
  }
  setPlayingUi(playback.playing);
}

async function backToSetup() {
  clearInterval(timer);
  await playback.pause().catch(() => {});
  setPlayingUi(false);
  await renderSetup();
}

// ---------- Hændelser ----------
el.loginBtn.addEventListener("click", async () => {
  showError("");
  if (!SPOTIFY_CLIENT_ID) store.set(KEYS.clientId, el.clientId.value.trim());
  try {
    await auth.login();
  } catch (err) {
    showError(err.message);
  }
});

el.logoutBtn.addEventListener("click", () => {
  auth.logout();
  account = null;
  renderSetup();
});

document.querySelectorAll(".segmented").forEach((group) => {
  group.addEventListener("click", (event) => {
    const btn = event.target.closest("button");
    if (!btn) return;
    settings[group.dataset.setting] = btn.dataset.value;
    saveSettings();
    renderSettings();
  });
});

el.typeChecks.forEach((check) => {
  check.addEventListener("change", () => {
    settings.types = [...el.typeChecks].filter((c) => c.checked).map((c) => c.value);
    saveSettings();
  });
});

el.deviceSelect.addEventListener("change", () => {
  settings.playback = el.deviceSelect.value;
  saveSettings();
  renderDeviceHint();
});

el.refreshDevices.addEventListener("click", renderDevices);
el.startBtn.addEventListener("click", startGame);
el.toggleBtn.addEventListener("click", togglePlayback);
el.nextBtn.addEventListener("click", nextRound);
el.againBtn.addEventListener("click", startGame);
el.menuBtn.addEventListener("click", backToSetup);

// Tast 1–4 for at svare
document.addEventListener("keydown", (event) => {
  if (screens.game.hidden || event.target.tagName === "INPUT") return;
  const btn = el.answers.querySelector(`button[data-key="${event.key}"]`);
  if (btn && !btn.disabled) btn.click();
});

// ---------- Start ----------
(async () => {
  try {
    await auth.handleRedirect();
  } catch (err) {
    await renderSetup();
    showError(err.message);
    return;
  }
  await renderSetup();
})();
