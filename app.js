/**
 * 영한번역 영어 학습 웹앱 - 코어 애플리케이션 스크립트 (app.js)
 */

document.addEventListener("DOMContentLoaded", () => {
  // ── 애플리케이션 상태 (State) ──
  let state = {
    currentFileId: "default_interview", // 현재 학습 중인 파일 ID
    currentIndex: 0,                   // 현재 학습 중인 문장 인덱스
    revealed: false,                   // 번역 및 설명 노출 상태
    starred: [],                       // 즐겨찾기(별표) 문장 ID 리스트
    settings: {
      theme: "dark",
      fontSize: "md",
      ttsSpeed: 1.0,
      ttsVoice: "",
      autoPlay: false,
      alwaysShowTranslation: true
    },
    // 사용자 추가 파일 리스트 { id: { title, data: [...] } }
    customFiles: {}
  };

  // ── TTS 지원 음성 리스트 캐시 ──
  let availableVoices = [];

  // ── DOM 엘리먼트 참조 ──
  const body = document.body;
  const cardElement = document.getElementById("study-card");
  const cardContainer = document.getElementById("card-container");
  const fileSelect = document.getElementById("file-select");
  const fileListDashboard = document.getElementById("file-list-dashboard");
  
  // 헤더 버튼
  const settingsBtn = document.getElementById("settings-btn");
  const closeSettingsBtn = document.getElementById("close-settings-btn");
  const settingsPanel = document.getElementById("settings-panel");
  const dimOverlay = document.getElementById("dim-overlay");

  // 하단 컨트롤러
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const bookmarkBtn = document.getElementById("bookmark-btn");
  const progressBar = document.getElementById("progress-bar");
  const progressText = document.getElementById("progress-text");

  // 설정 컨트롤들
  const themeOpts = document.querySelectorAll(".theme-opt");
  const fontSizeSlider = document.getElementById("font-size-slider");
  const fontSizeVal = document.getElementById("font-size-val");
  const ttsSpeedSlider = document.getElementById("tts-speed-slider");
  const ttsSpeedVal = document.getElementById("tts-speed-val");
  const voiceSelect = document.getElementById("voice-select");
  const autoPlayToggle = document.getElementById("autoplay-toggle");
  const alwaysShowToggle = document.getElementById("always-show-toggle");

  // 파일 추가 입력기
  const fileUploadInput = document.getElementById("file-upload");
  const textPasteArea = document.getElementById("text-paste");
  const textSubmitBtn = document.getElementById("text-submit-btn");

  // 미니 단어 검색 팝업
  const wordPopup = document.getElementById("word-popup");
  const popupWord = document.getElementById("popup-word");
  const popupClose = document.getElementById("popup-close");
  const dictNaver = document.getElementById("dict-naver");
  const dictCambridge = document.getElementById("dict-cambridge");

  // ── 초기화 (Initialization) ──
  function init() {
    loadStateFromStorage();
    setupTheme(state.settings.theme);
    setupFontSize(state.settings.fontSize);
    
    // 항상 노출 토글 UI 상태 연동
    if (alwaysShowToggle) {
      alwaysShowToggle.checked = state.settings.alwaysShowTranslation;
    }

    // TTS 목소리 세팅
    setupTTSVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = setupTTSVoices;
    }

    // 파일 셀렉트 목록 채우기 및 렌더링
    populateFileDropdown();
    renderCurrentSentence();

    // 이벤트 리스너 바인딩
    bindEvents();
  }

  // ── 로컬 스토리지 데이터 로드 및 저장 ──
  function loadStateFromStorage() {
    try {
      const savedTheme = localStorage.getItem("yh_theme") || "dark";
      const savedFontSize = localStorage.getItem("yh_fontSize") || "md";
      const savedTtsSpeed = parseFloat(localStorage.getItem("yh_ttsSpeed")) || 1.0;
      const savedTtsVoice = localStorage.getItem("yh_ttsVoice") || "";
      const savedAutoPlay = localStorage.getItem("yh_autoPlay") === "true";
      const savedAlwaysShow = localStorage.getItem("yh_alwaysShow") !== "false"; // 기본값 true
      const savedCurrentFile = localStorage.getItem("yh_currentFileId") || "default_interview";
      const savedCurrentIndex = parseInt(localStorage.getItem("yh_currentIndex")) || 0;
      
      const savedStarred = localStorage.getItem("yh_starred");
      const savedCustomFiles = localStorage.getItem("yh_customFiles");

      state.settings = {
        theme: savedTheme,
        fontSize: savedFontSize,
        ttsSpeed: savedTtsSpeed,
        ttsVoice: savedTtsVoice,
        autoPlay: savedAutoPlay,
        alwaysShowTranslation: savedAlwaysShow
      };
      
      state.currentFileId = savedCurrentFile;
      state.currentIndex = savedCurrentIndex;
      state.starred = savedStarred ? JSON.parse(savedStarred) : [];
      state.customFiles = savedCustomFiles ? JSON.parse(savedCustomFiles) : {};
    } catch (e) {
      console.error("로컬 스토리지 로드 중 오류 발생:", e);
    }
  }

  function saveSettingsToStorage() {
    localStorage.setItem("yh_theme", state.settings.theme);
    localStorage.setItem("yh_fontSize", state.settings.fontSize);
    localStorage.setItem("yh_ttsSpeed", state.settings.ttsSpeed);
    localStorage.setItem("yh_ttsVoice", state.settings.ttsVoice);
    localStorage.setItem("yh_autoPlay", state.settings.autoPlay);
    localStorage.setItem("yh_alwaysShow", state.settings.alwaysShowTranslation);
  }

  function saveStateToStorage() {
    localStorage.setItem("yh_currentFileId", state.currentFileId);
    localStorage.setItem("yh_currentIndex", state.currentIndex);
    localStorage.setItem("yh_starred", JSON.stringify(state.starred));
    localStorage.setItem("yh_customFiles", JSON.stringify(state.customFiles));
  }

  // ── 테마 및 폰트 변경 처리 ──
  function setupTheme(theme) {
    state.settings.theme = theme;
    document.documentElement.setAttribute("data-theme", theme);
    
    // UI 동기화
    themeOpts.forEach(opt => {
      if (opt.dataset.theme === theme) {
        opt.classList.add("active");
      } else {
        opt.classList.remove("active");
      }
    });
    saveSettingsToStorage();
  }

  function setupFontSize(size) {
    state.settings.fontSize = size;
    
    // 폰트 클래스 교체
    body.classList.remove("font-sm", "font-md", "font-lg", "font-xl");
    body.classList.add(`font-${size}`);

    // 슬라이더 동기화
    const sizeMap = { "sm": 0, "md": 1, "lg": 2, "xl": 3 };
    fontSizeSlider.value = sizeMap[size];
    
    const displayMap = { "sm": "작게", "md": "보통", "lg": "크게", "xl": "아주 크게" };
    fontSizeVal.textContent = displayMap[size];
    
    saveSettingsToStorage();
  }

  // ── TTS 목소리 목록 구성 ──
  function setupTTSVoices() {
    if (typeof speechSynthesis === "undefined") return;
    
    availableVoices = window.speechSynthesis.getVoices();
    voiceSelect.innerHTML = "";

    // 영어(en) 관련 목소리 필터링
    const enVoices = availableVoices.filter(v => v.lang.startsWith("en-"));
    
    if (enVoices.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "기본 영어 음성 (시스템)";
      voiceSelect.appendChild(option);
      return;
    }

    enVoices.forEach(voice => {
      const option = document.createElement("option");
      option.value = voice.name;
      // 보기 편하게 가공 (e.g. Google US English (en-US))
      option.textContent = `${voice.name} (${voice.lang})`;
      
      if (voice.name === state.settings.ttsVoice) {
        option.selected = true;
      }
      voiceSelect.appendChild(option);
    });

    // 선택된 목소리가 없으면 첫 번째 영어 목소리로 세팅
    if (!state.settings.ttsVoice && enVoices.length > 0) {
      state.settings.ttsVoice = enVoices[0].name;
      saveSettingsToStorage();
    }
  }

  // ── 파일 선택 드롭다운 및 대시보드 채우기 ──
  function populateFileDropdown() {
    // 1. 헤더 드롭다운 동기화
    fileSelect.innerHTML = "";
    
    // 기본 파일 옵션 추가
    const defaultOpt = document.createElement("option");
    defaultOpt.value = "default_interview";
    defaultOpt.textContent = "Elon & Sunak 인터뷰";
    if (state.currentFileId === "default_interview") defaultOpt.selected = true;
    fileSelect.appendChild(defaultOpt);

    // 커스텀 파일 옵션 추가
    Object.keys(state.customFiles).forEach(id => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = state.customFiles[id].title;
      if (state.currentFileId === id) opt.selected = true;
      fileSelect.appendChild(opt);
    });

    // 2. 설정창 내부 파일 대시보드 동기화
    if (!fileListDashboard) return;
    fileListDashboard.innerHTML = "";

    // A. 기본 파일 카드 렌더링
    const defaultIsActive = state.currentFileId === "default_interview";
    const defaultCard = document.createElement("div");
    defaultCard.className = `file-item-card ${defaultIsActive ? "active" : ""}`;
    defaultCard.innerHTML = `
      <div class="file-item-info">
        <div class="file-item-title">Elon & Sunak 인터뷰</div>
        <div class="file-item-meta">
          <span class="file-item-badge">기본</span>
          <span>28 문장</span>
        </div>
      </div>
    `;
    defaultCard.addEventListener("click", () => {
      if (state.currentFileId !== "default_interview") {
        selectFile("default_interview");
      }
    });
    fileListDashboard.appendChild(defaultCard);

    // B. 사용자 커스텀 파일 카드 렌더링
    Object.keys(state.customFiles).forEach(id => {
      const fileData = state.customFiles[id];
      const isActive = state.currentFileId === id;
      const card = document.createElement("div");
      card.className = `file-item-card ${isActive ? "active" : ""}`;
      card.innerHTML = `
        <div class="file-item-info">
          <div class="file-item-title" title="${fileData.title}">${fileData.title}</div>
          <div class="file-item-meta">
            <span class="file-item-badge">사용자</span>
            <span>${fileData.data.length} 문장</span>
          </div>
        </div>
        <button class="file-delete-btn" title="파일 삭제" aria-label="파일 삭제">
          🗑️
        </button>
      `;
      
      // 카드 클릭 이벤트 (파일 활성화)
      card.addEventListener("click", () => {
        if (state.currentFileId !== id) {
          selectFile(id);
        }
      });

      // 삭제 버튼 클릭 이벤트
      const deleteBtn = card.querySelector(".file-delete-btn");
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation(); // 카드 클릭으로 전파되는 것 방지
        deleteCustomFile(id);
      });

      fileListDashboard.appendChild(card);
    });
  }

  // ── 파일 선택 처리 ──
  function selectFile(fileId) {
    state.currentFileId = fileId;
    state.currentIndex = 0;
    
    // UI 전체 동기화 및 학습 화면 갱신
    populateFileDropdown();
    renderCurrentSentence();
    
    // 헤더 드롭다운 값도 강제 동기화
    fileSelect.value = fileId;
  }

  // ── 커스텀 파일 삭제 처리 ──
  function deleteCustomFile(fileId) {
    const fileTitle = state.customFiles[fileId] ? state.customFiles[fileId].title : "해당 파일";
    if (!confirm(`'${fileTitle}' 파일을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며, 학습 진도도 함께 삭제됩니다.`)) {
      return;
    }

    // 데이터 삭제
    delete state.customFiles[fileId];
    saveStateToStorage();

    // 만약 현재 공부하던 파일이 삭제된 파일이면 기본 인터뷰로 강제 변경
    if (state.currentFileId === fileId) {
      state.currentFileId = "default_interview";
      state.currentIndex = 0;
      saveStateToStorage();
    }

    // UI 동기화
    populateFileDropdown();
    renderCurrentSentence();
    
    alert("파일이 안전하게 삭제되었습니다.");
  }

  // ── 현재 영어 문장 학습용 데이터 추출 ──
  function getCurrentDataset() {
    if (state.currentFileId === "default_interview") {
      return DEFAULT_STUDY_DATA;
    }
    const custom = state.customFiles[state.currentFileId];
    return custom ? custom.data : DEFAULT_STUDY_DATA;
  }

  // ── 메인 카드 렌더링 ──
  function renderCurrentSentence() {
    const dataset = getCurrentDataset();
    
    // 만약 현재 인덱스가 범위를 벗어나면 복구
    if (state.currentIndex < 0) state.currentIndex = 0;
    if (state.currentIndex >= dataset.length) state.currentIndex = Math.max(0, dataset.length - 1);

    const data = dataset[state.currentIndex];
    if (!data) return;

    // 번역 및 설명 가림막 초기화 (항상 노출 설정에 따른 분기)
    if (state.settings.alwaysShowTranslation) {
      state.revealed = true;
      cardElement.classList.add("revealed");
    } else {
      state.revealed = false;
      cardElement.classList.remove("revealed");
    }

    // 별표 상태 표시
    updateBookmarkUI(data.id);

    // 진행률 업데이트
    updateProgressUI(dataset.length);

    // 카드 내용 빌드
    const cardContentHTML = `
      <div class="card-header-info">
        <span class="speaker-tag">${data.speaker || "SPEAKER"}</span>
        <span>SENTENCE ${state.currentIndex + 1}/${dataset.length}</span>
      </div>
      
      <!-- [1구역: 영어 문장] -->
      <div class="en-section">
        <div class="sentence-en-container">
          <div class="sentence-en" id="sentence-en-text">
            ${makeWordsClickable(data.en)}
          </div>
          <button class="speak-btn" id="card-speak-btn" aria-label="문장 듣기">
            🔊
          </button>
        </div>
      </div>

      <!-- [번역 보기 트리거 버튼] -->
      <button class="reveal-trigger" id="reveal-trigger-btn">
        🔍 번역 및 학습 포인트 보기 (Space)
      </button>

      <!-- [드러나는 구역] -->
      <div class="revealed-content">
        <div class="divider"></div>
        
        <!-- [2구역: 한글 번역문] -->
        <div class="ko-section">
          <div class="sentence-ko">${data.ko}</div>
        </div>

        <!-- [3구역: 상세 설명 (단어, 문법, 숙어, 패턴)] -->
        <div class="notes-section">
          ${renderNotesSection(data.notes, data.en)}
        </div>
      </div>
    `;

    // 부드러운 전환 효과를 위한 클래스 교체
    cardElement.classList.remove("fade-in");
    cardElement.classList.add("fade-out");

    setTimeout(() => {
      cardElement.innerHTML = cardContentHTML;
      cardElement.classList.remove("fade-out");
      cardElement.classList.add("fade-in");

      // 카드 내 버튼 이벤트 동적 바인딩
      document.getElementById("reveal-trigger-btn").addEventListener("click", revealTranslation);
      document.getElementById("card-speak-btn").addEventListener("click", () => speak(data.en));
      
      // 단어 클릭 바인딩
      const wordSpans = cardElement.querySelectorAll(".word-span");
      wordSpans.forEach(span => {
        span.addEventListener("click", (e) => {
          e.stopPropagation();
          showWordPopup(span.dataset.word);
        });
      });

      // 자동 재생 연동
      if (state.settings.autoPlay) {
        speak(data.en);
      }
    }, 150);

    saveStateToStorage();
  }

  // ── 영어 문장의 개별 단어를 클릭 가능하도록 랩핑 ──
  function makeWordsClickable(sentence) {
    // HTML 태그가 이미 포함되어 있을 수 있으므로 텍스트만 분해하도록 주의
    // 여기서는 영단어(A-Za-z)와 아포스트로피('), 붙임표(-)를 식별하여 wrap
    const wordRegex = /([A-Za-z'-]+)/g;
    
    // 단순하게 텍스트 공백으로 잘라 태그 제외하고 치환
    return sentence.replace(wordRegex, (match) => {
      // 쉼표나 마침표 등의 문장부호는 바깥으로 빠지도록 설계
      const cleanWord = match.replace(/[^A-Za-z]/g, "").toLowerCase();
      if (cleanWord.length === 0) return match;
      return `<span class="word-span" data-word="${cleanWord}">${match}</span>`;
    });
  }

  // ── 상세 설명(Notes) 영역 HTML 생성 ──
  function renderNotesSection(notes, rawEn) {
    if (!notes) {
      // 만약 외부 파일이라 설명이 없으면 자동 생성된 사전 검색 도구 제공
      return `
        <h3>💡 Vocabulary Tool</h3>
        <p style="color: var(--text-secondary); margin-bottom: 10px;">
          단어를 탭하면 상단 미니 팝업에서 상세 온라인 사전을 열어 즉시 탐색할 수 있습니다.
        </p>
      `;
    }

    let html = "";

    // 1. 단어 목록
    if (notes.words && notes.words.length > 0) {
      html += `
        <h3>📌 Key Vocabulary</h3>
        <div class="words-list">
          ${notes.words.map(w => `
            <div class="word-item">
              <span class="word-name">${w.word}</span>
              <span class="word-meaning">${w.meaning}</span>
              <a href="#" class="dict-link" data-word="${w.word.toLowerCase()}">사전 🔍</a>
            </div>
          `).join("")}
        </div>
      `;
    }

    // 2. 직독직해 & 구조
    if (notes.structure) {
      html += `
        <h3>💡 Sentence Structure</h3>
        <div class="grammar-notes" style="border-top: none; padding-top: 0; margin-top: 0; margin-bottom: 12px;">
          ${notes.structure}
        </div>
      `;
    }

    // 3. 필수 암기 문법/숙어
    if (notes.mustMemorize) {
      html += `
        <h3>🔥 Must Memorize</h3>
        <div class="idiom-notes" style="border-top: none; padding-top: 0; margin-top: 0; margin-bottom: 12px;">
          ${notes.mustMemorize}
        </div>
      `;
    }

    // 4. 회화 응용 패턴
    if (notes.pattern) {
      html += `
        <h3>🔄 Speaking Pattern Hint</h3>
        <div class="idiom-notes" style="border-top: none; padding-top: 0; margin-top: 0;">
          ${notes.pattern}
        </div>
      `;
    }

    // 사전 링크 동적 바인딩을 위한 후처리 지원
    setTimeout(() => {
      const dictLinks = cardElement.querySelectorAll(".dict-link");
      dictLinks.forEach(link => {
        link.addEventListener("click", (e) => {
          e.preventDefault();
          e.stopPropagation();
          showWordPopup(link.dataset.word);
        });
      });
    }, 200);

    return html || "<p style='color: var(--text-muted)'>상세 설명 정보가 없습니다.</p>";
  }

  // ── 번역 및 설명 영역 노출 ──
  function revealTranslation() {
    state.revealed = true;
    cardElement.classList.add("revealed");
  }

  // ── 별표/즐겨찾기 상태 ──
  function toggleBookmark() {
    const dataset = getCurrentDataset();
    const data = dataset[state.currentIndex];
    if (!data) return;

    const idx = state.starred.indexOf(data.id);
    if (idx === -1) {
      state.starred.push(data.id);
      bookmarkBtn.classList.add("active");
    } else {
      state.starred.splice(idx, 1);
      bookmarkBtn.classList.remove("active");
    }
    saveStateToStorage();
  }

  function updateBookmarkUI(sentenceId) {
    if (state.starred.includes(sentenceId)) {
      bookmarkBtn.classList.add("active");
    } else {
      bookmarkBtn.classList.remove("active");
    }
  }

  // ── 진행바 및 제어 버튼 비활성화 UI ──
  function updateProgressUI(totalCount) {
    const pct = totalCount > 0 ? ((state.currentIndex + 1) / totalCount) * 100 : 0;
    progressBar.style.width = `${pct}%`;
    progressText.textContent = `${state.currentIndex + 1} / ${totalCount} (${Math.round(pct)}%)`;

    // 경계 비활성화
    prevBtn.disabled = state.currentIndex === 0;
    nextBtn.disabled = state.currentIndex === totalCount - 1;
  }

  // ── TTS 음성 합성 발음 (Web Speech API) ──
  function speak(text) {
    if (typeof speechSynthesis === "undefined") return;

    // 현재 진행 중인 음성은 중단
    window.speechSynthesis.cancel();

    // 단어 기호 정제 (HTML 태그 제거)
    const cleanText = text.replace(/<\/?[^>]+(>|$)/g, "");

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "en-US";
    utterance.rate = state.settings.ttsSpeed;

    // 설정된 보이스 매칭
    if (state.settings.ttsVoice) {
      const selectedVoice = availableVoices.find(v => v.name === state.settings.ttsVoice);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      }
    }

    window.speechSynthesis.speak(utterance);
  }

  // ── 이전/다음 문장 내비게이션 ──
  function navigate(direction) {
    const dataset = getCurrentDataset();
    
    if (direction === "prev" && state.currentIndex > 0) {
      state.currentIndex--;
      renderCurrentSentence();
    } else if (direction === "next" && state.currentIndex < dataset.length - 1) {
      state.currentIndex++;
      renderCurrentSentence();
    }
  }

  // ── 단어 사전 검색 미니 팝업 ──
  function showWordPopup(word) {
    const cleanWord = word.replace(/[^A-Za-z]/g, "").toLowerCase();
    popupWord.textContent = cleanWord;
    
    // 네이버 및 캠브리지 사전 주소 주입
    dictNaver.href = `https://en.dict.naver.com/#/search?query=${cleanWord}`;
    dictCambridge.href = `https://dictionary.cambridge.org/dictionary/english/${cleanWord}`;
    
    wordPopup.classList.add("active");
    dimOverlay.classList.add("active");
  }

  function hideWordPopup() {
    wordPopup.classList.remove("active");
    // 설정 패널이 닫혀 있으면 딤오버레이도 비활성화
    if (!settingsPanel.classList.contains("active")) {
      dimOverlay.classList.remove("active");
    }
  }

  // ── 설정창 제어 ──
  function openSettings() {
    settingsPanel.classList.add("active");
    dimOverlay.classList.add("active");
  }

  function closeSettings() {
    settingsPanel.classList.remove("active");
    // 단어 팝업창도 닫혀있으면 딤오버레이 완전 종료
    if (!wordPopup.classList.contains("active")) {
      dimOverlay.classList.remove("active");
    }
  }

  // ── 외부 학습용 영어 파일 파서 및 임포트 ──
  
  // 1. HTML 파일 파서 (elon_sunak_interview.html 형식 자동 매핑)
  function parseHtmlTranscript(htmlText, fileName) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");
    
    // dialogue-block들을 수집
    const blocks = doc.querySelectorAll(".dialogue-block");
    const parsedData = [];

    let currentSpeaker = "SPEAKER";
    let lastEnText = "";

    // elon_sunak_interview.html 구조:
    // EN 블록이 오고 다음 블록으로 KO 블록이 배치되는 규칙성 파싱
    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const enTextEl = block.querySelector(".en-text");
      const koTextEl = block.querySelector(".ko-text");
      
      const badge = block.querySelector(".lang-badge");
      let rawSpeaker = "SPEAKER";
      
      // 대화 블록 직전 또는 내부의 클래스 속성에서 화자 파악 시도
      // (예: Sunak, Musk 또는 뱃지 명칭)
      if (badge) {
        // 부모의 형제나 타이틀에서 화자를 추측할 수 없으므로 번갈아가며 매핑
        // Rishi Sunak(sunak_XX), Elon Musk(musk_XX)
      }

      if (enTextEl) {
        lastEnText = enTextEl.textContent.trim();
      } else if (koTextEl && lastEnText) {
        const cleanKoText = koTextEl.textContent.trim();
        
        // 화자 추정 규칙: Rishi Sunak / Elon Musk 홀수/짝수 세팅
        // (간단하게 EN/KO 페어링을 문장 리스트로 조립)
        const id = `custom_${fileName.replace(/[^a-z0-9]/gi, "_")}_${parsedData.length}`;
        const speaker = (parsedData.length % 2 === 0) ? "Rishi Sunak" : "Elon Musk";

        parsedData.push({
          id: id,
          speaker: speaker,
          en: lastEnText,
          ko: cleanKoText,
          notes: null // 동적으로 dictionary lookup을 하도록 설계
        });
        
        lastEnText = ""; // 리셋
      }
    }

    return parsedData;
  }

  // 2. JSON 파일 파서
  function parseJsonDataset(jsonText) {
    const raw = JSON.parse(jsonText);
    if (!Array.isArray(raw)) throw new Error("JSON 루트 노드는 배열 객체여야 합니다.");
    
    return raw.map((item, idx) => {
      if (!item.en || !item.ko) throw new Error(`${idx + 1}번째 문장에 'en' 또는 'ko' 필드가 누락되었습니다.`);
      
      return {
        id: item.id || `json_${Date.now()}_${idx}`,
        speaker: item.speaker || "Speaker",
        en: item.en,
        ko: item.ko,
        notes: item.notes || null
      };
    });
  }

  // 3. Raw Text 붙여넣기 파서
  function parseRawText(rawText) {
    const lines = rawText.split("\n");
    const parsedData = [];
    
    lines.forEach((line, idx) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // 구분자 감지: '|' 또는 '::'
      let parts = [];
      if (trimmed.includes("|")) {
        parts = trimmed.split("|");
      } else if (trimmed.includes("::")) {
        parts = trimmed.split("::");
      }

      if (parts.length >= 2) {
        const en = parts[0].trim();
        const ko = parts[1].trim();
        const noteText = parts[2] ? parts[2].trim() : "";
        
        let parsedNotes = null;
        if (noteText) {
          // 간이 단어 설명 파싱 (단어=뜻; 단어=뜻)
          const words = [];
          noteText.split(";").forEach(pair => {
            const wParts = pair.split("=");
            if (wParts.length >= 2) {
              words.push({ word: wParts[0].trim(), meaning: wParts[1].trim() });
            }
          });
          parsedNotes = {
            words: words,
            mustMemorize: `• <strong>주의 학습 포인트</strong>: ${noteText}`
          };
        }

        parsedData.push({
          id: `pasted_${Date.now()}_${idx}`,
          speaker: "Tutor",
          en: en,
          ko: ko,
          notes: parsedNotes
        });
      }
    });

    return parsedData;
  }

  // ── 새 학습 리스트 저장 및 활성화 ──
  function loadAndActivateNewDataset(title, data) {
    if (!data || data.length === 0) {
      alert("파싱된 문장 데이터가 없습니다. 포맷을 다시 확인해 주세요.");
      return;
    }

    const fileId = `file_${Date.now()}`;
    state.customFiles[fileId] = {
      title: title,
      data: data
    };

    state.currentFileId = fileId;
    state.currentIndex = 0;

    // 로컬 스토리지 저장 및 UI 리빌드
    saveStateToStorage();
    populateFileDropdown();
    renderCurrentSentence();
    
    alert(`성공! [${title}] 총 ${data.length}개 문장이 정상 업로드되었습니다.`);
    closeSettings();
  }

  // ── 이벤트 핸들러 바인딩 (Events Binding) ──
  function bindEvents() {
    // 헤더 컨트롤
    settingsBtn.addEventListener("click", openSettings);
    closeSettingsBtn.addEventListener("click", closeSettings);
    dimOverlay.addEventListener("click", () => {
      closeSettings();
      hideWordPopup();
    });

    // 학습 파일 전환
    fileSelect.addEventListener("change", (e) => {
      selectFile(e.target.value);
    });

    // 하단 제어
    prevBtn.addEventListener("click", () => navigate("prev"));
    nextBtn.addEventListener("click", () => navigate("next"));
    bookmarkBtn.addEventListener("click", toggleBookmark);

    // 설정: 테마 선택
    themeOpts.forEach(opt => {
      opt.addEventListener("click", () => {
        setupTheme(opt.dataset.theme);
      });
    });

    // 설정: 폰트 크기 슬라이더
    fontSizeSlider.addEventListener("input", (e) => {
      const sizes = ["sm", "md", "lg", "xl"];
      const selectedSize = sizes[parseInt(e.target.value)];
      setupFontSize(selectedSize);
    });

    // 설정: TTS 배속
    ttsSpeedSlider.addEventListener("input", (e) => {
      const speed = parseFloat(e.target.value);
      state.settings.ttsSpeed = speed;
      ttsSpeedVal.textContent = `${speed.toFixed(2)}x`;
      saveSettingsToStorage();
    });

    // 설정: 목소리 변경
    voiceSelect.addEventListener("change", (e) => {
      state.settings.ttsVoice = e.target.value;
      saveSettingsToStorage();
    });

    // 설정: 자동 재생 여부
    autoPlayToggle.addEventListener("change", (e) => {
      state.settings.autoPlay = e.target.checked;
      saveSettingsToStorage();
    });

    // 설정: 번역 상시 노출 여부
    if (alwaysShowToggle) {
      alwaysShowToggle.addEventListener("change", (e) => {
        state.settings.alwaysShowTranslation = e.target.checked;
        saveSettingsToStorage();
        renderCurrentSentence(); // 즉시 UI 업데이트 반영
      });
    }

    // 단어 검색창 닫기
    popupClose.addEventListener("click", hideWordPopup);

    // 파일 임포트: 파일 업로드 트리거
    fileUploadInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(evt) {
        const text = evt.target.result;
        const name = file.name;
        
        try {
          if (name.endsWith(".html") || name.endsWith(".htm")) {
            // HTML 파서 가동
            const parsed = parseHtmlTranscript(text, name);
            loadAndActivateNewDataset(name.replace(/\.[^/.]+$/, ""), parsed);
          } else if (name.endsWith(".json")) {
            // JSON 파서 가동
            const parsed = parseJsonDataset(text);
            loadAndActivateNewDataset(name.replace(/\.[^/.]+$/, ""), parsed);
          } else {
            // 일반 텍스트 파서
            const parsed = parseRawText(text);
            loadAndActivateNewDataset(name.replace(/\.[^/.]+$/, ""), parsed);
          }
        } catch (err) {
          alert(`파일 파싱에 실패했습니다:\n${err.message}`);
        }
      };
      reader.readAsText(file);
    });

    // 파일 임포트: 직접 붙여넣기 트리거
    textSubmitBtn.addEventListener("click", () => {
      const text = textPasteArea.value.trim();
      if (!text) {
        alert("붙여넣을 텍스트 내용을 입력해 주세요.");
        return;
      }

      try {
        const parsed = parseRawText(text);
        if (parsed.length === 0) {
          alert("파싱에 실패했습니다. 포맷 예시: '영어 문장 | 한국어 번역 | 단어1=뜻;단어2=뜻' 형식을 유지해 주세요.");
          return;
        }
        loadAndActivateNewDataset(`직접 입력 카드 (${parsed.length}문장)`, parsed);
        textPasteArea.value = ""; // 초기화
      } catch (err) {
        alert(`텍스트 파싱 오류: ${err.message}`);
      }
    });

    // ── 데스크톱 전용 키보드 단축키 연동 ──
    window.addEventListener("keydown", (e) => {
      // 입력창 내부 타이핑 중일 때는 단축키 오작동 방지
      if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA") {
        return;
      }

      const key = e.key;
      const dataset = getCurrentDataset();

      if (key === " ") { // 스페이스바 -> 번역 및 설명 보기
        e.preventDefault();
        if (!state.revealed) {
          revealTranslation();
        }
      } else if (key === "ArrowLeft") { // 왼쪽 방향키 -> 이전 문장
        e.preventDefault();
        navigate("prev");
      } else if (key === "ArrowRight") { // 오른쪽 방향키 -> 다음 문장
        e.preventDefault();
        navigate("next");
      } else if (key === "Enter") { // 엔터키 -> 발음 재생
        e.preventDefault();
        const data = dataset[state.currentIndex];
        if (data) speak(data.en);
      }
    });

    // ── 모바일 스와이프(Swipe) 터치 제스처 연동 ──
    let touchStartX = 0;
    let touchEndX = 0;
    
    cardContainer.addEventListener("touchstart", (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });
    
    cardContainer.addEventListener("touchend", (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipeGesture();
    }, { passive: true });
    
    function handleSwipeGesture() {
      const threshold = 60; // 스와이프 트리거 거리 (픽셀)
      const diff = touchStartX - touchEndX;
      
      if (Math.abs(diff) > threshold) {
        if (diff > 0) {
          // 왼쪽으로 스와이프 -> 다음 문장 (Next)
          navigate("next");
        } else {
          // 오른쪽으로 스와이프 -> 이전 문장 (Prev)
          navigate("prev");
        }
      }
    }
  }

  // ── 실행 ──
  init();
});
