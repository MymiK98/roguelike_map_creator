// 알고리즘 등록부 — 각 항목의 param 스키마로 UI가 동적 생성된다.

import { generate as bsp } from "./algorithms/bsp.js";
import { generate as cellular, steps as cellularSteps } from "./algorithms/cellular.js";
import { generate as drunkard, steps as drunkardSteps } from "./algorithms/drunkard.js";
import { generate as tunneling } from "./algorithms/tunneling.js";
import { generate as maze, steps as mazeSteps } from "./algorithms/maze.js";
import { generate as graph } from "./algorithms/graph.js";
import { generate as hybrid } from "./algorithms/hybrid.js";
import { generate as wfc } from "./algorithms/wfc.js";
import { generate as wfcOverlap } from "./algorithms/wfc-overlap.js";

// param type: 'range' {min,max,step,default} | 'select' {options:[{value,label}],default}
export const ALGORITHMS = [
  {
    id: "bsp",
    name: "BSP 던전",
    desc: "공간을 재귀 분할해 방을 배치하고 복도로 잇는 구조적 던전. 연결성 보장.",
    docRef: "문서 §1",
    generate: bsp,
    params: [
      { key: "minLeaf", label: "최소 구획 크기", type: "range", min: 6, max: 16, step: 1, default: 9 },
      { key: "maxLeaf", label: "최대 구획 크기", type: "range", min: 14, max: 40, step: 1, default: 22 },
      { key: "roomPadding", label: "방 여백", type: "range", min: 0, max: 3, step: 1, default: 1 },
    ],
  },
  {
    id: "cellular",
    name: "셀룰러 오토마타 동굴",
    desc: "무작위 노이즈를 반복 스무딩해 자연스러운 동굴 생성. 사후 터널 연결.",
    docRef: "문서 §2",
    generate: cellular,
    steps: cellularSteps,
    animatable: true,
    params: [
      { key: "fillProb", label: "초기 벽 비율", type: "range", min: 0.35, max: 0.55, step: 0.01, default: 0.45 },
      { key: "iterations", label: "스무딩 반복", type: "range", min: 1, max: 8, step: 1, default: 5 },
    ],
  },
  {
    id: "drunkard",
    name: "드렁큰 워크",
    desc: "에이전트가 무작위로 이동하며 통로를 파는 유기적 동굴. 완전 연결.",
    docRef: "문서 §3",
    generate: drunkard,
    steps: drunkardSteps,
    animatable: true,
    params: [
      { key: "floorTargetPct", label: "바닥 비율 목표", type: "range", min: 0.2, max: 0.6, step: 0.01, default: 0.4 },
      { key: "agents", label: "에이전트 수", type: "range", min: 1, max: 6, step: 1, default: 1 },
    ],
  },
  {
    id: "tunneling",
    name: "룸+코리더 (터널링)",
    desc: "방을 무작위 배치하고 직전 방과 L자 터널로 연결. 입문 표준, 완전 연결.",
    docRef: "문서 §4",
    generate: tunneling,
    params: [
      { key: "maxRooms", label: "최대 방 수", type: "range", min: 4, max: 40, step: 1, default: 18 },
      { key: "roomMin", label: "방 최소 크기", type: "range", min: 3, max: 8, step: 1, default: 4 },
      { key: "roomMax", label: "방 최대 크기", type: "range", min: 6, max: 16, step: 1, default: 9 },
      { key: "corridor", label: "복도 방식", type: "select", default: "L", options: [
        { value: "L", label: "L자" }, { value: "astar", label: "A* (합류)" } ] },
    ],
  },
  {
    id: "maze",
    name: "미로 (재귀 백트래커)",
    desc: "스택 DFS로 길고 구불구불한 미로 생성. braid로 막다른 길 제거 가능.",
    docRef: "문서 §5",
    generate: maze,
    steps: mazeSteps,
    animatable: true,
    params: [
      { key: "braid", label: "막다른 길 제거율", type: "range", min: 0, max: 1, step: 0.05, default: 0 },
    ],
  },
  {
    id: "graph",
    name: "그래프 던전 (들로네+MST)",
    desc: "방을 배치하고 들로네 삼각분할→MST로 연결, 일부 엣지를 되살려 루프/지름길 생성.",
    docRef: "문서 §6",
    generate: graph,
    params: [
      { key: "maxRooms", label: "최대 방 수", type: "range", min: 4, max: 30, step: 1, default: 16 },
      { key: "roomMin", label: "방 최소 크기", type: "range", min: 3, max: 8, step: 1, default: 4 },
      { key: "roomMax", label: "방 최대 크기", type: "range", min: 6, max: 16, step: 1, default: 9 },
      { key: "loopFactor", label: "루프 비율", type: "range", min: 0, max: 0.4, step: 0.01, default: 0.15 },
      { key: "corridor", label: "복도 방식", type: "select", default: "L", options: [
        { value: "L", label: "L자" }, { value: "astar", label: "A* (합류)" } ] },
    ],
  },
  {
    id: "hybrid",
    name: "하이브리드 (BSP+동굴)",
    desc: "BSP로 구획을 나눈 뒤 일부 구획은 셀룰러 동굴, 나머지는 사각 방으로 채워 연결.",
    docRef: "문서 §0",
    generate: hybrid,
    params: [
      { key: "caveRatio", label: "동굴 비율", type: "range", min: 0, max: 1, step: 0.05, default: 0.4 },
      { key: "minLeaf", label: "최소 구획", type: "range", min: 7, max: 16, step: 1, default: 10 },
      { key: "maxLeaf", label: "최대 구획", type: "range", min: 16, max: 40, step: 1, default: 24 },
      { key: "caveFill", label: "동굴 초기 벽", type: "range", min: 0.35, max: 0.55, step: 0.01, default: 0.45 },
      { key: "caveIters", label: "동굴 스무딩", type: "range", min: 1, max: 6, step: 1, default: 4 },
    ],
  },
  {
    id: "wfc",
    name: "WFC (타일 기반)",
    desc: "인접 규칙 제약 전파로 타일 패턴 맵 생성(파이프 타일셋). 모순 시 재시도, 사후 연결.",
    docRef: "문서 §7",
    generate: wfc,
    params: [
      { key: "wallWeight", label: "벽 가중치", type: "range", min: 2, max: 60, step: 1, default: 30 },
      { key: "roomWeight", label: "방 가중치", type: "range", min: 0, max: 8, step: 1, default: 1 },
      { key: "maxTries", label: "재시도 한도", type: "range", min: 5, max: 40, step: 1, default: 20 },
    ],
  },
  {
    id: "wfc-overlap",
    name: "WFC Overlapping (샘플)",
    desc: "샘플 패턴에서 N×N 규칙을 학습해 더 큰 맵 합성. 샘플 편집 가능, 사후 연결.",
    docRef: "문서 §7",
    generate: wfcOverlap,
    sampleEditor: true,
    params: [
      { key: "preset", label: "프리셋 샘플", type: "select", default: "rooms", options: [
        { value: "rooms", label: "방+복도" }, { value: "caves", label: "동굴" }, { value: "maze", label: "미로" } ] },
      { key: "patternN", label: "패턴 크기 N", type: "range", min: 2, max: 3, step: 1, default: 2 },
      { key: "symmetry", label: "대칭", type: "select", default: "none", options: [
        { value: "none", label: "없음" }, { value: "all", label: "회전+반사" } ] },
      { key: "maxTries", label: "재시도 한도", type: "range", min: 5, max: 40, step: 1, default: 20 },
    ],
  },
];

export function getAlgorithm(id) {
  return ALGORITHMS.find((a) => a.id === id) || null;
}

// 스키마 기반 기본 파라미터 객체
export function defaultParams(algo) {
  const p = {};
  for (const param of algo.params) p[param.key] = param.default;
  return p;
}
