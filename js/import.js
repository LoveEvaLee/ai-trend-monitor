// A · CSV 읽기·점검 (W6 · 유경). 약속은 js/README.md
window.ATM = window.ATM || {};

// text → { rows: [{ line, date, title, url, source }], skipped: [{ line, reason }] }
ATM.parseCSV = function (text) {
  // 1차에서 구현
  return { rows: [], skipped: [] };
};
