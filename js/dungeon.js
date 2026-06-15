// 다층 던전 — 층별 파생시드로 buildMap, 계단(하행/상행) 배치.
// 단층(floors<=1)이면 buildMap 1개. DOM 비의존.

import { buildMap } from "./buildmap.js";
import { makeRNG } from "./rng.js";
import { ENTITY, pickFloorCell } from "./entities.js";

// config: { algoId, seed, w, h, params, entities, floors }
// 반환: { floors:[{grid,entities,meta}], currentFloor:0 }
export function buildDungeon(config) {
  const n = Math.max(1, config.floors || 1);
  const floors = [];
  for (let i = 0; i < n; i++) {
    const floorSeed = n > 1 ? config.seed + ":L" + i : config.seed;
    floors.push(buildMap({ ...config, seed: floorSeed }));
  }

  if (n > 1) {
    for (let i = 0; i < n; i++) {
      const res = floors[i];
      // 하행: 마지막 층 제외 → 해당 층 exit 위치(없으면 무작위 바닥)
      if (i < n - 1) {
        const pos = entityPos(res, ENTITY.EXIT) || pickFloorCell(res.grid, makeRNG(config.seed + ":sd" + i));
        if (pos) res.entities.push({ type: ENTITY.STAIRS_DOWN, x: pos[0], y: pos[1] });
      }
      // 상행: 첫 층 제외 → 해당 층 start 위치(없으면 무작위 바닥)
      if (i > 0) {
        const pos = entityPos(res, ENTITY.START) || pickFloorCell(res.grid, makeRNG(config.seed + ":su" + i));
        if (pos) res.entities.push({ type: ENTITY.STAIRS_UP, x: pos[0], y: pos[1] });
      }
    }
  }

  return { floors, currentFloor: 0 };
}

function entityPos(res, type) {
  const e = res.entities.find((e) => e.type === type);
  return e ? [e.x, e.y] : null;
}
