// 실제 생성기 출력(맵)을 PNG로 인코딩해 assets/에 저장. 헤드리스(브라우저 불필요).
// 순수 Node: zlib + 자체 CRC32로 최소 PNG 작성.

import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { buildMap } from "../js/buildmap.js";
import { TILE_COLORS, ENTITY_STYLE } from "../js/render.js";
import { defaultParams, getAlgorithm } from "../js/registry.js";

// ---- PNG 인코더 ----
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // 스캔라인: 행마다 필터바이트 0
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

// 그리드+엔티티 → RGBA 버퍼
function renderToRGBA(result, cell) {
  const { grid, entities } = result;
  const W = grid.w * cell;
  const H = grid.h * cell;
  const buf = Buffer.alloc(W * H * 4);
  const tileRgb = {};
  for (const k of Object.keys(TILE_COLORS)) tileRgb[k] = hexToRgb(TILE_COLORS[k]);
  const put = (px, py, r, g, b) => {
    if (px < 0 || py < 0 || px >= W || py >= H) return;
    const i = (py * W + px) * 4;
    buf[i] = r;
    buf[i + 1] = g;
    buf[i + 2] = b;
    buf[i + 3] = 255;
  };
  for (let y = 0; y < grid.h; y++) {
    for (let x = 0; x < grid.w; x++) {
      const [r, g, b] = tileRgb[grid.get(x, y)] || tileRgb[0];
      for (let dy = 0; dy < cell; dy++) for (let dx = 0; dx < cell; dx++) put(x * cell + dx, y * cell + dy, r, g, b);
    }
  }
  // 엔티티 마커(작은 사각)
  for (const e of entities) {
    const st = ENTITY_STYLE[e.type];
    if (!st) continue;
    const [r, g, b] = hexToRgb(st.color);
    const cx = e.x * cell + (cell >> 1);
    const cy = e.y * cell + (cell >> 1);
    const rad = Math.max(1, Math.floor(cell * 0.45));
    for (let dy = -rad; dy <= rad; dy++) for (let dx = -rad; dx <= rad; dx++) put(cx + dx, cy + dy, r, g, b);
  }
  return { buf, W, H };
}

// ---- 생성 ----
mkdirSync(new URL("../assets", import.meta.url), { recursive: true });
const outDir = new URL("../assets/", import.meta.url);

const shots = [
  { id: "bsp", seed: "DEMO-BSP" },
  { id: "cellular", seed: "DEMO-CAVE" },
  { id: "graph", seed: "DEMO-GRAPH" },
  { id: "maze", seed: "DEMO-MAZE" },
  { id: "hybrid", seed: "DEMO-HYBRID" },
  { id: "wfc", seed: "DEMO-WFC" },
];

const cell = 8;
for (const s of shots) {
  const algo = getAlgorithm(s.id);
  const result = buildMap({
    algoId: s.id,
    seed: s.seed,
    w: 72,
    h: 44,
    params: defaultParams(algo),
    entities: { enabled: true, treasures: 4 },
  });
  const { buf, W, H } = renderToRGBA(result, cell);
  const png = encodePNG(W, H, buf);
  writeFileSync(new URL(s.id + ".png", outDir), png);
  console.log(`assets/${s.id}.png (${W}x${H}) 바닥${(result.meta.floorPct * 100).toFixed(0)}%`);
}
console.log("done");
