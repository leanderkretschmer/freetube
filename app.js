const feedItems = [
  {
    title: "Hyperdrive Mix – Space LoFi",
    channel: "Orbit Tunes",
    views: "1,2 Mio. Aufrufe",
    thumb: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Neon City Walkthrough",
    channel: "Future Frame",
    views: "842 Tsd. Aufrufe",
    thumb: "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Ocean Depths in 4K",
    channel: "Blue Planet",
    views: "2,3 Mio. Aufrufe",
    thumb: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Konzert: Synthwave Live",
    channel: "Nightwave",
    views: "612 Tsd. Aufrufe",
    thumb: "https://images.unsplash.com/photo-1514912885225-5c9ec8507d68?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Aurora Expedition",
    channel: "Nordic Visions",
    views: "994 Tsd. Aufrufe",
    thumb: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=800&q=80",
  },
  {
    title: "Tokyo After Dark",
    channel: "Citylight",
    views: "1,7 Mio. Aufrufe",
    thumb: "https://images.unsplash.com/photo-1441716844725-09cedc13a4e7?auto=format&fit=crop&w=800&q=80",
  },
];

const qualityLevels = [4320, 2160, 1440, 1080, 720, 480];
const segmentCount = 12;
const bufferState = new Map();
let currentSegment = 0;
let isPlaying = false;
let preferredQuality = 2160;

const feedGrid = document.getElementById("feedGrid");
const segmentList = document.getElementById("segmentList");
const scrubber = document.getElementById("scrubber");
const currentQuality = document.getElementById("currentQuality");
const streamStatus = document.getElementById("streamStatus");
const qualitySelect = document.getElementById("qualitySelect");
const bufferFill = document.getElementById("bufferFill");
const playButton = document.getElementById("playButton");
const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");

const initializeBuffer = () => {
  qualityLevels.forEach((quality) => {
    bufferState.set(
      quality,
      Array.from({ length: segmentCount }, () => false)
    );
  });
};

const renderFeed = () => {
  feedGrid.innerHTML = "";
  feedItems.forEach((item) => {
    const card = document.createElement("div");
    card.className = "video-card";
    card.innerHTML = `
      <img src="${item.thumb}" alt="${item.title}" />
      <div class="meta">
        <strong>${item.title}</strong>
        <span>${item.channel}</span>
        <span>${item.views}</span>
      </div>
    `;
    feedGrid.appendChild(card);
  });
};

const renderSegments = () => {
  segmentList.innerHTML = "";
  Array.from({ length: segmentCount }).forEach((_, index) => {
    const span = document.createElement("span");
    span.className = "segment" + (index === currentSegment ? " active" : "");
    span.textContent = `S${index + 1}`;
    segmentList.appendChild(span);
  });
};

const highestAvailableQuality = (segmentIndex) => {
  for (const quality of qualityLevels) {
    if (bufferState.get(quality)[segmentIndex]) {
      return quality;
    }
  }
  return null;
};

const updateStreamQuality = () => {
  const available = highestAvailableQuality(currentSegment);
  const preferredAvailable =
    bufferState.get(preferredQuality)[currentSegment] || false;

  if (available === null) {
    currentQuality.textContent = "Qualität: lädt...";
    streamStatus.textContent = "Segment wird geladen";
    return;
  }

  const selected = preferredAvailable ? preferredQuality : available;
  currentQuality.textContent = `Qualität: ${selected}p`;
  if (selected === preferredQuality) {
    streamStatus.textContent = "Stream: höchste Qualität verfügbar";
  } else {
    streamStatus.textContent =
      "Stream: nächstbeste Qualität wegen Segment-Verfügbarkeit";
  }
};

const tickBuffer = () => {
  qualityLevels.forEach((quality, index) => {
    const buffer = bufferState.get(quality);
    const nextMissing = buffer.findIndex((segment) => !segment);
    if (nextMissing !== -1) {
      const speedFactor = 1 + index * 0.2;
      if (Math.random() > 0.6 / speedFactor) {
        buffer[nextMissing] = true;
      }
    }
  });

  const availableSegments = bufferState
    .get(preferredQuality)
    .filter(Boolean).length;
  bufferFill.style.width = `${(availableSegments / segmentCount) * 100}%`;
  updateStreamQuality();
};

const playLoop = () => {
  if (!isPlaying) return;
  const available = highestAvailableQuality(currentSegment);
  if (available !== null) {
    currentSegment = Math.min(segmentCount - 1, currentSegment + 1);
    scrubber.value = ((currentSegment + 1) / segmentCount) * 100;
  }
  renderSegments();
  updateStreamQuality();

  if (currentSegment < segmentCount - 1) {
    setTimeout(playLoop, 1200);
  }
};

const handleScrub = () => {
  const targetSegment = Math.round((scrubber.value / 100) * (segmentCount - 1));
  currentSegment = targetSegment;
  renderSegments();
  updateStreamQuality();
};

qualitySelect.addEventListener("change", (event) => {
  preferredQuality = Number(event.target.value);
  updateStreamQuality();
});

playButton.addEventListener("click", () => {
  isPlaying = !isPlaying;
  playButton.textContent = isPlaying ? "Pause" : "Play";
  if (isPlaying) {
    playLoop();
  }
});

scrubber.addEventListener("input", handleScrub);

searchButton.addEventListener("click", () => {
  if (!searchInput.value) return;
  document.getElementById("videoTitle").textContent =
    `Suche nach: ${searchInput.value}`;
});

initializeBuffer();
renderFeed();
renderSegments();
updateStreamQuality();
setInterval(tickBuffer, 1500);
