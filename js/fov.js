// 시야(FOV) — 재귀 섀도캐스팅 (8분면). 리서치 문서 권장 기법.
// 반환: 가시 셀 인덱스 Set (grid.idx 기준).

import { WALL } from "./grid.js";

// 8분면 변환 (xx,xy,yx,yy)
const OCTANTS = [
  [1, 0, 0, 1],
  [0, 1, 1, 0],
  [0, -1, 1, 0],
  [-1, 0, 0, 1],
  [-1, 0, 0, -1],
  [0, -1, -1, 0],
  [0, 1, -1, 0],
  [1, 0, 0, -1],
];

export function computeFOV(grid, ox, oy, radius) {
  const visible = new Set();
  if (!grid.inBounds(ox, oy)) return visible;
  visible.add(grid.idx(ox, oy));
  const r2 = radius * radius;
  const isWall = (x, y) => grid.get(x, y) === WALL;

  for (const [xx, xy, yx, yy] of OCTANTS) {
    castLight(grid, ox, oy, 1, 1.0, 0.0, radius, r2, xx, xy, yx, yy, isWall, visible);
  }
  return visible;
}

function castLight(grid, ox, oy, row, startSlope, endSlope, radius, r2, xx, xy, yx, yy, isWall, visible) {
  if (startSlope < endSlope) return;
  let nextStart = startSlope;
  for (let i = row; i <= radius; i++) {
    let blocked = false;
    for (let dx = -i, dy = -i; dx <= 0; dx++) {
      const lSlope = (dx - 0.5) / (dy + 0.5);
      const rSlope = (dx + 0.5) / (dy - 0.5);
      if (rSlope > startSlope) continue;
      if (lSlope < endSlope) break;

      const mx = ox + dx * xx + dy * xy;
      const my = oy + dx * yx + dy * yy;
      if (!grid.inBounds(mx, my)) continue;

      if (dx * dx + dy * dy <= r2) visible.add(grid.idx(mx, my));

      const wall = isWall(mx, my);
      if (blocked) {
        if (wall) {
          nextStart = rSlope;
          continue;
        } else {
          blocked = false;
          startSlope = nextStart;
        }
      } else {
        if (wall && i < radius) {
          blocked = true;
          castLight(grid, ox, oy, i + 1, startSlope, lSlope, radius, r2, xx, xy, yx, yy, isWall, visible);
          nextStart = rSlope;
        }
      }
    }
    if (blocked) break;
  }
}
