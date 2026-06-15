// WFC 타일셋 — Simple Tiled Model. 각 타일은 한 셀, 4면 소켓(open/closed).
// 인접 규칙: 마주보는 면의 소켓이 같아야 연결(open↔open, closed↔closed) — 파이프 타일 방식.
// 소켓 인덱스 0=N,1=E,2=S,3=W. 반대면: N↔S(0↔2), E↔W(1↔3).

export const OPP = [2, 3, 0, 1];

// mask 비트: 1=N, 2=E, 4=S, 8=W (열린 면)
export function buildTileset(opts = {}) {
  const wallWeight = opts.wallWeight ?? 10;
  const roomWeight = opts.roomWeight ?? 2;
  const tiles = [];
  for (let m = 0; m < 16; m++) {
    const N = m & 1 ? 1 : 0;
    const E = m & 2 ? 1 : 0;
    const S = m & 4 ? 1 : 0;
    const W = m & 8 ? 1 : 0;
    const open = N + E + S + W;
    let weight;
    if (m === 0) weight = wallWeight; // 완전 벽
    else if (open === 1) weight = 1; // 막다른 길(희소)
    else if (open === 2) weight = 6; // 직선/코너 (선호)
    else if (open === 3) weight = 3; // T자
    else weight = roomWeight; // 사방 개방(방)
    tiles.push({ mask: m, sockets: [N, E, S, W], weight, isFloor: m !== 0 });
  }
  return tiles;
}

// tileA의 dir면이 tileB와 인접 가능한가
export function compatible(tileA, dir, tileB) {
  return tileA.sockets[dir] === tileB.sockets[OPP[dir]];
}
