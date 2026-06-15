// 셀룰러 오토마타 동굴 — 문서 §2
// 무작위 채움 → "3×3에 벽 5개↑ → 벽" 규칙 N회 반복 → 연결성 사후처리.
// steps()가 단일 출처, generate=마지막 프레임 (애니메이션/생성 로직 일치).

import { Grid, WALL, FLOOR, connectRegions } from "../grid.js";

function wallCount(grid, x, y) {
  let n = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (grid.get(x + dx, y + dy) === WALL) n++;
    }
  }
  return n;
}

export function* steps(rng, opts) {
  const { w, h, fillProb = 0.45, iterations = 5 } = opts;
  let grid = new Grid(w, h, WALL);

  // 초기 무작위 채움 (경계는 벽 유지)
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      grid.set(x, y, rng.next() < fillProb ? WALL : FLOOR);
    }
  }
  yield grid.clone();

  for (let it = 0; it < iterations; it++) {
    const next = new Grid(w, h, WALL);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
          next.set(x, y, WALL);
          continue;
        }
        next.set(x, y, wallCount(grid, x, y) >= 5 ? WALL : FLOOR);
      }
    }
    grid = next;
    yield grid.clone();
  }

  connectRegions(grid, rng);
  yield grid;
}

export function generate(rng, opts) {
  let g = null;
  for (const frame of steps(rng, opts)) g = frame;
  return g;
}
