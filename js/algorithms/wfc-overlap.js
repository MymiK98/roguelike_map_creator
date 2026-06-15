// WFC Overlapping Model — 문서 §7. 샘플 패턴에서 N×N 규칙 학습 → 더 큰 맵 합성.
// 사용자 샘플(페인터) 또는 프리셋 입력. 연결성 미보장 → connectRegions 사후.

import { Grid, WALL, FLOOR, connectRegions } from "../grid.js";
import { makeRNG } from "../rng.js";

// ---------- 프리셋 샘플 (#=벽, .=바닥) ----------
export const PRESETS = {
  rooms: [
    "##########",
    "#....##...#",
    "#....##...#",
    "#.........#",
    "###.####.##",
    "#.........#",
    "#...##....#",
    "#...##....#",
    "##########",
  ],
  caves: [
    "..##....",
    ".#..#...",
    "#....##.",
    "#....#..",
    ".#...#..",
    "..##.#..",
    "...#.#..",
    "..##....",
  ],
  maze: [
    "#.#.#.#.#",
    "#.#.#.#.#",
    "#.......#",
    "#.#####.#",
    "#.#...#.#",
    "#.#.#.#.#",
    "#...#...#",
    "#########",
  ],
};

export function presetToSample(name) {
  const rows = PRESETS[name] || PRESETS.rooms;
  const w = Math.max(...rows.map((r) => r.length));
  const h = rows.length;
  const cells = new Uint8Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) cells[y * w + x] = (rows[y][x] || "#") === "#" ? WALL : FLOOR;
  return { w, h, cells };
}

// ---------- 샘플 직렬화(비트팩 + base64) ----------
export function packSample(sample) {
  const bytes = new Uint8Array(Math.ceil(sample.cells.length / 8));
  for (let i = 0; i < sample.cells.length; i++) if (sample.cells[i]) bytes[i >> 3] |= 1 << (i & 7);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return { w: sample.w, h: sample.h, bits: btoa(bin) };
}
export function unpackSample(s) {
  const bin = atob(s.bits);
  const cells = new Uint8Array(s.w * s.h);
  for (let i = 0; i < cells.length; i++) cells[i] = (bin.charCodeAt(i >> 3) >> (i & 7)) & 1;
  return { w: s.w, h: s.h, cells };
}

// ---------- 패턴 추출 ----------
function rotate(p, N) {
  const out = new Uint8Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) out[x * N + (N - 1 - y)] = p[y * N + x];
  return out;
}
function reflect(p, N) {
  const out = new Uint8Array(N * N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) out[y * N + (N - 1 - x)] = p[y * N + x];
  return out;
}

function extractPatterns(sample, N, symmetry) {
  const { w, h, cells } = sample;
  const map = new Map();
  const addVariants = (base) => {
    let variants = [base];
    if (symmetry === "all") {
      let cur = base;
      for (let r = 0; r < 3; r++) {
        cur = rotate(cur, N);
        variants.push(cur);
      }
      let ref = reflect(base, N);
      variants.push(ref);
      cur = ref;
      for (let r = 0; r < 3; r++) {
        cur = rotate(cur, N);
        variants.push(cur);
      }
    }
    for (const v of variants) {
      const key = v.join("");
      const e = map.get(key);
      if (e) e.weight++;
      else map.set(key, { pattern: v, weight: 1 });
    }
  };
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const pat = new Uint8Array(N * N);
      for (let dy = 0; dy < N; dy++)
        for (let dx = 0; dx < N; dx++) pat[dy * N + dx] = cells[((y + dy) % h) * w + ((x + dx) % w)];
      addVariants(pat);
    }
  }
  return [...map.values()];
}

const DIRS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

function agrees(a, b, dx, dy, N) {
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const bx = x - dx,
        by = y - dy;
      if (bx < 0 || by < 0 || bx >= N || by >= N) continue;
      if (a[y * N + x] !== b[by * N + bx]) return false;
    }
  }
  return true;
}

function buildCompat(patterns, N) {
  const P = patterns.length;
  // compat[d][i] = Uint8Array(P) 가능여부
  const compat = DIRS.map(() => []);
  for (let d = 0; d < DIRS.length; d++) {
    const [dx, dy] = DIRS[d];
    for (let i = 0; i < P; i++) {
      const list = [];
      for (let j = 0; j < P; j++) if (agrees(patterns[i].pattern, patterns[j].pattern, dx, dy, N)) list.push(j);
      compat[d][i] = list;
    }
  }
  return compat;
}

// ---------- 솔버 ----------
function solve(rng, w, h, patterns, compat, weights) {
  const P = patterns.length;
  const N = w * h;
  const domains = new Array(N);
  for (let i = 0; i < N; i++) domains[i] = { mask: new Uint8Array(P).fill(1), count: P };

  const stack = [];
  const propagate = () => {
    while (stack.length) {
      const c = stack.pop();
      const cx = c % w;
      const cy = (c - cx) / w;
      for (let d = 0; d < DIRS.length; d++) {
        const nx = cx + DIRS[d][0];
        const ny = cy + DIRS[d][1];
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const nc = ny * w + nx;
        const nd = domains[nc];
        if (nd.count === 0) continue;
        // c에서 가능한 패턴들이 nc방향으로 허용하는 패턴 집합
        const allowed = new Uint8Array(P);
        const cd = domains[c];
        for (let i = 0; i < P; i++) {
          if (!cd.mask[i]) continue;
          const list = compat[d][i];
          for (let k = 0; k < list.length; k++) allowed[list[k]] = 1;
        }
        let changed = false;
        for (let j = 0; j < P; j++) {
          if (nd.mask[j] && !allowed[j]) {
            nd.mask[j] = 0;
            nd.count--;
            changed = true;
          }
        }
        if (nd.count === 0) return false;
        if (changed) stack.push(nc);
      }
    }
    return true;
  };

  while (true) {
    let best = -1,
      bestCount = Infinity,
      ties = [];
    for (let i = 0; i < N; i++) {
      const c = domains[i].count;
      if (c <= 1) continue;
      if (c < bestCount) {
        bestCount = c;
        ties = [i];
      } else if (c === bestCount) ties.push(i);
    }
    if (ties.length === 0) break;
    best = ties[rng.int(0, ties.length - 1)];

    const d = domains[best];
    let total = 0;
    const choices = [];
    for (let i = 0; i < P; i++)
      if (d.mask[i]) {
        choices.push(i);
        total += weights[i];
      }
    let r = rng.next() * total;
    let chosen = choices[0];
    for (const i of choices) {
      r -= weights[i];
      if (r <= 0) {
        chosen = i;
        break;
      }
    }
    for (let i = 0; i < P; i++) d.mask[i] = i === chosen ? 1 : 0;
    d.count = 1;
    stack.push(best);
    if (!propagate()) return null;
  }

  // 출력: 각 셀의 확정 패턴의 좌상단 값
  const grid = new Grid(w, h, WALL);
  for (let i = 0; i < N; i++) {
    let t = -1;
    const m = domains[i].mask;
    for (let k = 0; k < P; k++)
      if (m[k]) {
        t = k;
        break;
      }
    if (t >= 0) grid.cells[i] = patterns[t].pattern[0];
  }
  return grid;
}

export function generate(rng, opts) {
  const { w, h, preset = "rooms", patternN = 2, symmetry = "none", maxTries = 20 } = opts;
  const N = Math.max(2, Math.min(3, patternN));
  const sample = opts.sample ? unpackSample(opts.sample) : presetToSample(preset);

  const patterns = extractPatterns(sample, N, symmetry);
  const weights = patterns.map((p) => p.weight);
  const compat = buildCompat(patterns, N);

  const baseSeed = rng.seed;
  let grid = null;
  for (let attempt = 0; attempt < maxTries; attempt++) {
    const tryRng = makeRNG(baseSeed + ":wfco" + attempt);
    grid = solve(tryRng, w, h, patterns, compat, weights);
    if (grid) break;
  }
  if (!grid) grid = new Grid(w, h, WALL);

  connectRegions(grid, rng);
  return grid;
}
