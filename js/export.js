// 내보내기 — PNG(캔버스) / JSON(맵 데이터).

function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportPNG(canvas, name) {
  canvas.toBlob((blob) => {
    if (blob) download(blob, name + ".png");
  });
}

export function exportJSON(config, result, name) {
  const payload = {
    algo: config.algoId,
    seed: config.seed,
    w: config.w,
    h: config.h,
    params: config.params,
    entities: result.entities,
    meta: result.meta,
    // 셀은 행 단위 배열로 (가독성 + 재구성 용이)
    cells: Array.from(result.grid.cells),
  };
  const blob = new Blob([JSON.stringify(payload, null, 0)], {
    type: "application/json",
  });
  download(blob, name + ".json");
}
