// 재귀 백트래커 미로 — 문서 §5
// 스택 기반 DFS로 격자 미로 생성. braid로 막다른 길 일부 제거.
// steps()가 단일 출처(애니메이션용 ~60프레임 캡), generate=마지막 프레임.

import { Grid, WALL, FLOOR, DIR4 } from "../grid.js";

export function* steps(rng, opts) {
  const { w, h, braid = 0 } = opts;
  const grid = new Grid(w, h, WALL);

  const startX = 1;
  const startY = 1;
  const stack = [[startX, startY]];
  grid.set(startX, startY, FLOOR);

  const NB = [
    [0, -2],
    [0, 2],
    [-2, 0],
    [2, 0],
  ];

  const cellEstimate = Math.floor((w * h) / 4);
  const frameStride = Math.max(1, Math.floor(cellEstimate / 60));
  let sinceFrame = 0;

  while (stack.length > 0) {
    const [cx, cy] = stack[stack.length - 1];
    const candidates = [];
    for (const [dx, dy] of NB) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx > 0 && ny > 0 && nx < w - 1 && ny < h - 1 && grid.get(nx, ny) === WALL) {
        candidates.push([nx, ny, dx, dy]);
      }
    }
    if (candidates.length === 0) {
      stack.pop();
      continue;
    }
    const [nx, ny, dx, dy] = rng.pick(candidates);
    grid.set(cx + dx / 2, cy + dy / 2, FLOOR);
    grid.set(nx, ny, FLOOR);
    stack.push([nx, ny]);
    if (++sinceFrame >= frameStride) {
      sinceFrame = 0;
      yield grid.clone();
    }
  }

  // braid: 막다른 길을 확률적으로 추가 연결해 루프 생성
  if (braid > 0) {
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        if (grid.get(x, y) !== FLOOR) continue;
        const open = DIR4.filter(([dx, dy]) => grid.get(x + dx, y + dy) === FLOOR);
        if (open.length === 1 && rng.chance(braid)) {
          const walls = DIR4.filter(([dx, dy]) => {
            const nx = x + dx;
            const ny = y + dy;
            return nx > 0 && ny > 0 && nx < w - 1 && ny < h - 1 && grid.get(nx, ny) === WALL;
          });
          if (walls.length) {
            const [dx, dy] = rng.pick(walls);
            grid.set(x + dx, y + dy, FLOOR);
          }
        }
      }
    }
  }

  yield grid;
}

export function generate(rng, opts) {
  let g = null;
  for (const frame of steps(rng, opts)) g = frame;
  return g;
}
