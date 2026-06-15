// 들로네 삼각분할 — Bowyer–Watson. 결정론적(동률은 인덱스 tie-break, Math.random 금지).
// 입력 points: [{x,y,id}] (id=원래 인덱스). 반환 엣지: [[idA,idB], ...] 중복 제거.

function circumcircleContains(ax, ay, bx, by, cx, cy, px, py) {
  // (a,b,c) 외접원에 p가 포함되는지 (행렬식 판정)
  const adx = ax - px,
    ady = ay - py;
  const bdx = bx - px,
    bdy = by - py;
  const cdx = cx - px,
    cdy = cy - py;
  const d =
    (adx * adx + ady * ady) * (bdx * cdy - cdx * bdy) -
    (bdx * bdx + bdy * bdy) * (adx * cdy - cdx * ady) +
    (cdx * cdx + cdy * cdy) * (adx * bdy - bdx * ady);
  // CCW 가정. 시계방향이면 부호 반전 필요 → 절대 판정 위해 면적 부호 고려
  const area =
    (bx - ax) * (cy - ay) - (cx - ax) * (by - ay);
  return area > 0 ? d > 0 : d < 0;
}

// 반환: 엣지 배열 (원본 point.id 기준)
export function triangulate(points) {
  const n = points.length;
  if (n < 3) {
    // 퇴화: 0/1/2점 → 직접 엣지
    const edges = [];
    if (n === 2) edges.push([points[0].id, points[1].id]);
    return edges;
  }

  // 슈퍼 삼각형 (모든 점 포함)
  let minX = Infinity,
    minY = Infinity,
    maxX = -Infinity,
    maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const dx = maxX - minX || 1;
  const dy = maxY - minY || 1;
  const dmax = Math.max(dx, dy) * 20;
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;

  // 슈퍼 정점은 음수 id로
  const verts = points.map((p) => ({ x: p.x, y: p.y, id: p.id }));
  const s0 = { x: midX - dmax, y: midY - dmax, id: -1 };
  const s1 = { x: midX, y: midY + dmax, id: -2 };
  const s2 = { x: midX + dmax, y: midY - dmax, id: -3 };
  verts.push(s0, s1, s2);
  const si0 = verts.length - 3,
    si1 = verts.length - 2,
    si2 = verts.length - 1;

  // 삼각형 = 정점 인덱스 3개 (verts 기준)
  let triangles = [[si0, si1, si2]];

  // 점을 하나씩 삽입 (원래 입력 순서 = 결정론적)
  for (let i = 0; i < n; i++) {
    const p = verts[i];
    const bad = [];
    for (const t of triangles) {
      const [a, b, c] = t;
      if (
        circumcircleContains(
          verts[a].x, verts[a].y,
          verts[b].x, verts[b].y,
          verts[c].x, verts[c].y,
          p.x, p.y
        )
      ) {
        bad.push(t);
      }
    }
    // 경계 폴리곤(엣지) 추출: bad 삼각형들의 비공유 엣지
    const boundary = [];
    for (const t of bad) {
      const e = [
        [t[0], t[1]],
        [t[1], t[2]],
        [t[2], t[0]],
      ];
      for (const edge of e) {
        let shared = false;
        for (const t2 of bad) {
          if (t2 === t) continue;
          if (triHasEdge(t2, edge[0], edge[1])) {
            shared = true;
            break;
          }
        }
        if (!shared) boundary.push(edge);
      }
    }
    // bad 제거
    triangles = triangles.filter((t) => !bad.includes(t));
    // 새 삼각형 추가 (점 i와 경계 엣지)
    for (const [a, b] of boundary) triangles.push([a, b, i]);
  }

  // 슈퍼 정점 포함 삼각형 제거 후 엣지 수집(중복 제거)
  const edgeSet = new Set();
  const edges = [];
  for (const t of triangles) {
    if (t.some((v) => v === si0 || v === si1 || v === si2)) continue;
    const pairs = [
      [t[0], t[1]],
      [t[1], t[2]],
      [t[2], t[0]],
    ];
    for (let [a, b] of pairs) {
      const ia = verts[a].id;
      const ib = verts[b].id;
      const key = ia < ib ? ia + "," + ib : ib + "," + ia;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        edges.push([ia, ib]);
      }
    }
  }
  return edges;
}

function triHasEdge(t, a, b) {
  const has = (x, y) =>
    (t[0] === x || t[1] === x || t[2] === x) &&
    (t[0] === y || t[1] === y || t[2] === y);
  return has(a, b);
}
