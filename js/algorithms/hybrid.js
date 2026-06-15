// 하이브리드 파이프라인 — 문서 §0 권장 (BSP 구획 → 일부 셀 CA 동굴).
// bsp-core로 트리 분할/연결, 리프를 caveRatio 확률로 CA 동굴 / 나머지 사각 방.

import { Grid, WALL, FLOOR } from "../grid.js";
import { buildTree, connect } from "../lib/bsp-core.js";

// 리프 영역 내부에 셀룰러 동굴 생성(경계 1칸 벽 유지). 채워진 셀을 grid에 반영.
function carveCave(grid, leaf, rng, fill, iters) {
  const x0 = leaf.x + 1,
    y0 = leaf.y + 1;
  const x1 = leaf.x + leaf.w - 2,
    y1 = leaf.y + leaf.h - 2;
  const lw = x1 - x0 + 1;
  const lh = y1 - y0 + 1;
  if (lw < 4 || lh < 4) return null;

  // 로컬 버퍼 (벽=true)
  let buf = [];
  for (let y = 0; y < lh; y++) {
    buf[y] = [];
    for (let x = 0; x < lw; x++) {
      const edge = x === 0 || y === 0 || x === lw - 1 || y === lh - 1;
      buf[y][x] = edge ? true : rng.next() < fill;
    }
  }
  const wallCount = (b, x, y) => {
    let n = 0;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx,
          ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= lw || ny >= lh) n++;
        else if (b[ny][nx]) n++;
      }
    return n;
  };
  for (let it = 0; it < iters; it++) {
    const next = [];
    for (let y = 0; y < lh; y++) {
      next[y] = [];
      for (let x = 0; x < lw; x++) {
        next[y][x] = wallCount(buf, x, y) >= 5;
      }
    }
    buf = next;
  }

  // grid에 바닥 반영. 중심 셀 반환(복도 연결용 대표점)
  let cx = x0 + (lw >> 1),
    cy = y0 + (lh >> 1);
  for (let y = 0; y < lh; y++)
    for (let x = 0; x < lw; x++)
      if (!buf[y][x]) grid.set(x0 + x, y0 + y, FLOOR);

  // 중심이 벽이면 바닥 보장(연결 대표점)
  if (grid.get(cx, cy) === WALL) grid.set(cx, cy, FLOOR);
  return { cx, cy };
}

export function generate(rng, opts) {
  const {
    w,
    h,
    caveRatio = 0.4,
    minLeaf = 10,
    maxLeaf = 24,
    caveFill = 0.45,
    caveIters = 4,
  } = opts;
  const grid = new Grid(w, h, WALL);

  const { root, leaves } = buildTree(rng, w, h, minLeaf, maxLeaf);

  for (const leaf of leaves) {
    if (leaf.left || leaf.right) continue;
    if (rng.chance(caveRatio)) {
      const c = carveCave(grid, leaf, rng, caveFill, caveIters);
      // 동굴 리프도 대표 방을 설정해 bsp connect가 잇도록(1×1 방 마커)
      if (c) leaf.room = { x: c.cx, y: c.cy, w: 1, h: 1 };
    } else {
      // 사각 방
      const maxW = leaf.w - 2;
      const maxH = leaf.h - 2;
      if (maxW < 3 || maxH < 3) continue;
      const rw = rng.int(3, maxW);
      const rh = rng.int(3, maxH);
      const rx = leaf.x + 1 + rng.int(0, maxW - rw);
      const ry = leaf.y + 1 + rng.int(0, maxH - rh);
      leaf.room = { x: rx, y: ry, w: rw, h: rh };
      grid.fillRect(rx, ry, rx + rw - 1, ry + rh - 1, FLOOR);
    }
  }

  connect(grid, root, rng);
  return grid;
}
