# js 함수 약속 (W1 · #4)

1차(W6 · W7)에서 A와 B가 이 약속을 따라 각자 파일을 채운다. 바꾸고 싶으면 PR로 이 문서부터 고친다.

- `index.html`을 더블클릭해서 열어도 돌아가야 하므로 ES 모듈(`import`/`export`)은 쓰지 않는다. 각 파일은 전역 이름공간 `window.ATM`에 함수를 붙인다.
- 불러오는 순서: `rules.js` → `data/example.js` → A(`import` · `classify` · `keywords`) → B(`charts` · `grid` · `export`) → `app.js`
- 지금 각 파일에는 빈 결과를 돌려주는 자리 함수만 있다. 이름과 입력·출력 모양은 그대로 두고 속을 채운다.

## 공통 입력

| 이름 | 파일 | 모양 |
|---|---|---|
| `window.RULES` | `rules.js` (#5) | 아래 「RULES 모양 제안」 |
| `window.EXAMPLE_CSV` | `data/example.js` (#6) | `data/example.csv`와 같은 내용을 담은 문자열 |

## A · 데이터 처리

| 함수 | 파일 | 입력 | 출력 |
|---|---|---|---|
| `ATM.parseCSV(text)` | `js/import.js` | CSV 문자열 | `{ rows: [{ line, date, title, url, source }], skipped: [{ line, reason }] }`<br>`line`은 원본 줄 번호(머리글 = 1). 빈 줄·날짜 없는 줄은 `skipped`로 |
| `ATM.classify(rows, rules)` | `js/classify.js` | `parseCSV`의 `rows` · `RULES` | `items` 배열. 한 건 = 기획안의 「A → B로 넘길 결과 한 건」<br>`{ date, title, url, source, grade, gradeReason, topics, keywords, score }`<br>어느 주제에도 안 걸리면 `topics: []` |
| `ATM.extractKeywords(title, rules)` | `js/keywords.js` | 제목 · `RULES` | `["EU AI Act", "표시 의무"]` 같은 키워드 배열 (한 기사 안에서 중복 없음). `classify`가 불러 씀 |
| `ATM.keywordRanks(items, baseDate)` | `js/keywords.js` | `items` · 기준일 `"YYYY-MM-DD"` | `{ "90d": {...}, "30d": {...}, "7d": {...}, "1d": {...} }`<br>각 값 = `{ window: "7d", rank: [{ keyword, count, prev }] }` 상위 10개 |

기준일(`baseDate`)은 `app.js`가 `items`의 가장 늦은 날짜로 정해서 넘긴다.

## B · 화면

| 함수 | 파일 | 입력 | 하는 일 |
|---|---|---|---|
| `ATM.renderSummary(stats)` | `js/charts.js` | `{ total, classified, unclassified, skipped: [{ line, reason }] }` | `#stat-total` 등 숫자 4칸과 `#skipped-lines`(건너뛴 줄 번호) 채우기 |
| `ATM.renderTopicCounts(el, items, topics, onSelect)` | `js/charts.js` | `#topic-counts .slot` · `items` · 주제 이름 배열 · 막대를 눌렀을 때 부를 함수 `onSelect(topic)` | 가로 막대 5개 + 미분류 |
| `ATM.renderTrend(el, items, topics, selected, baseDate)` | `js/charts.js` | `#weekly-trend .slot` · … · 선택된 주제 배열 | 주별 꺾은선 |
| `ATM.renderGrid(el, items, topics)` | `js/grid.js` | `#importance-grid .slot` | 주제 카드 5장, 카드마다 `score` 상위 5건 |
| `ATM.renderKeywordTable(el, rank)` | `js/grid.js` | `#keyword-table` · `keywordRanks(...)["7d"]` 같은 값 하나 | 키워드 · 건수 · 증감 표. 탭 전환은 `app.js`가 함 |
| `ATM.renderUnclassified(el, items)` | `js/grid.js` | `#unclassified .slot` · `topics`가 빈 `items` | 미분류 목록 |
| `ATM.toCSV(items)` | `js/export.js` | `items` | CSV 문자열. 다시 넣으면 같은 결과가 나와야 함(완료 기준 5) |
| `ATM.toMarkdown(items, ranks, stats)` | `js/export.js` | … | 마크다운 문자열 |

파일 저장(다운로드)과 버튼 연결은 `app.js`가 한다.

## RULES 모양 제안 (#5에서 확정)

```js
window.RULES = {
  topics: {                       // 주제 이름 → 한·영 키워드
    "AI 에이전트": ["에이전트", "agent", "MCP"],
    // … 5개
  },
  sources: [                      // 출처 등급표 (기획안 「출처 등급과 근거」)
    { domain: "arxiv.org", type: "프리프린트", grade: "B", oa: true, reason: "심사 전 논문 · 원문 무료" }
  ],
  gradeWeight: { A: 3, B: 2, C: 1, D: 0.5 },
  score: { overlap: 2, recencyDays: 30 },   // 겹침 기준 · 최신성 감소 폭 〔사람이 정할 것〕
  keywords: {
    phrases: ["EU AI Act", "AI 기본법", "휴머노이드"],
    stopwords: ["AI", "인공지능", "발표", "공개"]
  }
};
```

`app.js`는 주제 순서를 `Object.keys(RULES.topics)`로 읽는다.
