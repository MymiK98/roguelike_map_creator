// JSON 불러오기 — 내보낸 맵 JSON을 공유코드(v3) 형태로 변환.

import { getAlgorithm } from "./registry.js";

// File → Promise<decoded v3 object | null>
export function importJSON(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const o = JSON.parse(reader.result);
        // export.js 포맷: {algo,seed,w,h,params,entities,meta,cells}
        if (!o || !getAlgorithm(o.algo)) {
          resolve(null);
          return;
        }
        const ents = Array.isArray(o.entities) ? o.entities : [];
        resolve({
          v: 3,
          c: 0,
          slots: [
            {
              a: o.algo,
              s: o.seed,
              w: o.w,
              h: o.h,
              p: o.params || {},
              // 엔티티 배열이 비어있으면 내보낼 때 비활성이었던 것 → enabled:false 유지
              e: { enabled: ents.length > 0, treasures: ents.filter((e) => e.type === "treasure").length },
              f: o.floors || 1,
            },
          ],
        });
      } catch {
        resolve(null);
      }
    };
    reader.onerror = () => resolve(null);
    reader.readAsText(file);
  });
}
