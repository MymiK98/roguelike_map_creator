// 메인 앱 — 슬롯(2) 기반. 화면전환·동적컨트롤·생성·시드/공유코드 재현·비교·FOV·애니메이션.

import { makeRNG, randomSeed } from "./rng.js";
import { ALGORITHMS, getAlgorithm, defaultParams } from "./registry.js";
import { render, legendItems, ENTITY_STYLE, TILE_COLORS } from "./render.js";
import { buildMap } from "./buildmap.js";
import { buildDungeon } from "./dungeon.js";
import { computeFOV } from "./fov.js";
import { exportPNG, exportJSON } from "./export.js";
import { importJSON } from "./io.js";
import * as gallery from "./gallery.js";
import { solutionPath } from "./entities.js";
import { runBench } from "./bench.js";
import { presetToSample, packSample, unpackSample } from "./algorithms/wfc-overlap.js";

const $ = (sel) => document.querySelector(sel);

// ---------- 상태 ----------
function newCfg() {
  return {
    algoId: null,
    seed: "",
    w: 64,
    h: 40,
    params: {},
    entities: { enabled: true, treasures: 3 },
    floors: 1,
  };
}

const state = {
  slots: [newCfg(), newCfg()],
  active: 0, // 편집/주 대상 슬롯
  compare: { enabled: false },
};
const view = { showGrid: false, showPath: false };

// 슬롯별 결과: { floors:[{grid,entities,meta}], currentFloor }
const results = [null, null];

const fovState = { enabled: false, radius: 8, origin: null }; // 패널 A 한정
const anim = { frames: [], playing: false, timer: 0, i: 0 };

const activeCfg = () => state.slots[state.active];
// 패널 인덱스: 비교 OFF → 항상 0만. 비교 ON → 0(좌),1(우).
const visibleSlots = () => (state.compare.enabled ? [0, 1] : [0]);
const curResult = (i) => {
  const r = results[i];
  return r ? r.floors[r.currentFloor] : null;
};

// ---------- 화면 전환 ----------
function showScreen(which) {
  $("#start-screen").classList.toggle("hidden", which !== "start");
  $("#generator-screen").classList.toggle("hidden", which !== "generator");
}

// ---------- 시작 화면 ----------
function buildStartScreen() {
  const grid = $("#algo-cards");
  grid.innerHTML = "";
  for (const algo of ALGORITHMS) {
    const card = document.createElement("button");
    card.className = "algo-card";
    card.innerHTML = `
      <span class="algo-card-ref">${algo.docRef}</span>
      <h3>${algo.name}</h3>
      <p>${algo.desc}</p>`;
    card.addEventListener("click", () => selectAlgorithm(algo.id));
    grid.appendChild(card);
  }
}

function selectAlgorithm(id) {
  const algo = getAlgorithm(id);
  if (!algo) return;
  const cfg = activeCfg();
  cfg.algoId = id;
  cfg.params = defaultParams(algo);
  if (!cfg.seed) cfg.seed = randomSeed();
  writeCfgToControls(cfg);
  showScreen("generator");
  generate();
}

// ---------- 동적 파라미터 컨트롤 ----------
function buildParamControls(algo, cfg) {
  const box = $("#algo-params");
  box.innerHTML = "";
  for (const p of algo.params) {
    const wrap = document.createElement("div");
    wrap.className = "param-row";
    const id = "param-" + p.key;
    if (p.type === "range") {
      wrap.innerHTML = `
        <label for="${id}">${p.label} <span class="param-val" id="${id}-val">${cfg.params[p.key]}</span></label>
        <input type="range" id="${id}" min="${p.min}" max="${p.max}" step="${p.step}" value="${cfg.params[p.key]}">`;
      box.appendChild(wrap);
      const input = wrap.querySelector("input");
      const val = wrap.querySelector(".param-val");
      input.addEventListener("input", () => {
        const v = p.step % 1 === 0 ? parseInt(input.value, 10) : parseFloat(input.value);
        activeCfg().params[p.key] = v;
        val.textContent = v;
      });
    } else if (p.type === "select") {
      const opts = p.options
        .map((o) => `<option value="${o.value}" ${o.value === cfg.params[p.key] ? "selected" : ""}>${o.label}</option>`)
        .join("");
      wrap.innerHTML = `<label for="${id}">${p.label}</label><select id="${id}">${opts}</select>`;
      box.appendChild(wrap);
      wrap.querySelector("select").addEventListener("change", (e) => {
        activeCfg().params[p.key] = e.target.value;
        // 프리셋 변경 시 샘플 재로드
        if (algo.sampleEditor && p.key === "preset") {
          delete activeCfg().params.sample;
          buildSamplePainter(activeCfg());
        }
      });
    }
  }
  if (algo.sampleEditor) buildSamplePainter(cfg);
}

// WFC Overlapping 샘플 페인터 (#=벽/.=바닥 토글)
function buildSamplePainter(cfg) {
  const box = $("#algo-params");
  let old = $("#sample-painter");
  if (old) old.remove();
  const sample = cfg.params.sample ? unpackSample(cfg.params.sample) : presetToSample(cfg.params.preset || "rooms");
  // 항상 packed 형태로 cfg에 저장
  cfg.params.sample = packSample(sample);

  const wrap = document.createElement("div");
  wrap.id = "sample-painter";
  wrap.className = "param-row";
  wrap.innerHTML = `<label>샘플 편집 (클릭 토글)</label>`;
  const canvas = document.createElement("canvas");
  const cell = 16;
  canvas.width = sample.w * cell;
  canvas.height = sample.h * cell;
  canvas.className = "sample-canvas";
  wrap.appendChild(canvas);
  box.appendChild(wrap);

  const ctx = canvas.getContext("2d");
  const draw = () => {
    for (let y = 0; y < sample.h; y++)
      for (let x = 0; x < sample.w; x++) {
        ctx.fillStyle = sample.cells[y * sample.w + x] ? "#cdb89a" : "#1a1d29";
        ctx.fillRect(x * cell, y * cell, cell - 1, cell - 1);
      }
  };
  draw();
  canvas.addEventListener("click", (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor(((e.clientX - rect.left) / rect.width) * sample.w);
    const y = Math.floor(((e.clientY - rect.top) / rect.height) * sample.h);
    if (x < 0 || y < 0 || x >= sample.w || y >= sample.h) return;
    const i = y * sample.w + x;
    sample.cells[i] = sample.cells[i] ? 0 : 1;
    cfg.params.sample = packSample(sample);
    draw();
  });
}

// 컨트롤 ← cfg (편집 대상 전환/로드 시)
function writeCfgToControls(cfg) {
  const algo = getAlgorithm(cfg.algoId);
  if (!algo) return;
  $("#algo-title").textContent = algo.name + (state.compare.enabled ? `  ·  편집: ${state.active === 0 ? "A" : "B"}` : "");
  $("#algo-desc").textContent = algo.desc + "  (" + algo.docRef + ")";
  $("#map-w").value = cfg.w;
  $("#map-h").value = cfg.h;
  $("#map-floors").value = cfg.floors;
  $("#map-floors-val").textContent = cfg.floors;
  $("#seed-input").value = cfg.seed;
  $("#ent-enabled").checked = cfg.entities.enabled;
  $("#ent-treasures").value = cfg.entities.treasures;
  $("#ent-treasures-val").textContent = cfg.entities.treasures;
  buildParamControls(algo, cfg);
  updateAnimSection();
}

// cfg ← 컨트롤 (생성 직전)
function readControlsIntoCfg(cfg) {
  cfg.w = clampInt($("#map-w").value, 16, 200, 64);
  cfg.h = clampInt($("#map-h").value, 16, 200, 40);
  cfg.floors = clampInt($("#map-floors").value, 1, 8, 1);
  let seed = $("#seed-input").value.trim();
  if (!seed) seed = randomSeed();
  cfg.seed = seed;
  cfg.entities = {
    enabled: $("#ent-enabled").checked,
    treasures: clampInt($("#ent-treasures").value, 0, 12, 3),
  };
  $("#map-w").value = cfg.w;
  $("#map-h").value = cfg.h;
  $("#seed-input").value = cfg.seed;
}

// ---------- 빌드 ----------
function cfgToMapConfig(cfg) {
  return { algoId: cfg.algoId, seed: cfg.seed, w: cfg.w, h: cfg.h, params: cfg.params, entities: cfg.entities };
}
function buildSlot(i) {
  const cfg = state.slots[i];
  if (!getAlgorithm(cfg.algoId)) {
    results[i] = null;
    return;
  }
  results[i] = buildDungeon(cfg);
}

function generate() {
  const cfg = activeCfg();
  if (!getAlgorithm(cfg.algoId)) return;
  stopAnim();
  $("#anim-scrub").value = 0;
  readControlsIntoCfg(cfg);

  buildSlot(state.active);
  if (state.compare.enabled) {
    // 미초기화된 다른 슬롯은 활성 슬롯 복제 후 시드만 변경
    const other = 1 - state.active;
    if (!getAlgorithm(state.slots[other].algoId)) {
      state.slots[other] = { ...structuredCloneCfg(cfg), seed: randomSeed() };
    }
    buildSlot(other);
  }
  if (state.active === 0) fovState.origin = null;
  redraw();
  updateShareCode();
}

function structuredCloneCfg(cfg) {
  return {
    algoId: cfg.algoId,
    seed: cfg.seed,
    w: cfg.w,
    h: cfg.h,
    params: { ...cfg.params },
    entities: { ...cfg.entities },
    floors: cfg.floors,
  };
}

// ---------- 렌더 ----------
const MP = () => (state.compare.enabled ? 540 : 960);

function paint(suffix, result, fov) {
  if (!result) return;
  const path = view.showPath ? solutionPath(result.grid, result.entities) : null;
  render($("#map-canvas" + suffix), result.grid, {
    maxPixel: MP(),
    showGrid: view.showGrid,
    entities: result.entities,
    fov,
    path,
  });
  $("#info" + suffix).innerHTML = infoHTML(result);
  fillLegend($("#legend" + suffix), result);
}

function redraw() {
  const r0 = curResult(0);
  if (!r0) return;
  let fov = null;
  if (fovState.enabled && fovState.origin) {
    fov = { visible: computeFOV(r0.grid, fovState.origin[0], fovState.origin[1], fovState.radius) };
  }
  paint("", r0, fov);
  if (state.compare.enabled) paint("-b", curResult(1), null);
  updateFloorNav("", 0);
  if (state.compare.enabled) updateFloorNav("-b", 1);
}

function updateFloorNav(suffix, slot) {
  const r = results[slot];
  const nav = $("#floor-nav" + suffix);
  if (!r || r.floors.length <= 1) {
    nav.classList.add("hidden");
    return;
  }
  nav.classList.remove("hidden");
  $("#floor-label" + suffix).textContent = `층 ${r.currentFloor + 1}/${r.floors.length}`;
}

function changeFloor(slot, delta) {
  const r = results[slot];
  if (!r) return;
  r.currentFloor = Math.max(0, Math.min(r.floors.length - 1, r.currentFloor + delta));
  if (slot === 0) fovState.origin = null;
  redraw();
}

// ---------- 애니메이션 (패널 A / 슬롯0 기준) ----------
function stopAnim() {
  anim.playing = false;
  if (anim.timer) clearTimeout(anim.timer);
  anim.timer = 0;
  $("#btn-play").textContent = "▶ 재생";
}

function renderFrame(grid) {
  render($("#map-canvas"), grid, { maxPixel: MP(), showGrid: view.showGrid, entities: [] });
}

function showFrame(i) {
  anim.i = Math.max(0, Math.min(anim.frames.length - 1, i));
  $("#anim-scrub").value = anim.i;
  if (anim.i === anim.frames.length - 1) redraw();
  else renderFrame(anim.frames[anim.i]);
}

function buildFrames() {
  const cfg = activeCfg();
  const algo = getAlgorithm(cfg.algoId);
  if (!algo || !algo.steps) return [];
  const rng = makeRNG(cfg.seed);
  return [...algo.steps(rng, { w: cfg.w, h: cfg.h, ...cfg.params })];
}

function playAnim() {
  const cfg = activeCfg();
  const algo = getAlgorithm(cfg.algoId);
  if (!algo || !algo.animatable) return;
  stopAnim();
  anim.frames = buildFrames();
  if (anim.frames.length === 0) return;
  $("#anim-scrub").max = anim.frames.length - 1;
  anim.playing = true;
  $("#btn-play").textContent = "⏸ 정지";
  const stepMs = Math.max(16, Math.floor(2500 / anim.frames.length));
  let i = 0;
  const tick = () => {
    if (!anim.playing) return;
    showFrame(i);
    if (i >= anim.frames.length - 1) {
      stopAnim();
      return;
    }
    i++;
    anim.timer = setTimeout(tick, stepMs);
  };
  tick();
}

function updateAnimSection() {
  const algo = getAlgorithm(activeCfg().algoId);
  // 비교 모드에선 애니메이션 숨김(혼동 방지)
  const show = algo && algo.animatable && !state.compare.enabled;
  $("#anim-section").style.display = show ? "" : "none";
}

// ---------- 정보/범례 ----------
function infoHTML({ grid, meta }) {
  const pct = (meta.floorPct * 100).toFixed(1);
  return `
    <span>크기 <b>${grid.w}×${grid.h}</b></span>
    <span>바닥 <b>${pct}%</b></span>
    <span>분리 영역 <b class="${meta.regions === 1 ? "ok" : "warn"}">${meta.regions}</b></span>
    <span>생성 <b>${meta.ms.toFixed(1)}ms</b></span>`;
}

function fillLegend(box, { grid, entities }) {
  box.innerHTML = "";
  const add = (color, name) => {
    const el = document.createElement("span");
    el.className = "legend-item";
    el.innerHTML = `<i style="background:${color}"></i>${name}`;
    box.appendChild(el);
  };
  for (const item of legendItems(grid)) add(item.color, item.name);
  const used = new Set(entities.map((e) => e.type));
  for (const type of used) {
    const st = ENTITY_STYLE[type];
    if (st) add(st.color, st.name);
  }
}

// ---------- 공유코드 (v3: 슬롯 직렬화, 구버전 하위호환) ----------
function encodeState() {
  const payload = {
    v: 3,
    c: state.compare.enabled ? 1 : 0,
    slots: (state.compare.enabled ? state.slots : [state.slots[0]]).map(serializeCfg),
  };
  return b64encode(JSON.stringify(payload));
}

function serializeCfg(cfg) {
  return { a: cfg.algoId, s: cfg.seed, w: cfg.w, h: cfg.h, p: cfg.params, e: cfg.entities, f: cfg.floors };
}

function cfgFromSerialized(o) {
  const algo = o && getAlgorithm(o.a);
  if (!algo) return null; // 알 수 없는 알고리즘(구버전 제거/오염) → 거부
  const cfg = newCfg();
  cfg.algoId = o.a;
  cfg.seed = typeof o.s === "string" ? o.s : "";
  cfg.w = clampInt(o.w, 16, 200, 64);
  cfg.h = clampInt(o.h, 16, 200, 40);
  cfg.params = { ...defaultParams(algo), ...(o.p && typeof o.p === "object" ? o.p : {}) };
  const e = o.e && typeof o.e === "object" ? o.e : {};
  cfg.entities = { enabled: e.enabled !== false, treasures: clampInt(e.treasures, 0, 12, 3) };
  cfg.floors = clampInt(o.f, 1, 8, 1);
  return cfg;
}

function decodeState(code) {
  try {
    const o = JSON.parse(b64decode(code));
    if (!o) return null;
    if (o.v === 3 && Array.isArray(o.slots)) {
      if (!getAlgorithm(o.slots[0]?.a)) return null;
      return o;
    }
    // 구버전 {a,s,w,h,p,e} → v3 단일슬롯
    if (getAlgorithm(o.a)) return { v: 3, c: 0, slots: [o] };
    return null;
  } catch {
    return null;
  }
}

function updateShareCode() {
  const code = encodeState();
  $("#share-code").value = code;
  history.replaceState(null, "", "#code=" + code);
}

function applyDecoded(o) {
  const cfg0 = cfgFromSerialized(o.slots && o.slots[0]);
  if (!cfg0) {
    alert("불러올 수 없는 설정입니다(알 수 없는 알고리즘).");
    return;
  }
  state.compare.enabled = !!o.c;
  state.slots[0] = cfg0;
  // 슬롯 B가 유효치 않으면 A 복제로 폴백(크래시 방지)
  state.slots[1] = (o.slots[1] && cfgFromSerialized(o.slots[1])) || structuredCloneCfg(cfg0);
  state.active = 0;
  syncCompareUI();
  writeCfgToControls(state.slots[0]);
  showScreen("generator");
  // 두 슬롯 모두 빌드
  buildSlot(0);
  if (state.compare.enabled) buildSlot(1);
  redraw();
  updateShareCode();
}

// ---------- base64 ----------
function b64encode(str) {
  return btoa(unescape(encodeURIComponent(str))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64decode(str) {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  return decodeURIComponent(escape(atob(str)));
}
function clampInt(v, min, max, fallback) {
  const n = parseInt(v, 10);
  if (Number.isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
async function copyToClipboard(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    const old = btn.textContent;
    btn.textContent = "복사됨!";
    setTimeout(() => (btn.textContent = old), 1200);
  } catch {
    alert("복사 실패. 수동 복사:\n" + text);
  }
}

// ---------- 갤러리 ----------
function saveToGallery() {
  const r = curResult(0);
  if (!r) return;
  const cfg = state.slots[0];
  gallery.save({
    serializedCfg: serializeCfg(cfg),
    thumb: gallery.makeThumb(r.grid, TILE_COLORS),
    label: cfg.algoId + " · " + cfg.seed,
  });
  refreshGallery();
}

function refreshGallery() {
  const box = $("#gallery-list");
  box.innerHTML = "";
  for (const item of gallery.list().slice().reverse()) {
    const el = document.createElement("div");
    el.className = "gallery-item";
    el.title = item.label;
    el.innerHTML = `<img src="${item.thumb}" alt=""><div class="gi-label">${item.label}</div><button class="gi-del">✕</button>`;
    el.querySelector("img").addEventListener("click", () => applyDecoded({ v: 3, c: 0, slots: [item.serializedCfg] }));
    el.querySelector(".gi-label").addEventListener("click", () => applyDecoded({ v: 3, c: 0, slots: [item.serializedCfg] }));
    el.querySelector(".gi-del").addEventListener("click", (e) => {
      e.stopPropagation();
      gallery.remove(item.id);
      refreshGallery();
    });
    box.appendChild(el);
  }
}

// ---------- 벤치마크 ----------
function runBenchmark() {
  const box = $("#bench-result");
  box.textContent = "측정 중…";
  const sizes = [32, 64, 96];
  // 다음 프레임에 실행(UI 갱신 후)
  setTimeout(() => {
    const rows = runBench({ algoIds: ALGORITHMS.map((a) => a.id), sizes, runs: 3 });
    let html = "<table><tr><th>알고리즘</th>" + sizes.map((s) => `<th>${s}w</th>`).join("") + "</tr>";
    for (const r of rows) {
      html += `<tr><td>${r.name}</td>` + sizes.map((s) => `<td>${r.cells[s].median.toFixed(1)}</td>`).join("") + "</tr>";
    }
    html += "</table><div style='color:var(--muted);margin-top:4px'>median ms (runs=3)</div>";
    box.innerHTML = html;
  }, 30);
}

// ---------- 비교 UI ----------
function syncCompareUI() {
  const on = state.compare.enabled;
  $("#compare-mode").checked = on;
  $("#panel-b").classList.toggle("hidden", !on);
  $("#compare-grid").classList.toggle("two", on);
  $("#edit-target-row").classList.toggle("hidden", !on);
  updateAnimSection();
}

// ---------- 바인딩 ----------
function bind() {
  $("#btn-generate").addEventListener("click", generate);
  $("#btn-random-seed").addEventListener("click", () => {
    activeCfg().seed = randomSeed();
    $("#seed-input").value = activeCfg().seed;
    generate();
  });
  $("#btn-copy-seed").addEventListener("click", (e) => copyToClipboard($("#seed-input").value, e.target));
  $("#btn-copy-code").addEventListener("click", (e) => copyToClipboard($("#share-code").value, e.target));
  $("#btn-load-code").addEventListener("click", () => {
    const o = decodeState($("#share-code").value.trim());
    if (o) applyDecoded(o);
    else alert("잘못된 공유코드입니다.");
  });
  $("#btn-change-algo").addEventListener("click", () => showScreen("start"));
  $("#show-grid").addEventListener("change", () => {
    view.showGrid = $("#show-grid").checked;
    redraw();
  });
  $("#show-path").addEventListener("change", () => {
    view.showPath = $("#show-path").checked;
    redraw();
  });
  $("#seed-input").addEventListener("keydown", (e) => {
    if (e.key === "Enter") generate();
  });

  // 층 수
  $("#map-floors").addEventListener("input", () => {
    $("#map-floors-val").textContent = $("#map-floors").value;
  });
  $("#map-floors").addEventListener("change", generate);
  // 층 네비
  $("#floor-prev").addEventListener("click", () => changeFloor(0, -1));
  $("#floor-next").addEventListener("click", () => changeFloor(0, 1));
  $("#floor-prev-b").addEventListener("click", () => changeFloor(1, -1));
  $("#floor-next-b").addEventListener("click", () => changeFloor(1, 1));

  // 엔티티
  $("#ent-enabled").addEventListener("change", generate);
  $("#ent-treasures").addEventListener("input", () => {
    $("#ent-treasures-val").textContent = $("#ent-treasures").value;
  });
  $("#ent-treasures").addEventListener("change", generate);

  // 내보내기
  $("#btn-export-png").addEventListener("click", () => {
    exportPNG($("#map-canvas"), "map_" + activeCfg().algoId + "_" + activeCfg().seed);
  });
  $("#btn-export-json").addEventListener("click", () => {
    const r = curResult(0);
    if (r) exportJSON(cfgToMapConfig(state.slots[0]), r, "map_" + state.slots[0].algoId + "_" + state.slots[0].seed);
  });

  // 벤치마크
  $("#btn-bench").addEventListener("click", runBenchmark);

  // 갤러리 / 불러오기
  $("#btn-save-gallery").addEventListener("click", saveToGallery);
  $("#file-json").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const o = await importJSON(file);
    if (o) applyDecoded(o);
    else alert("불러올 수 없는 JSON입니다.");
    e.target.value = "";
  });

  // FOV
  $("#fov-enabled").addEventListener("change", () => {
    fovState.enabled = $("#fov-enabled").checked;
    redraw();
  });
  $("#fov-radius").addEventListener("input", () => {
    fovState.radius = clampInt($("#fov-radius").value, 3, 20, 8);
    $("#fov-radius-val").textContent = fovState.radius;
    if (fovState.enabled) redraw();
  });

  // 비교 모드
  $("#compare-mode").addEventListener("change", () => {
    state.compare.enabled = $("#compare-mode").checked;
    if (state.compare.enabled && !getAlgorithm(state.slots[1].algoId)) {
      state.slots[1] = { ...structuredCloneCfg(state.slots[0]), seed: randomSeed() };
    }
    state.active = 0;
    setEditTarget(0);
    syncCompareUI();
    if (state.compare.enabled) buildSlot(1);
    redraw();
    updateShareCode();
  });
  // 편집 대상 A|B
  $("#edit-a").addEventListener("click", () => setEditTarget(0));
  $("#edit-b").addEventListener("click", () => setEditTarget(1));

  // 애니메이션
  $("#btn-play").addEventListener("click", () => (anim.playing ? stopAnim() : playAnim()));
  $("#anim-scrub").addEventListener("input", () => {
    stopAnim();
    if (anim.frames.length === 0) anim.frames = buildFrames();
    if (anim.frames.length) {
      $("#anim-scrub").max = anim.frames.length - 1;
      showFrame(parseInt($("#anim-scrub").value, 10));
    }
  });

  // 캔버스 A 클릭 = FOV 원점
  $("#map-canvas").addEventListener("click", (e) => {
    const r0 = curResult(0);
    if (!fovState.enabled || !r0) return;
    const rect = e.target.getBoundingClientRect();
    const cell = rect.width / r0.grid.w;
    const x = Math.floor((e.clientX - rect.left) / cell);
    const y = Math.floor((e.clientY - rect.top) / cell);
    if (r0.grid.isFloor(x, y)) {
      fovState.origin = [x, y];
      redraw();
    }
  });
}

function setEditTarget(i) {
  state.active = i;
  $("#edit-a").classList.toggle("active", i === 0);
  $("#edit-b").classList.toggle("active", i === 1);
  writeCfgToControls(activeCfg());
}

// ---------- 시작 ----------
function init() {
  buildStartScreen();
  bind();
  syncCompareUI();
  refreshGallery();
  const m = location.hash.match(/code=([^&]+)/);
  if (m) {
    const o = decodeState(decodeURIComponent(m[1]));
    if (o) {
      applyDecoded(o);
      return;
    }
  }
  showScreen("start");
}

init();
