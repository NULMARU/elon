/**
 * ai.js — 외부 AI/API 연동 모듈
 * - Gemini (Google AI Studio): AI 학습 카드 생성 / 문맥 단어 뜻 / 관심분야 추천 자료 생성
 * - youtubetotext.ai: 유튜브 자막 추출 (비동기 작업 생성 → 폴링)
 *
 * API 키는 앱 설정 화면에서 입력하며 이 기기 브라우저(localStorage)에만 저장됩니다.
 */
window.YHAI = (() => {

  // ───────────────────────────────────────────────
  // 공통 유틸
  // ───────────────────────────────────────────────
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  function isYoutubeUrl(url) {
    return /(?:youtube\.com\/(?:watch|shorts|live|embed)|youtu\.be\/)/i.test(String(url || ""));
  }

  function youtubeVideoId(url) {
    const m = String(url || "").match(/(?:v=|youtu\.be\/|shorts\/|live\/|embed\/)([A-Za-z0-9_-]{6,})/);
    return m ? m[1] : "";
  }

  // 모델 응답에서 JSON만 안전하게 추출 (코드펜스/앞뒤 잡음 제거)
  function parseJsonLoose(text) {
    let s = String(text || "").trim();
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    try { return JSON.parse(s); } catch (e) { /* 계속 */ }

    const firstArr = s.indexOf("[");
    const firstObj = s.indexOf("{");
    let start = -1;
    if (firstArr >= 0 && (firstObj < 0 || firstArr < firstObj)) start = firstArr;
    else if (firstObj >= 0) start = firstObj;
    if (start < 0) throw new Error("AI 응답에서 JSON을 찾지 못했습니다.");

    const open = s[start];
    const close = open === "[" ? "]" : "}";
    const end = s.lastIndexOf(close);
    if (end <= start) throw new Error("AI 응답 JSON이 불완전합니다.");
    return JSON.parse(s.slice(start, end + 1));
  }

  // ───────────────────────────────────────────────
  // Gemini (Google AI Studio) 클라이언트
  // ───────────────────────────────────────────────
  const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";
  // 앞 모델부터 시도하고, 사용 불가(404 등)이면 다음 모델로 폴백
  const GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"];

  async function geminiRequest(apiKey, prompt, options = {}) {
    const { temperature = 0.4, maxOutputTokens = 24576 } = options;
    if (!apiKey) throw new Error("Gemini API 키가 없습니다. 설정에서 입력해 주세요.");

    let lastError = null;
    for (const model of GEMINI_MODELS) {
      const generationConfig = {
        temperature,
        maxOutputTokens,
        responseMimeType: "application/json"
      };
      // 2.5 계열은 thinking 기본 활성 → 학습 카드 변환에는 불필요하므로 꺼서 비용/지연 절감
      if (/^gemini-2\.5/.test(model)) {
        generationConfig.thinkingConfig = { thinkingBudget: 0 };
      }

      let res;
      try {
        res = await fetch(`${GEMINI_BASE}/${model}:generateContent`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig
          })
        });
      } catch (e) {
        throw new Error("Gemini API에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.");
      }

      if (res.status === 400 || res.status === 401 || res.status === 403) {
        let detail = "";
        try { detail = (await res.json())?.error?.message || ""; } catch (e) { /* 무시 */ }
        if (/API key/i.test(detail) || res.status === 401 || res.status === 403) {
          throw new Error("Gemini API 키가 올바르지 않거나 권한이 없습니다. 설정에서 키를 확인해 주세요.");
        }
        lastError = new Error(`Gemini 요청 오류 (${model}): ${detail || res.status}`);
        continue;
      }
      if (res.status === 429) {
        throw new Error("Gemini API 사용량 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.");
      }
      if (!res.ok) {
        lastError = new Error(`Gemini 요청 실패 (${model}, HTTP ${res.status})`);
        continue;
      }

      const data = await res.json();
      const text = (data?.candidates?.[0]?.content?.parts || [])
        .map(p => p.text || "")
        .join("");
      if (!text.trim()) {
        lastError = new Error("Gemini 응답이 비어 있습니다. 다시 시도해 주세요.");
        continue;
      }
      return text;
    }
    throw lastError || new Error("Gemini 요청에 실패했습니다.");
  }

  // ── 카드 생성 프롬프트 ──
  const DENSITY_RULE = {
    auto: `카드 분량은 글 전체의 맥락과 학습 효율을 보고 당신이 스스로 결정합니다.
   - 하나의 카드는 반드시 하나의 생각/의미 단위가 완결되게 합니다 (문장 중간이나 논리 흐름 중간에서 끊지 않음).
   - 짧고 쉬운 문장들이 같은 흐름이면 2~3개를 하나의 카드로 묶고, 길고 복잡한 문장은 단독 카드로 둡니다.
   - 대체로 카드 하나에 15~45단어가 되도록 하되, 의미 단위 완결이 단어 수보다 우선입니다.
   - 대화문이면 화자의 발화(turn) 단위를 존중합니다.`,
    short: "카드 하나는 짧은 문장 1개(대략 8~16단어)로 만듭니다. 긴 문장은 의미가 끊기지 않는 절 단위로 나눕니다.",
    medium: "카드 하나는 1~2문장(대략 18~30단어)으로 만듭니다. 짧은 문장은 같은 흐름의 옆 문장과 묶습니다.",
    long: "카드 하나는 2~3문장(대략 30~50단어)의 문단 단위로 만듭니다. 하나의 생각 흐름이 카드 안에서 완결되게 합니다."
  };

  const LEVEL_RULE = {
    beginner: "학습자는 초급입니다. 번역은 아주 쉽게, 단어 설명은 기초 단어까지 포함하고, structure 해설은 어순 중심으로 친절하게 써 주세요.",
    intermediate: "학습자는 중급입니다. 중학~고교 수준을 넘는 단어와 구문 위주로 설명해 주세요.",
    advanced: "학습자는 고급입니다. 어려운 단어, 관용 표현, 뉘앙스 차이 위주로 간결하게 설명해 주세요."
  };

  function buildCardPrompt(text, density, level) {
    return `당신은 한국인 학습자를 위한 영어 독해 교재 편집자입니다.
아래 [원문]을 영어 독해 학습 카드로 변환해 주세요.

규칙:
1. ${DENSITY_RULE[density] || DENSITY_RULE.auto}
2. ${LEVEL_RULE[level] || LEVEL_RULE.intermediate}
3. 영어 원문 문장은 바꾸지 말고 그대로 사용합니다. 단, 유튜브 자막 특유의 오타·대소문자·문장부호 누락은 자연스럽게 교정합니다.
4. 광고, 메뉴, 구독 요청, 타임스탬프, 채널 소개 등 학습 가치가 없는 텍스트는 카드에서 제외합니다.
5. 화자가 구분되는 대화/인터뷰이면 "speaker"에 화자 이름을 넣고, 일반 글이면 "Narrator"로 합니다.
6. "ko"는 자연스러운 한국어 번역으로, 의역하되 영어 문장 구조를 따라갈 수 있게 씁니다.
7. "words"는 이 문맥에서 중요한 단어/표현 3~6개입니다. meaning은 반드시 이 문맥에서의 뜻을 한국어로 씁니다. 너무 쉬운 단어(the, have, go 등)는 제외합니다.
8. "structure"는 문장을 직독직해 순서(끊어읽기)로 짧게 해설합니다. 단순한 문장이면 빈 문자열("")로 둡니다.
9. "mustMemorize"는 회화나 작문에 재사용할 만한 핵심 표현 1~2개와 뜻입니다. 없으면 빈 문자열("")로 둡니다.

출력은 아래 형식의 JSON만 출력하세요. 다른 텍스트는 쓰지 마세요.
{
  "title": "이 자료 전체를 요약하는 짧은 한국어 제목 (15자 이내)",
  "cards": [
    {
      "speaker": "화자 또는 Narrator",
      "en": "영어 원문",
      "ko": "한국어 번역",
      "words": [{"word": "단어/표현", "meaning": "문맥상 한국어 뜻"}],
      "structure": "직독직해 해설 또는 빈 문자열",
      "mustMemorize": "핵심 표현 설명 또는 빈 문자열"
    }
  ]
}

[원문]
${text}`;
  }

  // 긴 원문을 문단 경계에서 배치로 분할 (Gemini 1회 요청 입력 한도/품질 관리)
  function splitIntoBatches(text, maxChars) {
    const paragraphs = String(text || "").split(/\n{2,}/);
    const batches = [];
    let current = "";
    paragraphs.forEach(p => {
      const piece = p.trim();
      if (!piece) return;
      if (current && (current.length + piece.length + 2) > maxChars) {
        batches.push(current);
        current = piece;
      } else {
        current = current ? `${current}\n\n${piece}` : piece;
      }
      // 문단 하나가 한도보다 훨씬 길면 문장 경계 근처에서 강제 분할
      while (current.length > maxChars * 1.4) {
        let cut = current.lastIndexOf(". ", maxChars);
        if (cut < maxChars * 0.4) cut = maxChars;
        batches.push(current.slice(0, cut + 1).trim());
        current = current.slice(cut + 1).trim();
      }
    });
    if (current) batches.push(current);
    return batches.length ? batches : [String(text || "").trim()];
  }

  function normalizeAICards(rawCards) {
    if (!Array.isArray(rawCards)) return [];
    return rawCards
      .map(item => {
        const en = String(item?.en || "").replace(/\s+/g, " ").trim();
        const ko = String(item?.ko || "").replace(/\s+/g, " ").trim();
        if (!en || !/[A-Za-z]{2,}/.test(en)) return null;

        const words = Array.isArray(item.words)
          ? item.words
              .map(w => ({
                word: String(w?.word || "").trim(),
                meaning: String(w?.meaning || "").trim()
              }))
              .filter(w => w.word && w.meaning)
              .slice(0, 8)
          : [];

        const structure = String(item?.structure || "").trim();
        const mustMemorize = String(item?.mustMemorize || "").trim();

        const notes = {};
        if (words.length > 0) notes.words = words;
        if (structure) notes.structure = structure;
        if (mustMemorize) notes.mustMemorize = mustMemorize;

        return {
          speaker: String(item?.speaker || "Narrator").trim() || "Narrator",
          en,
          ko: ko || "번역 없음",
          notes: Object.keys(notes).length > 0 ? notes : null
        };
      })
      .filter(Boolean);
  }

  /**
   * 영문 텍스트 → AI 학습 카드
   * @returns {Promise<{title: string, cards: Array}>}
   */
  async function generateCards(text, { apiKey, density = "auto", level = "intermediate", onProgress } = {}) {
    const batches = splitIntoBatches(text, 6500);
    const allCards = [];
    let title = "";

    for (let i = 0; i < batches.length; i++) {
      if (typeof onProgress === "function") {
        onProgress(batches.length > 1
          ? `AI 카드 생성 중… (${i + 1}/${batches.length} 구간)`
          : "AI 카드 생성 중…");
      }
      const raw = await geminiRequest(apiKey, buildCardPrompt(batches[i], density, level));
      const parsed = parseJsonLoose(raw);
      const cards = normalizeAICards(Array.isArray(parsed) ? parsed : parsed?.cards);
      if (!title && parsed?.title) title = String(parsed.title).trim();
      allCards.push(...cards);
    }

    if (allCards.length === 0) {
      throw new Error("AI가 학습 카드를 만들지 못했습니다. 원문에 영어 문장이 있는지 확인해 주세요.");
    }
    return { title: title || "AI 학습 카드", cards: allCards };
  }

  /**
   * 관심분야 기반 추천 학습 자료 생성
   * @returns {Promise<{title: string, cards: Array}>}
   */
  async function generateRecommended({ apiKey, interests, level = "intermediate", density = "auto", recentTopics = [], onProgress } = {}) {
    if (typeof onProgress === "function") onProgress("관심분야 학습 글을 만드는 중…");

    const levelText = {
      beginner: "초급 (쉬운 단어, 짧은 문장 위주)",
      intermediate: "중급 (일반 기사/인터뷰 수준)",
      advanced: "고급 (원어민 칼럼 수준, 관용 표현 포함)"
    }[level] || "중급";

    const avoid = recentTopics.length > 0
      ? `\n- 최근에 이미 다룬 주제(${recentTopics.join(", ")})와는 겹치지 않는 새로운 소재를 고르세요.`
      : "";

    const prompt = `당신은 한국인 학습자를 위한 영어 독해 교재 저자입니다.
학습자의 관심분야: ${interests}
학습자의 영어 수준: ${levelText}

위 관심분야에서 오늘 읽기 좋은 소재를 하나 골라, 영어 독해 학습용 글을 직접 작성해 주세요.
- 글은 10~14문장의 자연스러운 영어 산문으로, 실제 기사/에세이처럼 씁니다.
- 학습 가치가 높은 표현(자주 쓰이는 구문, 콜로케이션)을 의도적으로 포함합니다.${avoid}

그 다음, 작성한 글을 학습 카드로 변환합니다.
${DENSITY_RULE[density] || DENSITY_RULE.auto}
${LEVEL_RULE[level] || LEVEL_RULE.intermediate}

각 카드: "speaker"는 "Narrator", "en" 영어 원문, "ko" 자연스러운 한국어 번역,
"words" 문맥상 핵심 단어 3~6개 [{"word","meaning"}], "structure" 직독직해 해설(단순하면 ""),
"mustMemorize" 재사용할 핵심 표현 1~2개(없으면 "").

출력은 아래 형식의 JSON만 출력하세요.
{
  "title": "짧은 한국어 제목 (15자 이내)",
  "cards": [ { "speaker": "...", "en": "...", "ko": "...", "words": [...], "structure": "...", "mustMemorize": "..." } ]
}`;

    const raw = await geminiRequest(apiKey, prompt, { temperature: 0.9 });
    const parsed = parseJsonLoose(raw);
    const cards = normalizeAICards(parsed?.cards);
    if (cards.length === 0) throw new Error("추천 자료 생성에 실패했습니다. 다시 시도해 주세요.");
    return { title: String(parsed?.title || "AI 추천 자료").trim(), cards };
  }

  /**
   * 문맥 안에서의 단어 뜻 설명 (단어 팝업용)
   * @returns {Promise<{meaning: string, note: string}>}
   */
  async function explainWordInContext(word, sentence, { apiKey } = {}) {
    const prompt = `영어 문장: "${sentence}"
이 문장에서 "${word}"의 뜻을 한국인 학습자에게 설명해 주세요.

JSON만 출력:
{
  "meaning": "이 문맥에서의 한국어 뜻 (품사 포함, 한 줄)",
  "note": "발음 팁, 자주 쓰이는 형태, 비슷한 표현 등 도움말 한두 문장 (없으면 빈 문자열)"
}`;
    const raw = await geminiRequest(apiKey, prompt, { temperature: 0.2, maxOutputTokens: 2048 });
    const parsed = parseJsonLoose(raw);
    return {
      meaning: String(parsed?.meaning || "").trim(),
      note: String(parsed?.note || "").trim()
    };
  }

  // ───────────────────────────────────────────────
  // youtubetotext.ai 클라이언트 (비동기 작업 → 폴링)
  // ───────────────────────────────────────────────
  const YTT_BASE = "https://api.youtubetotext.ai/v1/api";
  const YTT_STATE_LABEL = {
    waiting: "대기 중",
    preparing: "준비 중",
    downloading: "영상 불러오는 중",
    converting: "변환 중",
    uploading: "업로드 중",
    processing: "음성 인식 중",
    aligning: "문장 정렬 중"
  };

  /**
   * 유튜브 URL → 자막 텍스트
   * @returns {Promise<{text: string, videoId: string}>}
   */
  async function fetchYoutubeTranscript(url, { apiKey, onProgress } = {}) {
    if (!apiKey) throw new Error("youtubetotext.ai API 키가 없습니다. 설정에서 입력해 주세요.");

    let res;
    try {
      res = await fetch(`${YTT_BASE}/transcribe`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ url, type: "transcript", verbatim: false })
      });
    } catch (e) {
      throw new Error("youtubetotext.ai에 연결하지 못했습니다 (네트워크 또는 CORS 차단). 사이트에서 자막을 복사해 텍스트칸에 붙여넣는 방법을 사용해 주세요.");
    }

    if (res.status === 401 || res.status === 403) {
      throw new Error("youtubetotext.ai API 키가 올바르지 않습니다. 설정에서 키를 확인해 주세요.");
    }
    if (res.status === 402 || res.status === 429) {
      throw new Error("youtubetotext.ai 크레딧/사용량 한도에 도달했습니다. 플랜을 확인해 주세요.");
    }
    if (!res.ok) throw new Error(`유튜브 자막 요청 실패 (HTTP ${res.status})`);

    const job = await res.json();
    const jobId = job?.id;
    if (!jobId) throw new Error("자막 작업 ID를 받지 못했습니다.");

    const startedAt = Date.now();
    const TIMEOUT_MS = 10 * 60 * 1000;
    let pollFailures = 0;

    while (Date.now() - startedAt < TIMEOUT_MS) {
      await sleep(2500);

      let poll;
      try {
        poll = await fetch(`${YTT_BASE}/transcription/${jobId}`, {
          headers: { "Authorization": `Bearer ${apiKey}` }
        });
      } catch (e) {
        if (++pollFailures >= 5) throw new Error("자막 작업 상태 확인에 반복 실패했습니다. 네트워크를 확인해 주세요.");
        continue;
      }
      if (!poll.ok) {
        if (++pollFailures >= 5) throw new Error(`자막 작업 상태 확인 실패 (HTTP ${poll.status})`);
        continue;
      }
      pollFailures = 0;

      const status = await poll.json();
      if (status.state === "done") {
        const text = String(status.txt || "").trim();
        if (!text) throw new Error("자막이 비어 있습니다. 해당 영상에 인식 가능한 음성이 없을 수 있습니다.");
        return { text, videoId: youtubeVideoId(url) };
      }
      if (status.state === "failed") {
        throw new Error(`유튜브 자막 생성 실패: ${status.error || "알 수 없는 오류"}`);
      }
      if (typeof onProgress === "function") {
        const label = YTT_STATE_LABEL[status.state] || status.state;
        const pct = Number(status.progress) || 0;
        onProgress(`유튜브 자막 생성 중 — ${label}${pct > 0 ? ` (${pct}%)` : ""}`);
      }
    }
    throw new Error("자막 생성 시간이 초과되었습니다 (10분). 긴 영상은 나중에 다시 시도해 주세요.");
  }

  // ───────────────────────────────────────────────
  // ElevenLabs TTS 클라이언트 (원어민급 음성 합성)
  // ───────────────────────────────────────────────
  const ELEVEN_BASE = "https://api.elevenlabs.io/v1";
  // 기본 음성: Rachel (차분한 미국식 여성 — ElevenLabs 기본 제공)
  const ELEVEN_DEFAULT_VOICE = "21m00Tcm4TlvDq8ikWAM";
  // turbo v2.5: multilingual v2 대비 절반 크레딧, 짧은 문장 학습용으로 충분한 품질
  const ELEVEN_MODEL = "eleven_turbo_v2_5";

  function elevenError(status, detail) {
    const extra = detail ? ` — ${detail}` : "";
    if (status === 401 || status === 403) {
      return new Error(`API 키 인증/권한 오류 (HTTP ${status})${extra}. 키가 권한 제한(scoped) 키라면 ElevenLabs에서 'Voices: Read' 권한을 켜 주세요.`);
    }
    if (status === 402 || status === 429) return new Error(`크레딧/사용량 한도 도달 (HTTP ${status})${extra}`);
    return new Error(`요청 실패 (HTTP ${status})${extra}`);
  }

  // ElevenLabs 기본 제공(premade) 목소리 — 모든 계정에서 사용 가능, 목록 API가 막혀도 이 ID로 재생 가능
  const ELEVEN_PREMADE_VOICES = [
    { voiceId: "21m00Tcm4TlvDq8ikWAM", name: "Rachel", labels: "여, 미국, 차분" },
    { voiceId: "EXAVITQu4vr4xnSDxMaL", name: "Sarah", labels: "여, 미국, 부드러움" },
    { voiceId: "9BWtsMINqrJLrRacOk9x", name: "Aria", labels: "여, 미국, 허스키" },
    { voiceId: "FGY2WhTYpPnrIDTdsKH5", name: "Laura", labels: "여, 미국, 발랄" },
    { voiceId: "cgSgspJ2msm6clMCkdW9", name: "Jessica", labels: "여, 미국, 밝음" },
    { voiceId: "XrExE9yKIg1WjnnlVkGX", name: "Matilda", labels: "여, 미국, 친근" },
    { voiceId: "Xb7hH8MSUJpSbSDYk0k2", name: "Alice", labels: "여, 영국, 명료" },
    { voiceId: "XB0fDUnXU5powFXDhCwa", name: "Charlotte", labels: "여, 스웨덴 억양" },
    { voiceId: "pFZP5JQG7iQjIQuC4Bku", name: "Lily", labels: "여, 영국, 따뜻" },
    { voiceId: "pNInz6obpgDQGcFmaJgB", name: "Adam", labels: "남, 미국, 깊음" },
    { voiceId: "onwK4e9ZLuTAKqWW03F9", name: "Daniel", labels: "남, 영국, 뉴스톤" },
    { voiceId: "nPczCjzI2devNBz1zQrb", name: "Brian", labels: "남, 미국, 내레이션" },
    { voiceId: "JBFqnCBsd6RMkjVDRZzb", name: "George", labels: "남, 영국, 중후" },
    { voiceId: "iP95p4xoKVk53GoZ742B", name: "Chris", labels: "남, 미국, 일상 대화" },
    { voiceId: "cjVigY5qzO86Huf0OWal", name: "Eric", labels: "남, 미국, 친근" },
    { voiceId: "TX3LPaxmHKxFdv7VOQHJ", name: "Liam", labels: "남, 미국, 또렷" },
    { voiceId: "IKne3meq5aSn9XLyUdCD", name: "Charlie", labels: "남, 호주, 자연스러움" },
    { voiceId: "N2lVS1w4EtoT3dr4eOWO", name: "Callum", labels: "남, 개성적" },
    { voiceId: "bIHbv24MWmeRgasZH58o", name: "Will", labels: "남, 미국, 편안" },
    { voiceId: "pqHfZKP75CvOlQylNhV4", name: "Bill", labels: "남, 미국, 신뢰감" }
  ];

  /** 계정에서 사용 가능한 음성 목록 → [{voiceId, name, labels}] */
  async function listElevenVoices({ apiKey } = {}) {
    if (!apiKey) throw new Error("ElevenLabs API 키가 없습니다.");
    let res;
    try {
      res = await fetch(`${ELEVEN_BASE}/voices`, { headers: { "xi-api-key": apiKey } });
    } catch (e) {
      throw new Error("ElevenLabs에 연결하지 못했습니다 (네트워크/CORS). 인터넷 연결을 확인해 주세요.");
    }
    if (!res.ok) {
      let detail = "";
      try {
        const err = await res.json();
        detail = err?.detail?.message || err?.detail?.status || (typeof err?.detail === "string" ? err.detail : "");
      } catch (e) { /* 무시 */ }
      throw elevenError(res.status, detail);
    }
    const data = await res.json();
    return (data?.voices || []).map(v => ({
      voiceId: v.voice_id,
      name: v.name,
      labels: [v.labels?.gender, v.labels?.accent].filter(Boolean).join(", ")
    }));
  }

  /** 텍스트 → mp3 Blob (재생은 호출 측에서 Audio로) */
  async function fetchElevenAudio(text, { apiKey, voiceId } = {}) {
    if (!apiKey) throw new Error("ElevenLabs API 키가 없습니다.");
    const vid = voiceId || ELEVEN_DEFAULT_VOICE;
    let res;
    try {
      res = await fetch(`${ELEVEN_BASE}/text-to-speech/${vid}?output_format=mp3_44100_64`, {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          text: String(text || "").trim(),
          model_id: ELEVEN_MODEL
        })
      });
    } catch (e) {
      throw new Error("ElevenLabs에 연결하지 못했습니다. 인터넷 연결을 확인해 주세요.");
    }
    if (!res.ok) throw elevenError(res.status);
    return await res.blob();
  }

  return {
    isYoutubeUrl,
    youtubeVideoId,
    generateCards,
    generateRecommended,
    explainWordInContext,
    fetchYoutubeTranscript,
    listElevenVoices,
    fetchElevenAudio,
    ELEVEN_DEFAULT_VOICE,
    ELEVEN_PREMADE_VOICES
  };
})();
