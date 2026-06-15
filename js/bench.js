// 성능 벤치마크 — 알고리즘×크기별 buildMap 생성시간(median/min). DOM 비의존 코어.
// 문서 §10 미해결(알고리즘 정량 성능) 대응.

import { buildMap } from "./buildmap.js";
import { getAlgorithm, defaultParams } from "./registry.js";

// opts: { algoIds, sizes:[변길이], runs }
// 반환: [{id,name, cells:{ [size]:{median,min} }}]
export function runBench({ algoIds, sizes, runs = 3 }) {
  const rows = [];
  for (const id of algoIds) {
    const algo = getAlgorithm(id);
    if (!algo) continue;
    const cells = {};
    for (const s of sizes) {
      const w = s;
      const h = Math.round(s * 0.625);
      const times = [];
      let failed = false;
      for (let r = 0; r < runs; r++) {
        try {
          const t0 = performance.now();
          // 매 실행 파라미터 재생성(상호 오염 방지)
          buildMap({ algoId: id, seed: "bench" + r, w, h, params: defaultParams(algo), entities: { enabled: false } });
          times.push(performance.now() - t0);
        } catch {
          failed = true;
          break;
        }
      }
      if (failed || times.length === 0) {
        cells[s] = { median: NaN, min: NaN };
      } else {
        times.sort((a, b) => a - b);
        cells[s] = { median: times[Math.floor(times.length / 2)], min: times[0] };
      }
    }
    rows.push({ id, name: algo.name, cells });
  }
  return rows;
}
