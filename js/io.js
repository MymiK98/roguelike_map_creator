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
              e: o.entities
                ? { enabled: true, treasures: o.entities.filter((e) => e.type === "treasure").length }
                : undefined,
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
