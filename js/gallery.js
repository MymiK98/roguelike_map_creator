// 시드 갤러리 — localStorage 저장/목록/삭제. 쿼터 관리(캡 + try/catch).

const KEY = "rlmap.gallery";
const MAX_ITEMS = 50;

export function list() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persist(items) {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
    return true;
  } catch {
    // QuotaExceeded → 오래된 항목 제거 후 재시도
    while (items.length > 1) {
      items.shift();
      try {
        localStorage.setItem(KEY, JSON.stringify(items));
        return true;
      } catch {
        /* continue */
      }
    }
    return false;
  }
}

// entry: { serializedCfg, thumb(dataURL), label }
export function save(entry) {
  const items = list();
  const id = entry.label + "_" + items.length + "_" + (items.reduce((a) => a + 1, 0) + Math.floor(performance.now()));
  items.push({ id, ...entry });
  while (items.length > MAX_ITEMS) items.shift();
  persist(items);
  return id;
}

export function remove(id) {
  const items = list().filter((e) => e.id !== id);
  persist(items);
}

export function clear() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

// 결과 그리드를 소형 썸네일 dataURL로 (JPEG, 저용량)
export function makeThumb(grid, colors, maxPx = 96) {
  const cell = Math.max(1, Math.floor(maxPx / Math.max(grid.w, grid.h)));
  const cw = grid.w * cell;
  const ch = grid.h * cell;
  const c = document.createElement("canvas");
  c.width = cw;
  c.height = ch;
  const ctx = c.getContext("2d");
  ctx.fillStyle = "#0d0f17";
  ctx.fillRect(0, 0, cw, ch);
  for (let y = 0; y < grid.h; y++) {
    for (let x = 0; x < grid.w; x++) {
      ctx.fillStyle = colors[grid.get(x, y)] || colors[0];
      ctx.fillRect(x * cell, y * cell, cell, cell);
    }
  }
  return c.toDataURL("image/jpeg", 0.6);
}
