// A · 키워드 추출·기간별 순위 (W8 · 유경). 약속은 js/README.md
window.ATM = window.ATM || {};

// title, RULES → ["EU AI Act", ...] (한 기사 안에서 중복 없음)
ATM.extractKeywords = function (title, rules) {
  // 2차에서 구현
  return [];
};

// items, "YYYY-MM-DD" → { "90d" | "30d" | "7d" | "1d": { window, rank: [{ keyword, count, prev }] } }
ATM.keywordRanks = function (items, baseDate) {
  // 2차에서 구현
  var out = {};
  ["90d", "30d", "7d", "1d"].forEach(function (w) { out[w] = { window: w, rank: [] }; });
  return out;
};
