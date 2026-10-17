// B · 요약 숫자·주제별 막대·주별 추이 (W7 · 연구원님). 약속은 js/README.md
window.ATM = window.ATM || {};

// { total, classified, unclassified, skipped: [{ line, reason }] } → #summary 채우기
ATM.renderSummary = function (stats) {
  // 1차에서 구현
};

// el, items, ["주제", ...], onSelect(topic) → 가로 막대 + 미분류
ATM.renderTopicCounts = function (el, items, topics, onSelect) {
  // 1차에서 구현
};

// el, items, topics, selected, baseDate → 주별 꺾은선
ATM.renderTrend = function (el, items, topics, selected, baseDate) {
  // 1차에서 구현
};
