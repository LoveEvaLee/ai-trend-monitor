// rules.js — AI 동향 모니터의 판단 기준 (기획안 v3)
// 분류 · 등급 · 중요도 · 키워드 기준은 모두 이 파일에만 둔다. js 코드는 이 파일을 읽어 적용만 한다.
// 기준을 바꿀 때는 이 파일만 고치고 PR로 검토한다.
//
// 적용 방식 (classify.js · keywords.js가 따르는 약속)
// 1. 주제 분류
//    - 제목을 소문자로 바꾼 뒤 찾는다.
//    - en: 낱말 단위로 일치해야 센다 (예: 'eu'는 "statichost.eu"에 걸리지 않음). 구는 구 전체가 일치해야 함.
//    - ko: 제목 안에 그 글자가 들어 있으면 센다 (조사가 붙어도 걸림).
//    - exclude에 걸리면 그 주제는 붙이지 않는다.
//    - 한 기사에 여러 주제가 붙을 수 있다. 아무 주제도 안 붙으면 '미분류'.
//    - 주제별 개수는 주제마다 센다 (여러 주제가 붙은 기사는 각 주제에 한 번씩 → 합계가 총 건수보다 클 수 있음).
// 2. 출처 등급
//    - url의 호스트에서 'www.'를 떼고, sources의 domain과 같거나 그 하위 도메인이면 일치.
//    - 여러 줄이 맞으면 domain이 가장 긴 줄, 그다음 pathPrefix가 있는 줄이 이긴다.
//    - 어느 줄에도 안 맞으면 unknownGrade를 쓰고 '미등록 도메인' 목록에 띄운다.
// 3. 중요도 = 등급 가중치 × (1 + 비슷한 기사 수) × 최신성
//    - 비슷한 기사: 날짜가 같고, 주제가 하나 이상 같고, 추출 키워드가 similarMinShared개 이상 겹치는 다른 기사
//    - 최신성: 0.5 ^ (기준일과의 날짜 차 ÷ recencyHalfLifeDays). 기준일 = 입력 데이터의 마지막 날짜
// 4. 키워드
//    - phrases에 있는 구를 먼저 찾아 한 덩어리로 센다.
//    - 나머지 낱말: 한글은 particles의 조사를 한 번 떼고 minKo음절 이상, 영문은 소문자로 바꿔 minEn자 이상
//    - stopwords는 빼고, 한 기사 안에서 같은 키워드는 한 번만 센다 (문서 빈도).
//    - 기간: 기준일을 포함해 거꾸로 days일. 직전 기간 = 그 바로 앞 같은 길이.

window.RULES = {
  version: "0.1 (0단계 초안 · 2026-10-17)",

  // ── W2 · 주제 분류 사전 ────────────────────────────────────────────
  // 순서 = 화면 표시 순서. 경계는 기획안 v3 「주제 5개」 표를 따른다.
  topics: [
    {
      name: "AI 에이전트",
      // 에이전트 제품·프레임워크, 도구 호출, 에이전트 프로토콜. 모델 자체 출시는 파운데이션 모델로.
      en: ["ai agent", "ai agents", "agentic", "agent", "agents", "multi-agent", "coding agent",
           "computer use", "browser agent", "mcp", "model context protocol", "a2a", "tool calling", "tool use"],
      ko: ["에이전트", "에이전틱", "멀티에이전트", "도구 호출"],
      exclude: ["travel agent", "real estate agent", "secret agent", "free agent", "fbi agent", "insurance agent"]
    },
    {
      name: "AI 윤리·안전·거버넌스",
      // 편향·안전성·정렬, 법·규제, 정부·국제기구 가이드라인. 교육 현장의 윤리 교육은 리터러시·교육으로.
      en: ["ai safety", "safety", "ethics", "ethical", "bias", "biased", "alignment", "deepfake", "deepfakes",
           "misinformation", "disinformation", "guardrail", "guardrails", "regulation", "regulations",
           "regulator", "regulators", "regulatory", "ai act", "governance", "lawsuit", "copyright",
           "privacy", "executive order", "accountability", "transparency"],
      ko: ["윤리", "안전", "편향", "딥페이크", "허위정보", "가짜뉴스", "규제", "기본법", "법안", "입법",
           "거버넌스", "가이드라인", "저작권", "개인정보", "책임성", "투명성"],
      exclude: []
    },
    {
      name: "AI 리터러시·교육",
      // AI 활용 교육, 교사·학생의 AI 사용, 리터러시 측정. 'learning'은 머신러닝과 겹쳐서 넣지 않음.
      en: ["literacy", "education", "educational", "educator", "educators", "school", "schools", "student",
           "students", "teacher", "teachers", "classroom", "classrooms", "curriculum", "university",
           "universities", "edtech", "tutor", "tutoring"],
      ko: ["리터러시", "교육", "학교", "학생", "교사", "교실", "수업", "대학", "교과서", "디지털교과서", "에듀테크"],
      exclude: ["teacher model", "student model", "teacher-student"]
    },
    {
      name: "피지컬 AI·로보틱스",
      // 휴머노이드, 로봇 기초 모델, 자율주행·제조 현장 AI.
      en: ["robot", "robots", "robotic", "robotics", "humanoid", "humanoids", "physical ai", "embodied",
           "autonomous driving", "self-driving", "robotaxi", "robotaxis", "drone", "drones", "lerobot"],
      ko: ["로봇", "휴머노이드", "피지컬", "자율주행", "로보택시", "드론"],
      exclude: []
    },
    {
      name: "파운데이션 모델",
      // 상용·오픈 웨이트 모델의 출시, 성능·벤치마크, 가격·라이선스, 지원 중단. 모델을 쓴 응용 사례는 해당 응용 주제로.
      en: ["foundation model", "foundation models", "large language model", "large language models", "llm", "llms",
           "language model", "open-weight", "open weights", "gpt", "chatgpt", "claude", "gemini", "gemma",
           "llama", "qwen", "deepseek", "mistral", "grok", "kimi", "glm", "benchmark", "benchmarks"],
      ko: ["거대언어모델", "대규모 언어모델", "언어모델", "파운데이션 모델", "오픈소스 모델", "챗gpt", "챗GPT",
           "클로드", "제미나이", "딥시크", "큐원", "벤치마크"],
      exclude: []
    }
  ],

  // ── W3 · 출처 등급표 ──────────────────────────────────────────────
  // 기준: 기획안 v3 「출처 등급과 근거」 (AI부문_후보.md 부록의 A~D 루브릭)
  // oa: 원문을 무료로 볼 수 있으면 true. 유료 논문은 중요도 상위에 오르기 전에 사람이 확인한다.
  weights: { A: 3, B: 2, C: 1, D: 0.5 },
  unknownGrade: "C",

  sources: [
    // A · 동료심사 학술지·학회 (오픈 액세스)
    { domain: "aclanthology.org", type: "학회 논문", grade: "A", oa: true, reason: "ACL 계열 동료심사 학회 논문집 · 원문 무료" },
    { domain: "proceedings.mlr.press", type: "학회 논문", grade: "A", oa: true, reason: "PMLR(ICML 등) 동료심사 논문집 · 원문 무료" },
    { domain: "proceedings.neurips.cc", type: "학회 논문", grade: "A", oa: true, reason: "NeurIPS 동료심사 논문집 · 원문 무료" },
    { domain: "jmlr.org", type: "학술지", grade: "A", oa: true, reason: "JMLR 동료심사 학술지 · 원문 무료" },
    { domain: "openreview.net", type: "학회 논문", grade: "A", oa: true, reason: "ICLR 등 공개 심사 기록이 남는 학회 · 원문 무료 (심사 전 제출본도 있어 채택 여부 확인)" },
    { domain: "frontiersin.org", type: "학술지", grade: "A", oa: true, reason: "동료심사 오픈 액세스 학술지" },
    { domain: "mdpi.com", type: "학술지", grade: "A", oa: true, reason: "동료심사 오픈 액세스 학술지 · 학술지별 심사 수준 편차가 있어 확인 필요" },
    { domain: "plos.org", type: "학술지", grade: "A", oa: true, reason: "동료심사 오픈 액세스 학술지" },
    // A · 동료심사 학술지·학회 (원문 유료일 수 있음)
    { domain: "nature.com", type: "학술지", grade: "A", oa: false, reason: "동료심사 학술지 · 원문 유료인 경우 많음" },
    { domain: "science.org", type: "학술지", grade: "A", oa: false, reason: "동료심사 학술지 · 원문 유료" },
    { domain: "sciencedirect.com", type: "학술지", grade: "A", oa: false, reason: "Elsevier 동료심사 학술지 · 원문 유료인 경우 많음" },
    { domain: "link.springer.com", type: "학술지", grade: "A", oa: false, reason: "Springer 동료심사 학술지 · 원문 유료인 경우 많음" },
    { domain: "onlinelibrary.wiley.com", type: "학술지", grade: "A", oa: false, reason: "Wiley 동료심사 학술지 · 원문 유료인 경우 많음" },
    { domain: "ieeexplore.ieee.org", type: "학술지·학회", grade: "A", oa: false, reason: "IEEE 동료심사 논문 · 원문 유료인 경우 많음" },
    { domain: "dl.acm.org", type: "학술지·학회", grade: "A", oa: false, reason: "ACM 동료심사 논문 · 원문 유료인 경우 많음" },
    { domain: "eric.ed.gov", type: "정부 학술 DB", grade: "A", oa: false, reason: "미국 교육부 운영 교육 연구 DB · 원문 공개 여부는 문헌마다 다름" },
    // A · 정부·국제기구 1차 문서
    { domain: "europa.eu", type: "국제기구", grade: "A", oa: true, reason: "EU 기관 공식 문서 · 1차 자료" },
    { domain: "oecd.org", type: "국제기구", grade: "A", oa: true, reason: "OECD 공식 문서 · 1차 자료" },
    { domain: "oecd.ai", type: "국제기구", grade: "A", oa: true, reason: "OECD AI 정책 관측소 · 1차 자료" },
    { domain: "unesco.org", type: "국제기구", grade: "A", oa: true, reason: "UNESCO 공식 문서 · 1차 자료" },
    { domain: "nist.gov", type: "정부", grade: "A", oa: true, reason: "미국 표준기술연구소 공식 발표 · 1차 자료" },
    { domain: "federalregister.gov", type: "정부", grade: "A", oa: true, reason: "미국 관보 원문 · 1차 자료" },
    { domain: "whitehouse.gov", type: "정부", grade: "A", oa: true, reason: "미국 백악관 공식 발표 · 1차 자료" },
    { domain: "gov.uk", type: "정부", grade: "A", oa: true, reason: "영국 정부 공식 발표(AI Security Institute 포함) · 1차 자료" },
    { domain: "msit.go.kr", type: "정부", grade: "A", oa: true, reason: "과학기술정보통신부 보도자료 · 1차 자료" },
    { domain: "moe.go.kr", type: "정부", grade: "A", oa: true, reason: "교육부 보도자료 · 1차 자료" },
    { domain: "korea.kr", type: "정부", grade: "A", oa: true, reason: "대한민국 정책브리핑 · 정부 1차 자료" },
    { domain: "law.go.kr", type: "정부", grade: "A", oa: true, reason: "국가법령정보센터 법령 원문 · 1차 자료" },

    // B · 프리프린트
    { domain: "arxiv.org", type: "프리프린트", grade: "B", oa: true, reason: "심사 전 논문 · 원문 무료" },
    { domain: "huggingface.co", pathPrefix: "/papers", type: "프리프린트", grade: "B", oa: true, reason: "arXiv 논문 소개 페이지 · 원 논문은 심사 전" },
    { domain: "ssrn.com", type: "프리프린트", grade: "B", oa: true, reason: "심사 전 논문 · 사회과학 중심" },
    // B · 주요 언론 (해외)
    { domain: "reuters.com", type: "주요 언론", grade: "B", oa: true, reason: "통신사 · 편집 검증 있음" },
    { domain: "apnews.com", type: "주요 언론", grade: "B", oa: true, reason: "통신사 · 편집 검증 있음" },
    { domain: "bloomberg.com", type: "주요 언론", grade: "B", oa: false, reason: "경제 전문 언론 · 편집 검증 있음 · 유료 기사 있음" },
    { domain: "ft.com", type: "주요 언론", grade: "B", oa: false, reason: "경제 전문 언론 · 편집 검증 있음 · 유료" },
    { domain: "wsj.com", type: "주요 언론", grade: "B", oa: false, reason: "일간지 · 편집 검증 있음 · 유료" },
    { domain: "nytimes.com", type: "주요 언론", grade: "B", oa: false, reason: "일간지 · 편집 검증 있음 · 유료 기사 있음" },
    { domain: "washingtonpost.com", type: "주요 언론", grade: "B", oa: false, reason: "일간지 · 편집 검증 있음 · 유료 기사 있음" },
    { domain: "theguardian.com", type: "주요 언론", grade: "B", oa: true, reason: "일간지 · 편집 검증 있음" },
    { domain: "bbc.com", type: "주요 언론", grade: "B", oa: true, reason: "공영 방송 · 편집 검증 있음" },
    { domain: "bbc.co.uk", type: "주요 언론", grade: "B", oa: true, reason: "공영 방송 · 편집 검증 있음" },
    // B · 기술 전문 언론 (해외)
    { domain: "technologyreview.com", type: "전문 언론", grade: "B", oa: false, reason: "MIT 기술 전문지 · 편집 검증 있음 · 일부 유료" },
    { domain: "spectrum.ieee.org", type: "전문 언론", grade: "B", oa: true, reason: "IEEE 학회 매체 · 편집 검증 있음" },
    { domain: "theverge.com", type: "전문 언론", grade: "B", oa: true, reason: "기술 전문 언론 · 편집 검증 있음" },
    { domain: "arstechnica.com", type: "전문 언론", grade: "B", oa: true, reason: "기술 전문 언론 · 편집 검증 있음" },
    { domain: "wired.com", type: "전문 언론", grade: "B", oa: false, reason: "기술 전문 언론 · 편집 검증 있음 · 일부 유료" },
    { domain: "techcrunch.com", type: "전문 언론", grade: "B", oa: true, reason: "기술 산업 전문 언론 · 편집 검증 있음" },
    { domain: "thenewstack.io", type: "전문 언론", grade: "B", oa: true, reason: "개발·인프라 전문 언론 · 편집 검증 있음" },
    { domain: "therobotreport.com", type: "전문 언론", grade: "B", oa: true, reason: "로봇 산업 전문 언론 · 편집 검증 있음" },
    { domain: "edsurge.com", type: "전문 언론", grade: "B", oa: true, reason: "에듀테크 전문 언론 · 편집 검증 있음" },
    // B · 국내 언론
    { domain: "yna.co.kr", type: "주요 언론", grade: "B", oa: true, reason: "국가기간 통신사 · 편집 검증 있음" },
    { domain: "chosun.com", type: "주요 언론", grade: "B", oa: true, reason: "일간지(조선비즈 포함) · 편집 검증 있음" },
    { domain: "joongang.co.kr", type: "주요 언론", grade: "B", oa: true, reason: "일간지 · 편집 검증 있음" },
    { domain: "donga.com", type: "주요 언론", grade: "B", oa: true, reason: "일간지 · 편집 검증 있음" },
    { domain: "hani.co.kr", type: "주요 언론", grade: "B", oa: true, reason: "일간지 · 편집 검증 있음" },
    { domain: "khan.co.kr", type: "주요 언론", grade: "B", oa: true, reason: "일간지 · 편집 검증 있음" },
    { domain: "mk.co.kr", type: "주요 언론", grade: "B", oa: true, reason: "경제지 · 편집 검증 있음" },
    { domain: "hankyung.com", type: "주요 언론", grade: "B", oa: true, reason: "경제지 · 편집 검증 있음" },
    { domain: "etnews.com", type: "전문 언론", grade: "B", oa: true, reason: "IT 산업 전문지 · 편집 검증 있음" },
    { domain: "zdnet.co.kr", type: "전문 언론", grade: "B", oa: true, reason: "IT 전문 언론 · 편집 검증 있음" },
    { domain: "ddaily.co.kr", type: "전문 언론", grade: "B", oa: true, reason: "IT 전문 언론 · 편집 검증 있음" },
    { domain: "aitimes.com", type: "전문 언론", grade: "B", oa: true, reason: "AI 전문 언론 · 편집 검증 있음 · 보도자료 기반 기사 비중이 높음" },
    { domain: "irobotnews.com", type: "전문 언론", grade: "B", oa: true, reason: "로봇 전문 언론(로봇신문) · 편집 검증 있음" },
    { domain: "byline.network", type: "전문 언론", grade: "B", oa: true, reason: "IT 전문 언론 · 기획 기사 위주" },
    { domain: "bloter.net", type: "전문 언론", grade: "C", oa: true, reason: "IT 전문 매체 · 편집 검증 수준을 확인하지 못해 C로 둠 〔팀원 확인〕" },
    { domain: "techm.kr", type: "전문 언론", grade: "C", oa: true, reason: "IT 전문 매체 · 편집 검증 수준을 확인하지 못해 C로 둠 〔팀원 확인〕" },
    { domain: "edupress.kr", type: "전문 언론", grade: "C", oa: true, reason: "교육 전문 매체 · 규모가 작고 편집 검증 수준을 확인하지 못함" },

    // C · 기업 공식 블로그·발표 (자사 이해관계 있음)
    // 기획안은 모델 카드·기술 보고서를 B로 두지만, 같은 도메인에 블로그 글이 섞여 있어 도메인 기본값은 C.
    // 모델 카드·기술 보고서 경로가 확인되면 pathPrefix 줄을 B로 추가한다 〔팀원 확인〕
    { domain: "openai.com", type: "기업 발표", grade: "C", oa: true, reason: "자사 제품·연구 1차 발표 · 자사 이해관계" },
    { domain: "anthropic.com", type: "기업 발표", grade: "C", oa: true, reason: "자사 제품·연구 1차 발표 · 자사 이해관계" },
    { domain: "deepmind.google", type: "기업 발표", grade: "C", oa: true, reason: "자사 연구 1차 발표 · 자사 이해관계" },
    { domain: "blog.google", type: "기업 발표", grade: "C", oa: true, reason: "자사 제품 발표 · 자사 이해관계" },
    { domain: "ai.meta.com", type: "기업 발표", grade: "C", oa: true, reason: "자사 연구 1차 발표 · 자사 이해관계" },
    { domain: "huggingface.co", type: "기업 발표·모델 저장소", grade: "C", oa: true, reason: "블로그·모델 카드 · 자사·작성자 이해관계" },
    { domain: "github.blog", type: "기업 발표", grade: "C", oa: true, reason: "자사 제품 발표 · 자사 이해관계" },
    { domain: "nvidia.com", type: "기업 발표", grade: "C", oa: true, reason: "자사 제품 발표 · 자사 이해관계" },
    // C · 전문가 뉴스레터 · 코드 저장소
    { domain: "latent.space", type: "전문가 뉴스레터", grade: "C", oa: true, reason: "실무 전문가 뉴스레터 · 검증 절차 없음" },
    { domain: "substack.com", type: "전문가 뉴스레터", grade: "C", oa: true, reason: "개인 뉴스레터 · 저자 전문성은 글마다 확인" },
    { domain: "github.com", type: "코드 저장소", grade: "C", oa: true, reason: "1차 산출물이지만 설명은 작성자 자기신고" },

    // D · 커뮤니티 원글 (관심도 신호로만 씀)
    { domain: "news.ycombinator.com", type: "커뮤니티", grade: "D", oa: true, reason: "누구나 쓸 수 있고 사실 확인이 없음" },
    { domain: "reddit.com", type: "커뮤니티", grade: "D", oa: true, reason: "누구나 쓸 수 있고 사실 확인이 없음" },
    { domain: "producthunt.com", type: "커뮤니티", grade: "D", oa: true, reason: "제품 등록·홍보 플랫폼 · 사실 확인 없음" },
    { domain: "news.hada.io", type: "커뮤니티", grade: "D", oa: true, reason: "국내 개발자 커뮤니티(GeekNews) · 사실 확인 없음" },
    { domain: "x.com", type: "커뮤니티", grade: "D", oa: true, reason: "개인 게시물 · 사실 확인 없음" },
    { domain: "twitter.com", type: "커뮤니티", grade: "D", oa: true, reason: "개인 게시물 · 사실 확인 없음" },
    { domain: "medium.com", type: "커뮤니티", grade: "D", oa: true, reason: "누구나 쓸 수 있는 블로그 플랫폼 · 저자 전문성 확인 어려움" }
  ],

  // ── 중요도 ─────────────────────────────────────────────────────────
  // 〔사람이 정할 것〕 아래 값은 초안. 바꾸면 기대값(data/expected.md)도 다시 계산한다.
  importance: {
    similarMinShared: 2,      // 같은 사건으로 볼 최소 겹침 키워드 수
    recencyHalfLifeDays: 14,  // 14일 지나면 최신성이 절반
    topN: 5                   // 주제 카드마다 보여 줄 건수
  },

  // ── 키워드 ─────────────────────────────────────────────────────────
  keywords: {
    windows: [
      { id: "90d", label: "90일", days: 90 },
      { id: "30d", label: "30일", days: 30 },
      { id: "7d", label: "7일", days: 7 },
      { id: "1d", label: "전날", days: 1 }
    ],
    topN: 10,
    minKo: 2,
    minEn: 3,
    // 한 덩어리로 셀 구 (긴 구부터 찾음)
    phrases: [
      "EU AI Act", "AI Act", "AI 기본법", "AI agent", "AI agents", "AI 에이전트", "agentic AI",
      "physical AI", "피지컬 AI", "embodied AI", "humanoid robot", "휴머노이드 로봇", "large language model",
      "거대언어모델", "foundation model", "open-weight", "AI safety", "AI literacy", "AI 리터러시",
      "AI 교육", "디지털교과서", "model context protocol", "computer use", "self-driving", "자율주행"
    ],
    // 떼어 낼 한글 조사 (긴 것부터)
    particles: ["으로서", "으로써", "에서는", "에게서", "이라고", "으로", "에서", "에게", "까지", "부터", "보다",
                "처럼", "이다", "라고", "은", "는", "이", "가", "을", "를", "의", "에", "와", "과", "도", "로", "만"],
    stopwords: {
      en: ["the", "and", "for", "with", "from", "that", "this", "are", "was", "were", "has", "have", "how",
           "what", "why", "who", "when", "will", "can", "its", "into", "about", "after", "over", "new", "says",
           "said", "more", "than", "you", "your", "our", "their", "not", "now", "just", "use", "using", "via",
           "ai", "artificial", "intelligence"],
      ko: ["인공지능", "AI", "기자", "발표", "공개", "출시", "관련", "위한", "대한", "통해", "있는", "하는", "했다",
           "한다", "된다", "이번", "올해", "지난", "오늘", "국내", "세계", "글로벌", "기업", "업계", "시장"]
    }
  }
};
