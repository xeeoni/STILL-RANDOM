let movies = [];
let currentMovie = null;
let filteredMovies = [];
let mode = "random";
const selected = { genre: "all", color: "all", era: "all", mood: "all" };
let saved = JSON.parse(localStorage.getItem("stillRandomSaved") || "[]");

const $ = (id) => document.getElementById(id);

const config = {
  genre: ["all", "드라마", "SF", "스릴러", "공포", "범죄", "로맨스", "코미디", "판타지", "액션", "애니메이션"],
  color: ["all", "블루", "레드", "옐로우", "그린", "퍼플", "어두운 톤", "밝은 톤", "다채로운 톤"],
  era: ["all", "1960s", "1970s", "1980s", "1990s", "2000s", "2010s", "2020s"],
  mood: ["all", "몽환적인", "기괴한", "긴장감 있는", "우울한", "따뜻한", "차가운", "고독한", "아름다운", "불안한"]
};

const labels = { all: "전체" };

function createChips(type) {
  const box = $(`${type}Chips`);
  config[type].forEach(value => {
    const btn = document.createElement("button");
    btn.className = `chip ${value === "all" ? "active" : ""}`;
    btn.dataset.value = value;
    btn.textContent = labels[value] || value;
    btn.onclick = () => {
      selected[type] = value;
      box.querySelectorAll(".chip").forEach(x => x.classList.remove("active"));
      btn.classList.add("active");
    };
    box.appendChild(btn);
  });
}

function updateFiltered() {
  filteredMovies = movies.filter(movie =>
    (selected.genre === "all" || movie.genre.includes(selected.genre)) &&
    (selected.color === "all" || movie.color === selected.color) &&
    (selected.era === "all" || movie.era === selected.era) &&
    (selected.mood === "all" || movie.mood.includes(selected.mood))
  );
}

function randomMovie() {
  updateFiltered();
  const pool = mode === "random" ? movies : filteredMovies;
  if (!pool.length) {
    alert("조건에 맞는 영화가 없습니다. 필터를 조금 넓혀보세요!");
    return;
  }
  let next = pool[Math.floor(Math.random() * pool.length)];
  if (pool.length > 1 && currentMovie) {
    while (next.id === currentMovie.id) next = pool[Math.floor(Math.random() * pool.length)];
  }
  showMovie(next);
}

function showMovie(movie) {
  currentMovie = movie;
  $("stillImage").src = movie.image;
  $("stillImage").alt = `${movie.title} 영화 스틸컷`;
  $("imageFallback").classList.add("hidden");
  $("stillImage").onerror = () => {
    $("imageFallback").classList.remove("hidden");
  };

  $("movieTitle").textContent = movie.title;
  $("movieMeta").textContent = `${movie.year} · ${movie.country}`;
  $("movieDescription").textContent = movie.description;
  $("movieDirector").textContent = movie.director;
  $("movieGenre").textContent = movie.genre.join(" / ");
  $("movieColor").textContent = movie.color;
  $("movieMood").textContent = movie.mood.join(" / ");

  $("movieTags").innerHTML = [
    movie.era, movie.color, ...movie.style
  ].map(tag => `<span>${tag}</span>`).join("");

  $("totalCount").textContent = String(movies.length).padStart(2, "0");
  $("currentIndex").textContent = String(movies.findIndex(m => m.id === movie.id) + 1).padStart(2, "0");
  updateSaveButton();
}

function updateSaveButton() {
  const isSaved = saved.includes(currentMovie?.id);
  $("saveBtn").textContent = isSaved ? "♥" : "♡";
  $("saveBtn").classList.toggle("saved", isSaved);
}

function toggleSave() {
  if (!currentMovie) return;
  if (saved.includes(currentMovie.id)) {
    saved = saved.filter(id => id !== currentMovie.id);
  } else {
    saved.push(currentMovie.id);
  }
  localStorage.setItem("stillRandomSaved", JSON.stringify(saved));
  updateSaveButton();
  renderSaved();
}

function renderSaved() {
  $("savedCount").textContent = saved.length;
  const grid = $("savedGrid");
  const savedMovies = movies.filter(m => saved.includes(m.id));
  grid.innerHTML = "";
  $("emptySaved").classList.toggle("hidden", savedMovies.length > 0);

  savedMovies.forEach(movie => {
    const card = document.createElement("div");
    card.className = "saved-card";
    card.innerHTML = `
      <img src="${movie.image}" alt="${movie.title} 스틸컷">
      <div><h3>${movie.title}</h3><p>${movie.year} · ${movie.director}</p></div>
    `;
    card.onclick = () => {
      showMovie(movie);
      $("savedPanel").classList.add("hidden");
      window.scrollTo({ top: document.querySelector(".result").offsetTop - 30, behavior: "smooth" });
    };
    grid.appendChild(card);
  });
}

async function init() {
  createChips("genre");
  createChips("color");
  createChips("era");
  createChips("mood");

  try {
    const response = await fetch("movies.json");
    if (!response.ok) throw new Error("movies.json을 찾을 수 없습니다.");
    movies = await response.json();
    if (!movies.length) throw new Error("영화 데이터가 비어 있습니다.");
    randomMovie();
    renderSaved();
  } catch (error) {
    console.error(error);
    $("movieTitle").textContent = "영화 데이터를 불러오지 못했습니다.";
    $("movieDescription").textContent = "index.html과 movies.json이 같은 폴더에 있는지 확인하세요.";
  }
}

document.querySelectorAll("#modeChips .chip").forEach(btn => {
  btn.onclick = () => {
    mode = btn.dataset.mode;
    document.querySelectorAll("#modeChips .chip").forEach(x => x.classList.remove("active"));
    btn.classList.add("active");
    $("filterPanel").classList.toggle("hidden", mode !== "filter");
  };
});

$("randomBtn").onclick = randomMovie;
$("saveBtn").onclick = toggleSave;
$("savedBtn").onclick = () => {
  $("savedPanel").classList.remove("hidden");
  renderSaved();
  $("savedPanel").scrollIntoView({ behavior: "smooth" });
};
$("closeSaved").onclick = () => $("savedPanel").classList.add("hidden");

init();
