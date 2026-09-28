const screens = {
  start: document.getElementById("start-screen"),
  quiz: document.getElementById("quiz-screen"),
  result: document.getElementById("result-screen"),
};

// Kun sværhedsgrader, som quizzens spørgsmål faktisk har, vises.
const DIFFICULTIES = [
  { key: "medium", label: "Medium" },
  { key: "hard", label: "Svær" },
].filter((level) => CATEGORIES.every((category) => category[level.key]));

const el = {
  difficultyList: document.getElementById("difficulty-list"),
  categoryList: document.getElementById("category-list"),
  categoryName: document.getElementById("category-name"),
  progress: document.getElementById("progress"),
  progressFill: document.getElementById("progress-fill"),
  question: document.getElementById("question"),
  answers: document.getElementById("answers"),
  nextBtn: document.getElementById("next-btn"),
  score: document.getElementById("score"),
  scoreMessage: document.getElementById("score-message"),
  retryBtn: document.getElementById("retry-btn"),
  menuBtn: document.getElementById("menu-btn"),
};

let state = null;
let difficulty = DIFFICULTIES[0].key;

function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function showScreen(name) {
  for (const [key, screen] of Object.entries(screens)) {
    screen.hidden = key !== name;
  }
}

function renderDifficulties() {
  el.difficultyList.hidden = DIFFICULTIES.length < 2;
  el.difficultyList.innerHTML = "";
  for (const level of DIFFICULTIES) {
    const btn = document.createElement("button");
    btn.textContent = level.label;
    btn.setAttribute("aria-pressed", level.key === difficulty);
    btn.addEventListener("click", () => {
      difficulty = level.key;
      renderDifficulties();
      renderCategories();
    });
    el.difficultyList.appendChild(btn);
  }
}

function difficultyLabel(key) {
  return DIFFICULTIES.find((level) => level.key === key).label;
}

function renderCategories() {
  el.categoryList.innerHTML = "";
  CATEGORIES.forEach((category, index) => {
    const btn = document.createElement("button");
    const count = category[difficulty].length;
    btn.textContent = `${category.icon}  ${category.name} · ${count} spørgsmål`;
    btn.addEventListener("click", () => startQuiz(index));
    el.categoryList.appendChild(btn);
  });
}

function startQuiz(categoryIndex) {
  const category = CATEGORIES[categoryIndex];
  state = {
    categoryIndex,
    questions: shuffle(category[difficulty]),
    current: 0,
    score: 0,
  };
  el.categoryName.textContent = `${category.icon} ${category.name} · ${difficultyLabel(difficulty)}`;
  showScreen("quiz");
  renderQuestion();
}

function renderQuestion() {
  const { questions, current } = state;
  const item = questions[current];
  const correct = item.answers[0];

  el.progress.textContent = `Spørgsmål ${current + 1} af ${questions.length}`;
  el.progressFill.style.width = `${(current / questions.length) * 100}%`;
  el.question.textContent = item.q;
  el.answers.innerHTML = "";
  el.nextBtn.hidden = true;

  shuffle(item.answers).forEach((answer) => {
    const btn = document.createElement("button");
    btn.textContent = answer;
    btn.dataset.correct = answer === correct;
    btn.addEventListener("click", () => selectAnswer(btn));
    el.answers.appendChild(btn);
  });
}

function selectAnswer(selected) {
  const isCorrect = selected.dataset.correct === "true";
  if (isCorrect) state.score++;

  for (const btn of el.answers.children) {
    btn.disabled = true;
    if (btn.dataset.correct === "true") btn.classList.add("correct");
  }
  if (!isCorrect) selected.classList.add("wrong");

  const isLast = state.current === state.questions.length - 1;
  el.nextBtn.textContent = isLast ? "Se resultat" : "Næste";
  el.nextBtn.hidden = false;
  el.nextBtn.focus();
}

function nextQuestion() {
  state.current++;
  if (state.current < state.questions.length) {
    renderQuestion();
  } else {
    showResult();
  }
}

function showResult() {
  const { score, questions } = state;
  const ratio = score / questions.length;
  el.score.textContent = `${score} / ${questions.length}`;

  let message;
  if (ratio === 1) message = "Perfekt! Du er en ægte quizmester 🏆";
  else if (ratio >= 0.7) message = "Rigtig flot klaret! 🎉";
  else if (ratio >= 0.4) message = "Godt gået – men der er plads til forbedring 👍";
  else message = "Øv! Prøv igen, så går det bedre næste gang 💪";
  el.scoreMessage.textContent = message;

  showScreen("result");
}

el.nextBtn.addEventListener("click", nextQuestion);
el.retryBtn.addEventListener("click", () => startQuiz(state.categoryIndex));
el.menuBtn.addEventListener("click", () => showScreen("start"));

renderDifficulties();
renderCategories();
