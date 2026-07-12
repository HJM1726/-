/* ビンボーマップ MVP
 * 外部キー不要の構成: Leaflet + OpenStreetMap タイル。
 * 投稿と投票は localStorage 保存(本番ではAPIサーバーに置き換える)。
 */

const STORAGE_SPOTS = "binbomap.userSpots";
const STORAGE_VOTES = "binbomap.votes";

const state = {
  maxPrice: 700,
  activeCategories: new Set(CATEGORIES.map((c) => c.id)),
  reportMode: false,
  pendingLatLng: null,
};

// ---------- storage ----------
function loadJSON(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
const userSpots = loadJSON(STORAGE_SPOTS, []);
const myVotes = loadJSON(STORAGE_VOTES, {}); // { spotId: "up" | "down" }

function saveUserSpots() { localStorage.setItem(STORAGE_SPOTS, JSON.stringify(userSpots)); }
function saveVotes() { localStorage.setItem(STORAGE_VOTES, JSON.stringify(myVotes)); }

function allSpots() { return SAMPLE_SPOTS.concat(userSpots); }

// ---------- map ----------
const map = L.map("map").setView([35.6895, 139.7005], 13); // 新宿を中心に
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

const markerLayer = L.layerGroup().addTo(map);

function priceColor(price) {
  if (price === 0) return getCss("--color-free");
  if (price <= 500) return getCss("--color-coin");
  if (price <= 800) return getCss("--color-mid");
  return getCss("--color-high");
}

function getCss(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function categoryLabel(id) {
  const c = CATEGORIES.find((c) => c.id === id);
  return c ? `${c.emoji} ${c.label}` : id;
}

function popupHtml(spot) {
  const votes = effectiveVotes(spot);
  const mine = myVotes[spot.id];
  const priceText = spot.price === 0 ? "無料" : `${spot.price}円`;
  return `
    <p class="popup-name">${escapeHtml(spot.name)}</p>
    <p class="popup-meta">${categoryLabel(spot.category)} ・ <span class="popup-price">${priceText}</span></p>
    ${spot.comment ? `<p class="popup-comment">${escapeHtml(spot.comment)}</p>` : ""}
    <div class="popup-votes">
      <button class="vote-btn ${mine === "up" ? "voted" : ""}" data-spot="${spot.id}" data-dir="up">👍 コスパ良い ${votes.up}</button>
      <button class="vote-btn ${mine === "down" ? "voted" : ""}" data-spot="${spot.id}" data-dir="down">👎 微妙 ${votes.down}</button>
    </div>`;
}

function effectiveVotes(spot) {
  const mine = myVotes[spot.id];
  return {
    up: (spot.up || 0) + (mine === "up" ? 1 : 0),
    down: (spot.down || 0) + (mine === "down" ? 1 : 0),
  };
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (ch) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]
  ));
}

function renderMarkers() {
  markerLayer.clearLayers();
  let count = 0;
  for (const spot of allSpots()) {
    if (spot.price > state.maxPrice && spot.price !== 0) continue;
    if (!state.activeCategories.has(spot.category)) continue;
    count++;
    const marker = L.circleMarker([spot.lat, spot.lng], {
      radius: 9,
      color: "#fff",
      weight: 2,
      fillColor: priceColor(spot.price),
      fillOpacity: 0.95,
    });
    marker.bindPopup(() => popupHtml(spot));
    marker.addTo(markerLayer);
  }
  document.getElementById("visible-count").textContent = count;
}

// 投票(イベント委任: ポップアップ内のボタン)
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".vote-btn");
  if (!btn) return;
  const spotId = btn.dataset.spot;
  const dir = btn.dataset.dir;
  myVotes[spotId] = myVotes[spotId] === dir ? undefined : dir;
  if (myVotes[spotId] === undefined) delete myVotes[spotId];
  saveVotes();
  const spot = allSpots().find((s) => s.id === spotId);
  if (spot) {
    const popup = btn.closest(".leaflet-popup-content");
    if (popup) popup.innerHTML = popupHtml(spot);
  }
});

// ---------- filters ----------
const priceSlider = document.getElementById("price-slider");
const priceValue = document.getElementById("price-value");

priceSlider.addEventListener("input", () => {
  state.maxPrice = Number(priceSlider.value);
  priceValue.textContent = state.maxPrice;
  renderMarkers();
});

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    priceSlider.value = chip.dataset.price;
    priceSlider.dispatchEvent(new Event("input"));
  });
});

const categoryFilters = document.getElementById("category-filters");
for (const cat of CATEGORIES) {
  const label = document.createElement("label");
  label.innerHTML = `<input type="checkbox" checked value="${cat.id}"> ${cat.emoji} ${cat.label}`;
  label.querySelector("input").addEventListener("change", (e) => {
    if (e.target.checked) state.activeCategories.add(cat.id);
    else state.activeCategories.delete(cat.id);
    renderMarkers();
  });
  categoryFilters.appendChild(label);
}

// ---------- report flow ----------
const reportBtn = document.getElementById("report-btn");
const reportHint = document.getElementById("report-hint");
const reportModal = document.getElementById("report-modal");
const reportForm = document.getElementById("report-form");
const categorySelect = document.getElementById("f-category");

for (const cat of CATEGORIES) {
  const opt = document.createElement("option");
  opt.value = cat.id;
  opt.textContent = `${cat.emoji} ${cat.label}`;
  categorySelect.appendChild(opt);
}

reportBtn.addEventListener("click", () => {
  state.reportMode = true;
  reportHint.classList.remove("hidden");
});

document.getElementById("report-cancel").addEventListener("click", () => {
  state.reportMode = false;
  reportHint.classList.add("hidden");
});

map.on("click", (e) => {
  if (!state.reportMode) return;
  state.pendingLatLng = e.latlng;
  state.reportMode = false;
  reportHint.classList.add("hidden");
  reportModal.classList.remove("hidden");
  document.getElementById("f-name").focus();
});

document.getElementById("form-cancel").addEventListener("click", () => {
  reportModal.classList.add("hidden");
  reportForm.reset();
});

reportForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const price = Number(document.getElementById("f-price").value);
  if (price > 1000) {
    alert("1000円以下のスポットのみ投稿できます");
    return;
  }
  const spot = {
    id: "u" + Date.now(),
    name: document.getElementById("f-name").value.trim(),
    category: categorySelect.value,
    price,
    lat: state.pendingLatLng.lat,
    lng: state.pendingLatLng.lng,
    comment: document.getElementById("f-comment").value.trim(),
    up: 0,
    down: 0,
  };
  userSpots.push(spot);
  saveUserSpots();
  reportModal.classList.add("hidden");
  reportForm.reset();
  renderMarkers();
  map.setView([spot.lat, spot.lng], Math.max(map.getZoom(), 15));
});

// ---------- init ----------
renderMarkers();
