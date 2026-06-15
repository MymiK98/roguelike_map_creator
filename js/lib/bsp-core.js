// BSP 코어 — bsp.js / hybrid.js 공용. 트리 분할 + 형제 노드 복도 연결.

import { WALL, CORRIDOR } from "../grid.js";

export class Leaf {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.left = null;
    this.right = null;
    this.room = null; // {x,y,w,h}
  }

  split(rng, minLeaf) {
    if (this.left || this.right) return false;

    // 한 변이 다른 변보다 25% 이상 크면 큰 쪽을 자른다
    let horizontal = rng.chance(0.5);
    if (this.w > this.h && this.w / this.h >= 1.25) horizontal = false;
    else if (this.h > this.w && this.h / this.w >= 1.25) horizontal = true;

    const max = (horizontal ? this.h : this.w) - minLeaf;
    if (max <= minLeaf) return false;

    const cut = rng.int(minLeaf, max);
    if (horizontal) {
      this.left = new Leaf(this.x, this.y, this.w, cut);
      this.right = new Leaf(this.x, this.y + cut, this.w, this.h - cut);
    } else {
      this.left = new Leaf(this.x, this.y, cut, this.h);
      this.right = new Leaf(this.x + cut, this.y, this.w - cut, this.h);
    }
    return true;
  }
}

// 루트에서 분할 가능한 동안 반복해 트리 + 리프 목록 생성
export function buildTree(rng, w, h, minLeaf, maxLeaf) {
  const root = new Leaf(0, 0, w, h);
  const leaves = [root];
  let didSplit = true;
  while (didSplit) {
    didSplit = false;
    for (const leaf of [...leaves]) {
      if (leaf.left || leaf.right) continue;
      if (leaf.w > maxLeaf || leaf.h > maxLeaf || rng.chance(0.75)) {
        if (leaf.split(rng, minLeaf)) {
          leaves.push(leaf.left, leaf.right);
          didSplit = true;
        }
      }
    }
  }
  return { root, leaves };
}

// 리프 목록만 추출
export function getLeaves(root) {
  const out = [];
  const stack = [root];
  while (stack.length) {
    const n = stack.pop();
    if (n.left || n.right) {
      if (n.left) stack.push(n.left);
      if (n.right) stack.push(n.right);
    } else out.push(n);
  }
  return out;
}

export function center(room) {
  return [Math.floor(room.x + room.w / 2), Math.floor(room.y + room.h / 2)];
}

// 리프(또는 하위 트리)의 대표 방 중심을 얻는다
function getRoom(leaf, rng) {
  if (leaf.room) return leaf.room;
  const l = leaf.left && getRoom(leaf.left, rng);
  const r = leaf.right && getRoom(leaf.right, rng);
  if (l && r) return rng.chance(0.5) ? l : r;
  return l || r || null;
}

function carveCorridor(grid, ax, ay, bx, by, rng) {
  // 1폭 L자 복도
  if (rng.chance(0.5)) {
    for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++)
      if (grid.get(x, ay) === WALL) grid.set(x, ay, CORRIDOR);
    for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++)
      if (grid.get(bx, y) === WALL) grid.set(bx, y, CORRIDOR);
  } else {
    for (let y = Math.min(ay, by); y <= Math.max(ay, by); y++)
      if (grid.get(ax, y) === WALL) grid.set(ax, y, CORRIDOR);
    for (let x = Math.min(ax, bx); x <= Math.max(ax, bx); x++)
      if (grid.get(x, by) === WALL) grid.set(x, by, CORRIDOR);
  }
}

// 형제 노드 연결: 트리를 후위 순회하며 left/right 대표 방을 잇는다 (연결성 보장)
export function connect(grid, leaf, rng) {
  if (!leaf.left && !leaf.right) return;
  if (leaf.left) connect(grid, leaf.left, rng);
  if (leaf.right) connect(grid, leaf.right, rng);
  if (leaf.left && leaf.right) {
    const a = getRoom(leaf.left, rng);
    const b = getRoom(leaf.right, rng);
    if (a && b) {
      const [ax, ay] = center(a);
      const [bx, by] = center(b);
      carveCorridor(grid, ax, ay, bx, by, rng);
    }
  }
}
