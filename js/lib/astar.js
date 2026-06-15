// A* 길찾기 — 결정론적(동률 tie-break는 셀 인덱스). rng 미사용.
// 셀 진입 비용: 바닥/복도=1(낮음, 합류 유도), 벽=wallCost(높음, 통과 가능).

import { WALL, DIR4 } from "../grid.js";

// 최소 힙 (f, idx) — f 우선, 동률은 idx
class MinHeap {
  constructor() {
    this.a = [];
  }
  get size() {
    return this.a.length;
  }
  push(f, idx) {
    const a = this.a;
    a.push([f, idx]);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p][0] < a[i][0] || (a[p][0] === a[i][0] && a[p][1] <= a[i][1])) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop() {
    const a = this.a;
    const top = a[0];
    const last = a.pop();
    if (a.length) {
      a[0] = last;
      let i = 0;
      const n = a.length;
      while (true) {
        let l = 2 * i + 1,
          r = 2 * i + 2,
          s = i;
        if (l < n && (a[l][0] < a[s][0] || (a[l][0] === a[s][0] && a[l][1] < a[s][1]))) s = l;
        if (r < n && (a[r][0] < a[s][0] || (a[r][0] === a[s][0] && a[r][1] < a[s][1]))) s = r;
        if (s === i) break;
        [a[s], a[i]] = [a[i], a[s]];
        i = s;
      }
    }
    return top;
  }
}

// 반환: path [[x,y]...] (시작·목표 포함) 또는 null
export function astar(grid, [sx, sy], [gx, gy], opts = {}) {
  const wallCost = opts.wallCost ?? 6;
  const { w, h } = grid;
  const N = w * h;
  const g = new Float64Array(N).fill(Infinity);
  const came = new Int32Array(N).fill(-1);
  const closed = new Uint8Array(N);
  const heur = (x, y) => Math.abs(x - gx) + Math.abs(y - gy);

  const si = sy * w + sx;
  const gi = gy * w + gx;
  g[si] = 0;
  const open = new MinHeap();
  open.push(heur(sx, sy), si);

  while (open.size) {
    const [, cur] = open.pop();
    if (cur === gi) break;
    if (closed[cur]) continue;
    closed[cur] = 1;
    const cx = cur % w;
    const cy = (cur - cx) / w;
    for (const [dx, dy] of DIR4) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (closed[ni]) continue;
      const step = grid.cells[ni] === WALL ? wallCost : 1;
      const ng = g[cur] + step;
      if (ng < g[ni]) {
        g[ni] = ng;
        came[ni] = cur;
        open.push(ng + heur(nx, ny), ni);
      }
    }
  }

  if (came[gi] === -1 && gi !== si) return null;
  // 역추적
  const path = [];
  let c = gi;
  while (c !== -1) {
    path.push([c % w, (c - (c % w)) / w]);
    if (c === si) break;
    c = came[c];
  }
  path.reverse();
  return path;
}
