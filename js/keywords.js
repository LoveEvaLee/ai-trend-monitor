// A · 키워드 추출·기간별 순위 (W8 · 유경). 약속은 js/README.md
// extractKeywords는 classify의 '비슷한 기사' 계산에 필요해서 W6에서 먼저 구현했다 (#12). keywordRanks는 W8.
window.ATM = window.ATM || {};

(function () {
  var HANGUL = /[가-힣]/;
  var HANGUL_ALL = /[가-힣]/g;
  var TOKEN = /[a-z0-9가-힣]+(?:[-.][a-z0-9가-힣]+)*/g;

  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

  // title, RULES → ["EU AI Act", ...] (한 기사 안에서 중복 없음). 규칙은 rules.js 맨 위 「4. 키워드」
  ATM.extractKeywords = function (title, rules) {
    var K = rules.keywords;
    var t = ATM.normalize(title);
    var out = [];
    function add(k) { if (out.indexOf(k) < 0) out.push(k); }

    // 1) 구를 긴 것부터 찾아 한 덩어리로 세고 제목에서 지운다
    K.phrases.slice().sort(function (a, b) { return b.length - a.length; }).forEach(function (p) {
      var pn = ATM.normalize(p);
      if (HANGUL.test(pn)) {
        if (t.indexOf(pn) >= 0) { add(p); t = t.split(pn).join(" "); }
      } else {
        var re = new RegExp("(^|[^a-z0-9.])" + esc(pn) + "(?=$|[^a-z])", "g");
        if (re.test(t)) { add(p); re.lastIndex = 0; t = t.replace(re, "$1 "); }
      }
    });

    // 2) 나머지 낱말
    var stopEn = K.stopwords.en.map(function (w) { return w.toLowerCase(); });
    var stopKo = K.stopwords.ko.map(function (w) { return w.toLowerCase(); });
    var particles = K.particles.slice().sort(function (a, b) { return b.length - a.length; });
    var dropEn = new RegExp(K.dropEnPattern);

    (t.match(TOKEN) || []).forEach(function (tok) {
      var w = tok;
      if (HANGUL.test(tok)) {
        for (var i = 0; i < particles.length; i++) {
          var pa = particles[i];
          if (w.length - pa.length >= K.minKo && w.slice(-pa.length) === pa) { w = w.slice(0, -pa.length); break; }
        }
        var syllables = (w.match(HANGUL_ALL) || []).length;
        var dropKo = K.dropKoEndings.some(function (e) { return w.slice(-e.length) === e; });
        if (syllables < K.minKo || stopKo.indexOf(w) >= 0 || dropKo) return;
      } else {
        if (!/[a-z]/.test(tok) || tok.length < K.minEn || stopEn.indexOf(tok) >= 0 || dropEn.test(tok)) return;
      }
      add(w);
    });
    return out;
  };

  // items, "YYYY-MM-DD" → { "90d" | "30d" | "7d" | "1d": { window, rank: [{ keyword, count, prev }] } }
  ATM.keywordRanks = function (items, baseDate) {
    // 2차에서 구현 (W8 · #14)
    var out = {};
    ["90d", "30d", "7d", "1d"].forEach(function (w) { out[w] = { window: w, rank: [] }; });
    return out;
  };
})();
