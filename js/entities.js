// 엔티티 배치 — 시작/출구/보물. 파생 시드로 맵 재현성 보존.

import { makeRNG } from "./rng.js";
import { bfsDistance, floodRegions } from "./grid.js";

export const ENTITY = {
  START: "start",
  EXIT: "exit",
  TREASURE: "treasure",
  STAIRS_DOWN: "stairs_down",
  STAIRS_UP: "stairs_up",
};

// 다층용: 가장 큰 영역의 무작위 바닥 좌표(파생 rng)
export function pickFloorCell(grid, rng) {
  const { regions } = floodRegions(grid);
  if (!regions.length) return null;
  let main = regions[0];
  for (const r of regions) if (r.size > main.size) main = r;
  return main.cells[rng.int(0, main.cells.length - 1)];
}

// 시작→출구 최단경로 (bfsDistance 역추적). 엔티티에 start/exit 있어야 함.
export function solutionPath(grid, entities) {
  const start = entities.find((e) => e.type === ENTITY.START);
  const exit = entities.find((e) => e.type === ENTITY.EXIT);
  if (!start || !exit) return null;
  if (!grid.inBounds(start.x, start.y) || !grid.inBounds(exit.x, exit.y)) return null;
  const dist = bfsDistance(grid, start.x, start.y);
  if (dist[grid.idx(exit.x, exit.y)] < 0) return null;
  const path = [[exit.x, exit.y]];
  let [x, y] = [exit.x, exit.y];
  let guard = grid.w * grid.h;
  while (!(x === start.x && y === start.y) && guard-- > 0) {
    const cur = dist[grid.idx(x, y)];
    let moved = false;
    for (const [dx, dy] of [
      [0, -1],
      [0, 1],
      [-1, 0],
      [1, 0],
    ]) {
      const nx = x + dx;
      const ny = y + dy;
      if (grid.inBounds(nx, ny) && grid.isFloor(nx, ny) && dist[grid.idx(nx, ny)] === cur - 1) {
        x = nx;
        y = ny;
        path.push([x, y]);
        moved = true;
        break;
      }
    }
    if (!moved) break;
  }
  return path;
}

// grid의 모든 바닥 좌표
function floorCells(grid) {
  const out = [];
  for (let y = 0; y < grid.h; y++)
    for (let x = 0; x < grid.w; x++) if (grid.isFloor(x, y)) out.push([x, y]);
  return out;
}

// placeEntities(grid, seed, {treasures})
// 규칙: 시작=가장 큰 영역의 무작위 바닥 / 출구=시작서 BFS 최장거리 바닥 /
//       보물=시작·서로서 일정거리 이상 떨어진 바닥 N개.
export function placeEntities(grid, seed, opts = {}) {
  const treasures = opts.treasures ?? 3;
  const rng = makeRNG(seed + ":ent");

  // 가장 큰 연결영역 내에서만 배치(고립칸 방지)
  const { regions } = floodRegions(grid);
  if (regions.length === 0) return [];
  let main = regions[0];
  for (const r of regions) if (r.size > main.size) main = r;
  const cells = main.cells;
  if (cells.length < 2) return [];

  const entities = [];

  // 시작
  const [sx, sy] = cells[rng.int(0, cells.length - 1)];
  entities.push({ type: ENTITY.START, x: sx, y: sy });

  // 출구 = 시작서 최장거리
  const dist = bfsDistance(grid, sx, sy);
  let exit = [sx, sy];
  let best = -1;
  for (const [x, y] of cells) {
    const d = dist[grid.idx(x, y)];
    if (d > best) {
      best = d;
      exit = [x, y];
    }
  }
  entities.push({ type: ENTITY.EXIT, x: exit[0], y: exit[1] });

  // 보물 — 기존 엔티티서 최소거리 유지하며 무작위 선택
  const minSep = Math.max(3, Math.floor(Math.sqrt(cells.length) / 3));
  const placed = [
    [sx, sy],
    exit,
  ];
  const shuffled = rng.shuffle([...cells]);
  for (const [x, y] of shuffled) {
    if (entities.filter((e) => e.type === ENTITY.TREASURE).length >= treasures) break;
    const ok = placed.every(([px, py]) => Math.abs(px - x) + Math.abs(py - y) >= minSep);
    if (ok) {
      entities.push({ type: ENTITY.TREASURE, x, y });
      placed.push([x, y]);
    }
  }

  return entities;
}
