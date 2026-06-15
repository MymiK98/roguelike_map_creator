// 룸-앤-코리더(터널링) — 문서 §4
// 무작위 방 배치(겹침 거부) → 직전 방과 L자 터널 연결(체인=완전 연결 보장).

import { Grid, WALL, FLOOR, carveTunnel, carveAStarPath } from "../grid.js";
import { astar } from "../lib/astar.js";

function intersects(a, b) {
  // 1칸 여유를 두어 방끼리 붙지 않도록
  return (
    a.x <= b.x + b.w + 1 &&
    a.x + a.w + 1 >= b.x &&
    a.y <= b.y + b.h + 1 &&
    a.y + a.h + 1 >= b.y
  );
}

export function generate(rng, opts) {
  let { w, h, maxRooms = 18, roomMin = 4, roomMax = 9, corridor = "L" } = opts;
  // 방 크기를 맵에 맞게 보정(역방향 rng.int 방지). 정상 파라미터엔 무영향.
  const cap = Math.max(3, Math.min(w, h) - 3);
  roomMax = Math.max(3, Math.min(roomMax, cap));
  roomMin = Math.max(2, Math.min(roomMin, roomMax));
  const grid = new Grid(w, h, WALL);
  const rooms = [];

  for (let i = 0; i < maxRooms * 3 && rooms.length < maxRooms; i++) {
    const rw = rng.int(roomMin, roomMax);
    const rh = rng.int(roomMin, roomMax);
    const rx = rng.int(1, w - rw - 2);
    const ry = rng.int(1, h - rh - 2);
    const room = { x: rx, y: ry, w: rw, h: rh };

    if (rooms.some((r) => intersects(room, r))) continue;

    grid.fillRect(rx, ry, rx + rw - 1, ry + rh - 1, FLOOR);

    if (rooms.length > 0) {
      const prev = rooms[rooms.length - 1];
      const ax = Math.floor(room.x + room.w / 2);
      const ay = Math.floor(room.y + room.h / 2);
      const bx = Math.floor(prev.x + prev.w / 2);
      const by = Math.floor(prev.y + prev.h / 2);
      if (corridor === "astar") carveAStarPath(grid, ax, ay, bx, by, astar);
      else carveTunnel(grid, ax, ay, bx, by, rng);
    }
    rooms.push(room);
  }

  return grid;
}
