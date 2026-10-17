// 연결 (공동): 입력 → A → B. 약속은 js/README.md
(function () {
  var $ = function (sel) { return document.querySelector(sel); };
  var state = { items: [], ranks: null, stats: null, baseDate: null, selected: [], window: "90d" };

  function status(msg) { $("#input-status").textContent = msg; }

  function topics() {
    return window.RULES && RULES.topics ? Object.keys(RULES.topics) : [];
  }

  function run() {
    if (!window.RULES) { status("rules.js가 아직 없습니다 (#5)."); return; }
    var text = $("#csv-input").value;
    if (!text.trim()) { status("CSV를 붙여 넣거나 파일을 고르세요."); return; }

    var parsed = ATM.parseCSV(text);
    var items = ATM.classify(parsed.rows, RULES);
    var baseDate = items.reduce(function (max, it) { return it.date > max ? it.date : max; }, "");
    var unclassified = items.filter(function (it) { return !it.topics || it.topics.length === 0; });

    state.items = items;
    state.baseDate = baseDate;
    state.stats = {
      total: items.length,
      classified: items.length - unclassified.length,
      unclassified: unclassified.length,
      skipped: parsed.skipped
    };
    state.ranks = ATM.keywordRanks(items, baseDate);

    ATM.renderSummary(state.stats);
    ATM.renderTopicCounts($("#topic-counts .slot"), items, topics(), onSelect);
    ATM.renderTrend($("#weekly-trend .slot"), items, topics(), state.selected, baseDate);
    ATM.renderGrid($("#importance-grid .slot"), items, topics());
    ATM.renderKeywordTable($("#keyword-table"), state.ranks[state.window]);
    ATM.renderUnclassified($("#unclassified .slot"), unclassified);

    $("#export-csv").disabled = $("#export-md").disabled = items.length === 0;
    status(items.length ? "기준일 " + baseDate + " · " + items.length + "건" : "분류된 결과가 없습니다 (js 1차 구현 전).");
  }

  // 막대를 누르면 그 주제를 추이에 켜고 끈다
  function onSelect(topic) {
    var i = state.selected.indexOf(topic);
    if (i >= 0) state.selected.splice(i, 1); else state.selected.push(topic);
    ATM.renderTrend($("#weekly-trend .slot"), state.items, topics(), state.selected, state.baseDate);
  }

  function download(name, text, type) {
    var url = URL.createObjectURL(new Blob([text], { type: type }));
    var a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  }

  $("#run").addEventListener("click", run);

  $("#load-example").addEventListener("click", function () {
    if (!window.EXAMPLE_CSV) { status("예시 입력이 아직 없습니다 (#6)."); return; }
    $("#csv-input").value = EXAMPLE_CSV;
    run();
  });

  $("#csv-file").addEventListener("change", function (e) {
    var file = e.target.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function () { $("#csv-input").value = reader.result; run(); };
    reader.readAsText(file, "utf-8");
  });

  document.querySelectorAll("#keyword-rank [role=tab]").forEach(function (tab) {
    tab.addEventListener("click", function () {
      document.querySelectorAll("#keyword-rank [role=tab]").forEach(function (t) {
        t.setAttribute("aria-selected", t === tab ? "true" : "false");
      });
      state.window = tab.dataset.window;
      if (state.ranks) ATM.renderKeywordTable($("#keyword-table"), state.ranks[state.window]);
    });
  });

  $("#export-csv").addEventListener("click", function () {
    download("ai-trend-" + state.baseDate + ".csv", ATM.toCSV(state.items), "text/csv;charset=utf-8");
  });
  $("#export-md").addEventListener("click", function () {
    download("ai-trend-" + state.baseDate + ".md", ATM.toMarkdown(state.items, state.ranks, state.stats), "text/markdown;charset=utf-8");
  });
})();
