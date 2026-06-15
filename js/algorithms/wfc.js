// 웨이브 함수 붕괴(WFC) — 문서 §7, Simple Tiled Model.
// 최소 엔트로피 셀 collapse → 제약 전파 → 모순 시 재시작(시도 카운터를 시드에 접어 결정론 유지).
// 연결성 미보장 → connectRegions 사후처리 필수.

import { Grid, WALL, FLOOR, connectRegions } from "../grid.js";
import { makeRNG } from "../rng.js";
import { buildTileset, compatible, OPP } from "../lib/wfc-tileset.js";

// 방향 dir: 0=N,1=E,2=S,3=W
const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

function solve(rng, w, h, tiles, roomWeight) {
  const T = tiles.length;
  const N = w * h;
  // domains[cell] = boolean[T] (가능 여부) + count
  const domains = new Array(N);
  for (let i = 0; i < N; i++) domains[i] = { mask: new Array(T).fill(true), count: T };

  // 경계: 맵 밖은 closed(벽). 테두리 셀은 해당 면 소켓이 closed인 타일만 허용.
  const removeIf = (cell, predicate) => {
    const d = domains[cell];
    for (let t = 0; t < T; t++) {
      if (d.mask[t] && predicate(tiles[t])) {
        d.mask[t] = false;
        d.count--;
      }
    }
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const c = y * w + x;
      if (y === 0) removeIf(c, (t) => t.sockets[0] === 1); // N 열림 금지
      if (x === w - 1) removeIf(c, (t) => t.sockets[1] === 1); // E
      if (y === h - 1) removeIf(c, (t) => t.sockets[2] === 1); // S
      if (x === 0) removeIf(c, (t) => t.sockets[3] === 1); // W
    }
  }

  const stack = [];
  // 전파: cell의 domain이 줄었을 때 이웃 제약
  const propagate = () => {
    while (stack.length) {
      const c = stack.pop();
      const cx = c % w;
      const cy = (c - cx) / w;
      for (let dir = 0; dir < 4; dir++) {
        const nx = cx + DX[dir];
        const ny = cy + DY[dir];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const nc = ny * w + nx;
        const nd = domains[nc];
        if (nd.count === 0) continue;
        let changed = false;
        for (let nt = 0; nt < T; nt++) {
          if (!nd.mask[nt]) continue;
          // nc의 nt가 c의 어떤 가능한 타일과도 호환 안되면 제거
          let ok = false;
          const cd = domains[c];
          for (let ct = 0; ct < T; ct++) {
            if (!cd.mask[ct]) continue;
            // c의 dir면 == nc의 OPP[dir]면 매칭 → compatible(c타일, dir, nc타일)
            if (compatible(tiles[ct], dir, tiles[nt])) {
              ok = true;
              break;
            }
          }
          if (!ok) {
            nd.mask[nt] = false;
            nd.count--;
            changed = true;
          }
        }
        if (nd.count === 0) return false; // 모순
        if (changed) stack.push(nc);
      }
    }
    return true;
  };

  // 초기 경계 제약 전파
  for (let i = 0; i < N; i++) if (domains[i].count < T) stack.push(i);
  if (!propagate()) return null;

  // 메인 루프
  while (true) {
    // 최소 엔트로피 셀 찾기 (count>1 중 최소, 동률 rng)
    let best = -1;
    let bestCount = Infinity;
    let tieCandidates = [];
    for (let i = 0; i < N; i++) {
      const c = domains[i].count;
      if (c <= 1) continue;
      if (c < bestCount) {
        bestCount = c;
        tieCandidates = [i];
      } else if (c === bestCount) tieCandidates.push(i);
    }
    if (tieCandidates.length === 0) break; // 전부 확정
    best = tieCandidates[rng.int(0, tieCandidates.length - 1)];

    // 가중 선택
    const d = domains[best];
    let total = 0;
    const choices = [];
    for (let t = 0; t < T; t++)
      if (d.mask[t]) {
        choices.push(t);
        total += tiles[t].weight;
      }
    let r = rng.next() * total;
    let chosen = choices[0];
    for (const t of choices) {
      r -= tiles[t].weight;
      if (r <= 0) {
        chosen = t;
        break;
      }
    }
    // collapse
    for (let t = 0; t < T; t++) d.mask[t] = t === chosen;
    d.count = 1;
    stack.push(best);
    if (!propagate()) return null; // 모순 → 호출자가 재시작
  }

  // 결과 Grid: 확정 타일 isFloor → FLOOR
  const grid = new Grid(w, h, WALL);
  for (let i = 0; i < N; i++) {
    const d = domains[i];
    let t = -1;
    for (let k = 0; k < T; k++)
      if (d.mask[k]) {
        t = k;
        break;
      }
    if (t >= 0 && tiles[t].isFloor) grid.cells[i] = FLOOR;
  }
  return grid;
}

export function generate(rng, opts) {
  const { w, h, maxTries = 20, roomWeight = 2, wallWeight = 10 } = opts;
  const tiles = buildTileset({ roomWeight, wallWeight });

  // 시드 결정론 유지: 시도마다 파생 시드
  const baseSeed = rng.seed;
  let grid = null;
  for (let attempt = 0; attempt < maxTries; attempt++) {
    const tryRng = makeRNG(baseSeed + ":wfc" + attempt);
    grid = solve(tryRng, w, h, tiles, roomWeight);
    if (grid) break;
  }
  if (!grid) grid = new Grid(w, h, WALL); // 전부 실패 시 빈 맵

  // 연결성 미보장 → 사후 연결
  connectRegions(grid, rng);
  return grid;
}
