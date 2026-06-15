// 맵 빌드 코어 — DOM 비의존(Node 테스트 가능). app.js/비교뷰/내보내기 공용.

import { makeRNG } from "./rng.js";
import { getAlgorithm } from "./registry.js";
import { floodRegions } from "./grid.js";
import { placeEntities } from "./entities.js";

// config: { algoId, seed, w, h, params, entities:{enabled,treasures} }
// 반환:   { grid, entities, meta:{regions, floorPct, ms} }
export function buildMap(config) {
  const algo = getAlgorithm(config.algoId);
  if (!algo) throw new Error("unknown algo: " + config.algoId);

  const rng = makeRNG(config.seed);
  const t0 = typeof performance !== "undefined" ? performance.now() : 0;
  const grid = algo.generate(rng, { w: config.w, h: config.h, ...config.params });
  const ms = (typeof performance !== "undefined" ? performance.now() : 0) - t0;

  const ent =
    config.entities && config.entities.enabled
      ? placeEntities(grid, config.seed, config.entities)
      : [];

  const { regions } = floodRegions(grid);
  const floors = grid.cells.length - grid.count(0);

  return {
    grid,
    entities: ent,
    meta: {
      regions: regions.length,
      floorPct: floors / grid.cells.length,
      ms,
    },
  };
}
