// 그리드 자료구조 + 타일 상수 + 연결성 사후처리 유틸

export const WALL = 0;
export const FLOOR = 1;
export const CORRIDOR = 2;
export const DOOR = 3;

export const TILE_NAMES = {
  [WALL]: "벽",
  [FLOOR]: "바닥",
  [CORRIDOR]: "복도",
  [DOOR]: "문",
};

export class Grid {
  constructor(w, h, fill = WALL) {
    this.w = w;
    this.h = h;
    this.cells = new Uint8Array(w * h).fill(fill);
  }

  clone() {
    const g = new Grid(this.w, this.h);
    g.cells.set(this.cells);
    return g;
  }

  idx(x, y) {
    return y * this.w + x;
  }

  inBounds(x, y) {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  get(x, y) {
    if (!this.inBounds(x, y)) return WALL;
    return this.cells[this.idx(x, y)];
  }

  set(x, y, v) {
    if (this.inBounds(x, y)) this.cells[this.idx(x, y)] = v;
  }

  isFloor(x, y) {
    return this.get(x, y) !== WALL;
  }

  // 사각 영역 채우기 [x0,y0]~[x1,y1] 포함
  fillRect(x0, y0, x1, y1, v) {
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) this.set(x, y, v);
    }
  }

  count(v) {
    let n = 0;
    for (let i = 0; i < this.cells.length; i++) if (this.cells[i] === v) n++;
    return n;
  }
}

// 8방향 / 4방향 오프셋
export const DIR4 = [
  [0, -1],
  [0, 1],
  [-1, 0],
  [1, 0],
];

// 바닥(=벽이 아닌) 셀들을 연결 영역으로 라벨링 (4방향 BFS).
// 반환: { labels:Int32Array(-1=벽), regions:[{id, cells:[[x,y]...], size}] }
export function floodRegions(grid) {
  const { w, h } = grid;
  const labels = new Int32Array(w * h).fill(-1);
  const regions = [];
  const queue = new Int32Array(w * h);

  for (let sy = 0; sy < h; sy++) {
    for (let sx = 0; sx < w; sx++) {
      const start = grid.idx(sx, sy);
      if (grid.cells[start] === WALL || labels[start] !== -1) continue;
      const id = regions.length;
      const cells = [];
      let head = 0,
        tail = 0;
      queue[tail++] = start;
      labels[start] = id;
      while (head < tail) {
        const cur = queue[head++];
        const cx = cur % w;
        const cy = (cur - cx) / w;
        cells.push([cx, cy]);
        for (const [dx, dy] of DIR4) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const ni = ny * w + nx;
          if (grid.cells[ni] === WALL || labels[ni] !== -1) continue;
          labels[ni] = id;
          queue[tail++] = ni;
        }
      }
      regions.push({ id, cells, size: cells.length });
    }
  }
  return { labels, regions };
}

// L자(수평 후 수직 또는 그 반대) 복도를 파낸다.
export function carveTunnel(grid, x0, y0, x1, y1, rng, tile = CORRIDOR) {
  const horizFirst = rng ? rng.chance(0.5) : true;
  const carveH = (y) => {
    for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
      if (grid.get(x, y) === WALL) grid.set(x, y, tile);
    }
  };
  const carveV = (x) => {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) {
      if (grid.get(x, y) === WALL) grid.set(x, y, tile);
    }
  };
  if (horizFirst) {
    carveH(y0);
    carveV(x1);
  } else {
    carveV(x0);
    carveH(y1);
  }
}

// A* 경로를 따라 복도를 판다 (벽 통과 가중). 기존 복도와 합류 유도.
// astar는 lib에서 주입(순환 import 회피).
export function carveAStarPath(grid, x0, y0, x1, y1, astar, tile = CORRIDOR, wallCost = 6) {
  const path = astar(grid, [x0, y0], [x1, y1], { wallCost });
  if (!path) return false;
  for (const [x, y] of path) if (grid.get(x, y) === WALL) grid.set(x, y, tile);
  return true;
}

// 연결성 미보장 기법(CA, 다중 드렁큰 등)의 사후처리.
// 모든 영역을 가장 큰 영역에 가까운 순으로 터널 연결해 단일 연결 그래프로 만든다.
export function connectRegions(grid, rng) {
  let { regions } = floodRegions(grid);
  if (regions.length <= 1) return;

  // 각 영역의 대표점(첫 셀) 계산
  const reps = regions.map((r) => r.cells[0]);
  // 가장 큰 영역을 메인으로
  let mainIdx = 0;
  for (let i = 1; i < regions.length; i++) {
    if (regions[i].size > regions[mainIdx].size) mainIdx = i;
  }

  const connected = new Set([mainIdx]);
  const remaining = new Set(regions.map((_, i) => i).filter((i) => i !== mainIdx));

  while (remaining.size > 0) {
    let best = null; // {from, to, dist}
    for (const ti of remaining) {
      const [tx, ty] = reps[ti];
      for (const fi of connected) {
        const [fx, fy] = reps[fi];
        const d = Math.abs(tx - fx) + Math.abs(ty - fy);
        if (!best || d < best.dist) best = { from: fi, to: ti, dist: d };
      }
    }
    const [fx, fy] = reps[best.from];
    const [tx, ty] = reps[best.to];
    carveTunnel(grid, fx, fy, tx, ty, rng);
    connected.add(best.to);
    remaining.delete(best.to);
  }
}

// (sx,sy)에서 4방향 BFS 거리맵. 벽/미도달 = -1. 반환 Int32Array.
export function bfsDistance(grid, sx, sy) {
  const { w, h } = grid;
  const dist = new Int32Array(w * h).fill(-1);
  if (!grid.isFloor(sx, sy)) return dist;
  const queue = new Int32Array(w * h);
  let head = 0,
    tail = 0;
  const s = grid.idx(sx, sy);
  dist[s] = 0;
  queue[tail++] = s;
  while (head < tail) {
    const cur = queue[head++];
    const cx = cur % w;
    const cy = (cur - cx) / w;
    for (const [dx, dy] of DIR4) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = ny * w + nx;
      if (grid.cells[ni] === WALL || dist[ni] !== -1) continue;
      dist[ni] = dist[cur] + 1;
      queue[tail++] = ni;
    }
  }
  return dist;
}

// 가장 큰 영역만 남기고 나머지는 벽으로 (대안 사후처리)
export function keepLargestRegion(grid) {
  const { labels, regions } = floodRegions(grid);
  if (regions.length === 0) return;
  let mainIdx = 0;
  for (let i = 1; i < regions.length; i++) {
    if (regions[i].size > regions[mainIdx].size) mainIdx = i;
  }
  for (let i = 0; i < grid.cells.length; i++) {
    if (labels[i] !== -1 && labels[i] !== mainIdx) grid.cells[i] = WALL;
  }
}
