// 시드 기반 결정론적 난수 (Seedable deterministic RNG)
// 모든 무작위성은 여기서만 발생해야 재현성이 보장된다. Math.random 금지.

// 문자열 시드 -> 32bit 부호없는 정수 (cyrb53 변형 / xfnv1a 계열)
export function hashSeed(str) {
  str = String(str);
  let h = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193); // FNV prime
  }
  // 추가 믹싱
  h ^= h >>> 16;
  h = Math.imul(h, 0x21f0aaad);
  h ^= h >>> 15;
  h = Math.imul(h, 0x735a2d97);
  h ^= h >>> 15;
  return h >>> 0;
}

// mulberry32: 빠르고 품질 충분한 32bit PRNG
function mulberry32(seedInt) {
  let a = seedInt >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 시드 문자열로 RNG 객체 생성
export function makeRNG(seedStr) {
  const next = mulberry32(hashSeed(seedStr));
  return {
    seed: String(seedStr),
    next, // 0 <= x < 1
    // [min, max] 정수 (양끝 포함)
    int(min, max) {
      return min + Math.floor(next() * (max - min + 1));
    },
    // [min, max) 실수
    float(min, max) {
      return min + next() * (max - min);
    },
    pick(arr) {
      return arr[Math.floor(next() * arr.length)];
    },
    chance(p) {
      return next() < p;
    },
    // Fisher-Yates (제자리 셔플)
    shuffle(arr) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
  };
}

// 표시/공유용 무작위 시드 문자열 생성.
// 시작 엔트로피는 시간 + 단조 카운터(같은 ms에 연속 호출해도 충돌 없도록).
let _counter = 0;
export function randomSeed() {
  _counter = (_counter + 1) >>> 0;
  // 시간 + 세션카운터 + 무작위(리로드 간 같은 ms 충돌 방지). 출력은 비재현 시드 문자열.
  const t = (Date.now() ^ Math.floor(Math.random() * 0x100000000)) >>> 0;
  const r = mulberry32(t ^ Math.imul(_counter, 0x9e3779b1));
  let s = "";
  for (let i = 0; i < 8; i++) {
    s += Math.floor(r() * 36).toString(36);
  }
  return s.toUpperCase();
}
