// B · 중요도 그리드·키워드 표·미분류 목록 (W9 · 연구원님). 약속은 js/README.md
window.ATM = window.ATM || {};

(function () {
  // charts.js와 같은 주제 색 (RULES.topics 순서)
  var COLORS = ["#2f5bd3", "#d1495b", "#c98a12", "#00798c", "#6a4c93"];

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }
  function link(it) {
    return /^https?:\/\//.test(it.url)
      ? '<a href="' + esc(it.url) + '" target="_blank" rel="noopener noreferrer">' + esc(it.title) + "</a>"
      : esc(it.title);
  }
  // 등급 표시. 마우스를 올리면 유형 · 근거 한 줄 (기획안 「출처 등급과 근거」)
  function grade(it) {
    var why = (it.gradeType ? it.gradeType + " · " : "") + (it.gradeReason || "") + (it.oa === false ? " · 원문 유료일 수 있음" : "");
    return '<span class="grade grade-' + esc(it.grade) + (it.unregistered ? " unregistered" : "") + '" title="' + esc(why) + '">' +
      esc(it.grade) + (it.unregistered ? "?" : "") + "</span>";
  }
  function fill(el, html) { el.classList.add("filled"); el.innerHTML = html; }
  function topN() { return window.RULES && RULES.score && RULES.score.topN || 5; }

  // ── 4. 주제별 중요도 순위 그리드 ────────────────────────────────
  // el, items, topics → 주제 카드 5장 · 카드마다 중요도 상위 topN건 (정렬은 ATM.byImportance = rules.js 동점 규칙)
  ATM.renderGrid = function (el, items, topics) {
    var n = topN();
    var cards = topics.map(function (name, i) {
      var top = items.filter(function (it) { return it.topics.indexOf(name) >= 0; }).sort(ATM.byImportance).slice(0, n);
      var rows = top.map(function (it) {
        return "<li>" +
          '<div class="card-title">' + link(it) + "</div>" +
          '<div class="card-meta">' + esc(it.date) + " · " + esc(it.source) + " · " + grade(it) +
          ' · <span class="score" title="중요도 = 등급 가중치 × (1 + 비슷한 기사) × 최신성">' + it.score.toFixed(2) + "</span>" +
          (it.similar && it.similar.length ? ' · <span class="similar">비슷한 기사 ' + it.similar.length + "건</span>" : "") +
          "</div></li>";
      }).join("");
      return '<article class="card" style="border-top-color:' + COLORS[i % COLORS.length] + '">' +
        "<h3>" + esc(name) + "</h3>" +
        (rows ? '<ol class="card-list">' + rows + "</ol>" : '<p class="hint">해당 기사가 없습니다.</p>') +
        "</article>";
    }).join("");
    fill(el, '<div class="cards">' + cards + '</div><p class="hint">등급(A~D)에 마우스를 올리면 출처 유형과 근거가 보입니다. "?"는 등급표에 없는 도메인(기본 C)입니다.</p>');
  };

  // ── 5. 기간별 키워드 순위 ───────────────────────────────────────
  // el, { window, label, days, rank: [{ keyword, count, prev }] } → 키워드 · 건수 · 직전 같은 기간 대비 증감 표
  ATM.renderKeywordTable = function (el, rank) {
    if (!rank || !rank.rank.length) { fill(el, '<p class="hint">이 기간에는 키워드가 없습니다.</p>'); return; }
    var label = rank.label || rank.window;
    var body = rank.rank.map(function (r, i) {
      var d = r.count - r.prev, change;
      if (r.prev === 0) change = '<span class="up">새로</span>';
      else if (d > 0) change = '<span class="up">▲ ' + d + "</span>";
      else if (d < 0) change = '<span class="down">▼ ' + (-d) + "</span>";
      else change = '<span class="same">–</span>';
      return "<tr><td>" + (i + 1) + "</td><td>" + esc(r.keyword) + '</td><td class="num">' + r.count +
        '</td><td class="num">' + r.prev + "</td><td>" + change + "</td></tr>";
    }).join("");
    fill(el, '<table class="kw"><caption>' + esc(label) + " 상위 " + rank.rank.length + "개 · 건수 = 키워드가 들어간 기사 수</caption>" +
      '<thead><tr><th>순위</th><th>키워드</th><th class="num">건수</th><th class="num">직전 ' + esc(label) + "</th><th>증감</th></tr></thead>" +
      "<tbody>" + body + "</tbody></table>");
  };

  // ── + 미분류 목록 ──────────────────────────────────────────────
  // el, topics가 빈 items → 미분류 목록 (분류 사전 보강 후보)
  ATM.renderUnclassified = function (el, items) {
    if (!items.length) { fill(el, '<p class="hint">미분류 기사가 없습니다.</p>'); return; }
    var rows = items.slice().sort(function (a, b) { return a.date < b.date ? 1 : a.date > b.date ? -1 : a.line - b.line; }).map(function (it) {
      return "<li>" + '<span class="when">' + esc(it.date) + "</span> " + link(it) + ' <span class="src">' + esc(it.source) + "</span></li>";
    }).join("");
    fill(el, '<p class="hint">' + items.length + "건 · 어느 주제 키워드에도 걸리지 않은 기사입니다. 분류해야 할 기사가 있으면 rules.js 주제 사전에 키워드를 더할 후보입니다.</p>" +
      '<ul class="unclassified-list">' + rows + "</ul>");
  };
})();
