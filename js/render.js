// Canvas 렌더러 — 그리드를 셀 단위로 그린다. 셀 크기는 캔버스에 맞춰 자동 스케일.

import { WALL, FLOOR, CORRIDOR, DOOR, TILE_NAMES } from "./grid.js";

export const TILE_COLORS = {
  [WALL]: "#1a1d29",
  [FLOOR]: "#cdb89a",
  [CORRIDOR]: "#8a7a5c",
  [DOOR]: "#c8553d",
};

const BG = "#0d0f17";
const GRID_LINE = "rgba(0,0,0,0.15)";

export const ENTITY_STYLE = {
  start: { color: "#5fb878", name: "시작" },
  exit: { color: "#e0533d", name: "출구" },
  treasure: { color: "#e8c84a", name: "보물" },
  stairs_down: { color: "#9aa3b8", name: "하행 계단" },
  stairs_up: { color: "#d8dded", name: "상행 계단" },
};

// grid를 canvas에 렌더.
// opts: { maxPixel, showGrid, entities:[{type,x,y}], fov:{visible:Set} }
export function render(canvas, grid, opts = {}) {
  const { maxPixel = 900, showGrid = false, entities = [], fov = null, path = null } = opts;
  const cell = Math.max(1, Math.floor(maxPixel / Math.max(grid.w, grid.h)));
  const cw = grid.w * cell;
  const ch = grid.h * cell;

  // 해상도(devicePixelRatio 고려)
  const dpr = window.devicePixelRatio || 1;
  canvas.width = cw * dpr;
  canvas.height = ch * dpr;
  canvas.style.width = cw + "px";
  canvas.style.height = ch + "px";

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, cw, ch);

  for (let y = 0; y < grid.h; y++) {
    for (let x = 0; x < grid.w; x++) {
      const t = grid.get(x, y);
      ctx.fillStyle = TILE_COLORS[t] || TILE_COLORS[WALL];
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }

  // FOV: 비가시 셀 어둡게
  if (fov && fov.visible) {
    ctx.fillStyle = "rgba(5,6,12,0.72)";
    for (let y = 0; y < grid.h; y++) {
      for (let x = 0; x < grid.w; x++) {
        if (!fov.visible.has(grid.idx(x, y))) ctx.fillRect(x * cell, y * cell, cell, cell);
      }
    }
  }

  if (showGrid && cell >= 6) {
    ctx.strokeStyle = GRID_LINE;
    ctx.lineWidth = 1;
    for (let x = 0; x <= grid.w; x++) {
      ctx.beginPath();
      ctx.moveTo(x * cell + 0.5, 0);
      ctx.lineTo(x * cell + 0.5, ch);
      ctx.stroke();
    }
    for (let y = 0; y <= grid.h; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * cell + 0.5);
      ctx.lineTo(cw, y * cell + 0.5);
      ctx.stroke();
    }
  }

  // 솔루션 경로
  if (path && path.length > 1) {
    ctx.strokeStyle = "rgba(91,141,239,0.9)";
    ctx.lineWidth = Math.max(1.5, cell * 0.28);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let i = 0; i < path.length; i++) {
      const px = path[i][0] * cell + cell / 2;
      const py = path[i][1] * cell + cell / 2;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }

  // 엔티티 마커
  for (const e of entities) {
    const st = ENTITY_STYLE[e.type];
    if (!st) continue;
    const px = e.x * cell + cell / 2;
    const py = e.y * cell + cell / 2;
    const r = Math.max(2, cell * 0.42);
    ctx.fillStyle = st.color;
    ctx.strokeStyle = "rgba(0,0,0,0.6)";
    ctx.lineWidth = Math.max(1, cell * 0.08);
    ctx.beginPath();
    if (e.type === "start") {
      // ▲
      ctx.moveTo(px, py - r);
      ctx.lineTo(px + r, py + r);
      ctx.lineTo(px - r, py + r);
    } else if (e.type === "exit") {
      // ▼
      ctx.moveTo(px, py + r);
      ctx.lineTo(px + r, py - r);
      ctx.lineTo(px - r, py - r);
    } else if (e.type === "stairs_down" || e.type === "stairs_up") {
      // 사각 + 방향 표시
      ctx.rect(px - r, py - r, r * 2, r * 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.fillStyle = "rgba(0,0,0,0.7)";
      const down = e.type === "stairs_down";
      ctx.moveTo(px, down ? py + r * 0.6 : py - r * 0.6);
      ctx.lineTo(px + r * 0.6, down ? py - r * 0.5 : py + r * 0.5);
      ctx.lineTo(px - r * 0.6, down ? py - r * 0.5 : py + r * 0.5);
      ctx.closePath();
      ctx.fill();
      continue;
    } else {
      // ◆ 보물
      ctx.moveTo(px, py - r);
      ctx.lineTo(px + r, py);
      ctx.lineTo(px, py + r);
      ctx.lineTo(px - r, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  return { cell, cw, ch };
}

// 범례 HTML (사용된 타일만)
export function legendItems(grid) {
  const used = new Set(grid.cells);
  const order = [FLOOR, CORRIDOR, DOOR, WALL];
  return order
    .filter((t) => used.has(t))
    .map((t) => ({ color: TILE_COLORS[t], name: TILE_NAMES[t] }));
}
