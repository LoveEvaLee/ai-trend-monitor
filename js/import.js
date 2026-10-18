// A · CSV 읽기·점검 (W6 · 유경). 약속은 js/README.md
window.ATM = window.ATM || {};

(function () {

// text → { rows: [{ line, date, title, url, source }], skipped: [{ line, reason }] }
// - 첫 줄은 머리글(date,title,url,source)로 보고 건너뛴다. line은 그 줄이 시작하는 원본 줄 번호(머리글 = 1)
// - 큰따옴표로 감싼 칸 안의 쉼표·줄바꿈은 칸 구분으로 보지 않는다. 칸 안의 ""는 " 하나 (RFC 4180)
// - 빈 줄, 날짜 칸이 빈 줄은 rows에 넣지 않고 skipped에 줄 번호와 이유를 남긴다
ATM.parseCSV = function (text) {
  var records = readRecords(String(text || "").replace(/^\uFEFF/, ""));
  var rows = [], skipped = [];

  records.slice(1).forEach(function (rec) {
    var f = rec.fields;
    var empty = f.every(function (c) { return c.trim() === ""; });
    if (empty) { skipped.push({ line: rec.line, reason: "빈 줄" }); return; }
    var date = (f[0] || "").trim();
    if (!date) { skipped.push({ line: rec.line, reason: "날짜 없음" }); return; }
    rows.push({
      line: rec.line,
      date: date,
      title: (f[1] || "").trim(),
      url: (f[2] || "").trim(),
      source: (f[3] || "").trim()
    });
  });

  return { rows: rows, skipped: skipped };
};

// 문자열 → [{ line, fields }]. 따옴표 안이 아닌 줄바꿈에서 레코드를 끊는다
function readRecords(s) {
  var out = [], fields = [], cell = "";
  var line = 1, start = 1, quoted = false;
  for (var i = 0; i < s.length; i++) {
    var ch = s[i];
    if (quoted) {
      if (ch === '"') {
        if (s[i + 1] === '"') { cell += '"'; i++; } else { quoted = false; }
      } else {
        if (ch === "\n") line++;
        cell += ch;
      }
      continue;
    }
    if (ch === '"' && cell === "") { quoted = true; }
    else if (ch === ",") { fields.push(cell); cell = ""; }
    else if (ch === "\r") { /* CRLF의 CR은 버림 */ }
    else if (ch === "\n") {
      fields.push(cell);
      out.push({ line: start, fields: fields });
      fields = []; cell = ""; line++; start = line;
    }
    else { cell += ch; }
  }
  // 마지막 줄 (파일 끝에 줄바꿈이 없을 때)
  if (cell !== "" || fields.length) { fields.push(cell); out.push({ line: start, fields: fields }); }
  return out;
}
})();
