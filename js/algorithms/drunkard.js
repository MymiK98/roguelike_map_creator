// 드렁큰 워크(랜덤 워크) — 문서 §3
// 벽 맵에서 에이전트가 통로를 파냄. 단일 시작 + 이어쓰기로 완전 연결 보장.
// steps()가 단일 출처(애니메이션용 ~60프레임 캡), generate=마지막 프레임.

import { Grid, WALL, FLOOR, DIR4 } from "../grid.js";

export function* steps(rng, opts) {
  const { w, h, floorTargetPct = 0.4, agents = 1 } = opts;
  const grid = new Grid(w, h, WALL);
  const target = Math.floor(w * h * floorTargetPct);

  let x = Math.floor(w / 2);
  let y = Math.floor(h / 2);
  grid.set(x, y, FLOOR);
  let carved = 1;

  let stepsThisAgent = 0;
  const maxPerAgent = agents > 1 ? Math.floor(target / agents) : Infinity;
  const maxSteps = w * h * 40;
  let steps = 0;

  const frameStride = Math.max(1, Math.floor(target / 60)); // ~60프레임
  let sinceFrame = 0;

  while (carved < target && steps < maxSteps) {
    steps++;
    const [dx, dy] = rng.pick(DIR4);
    const nx = x + dx;
    const ny = y + dy;
    if (nx <= 0 || ny <= 0 || nx >= w - 1 || ny >= h - 1) continue;
    x = nx;
    y = ny;
    if (grid.get(x, y) === WALL) {
      grid.set(x, y, FLOOR);
      carved++;
      if (++sinceFrame >= frameStride) {
        sinceFrame = 0;
        yield grid.clone();
      }
    }
    stepsThisAgent++;
    if (stepsThisAgent >= maxPerAgent) {
      stepsThisAgent = 0;
      x = Math.floor(w / 2);
      y = Math.floor(h / 2);
    }
  }

  yield grid;
}

export function generate(rng, opts) {
  let g = null;
  for (const frame of steps(rng, opts)) g = frame;
  return g;
}
