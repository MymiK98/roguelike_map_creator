// BSP(이진 공간 분할) 트리 던전 — 문서 §1
// 벽 맵을 재귀 분할 → 리프에 방 배치 → 형제 노드 복도 연결(연결성 보장).
// 코어 로직은 js/lib/bsp-core.js 공용(hybrid.js와 공유).

import { Grid, WALL, FLOOR } from "../grid.js";
import { buildTree, connect } from "../lib/bsp-core.js";

export function generate(rng, opts) {
  const { w, h, minLeaf = 9, maxLeaf = 22, roomPadding = 1 } = opts;
  const grid = new Grid(w, h, WALL);

  const { root, leaves } = buildTree(rng, w, h, minLeaf, maxLeaf);

  // 리프마다 방 배치 (leaves 순서 유지 = 재현성)
  for (const leaf of leaves) {
    if (leaf.left || leaf.right) continue;
    const pad = roomPadding;
    const maxW = leaf.w - pad * 2;
    const maxH = leaf.h - pad * 2;
    if (maxW < 3 || maxH < 3) continue;
    const rw = rng.int(3, maxW);
    const rh = rng.int(3, maxH);
    const rx = leaf.x + pad + rng.int(0, maxW - rw);
    const ry = leaf.y + pad + rng.int(0, maxH - rh);
    leaf.room = { x: rx, y: ry, w: rw, h: rh };
    grid.fillRect(rx, ry, rx + rw - 1, ry + rh - 1, FLOOR);
  }

  connect(grid, root, rng);
  return grid;
}
