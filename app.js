const feedGrid = document.getElementById("feedGrid");
const feedTitle = document.getElementById("feedTitle");
const feedSubtitle = document.getElementById("feedSubtitle");
const suggestionsBox = document.getElementById("suggestions");
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const playerPanel = document.getElementById("playerPanel");
const videoTitle = document.getElementById("videoTitle");
const videoChannel = document.getElementById("videoChannel");
const currentQuality = document.getElementById("currentQuality");
const streamStatus = document.getElementById("streamStatus");
const qualitySelect = document.getElementById("qualitySelect");
const videoPlayer = document.getElementById("videoPlayer");

let currentFormats = [];
let currentVideoId = null;
let suggestionTimer;

const apiFetch = async (path) => {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error("Request failed");
  }
  return response.json();
};

const renderEmptyState = (message) => {
  feedGrid.innerHTML = `
    <div class="empty-state">
      <p>${message}</p>
    </div>
  `;
};

const renderFeed = (items) => {
  feedGrid.innerHTML = "";
  if (!items.length) {
    renderEmptyState("Keine Ergebnisse. Bitte suche nach einem anderen Begriff.");
    return;
  }

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "video-card";
    card.innerHTML = `
      <img src="${item.thumbnail}" alt="${item.title}" />
      <div class="meta">
        <strong>${item.title}</strong>
        <span>${item.channel || "Unbekannter Kanal"}</span>
      </div>
    `;
    card.addEventListener("click", () => loadVideo(item.id));
    feedGrid.appendChild(card);
  });
};

const updatePlayer = (video) => {
  playerPanel.classList.remove("hidden");
  videoTitle.textContent = video.title;
  videoChannel.textContent = video.channel || "Unbekannter Kanal";
  currentVideoId = video.id;
  currentFormats = video.formats || [];

  if (!currentFormats.length) {
    streamStatus.textContent = "Keine kompatiblen Streams gefunden";
    qualitySelect.innerHTML = "";
    return;
  }

  qualitySelect.innerHTML = "";
  currentFormats.forEach((format, index) => {
    const label = `${format.height || "?"}p ${format.format_note || ""}`.trim();
    const option = document.createElement("option");
    option.value = index;
    option.textContent = label;
    qualitySelect.appendChild(option);
  });

  qualitySelect.selectedIndex = 0;
  applyFormat(0);
};

const applyFormat = (index) => {
  const format = currentFormats[index];
  if (!format) return;
  currentQuality.textContent = `Qualität: ${format.height || "?"}p`;
  streamStatus.textContent = "Stream: höchste verfügbare Qualität";
  videoPlayer.src = format.url;
  videoPlayer.load();
  videoPlayer.play().catch(() => {
    streamStatus.textContent = "Stream bereit (Autoplay blockiert)";
  });
};

const fallbackToNext = () => {
  const currentIndex = qualitySelect.selectedIndex;
  if (currentIndex < currentFormats.length - 1) {
    qualitySelect.selectedIndex = currentIndex + 1;
    applyFormat(qualitySelect.selectedIndex);
    streamStatus.textContent =
      "Stream: nächstbeste Qualität wegen Lade- oder Vorspul-Anforderung";
  }
};

const loadVideo = async (videoId) => {
  try {
    const data = await apiFetch(`/api/video?id=${encodeURIComponent(videoId)}`);
    updatePlayer(data);
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    streamStatus.textContent = "Fehler beim Laden des Videos";
  }
};

const searchVideos = async (query) => {
  feedTitle.textContent = `Suchergebnisse für „${query}“`;
  feedSubtitle.textContent =
    "Die Ergebnisse stammen live von YouTube über yt-dlp.";
  renderEmptyState("Suche läuft...");
  try {
    const data = await apiFetch(`/api/search?q=${encodeURIComponent(query)}`);
    renderFeed(data.results || []);
  } catch (error) {
    renderEmptyState("Fehler bei der Suche. Bitte erneut versuchen.");
  }
};

const updateSuggestions = async (query) => {
  if (!query) {
    suggestionsBox.classList.remove("show");
    suggestionsBox.innerHTML = "";
    return;
  }

  try {
    const data = await apiFetch(
      `/api/autocomplete?q=${encodeURIComponent(query)}`
    );
    const suggestions = data.suggestions || [];
    suggestionsBox.innerHTML = "";
    suggestions.slice(0, 6).forEach((text) => {
      const item = document.createElement("div");
      item.className = "suggestion-item";
      item.textContent = text;
      item.addEventListener("click", () => {
        searchInput.value = text;
        suggestionsBox.classList.remove("show");
        searchVideos(text);
      });
      suggestionsBox.appendChild(item);
    });
    if (suggestions.length) {
      suggestionsBox.classList.add("show");
    } else {
      suggestionsBox.classList.remove("show");
    }
  } catch (error) {
    suggestionsBox.classList.remove("show");
  }
};

searchInput.addEventListener("input", (event) => {
  clearTimeout(suggestionTimer);
  const value = event.target.value.trim();
  suggestionTimer = setTimeout(() => updateSuggestions(value), 250);
});

searchInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    const query = searchInput.value.trim();
    if (query) {
      suggestionsBox.classList.remove("show");
      searchVideos(query);
    }
  }
});

searchButton.addEventListener("click", () => {
  const query = searchInput.value.trim();
  if (query) {
    suggestionsBox.classList.remove("show");
    searchVideos(query);
  }
});

qualitySelect.addEventListener("change", (event) => {
  applyFormat(Number(event.target.value));
});

videoPlayer.addEventListener("error", fallbackToNext);

videoPlayer.addEventListener("seeking", () => {
  streamStatus.textContent =
    "Stream: prüfe höchste Qualität für die neue Position...";
});

videoPlayer.addEventListener("waiting", () => {
  streamStatus.textContent = "Stream: Puffern...";
});

videoPlayer.addEventListener("playing", () => {
  streamStatus.textContent = "Stream: Wiedergabe läuft";
});

const bootstrap = () => {
  renderEmptyState("Suche nach Videos, um loszulegen.");
  searchVideos("trending now");
};

bootstrap();
