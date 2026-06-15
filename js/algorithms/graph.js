// 그래프 기반 던전 — 문서 §6 (TinyKeep: 들로네 + MST + 루프 재추가).
// 방 배치 → 중심 들로네 삼각분할 → MST 연결 → 비-MST 엣지 일부 재추가 → 복도.

import { Grid, WALL, FLOOR, carveTunnel, carveAStarPath, connectRegions } from "../grid.js";
import { triangulate } from "../lib/delaunay.js";
import { astar } from "../lib/astar.js";

function intersects(a, b) {
  return (
    a.x <= b.x + b.w + 1 &&
    a.x + a.w + 1 >= b.x &&
    a.y <= b.y + b.h + 1 &&
    a.y + a.h + 1 >= b.y
  );
}

function dist2(a, b) {
  const dx = a.cx - b.cx;
  const dy = a.cy - b.cy;
  return dx * dx + dy * dy;
}

// Prim MST. nodes:[{cx,cy}], edges:[[i,j]]. 반환 선택된 엣지 Set("i,j" i<j).
function primMST(nodes, edges) {
  const adj = nodes.map(() => []);
  for (const [a, b] of edges) {
    const w = dist2(nodes[a], nodes[b]);
    adj[a].push([b, w]);
    adj[b].push([a, w]);
  }
  const inTree = new Array(nodes.length).fill(false);
  const mst = new Set();
  inTree[0] = true;
  let count = 1;
  while (count < nodes.length) {
    let best = null; // [from,to,w]
    for (let i = 0; i < nodes.length; i++) {
      if (!inTree[i]) continue;
      for (const [j, w] of adj[i]) {
        if (inTree[j]) continue;
        if (!best || w < best[2] || (w === best[2] && j < best[1])) best = [i, j, w];
      }
    }
    if (!best) break; // 비연결 그래프 → 안전망(connectRegions)이 마무리
    inTree[best[1]] = true;
    const key = best[0] < best[1] ? best[0] + "," + best[1] : best[1] + "," + best[0];
    mst.add(key);
    count++;
  }
  return mst;
}

export function generate(rng, opts) {
  const { w, h, maxRooms = 16, roomMin = 4, roomMax = 9, loopFactor = 0.15, corridor = "L" } = opts;
  const grid = new Grid(w, h, WALL);
  const rooms = [];

  for (let i = 0; i < maxRooms * 4 && rooms.length < maxRooms; i++) {
    const rw = rng.int(roomMin, roomMax);
    const rh = rng.int(roomMin, roomMax);
    const rx = rng.int(1, w - rw - 2);
    const ry = rng.int(1, h - rh - 2);
    const room = { x: rx, y: ry, w: rw, h: rh };
    if (rooms.some((r) => intersects(room, r))) continue;
    grid.fillRect(rx, ry, rx + rw - 1, ry + rh - 1, FLOOR);
    room.cx = Math.floor(rx + rw / 2);
    room.cy = Math.floor(ry + rh / 2);
    rooms.push(room);
  }

  if (rooms.length >= 2) {
    // 들로네 (퇴화 시 빈 엣지 → 안전망이 처리)
    const points = rooms.map((r, i) => ({ x: r.cx, y: r.cy, id: i }));
    let edges = triangulate(points);

    // 퇴화(일직선/공원점 등)로 엣지가 부족하면 거리순 체인 폴백
    if (edges.length < rooms.length - 1) {
      edges = [];
      for (let i = 1; i < rooms.length; i++) edges.push([i - 1, i]);
    }

    const mst = primMST(rooms, edges);

    for (const [a, b] of edges) {
      const key = a < b ? a + "," + b : b + "," + a;
      const inMST = mst.has(key);
      if (inMST || rng.chance(loopFactor)) {
        if (corridor === "astar")
          carveAStarPath(grid, rooms[a].cx, rooms[a].cy, rooms[b].cx, rooms[b].cy, astar);
        else carveTunnel(grid, rooms[a].cx, rooms[a].cy, rooms[b].cx, rooms[b].cy, rng);
      }
    }
  }

  // 안전망: 어떤 퇴화에도 단일 연결 보장
  connectRegions(grid, rng);
  return grid;
}
