/**
 * 영한번역 영어 학습 웹앱 - 코어 애플리케이션 스크립트 (app.js)
 * v1.2.0 - 즐겨찾기 복습 모드 / PWA / IndexedDB 저장소 / 파일별 진도 / 입력 살균 / 이벤트 위임
 */

document.addEventListener("DOMContentLoaded", () => {
  // ── 애플리케이션 상태 (State) ──
  let state = {
    currentFileId: "default_interview", // 현재 학습 중인 파일 ID
    currentIndex: 0,                   // 현재 학습 중인 문장 인덱스 (현재 데이터셋 기준)
    revealed: false,                   // 번역 및 설명 노출 상태
    mode: "all",                       // 학습 모드: "all" | "starred"
    starred: [],                       // 즐겨찾기(별표) 문장 ID 리스트
    progress: {},                      // 파일별 마지막 학습 위치 { fileId: index }
    settings: {
      theme: "dark",
      fontSize: "md",
      ttsSpeed: 1.0,
      ttsVoice: "",
      autoPlay: false,
      alwaysShowTranslation: true,
      cardDensity: "medium"        // 카드 분량: "short" | "medium" | "long" (임포트 시 청킹 기준)
    },
    // 사용자 추가 파일 메모리 캐시 { id: { title, data:[...], createdAt, updatedAt } }
    // 진실 원본(source of truth)은 IndexedDB (미지원 시 localStorage 폴백)
    customFiles: {}
  };

  // ── TTS 지원 음성 리스트 캐시 ──
  let availableVoices = [];

  // ── 렌더 가드 토큰 (빠른 연속 내비게이션 시 stale 렌더 방지) ──
  let renderToken = 0;

  // ── 현재 카드에 표시된 문장 (이벤트 위임 핸들러에서 참조) ──
  let currentSentence = null;

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
  const modeOpts = document.querySelectorAll(".mode-opt");

  // 설정 컨트롤들
  const themeOpts = document.querySelectorAll(".theme-opt");
  const fontSizeSlider = document.getElementById("font-size-slider");
  const fontSizeVal = document.getElementById("font-size-val");
  const ttsSpeedSlider = document.getElementById("tts-speed-slider");
  const ttsSpeedVal = document.getElementById("tts-speed-val");
  const voiceSelect = document.getElementById("voice-select");
  const autoPlayToggle = document.getElementById("autoplay-toggle");
  const alwaysShowToggle = document.getElementById("always-show-toggle");
  const cardDensitySlider = document.getElementById("card-density-slider");
  const cardDensityVal = document.getElementById("card-density-val");

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

  // ── 보안: HTML 이스케이프 헬퍼 (작은따옴표는 의도적으로 보존: 영어 축약형 표시용) ──
  function escapeHtml(str) {
    if (str == null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  // ── 보안: 신뢰할 수 없는 노트 텍스트에 대해 허용 태그(strong/em/br)만 통과 ──
  function sanitizeRichText(str) {
    if (str == null) return "";
    let safe = escapeHtml(str);
    safe = safe.replace(/&lt;(\/?(?:strong|em|br))\s*\/?&gt;/gi, (m, tag) => `<${tag}>`);
    return safe;
  }

  // ───────────────────────────────────────────────────────────
  // IndexedDB 저장소 래퍼 (커스텀 파일 본문 저장)
  // ───────────────────────────────────────────────────────────
  const FilesDB = (() => {
    const DB_NAME = "yh_db";
    const STORE = "files";
    const VERSION = 1;
    const supported = (typeof indexedDB !== "undefined" && indexedDB !== null);
    let dbPromise = null;

    function open() {
      if (!supported) return Promise.reject(new Error("IndexedDB 미지원"));
      if (dbPromise) return dbPromise;
      dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) {
            db.createObjectStore(STORE, { keyPath: "id" });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      return dbPromise;
    }

    async function listFiles() {
      const db = await open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readonly");
        const rq = tx.objectStore(STORE).getAll();
        rq.onsuccess = () => resolve(rq.result || []);
        rq.onerror = () => reject(rq.error);
      });
    }

    async function putFile(obj) {
      const db = await open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).put(obj);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    }

    async function deleteFile(id) {
      const db = await open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, "readwrite");
        tx.objectStore(STORE).delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }

    return { supported, listFiles, putFile, deleteFile };
  })();

  // ── 커스텀 파일 로드/저장/삭제 (IndexedDB 우선, localStorage 폴백) ──
  async function loadCustomFiles() {
    if (FilesDB.supported) {
      try {
        const arr = await FilesDB.listFiles();
        const map = {};
        arr.forEach(f => {
          map[f.id] = { title: f.title, data: f.data, rawData: f.rawData || null, density: f.density || null, createdAt: f.createdAt, updatedAt: f.updatedAt };
        });
        return map;
      } catch (e) {
        console.error("IndexedDB 파일 로드 실패, localStorage 폴백:", e);
      }
    }
    try {
      const saved = localStorage.getItem("yh_customFiles");
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      console.error("커스텀 파일 로드 실패:", e);
      return {};
    }
  }

  async function saveCustomFile(id, fileObj) {
    if (FilesDB.supported) {
      try {
        await FilesDB.putFile({ id, ...fileObj });
        return true;
      } catch (e) {
        console.error("IndexedDB 저장 실패:", e);
        alert("저장에 실패했습니다. 저장 공간이 부족하거나 브라우저 제한일 수 있습니다.");
        return false;
      }
    }
    // 폴백: 전체 맵을 localStorage에 직렬화
    try {
      localStorage.setItem("yh_customFiles", JSON.stringify(state.customFiles));
      return true;
    } catch (e) {
      console.error("localStorage 저장 실패:", e);
      alert("저장 공간이 부족합니다. 기존 파일을 삭제한 뒤 다시 시도해 주세요.");
      return false;
    }
  }

  async function removeCustomFile(id) {
    if (FilesDB.supported) {
      try { await FilesDB.deleteFile(id); } catch (e) { console.error("IndexedDB 삭제 실패:", e); }
      return;
    }
    try { localStorage.setItem("yh_customFiles", JSON.stringify(state.customFiles)); } catch (e) { console.error(e); }
  }

  // ── v2 마이그레이션: 기존 localStorage 데이터 이전 (1회성, 비파괴적) ──
  async function migrateV2() {
    try {
      if (localStorage.getItem("yh_migrated_v2") === "true") return;

      // (a) 커스텀 파일: localStorage → IndexedDB (지원 시에만 이전, 미지원이면 보존)
      const legacy = localStorage.getItem("yh_customFiles");
      if (legacy && FilesDB.supported) {
        const obj = JSON.parse(legacy);
        for (const id of Object.keys(obj)) {
          const f = obj[id];
          await FilesDB.putFile({
            id,
            title: f.title,
            data: f.data,
            createdAt: f.createdAt || Date.now(),
            updatedAt: f.updatedAt || Date.now()
          });
        }
        localStorage.removeItem("yh_customFiles");
      }

      // (b) 진도: 단일 yh_currentIndex → yh_progress 맵
      if (!localStorage.getItem("yh_progress")) {
        const oldIdx = parseInt(localStorage.getItem("yh_currentIndex")) || 0;
        const curFile = localStorage.getItem("yh_currentFileId") || "default_interview";
        const prog = {};
        prog[curFile] = oldIdx;
        localStorage.setItem("yh_progress", JSON.stringify(prog));
      }
      localStorage.removeItem("yh_currentIndex");

      localStorage.setItem("yh_migrated_v2", "true");
    } catch (e) {
      console.error("v2 마이그레이션 실패(기존 데이터 보존):", e);
    }
  }

  // ── 초기화 (Initialization) ──
  async function init() {
    await migrateV2();
    loadStateFromStorage();
    state.customFiles = await loadCustomFiles();

    // 현재 파일의 진도로 인덱스 복원 (복습 모드는 진도 비저장)
    if (state.mode === "all") {
      state.currentIndex = (state.progress[state.currentFileId] != null) ? state.progress[state.currentFileId] : 0;
    } else {
      state.currentIndex = 0;
    }

    setupTheme(state.settings.theme);
    setupFontSize(state.settings.fontSize);
    syncModeUI();

    if (alwaysShowToggle) {
      alwaysShowToggle.checked = state.settings.alwaysShowTranslation;
    }
    if (autoPlayToggle) {
      autoPlayToggle.checked = state.settings.autoPlay;
    }
    if (ttsSpeedSlider) {
      ttsSpeedSlider.value = state.settings.ttsSpeed;
      ttsSpeedVal.textContent = `${Number(state.settings.ttsSpeed).toFixed(2)}x`;
    }
    syncDensityUI();

    setupTTSVoices();
    if (typeof speechSynthesis !== "undefined" && window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = setupTTSVoices;
    }

    populateFileDropdown();
    renderCurrentSentence();
    bindEvents();
    registerServiceWorker();
  }

  // ── 서비스워커 등록 (PWA, file:// 환경에서는 비활성) ──
  function registerServiceWorker() {
    if ("serviceWorker" in navigator && location.protocol !== "file:") {
      navigator.serviceWorker.register("service-worker.js").catch(e => {
        console.warn("서비스워커 등록 실패:", e);
      });
    }
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
      const savedDensity = localStorage.getItem("yh_cardDensity") || "medium";
      const savedCurrentFile = localStorage.getItem("yh_currentFileId") || "default_interview";
      const savedMode = localStorage.getItem("yh_mode") === "starred" ? "starred" : "all";

      const savedStarred = localStorage.getItem("yh_starred");
      const savedProgress = localStorage.getItem("yh_progress");

      state.settings = {
        theme: savedTheme,
        fontSize: savedFontSize,
        ttsSpeed: savedTtsSpeed,
        ttsVoice: savedTtsVoice,
        autoPlay: savedAutoPlay,
        alwaysShowTranslation: savedAlwaysShow,
        cardDensity: (["short", "medium", "long"].includes(savedDensity) ? savedDensity : "medium")
      };

      state.currentFileId = savedCurrentFile;
      state.mode = savedMode;
      state.starred = savedStarred ? JSON.parse(savedStarred) : [];
      state.progress = savedProgress ? JSON.parse(savedProgress) : {};
    } catch (e) {
      console.error("로컬 스토리지 로드 중 오류 발생:", e);
    }
  }

  function saveSettingsToStorage() {
    try {
      localStorage.setItem("yh_theme", state.settings.theme);
      localStorage.setItem("yh_fontSize", state.settings.fontSize);
      localStorage.setItem("yh_ttsSpeed", state.settings.ttsSpeed);
      localStorage.setItem("yh_ttsVoice", state.settings.ttsVoice);
      localStorage.setItem("yh_autoPlay", state.settings.autoPlay);
      localStorage.setItem("yh_alwaysShow", state.settings.alwaysShowTranslation);
      localStorage.setItem("yh_cardDensity", state.settings.cardDensity);
    } catch (e) {
      console.error("설정 저장 실패:", e);
    }
  }

  function saveStateToStorage() {
    try {
      localStorage.setItem("yh_currentFileId", state.currentFileId);
      localStorage.setItem("yh_mode", state.mode);
      localStorage.setItem("yh_starred", JSON.stringify(state.starred));
      localStorage.setItem("yh_progress", JSON.stringify(state.progress));
    } catch (e) {
      console.error("상태 저장 실패:", e);
    }
  }

  // 현재 파일의 진도 갱신 (전체 모드에서만 영속화)
  function saveProgress() {
    if (state.mode === "all") {
      state.progress[state.currentFileId] = state.currentIndex;
    }
    saveStateToStorage();
  }

  // ── 테마 및 폰트 변경 처리 ──
  function setupTheme(theme) {
    state.settings.theme = theme;
    document.documentElement.setAttribute("data-theme", theme);
    themeOpts.forEach(opt => {
      opt.classList.toggle("active", opt.dataset.theme === theme);
    });
    saveSettingsToStorage();
  }

  function setupFontSize(size) {
    state.settings.fontSize = size;
    body.classList.remove("font-sm", "font-md", "font-lg", "font-xl");
    body.classList.add(`font-${size}`);

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

    const enVoices = availableVoices.filter(v => v.lang && v.lang.startsWith("en-"));

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
      option.textContent = `${voice.name} (${voice.lang})`;
      if (voice.name === state.settings.ttsVoice) {
        option.selected = true;
      }
      voiceSelect.appendChild(option);
    });

    if (!state.settings.ttsVoice && enVoices.length > 0) {
      state.settings.ttsVoice = enVoices[0].name;
      saveSettingsToStorage();
    }
  }

  // ── 파일 선택 드롭다운 및 대시보드 채우기 ──
  function populateFileDropdown() {
    fileSelect.innerHTML = "";

    const defaultOpt = document.createElement("option");
    defaultOpt.value = "default_interview";
    defaultOpt.textContent = "Elon & Sunak 인터뷰";
    if (state.currentFileId === "default_interview") defaultOpt.selected = true;
    fileSelect.appendChild(defaultOpt);

    Object.keys(state.customFiles).forEach(id => {
      const opt = document.createElement("option");
      opt.value = id;
      opt.textContent = state.customFiles[id].title;
      if (state.currentFileId === id) opt.selected = true;
      fileSelect.appendChild(opt);
    });

    if (!fileListDashboard) return;
    fileListDashboard.innerHTML = "";

    // A. 기본 파일 카드
    const defaultIsActive = state.currentFileId === "default_interview";
    const defaultCard = document.createElement("div");
    defaultCard.className = `file-item-card ${defaultIsActive ? "active" : ""}`;
    defaultCard.innerHTML = `
      <div class="file-item-info">
        <div class="file-item-title">Elon &amp; Sunak 인터뷰</div>
        <div class="file-item-meta">
          <span class="file-item-badge">기본</span>
          <span>${DEFAULT_STUDY_DATA.length} 문장</span>
        </div>
      </div>
    `;
    defaultCard.addEventListener("click", () => {
      if (state.currentFileId !== "default_interview") selectFile("default_interview");
    });
    fileListDashboard.appendChild(defaultCard);

    // B. 사용자 커스텀 파일 카드
    Object.keys(state.customFiles).forEach(id => {
      const fileData = state.customFiles[id];
      const isActive = state.currentFileId === id;
      const safeTitle = escapeHtml(fileData.title);
      const card = document.createElement("div");
      card.className = `file-item-card ${isActive ? "active" : ""}`;
      card.innerHTML = `
        <div class="file-item-info">
          <div class="file-item-title" title="${safeTitle}">${safeTitle}</div>
          <div class="file-item-meta">
            <span class="file-item-badge">사용자</span>
            <span>${fileData.data.length} 문장</span>
          </div>
        </div>
        <button class="file-delete-btn" title="파일 삭제" aria-label="파일 삭제">🗑️</button>
      `;
      card.addEventListener("click", () => {
        if (state.currentFileId !== id) selectFile(id);
      });
      const deleteBtn = card.querySelector(".file-delete-btn");
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteCustomFile(id);
      });
      fileListDashboard.appendChild(card);
    });
  }

  // ── 파일 선택 처리 ──
  function selectFile(fileId) {
    state.currentFileId = fileId;
    state.mode = "all";
    syncModeUI();
    state.currentIndex = (state.progress[fileId] != null) ? state.progress[fileId] : 0;

    saveStateToStorage();
    populateFileDropdown();
    renderCurrentSentence();
    fileSelect.value = fileId;
  }

  // ── 커스텀 파일 삭제 처리 ──
  async function deleteCustomFile(fileId) {
    const fileTitle = state.customFiles[fileId] ? state.customFiles[fileId].title : "해당 파일";
    if (!confirm(`'${fileTitle}' 파일을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없으며, 학습 진도도 함께 삭제됩니다.`)) {
      return;
    }

    delete state.customFiles[fileId];
    delete state.progress[fileId];
    await removeCustomFile(fileId);

    if (state.currentFileId === fileId) {
      state.currentFileId = "default_interview";
      state.mode = "all";
      syncModeUI();
      state.currentIndex = (state.progress["default_interview"] != null) ? state.progress["default_interview"] : 0;
    }

    saveStateToStorage();
    populateFileDropdown();
    renderCurrentSentence();
    alert("파일이 안전하게 삭제되었습니다.");
  }

  // ── 데이터셋 추출 ──
  function getFullDataset() {
    if (state.currentFileId === "default_interview") return DEFAULT_STUDY_DATA;
    const custom = state.customFiles[state.currentFileId];
    return custom ? custom.data : DEFAULT_STUDY_DATA;
  }

  function getCurrentDataset() {
    const full = getFullDataset();
    if (state.mode === "starred") {
      return full.filter(d => state.starred.includes(d.id));
    }
    return full;
  }

  // 기본 교재만 노트의 리치 마크업을 신뢰. 사용자 임포트는 새니타이즈.
  function isTrustedFile() {
    return state.currentFileId === "default_interview";
  }

  // ── 학습 모드 토글 ──
  function syncModeUI() {
    modeOpts.forEach(o => o.classList.toggle("active", o.dataset.mode === state.mode));
  }

  function setMode(mode) {
    if (state.mode === mode) return;
    state.mode = mode;
    if (mode === "all") {
      state.currentIndex = (state.progress[state.currentFileId] != null) ? state.progress[state.currentFileId] : 0;
    } else {
      state.currentIndex = 0;
    }
    syncModeUI();
    saveStateToStorage();
    renderCurrentSentence();
  }

  // ── 빈 상태(복습 모드인데 별표 0개) 렌더 ──
  function renderEmptyState() {
    const myToken = ++renderToken;
    cardElement.classList.remove("fade-in");
    cardElement.classList.add("fade-out");
    setTimeout(() => {
      if (myToken !== renderToken) return;
      cardElement.innerHTML = `
        <div class="empty-state">
          <div class="empty-emoji">★</div>
          <h3>즐겨찾기한 문장이 없습니다</h3>
          <p>학습 중 별표(★) 버튼을 눌러 문장을 즐겨찾기에 추가한 뒤,<br>이곳에서 모아 복습할 수 있어요.</p>
          <button class="reveal-trigger" id="empty-back-btn">전체 학습으로 돌아가기</button>
        </div>
      `;
      cardElement.classList.remove("fade-out");
      cardElement.classList.add("fade-in");
    }, 150);
  }

  // ── 메인 카드 렌더링 ──
  function renderCurrentSentence() {
    if (typeof speechSynthesis !== "undefined") {
      window.speechSynthesis.cancel();
    }

    const dataset = getCurrentDataset();

    // 복습 모드 빈 상태 처리
    if (dataset.length === 0) {
      currentSentence = null;
      updateBookmarkUI(null);
      updateProgressUI(0);
      renderEmptyState();
      return;
    }

    if (state.currentIndex < 0) state.currentIndex = 0;
    if (state.currentIndex >= dataset.length) state.currentIndex = Math.max(0, dataset.length - 1);

    const data = dataset[state.currentIndex];
    if (!data) return;
    currentSentence = data;

    if (state.settings.alwaysShowTranslation) {
      state.revealed = true;
      cardElement.classList.add("revealed");
    } else {
      state.revealed = false;
      cardElement.classList.remove("revealed");
    }

    updateBookmarkUI(data.id);
    updateProgressUI(dataset.length);

    const trusted = isTrustedFile();
    const cardContentHTML = `
      <div class="card-header-info">
        <span class="speaker-tag">${escapeHtml(data.speaker || "SPEAKER")}</span>
        <span>SENTENCE ${state.currentIndex + 1}/${dataset.length}</span>
      </div>

      <div class="en-section">
        <div class="sentence-en-container">
          <div class="sentence-en" id="sentence-en-text">
            ${makeWordsClickable(data.en)}
          </div>
          <button class="speak-btn" id="card-speak-btn" aria-label="문장 듣기">🔊</button>
        </div>
      </div>

      <button class="reveal-trigger" id="reveal-trigger-btn">
        🔍 번역 및 학습 포인트 보기 (Space)
      </button>

      <div class="revealed-content">
        <div class="divider"></div>
        <div class="ko-section">
          <div class="sentence-ko">${escapeHtml(data.ko)}</div>
        </div>
        <div class="notes-section">
          ${renderNotesSection(data.notes, trusted)}
        </div>
      </div>
    `;

    const myToken = ++renderToken;
    cardElement.classList.remove("fade-in");
    cardElement.classList.add("fade-out");

    setTimeout(() => {
      if (myToken !== renderToken) return; // stale 렌더 가드
      cardElement.innerHTML = cardContentHTML;
      cardElement.classList.remove("fade-out");
      cardElement.classList.add("fade-in");
      if (state.settings.autoPlay) speak(data.en);
    }, 150);

    saveProgress();
  }

  // ── 영어 문장의 개별 단어를 클릭 가능하도록 랩핑 (이스케이프 후 처리) ──
  function makeWordsClickable(sentence) {
    const safe = escapeHtml(sentence);
    const wordRegex = /([A-Za-z'-]+)/g;
    return safe.replace(wordRegex, (match) => {
      const cleanWord = match.replace(/[^A-Za-z]/g, "").toLowerCase();
      if (cleanWord.length === 0) return match;
      return `<span class="word-span" role="button" tabindex="0" data-word="${escapeHtml(cleanWord)}">${match}</span>`;
    });
  }

  // ── 상세 설명(Notes) 영역 HTML 생성 ──
  function renderNotesSection(notes, trusted) {
    if (!notes) {
      return `
        <h3>💡 Vocabulary Tool</h3>
        <p style="color: var(--text-secondary); margin-bottom: 10px;">
          단어를 탭하면 상단 미니 팝업에서 상세 온라인 사전을 열어 즉시 탐색할 수 있습니다.
        </p>
      `;
    }

    const rich = (s) => trusted ? s : sanitizeRichText(s);
    let html = "";

    if (notes.words && notes.words.length > 0) {
      html += `
        <h3>📌 Key Vocabulary</h3>
        <div class="words-list">
          ${notes.words.map(w => `
            <div class="word-item">
              <span class="word-name">${escapeHtml(w.word)}</span>
              <span class="word-meaning">${escapeHtml(w.meaning)}</span>
              <a href="#" class="dict-link" data-word="${escapeHtml(String(w.word || "").toLowerCase())}">사전 🔍</a>
            </div>
          `).join("")}
        </div>
      `;
    }

    if (notes.structure) {
      html += `
        <h3>💡 Sentence Structure</h3>
        <div class="grammar-notes" style="border-top: none; padding-top: 0; margin-top: 0; margin-bottom: 12px;">
          ${rich(notes.structure)}
        </div>
      `;
    }

    if (notes.mustMemorize) {
      html += `
        <h3>🔥 Must Memorize</h3>
        <div class="idiom-notes" style="border-top: none; padding-top: 0; margin-top: 0; margin-bottom: 12px;">
          ${rich(notes.mustMemorize)}
        </div>
      `;
    }

    if (notes.pattern) {
      html += `
        <h3>🔄 Speaking Pattern Hint</h3>
        <div class="idiom-notes" style="border-top: none; padding-top: 0; margin-top: 0;">
          ${rich(notes.pattern)}
        </div>
      `;
    }

    return html || "<p style='color: var(--text-muted)'>상세 설명 정보가 없습니다.</p>";
  }

  // ── 번역 및 설명 영역 노출 ──
  function revealTranslation() {
    state.revealed = true;
    cardElement.classList.add("revealed");
  }

  // ── 별표/즐겨찾기 ──
  function toggleBookmark() {
    const dataset = getCurrentDataset();
    const data = dataset[state.currentIndex];
    if (!data) return;

    const idx = state.starred.indexOf(data.id);
    if (idx === -1) {
      state.starred.push(data.id);
    } else {
      state.starred.splice(idx, 1);
    }
    updateBookmarkUI(data.id);
    saveStateToStorage();

    // 복습 모드에서 별표 해제 시 목록이 줄어드므로 즉시 갱신
    if (state.mode === "starred") {
      renderCurrentSentence();
    }
  }

  function updateBookmarkUI(sentenceId) {
    const isOn = sentenceId != null && state.starred.includes(sentenceId);
    bookmarkBtn.classList.toggle("active", isOn);
    bookmarkBtn.disabled = (sentenceId == null);
  }

  // ── 진행바 및 제어 버튼 ──
  function updateProgressUI(totalCount) {
    const pct = totalCount > 0 ? ((state.currentIndex + 1) / totalCount) * 100 : 0;
    progressBar.style.width = `${pct}%`;
    progressText.textContent = totalCount > 0
      ? `${state.currentIndex + 1} / ${totalCount} (${Math.round(pct)}%)`
      : `0 / 0 (0%)`;

    prevBtn.disabled = totalCount === 0 || state.currentIndex === 0;
    nextBtn.disabled = totalCount === 0 || state.currentIndex === totalCount - 1;
  }

  // ── TTS 음성 합성 발음 (Web Speech API) ──
  function speak(text) {
    if (typeof speechSynthesis === "undefined") return;

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      setSpeakButtonActive(false);
      return;
    }

    const cleanText = text.replace(/<\/?[^>]+(>|$)/g, "");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "en-US";
    utterance.rate = state.settings.ttsSpeed;

    if (state.settings.ttsVoice) {
      const selectedVoice = availableVoices.find(v => v.name === state.settings.ttsVoice);
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        utterance.lang = selectedVoice.lang;
      }
    }

    utterance.onstart = () => setSpeakButtonActive(true);
    utterance.onend = () => setSpeakButtonActive(false);
    utterance.onerror = () => setSpeakButtonActive(false);

    window.speechSynthesis.speak(utterance);
  }

  function setSpeakButtonActive(active) {
    const speakBtn = document.getElementById("card-speak-btn");
    if (!speakBtn) return;
    if (active) {
      speakBtn.innerHTML = "⏹️";
      speakBtn.classList.add("speaking");
      speakBtn.setAttribute("aria-label", "음성 중단");
    } else {
      speakBtn.innerHTML = "🔊";
      speakBtn.classList.remove("speaking");
      speakBtn.setAttribute("aria-label", "문장 듣기");
    }
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
    const cleanWord = String(word || "").replace(/[^A-Za-z]/g, "").toLowerCase();
    if (!cleanWord) return;
    popupWord.textContent = cleanWord;
    dictNaver.href = `https://en.dict.naver.com/#/search?query=${encodeURIComponent(cleanWord)}`;
    dictCambridge.href = `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(cleanWord)}`;
    wordPopup.classList.add("active");
    dimOverlay.classList.add("active");
  }

  function hideWordPopup() {
    wordPopup.classList.remove("active");
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
    if (!wordPopup.classList.contains("active")) {
      dimOverlay.classList.remove("active");
    }
  }

  // ───────────────────────────────────────────────────────────
  // 외부 학습용 영어 파일 파서
  // ───────────────────────────────────────────────────────────

  // 1. HTML 파서 (data-speaker 우선, 없으면 번갈아 폴백)
  function parseHtmlTranscript(htmlText, fileName) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");
    const blocks = doc.querySelectorAll(".dialogue-block");
    const parsedData = [];

    let lastEnText = "";
    let pendingSpeaker = "";

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const enTextEl = block.querySelector(".en-text");
      const koTextEl = block.querySelector(".ko-text");
      const dsAttr = block.getAttribute("data-speaker");

      if (enTextEl) {
        lastEnText = enTextEl.textContent.trim();
        pendingSpeaker = dsAttr ? dsAttr.trim() : "";
      } else if (koTextEl && lastEnText) {
        const cleanKoText = koTextEl.textContent.trim();
        const koSpeaker = dsAttr ? dsAttr.trim() : "";
        const id = `custom_${fileName.replace(/[^a-z0-9]/gi, "_")}_${parsedData.length}`;

        // data-speaker 우선 (EN 블록 → KO 블록 순), 없으면 번갈아 추정
        let speaker = pendingSpeaker || koSpeaker;
        if (!speaker) {
          speaker = (parsedData.length % 2 === 0) ? "Rishi Sunak" : "Elon Musk";
        }

        parsedData.push({ id, speaker, en: lastEnText, ko: cleanKoText, notes: null });
        lastEnText = "";
        pendingSpeaker = "";
      }
    }

    return parsedData;
  }

  // 2. JSON 파서
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
  // ───────────────────────────────────────────────────────────
  // 분량 최적화(휴리스틱 청킹) — 임포트 시 카드 단위를 학습하기 좋은 크기로 재구성
  //  · 무료/오프라인 휴리스틱 (네트워크·비용 없음)
  //  · 정책: "병합 위주 + 보수적 분할" (EN·KO 문장 수가 1:1로 맞을 때만 분할하여 번역 어긋남 방지)
  //  · 화자(speaker) 경계는 절대 넘지 않음, 중요 노트가 있는 카드는 독립 유지
  // ───────────────────────────────────────────────────────────

  // 카드 분량 예산(목표 단어 수 근사치)
  const DENSITY_BUDGET = { short: 14, medium: 24, long: 38 };
  const DENSITY_ORDER = ["short", "medium", "long"];
  const DENSITY_LABEL = { short: "짧게", medium: "보통", long: "길게" };

  function syncDensityUI() {
    if (!cardDensitySlider) return;
    const idx = DENSITY_ORDER.indexOf(state.settings.cardDensity);
    cardDensitySlider.value = idx < 0 ? 1 : idx;
    cardDensityVal.textContent = DENSITY_LABEL[state.settings.cardDensity] || "보통";
  }

  // 문장 분리: 영문 종결부호 + 닫는 인용부호 뒤 공백 기준. 약어/소수점은 최소 보호.
  function splitIntoSentences(text) {
    if (text == null) return [];
    const s = String(text).trim();
    if (!s) return [];
    const marked = s
      // 소수점(1.5) 보호
      .replace(/(\d)\.(\d)/g, "$1$2")
      // 종결부호(., ?, !) + 선택적 닫는 인용부호 뒤에 공백이 오면 분리 지점 표시
      .replace(/([.?!]["”’']?)\s+/g, "$1");
    const parts = marked.split("")
      .map(p => p.replace(//g, ".").trim())
      .filter(Boolean);
    return parts.length ? parts : [s];
  }

  function countWords(en) {
    const m = String(en || "").match(/[A-Za-z'-]+/g);
    return m ? m.length : 0;
  }

  // 절(clause) 신호: 쉼표·세미콜론·접속사·관계사 → 구분성/복잡도 가중
  function clauseSignals(en) {
    const punct = (String(en || "").match(/[,;:]/g) || []).length;
    const conj = (String(en || "").match(/\b(and|but|or|so|because|that|which|who|whom|whose|when|while|if|although|though|however)\b/gi) || []).length;
    return punct + conj;
  }

  // 카드 인지 부하 추정치
  function cardLoad(card) {
    return countWords(card.en) + clauseSignals(card.en) * 1.5;
  }

  // 중요도: 필수 암기/패턴 노트가 있으면 독립 카드로 유지 선호
  function isImportantCard(card) {
    return !!(card.notes && (card.notes.mustMemorize || card.notes.pattern));
  }

  // 핵심 알고리즘: 원본 카드 배열 → 분량 최적화된 카드 배열 (원본 불변)
  function segmentDataset(cards, density) {
    if (!Array.isArray(cards)) return [];
    const budget = DENSITY_BUDGET[density] || DENSITY_BUDGET.medium;

    // 1단계: 보수적 분할 — 매우 긴 카드를 EN/KO 문장 수가 정확히 일치할 때만 문장 단위로 분할
    const expanded = [];
    cards.forEach(card => {
      const load = cardLoad(card);
      const enSents = splitIntoSentences(card.en);
      const koSents = splitIntoSentences(card.ko);
      const splittable = load > budget * 1.6 && enSents.length > 1 && enSents.length === koSents.length;
      if (splittable) {
        enSents.forEach((en, i) => {
          expanded.push({
            id: `${card.id}_s${i}`,
            speaker: card.speaker,
            en: en,
            ko: koSents[i],
            // 분할 시 노트는 정렬 보장이 안 되므로 첫 조각에만 유지
            notes: i === 0 ? (card.notes || null) : null
          });
        });
      } else {
        // 원본 참조 유지(이후 병합 단계에서 복사하여 불변 보장)
        expanded.push(card);
      }
    });

    // 2단계: 병합 — 같은 화자의 연속 짧은 카드를 예산 내에서 합침
    const merged = [];
    for (const card of expanded) {
      const last = merged[merged.length - 1];
      const canMerge = last
        && last.speaker === card.speaker
        && !isImportantCard(last) && !isImportantCard(card)
        && (cardLoad(last) + cardLoad(card)) <= budget;
      if (canMerge) {
        last.en = `${last.en} ${card.en}`.trim();
        last.ko = `${last.ko} ${card.ko}`.trim();
        if (!last.notes && card.notes) last.notes = card.notes;
      } else {
        // 새 카드는 복사본으로 push → 입력(cards/rawData) 불변 보장
        merged.push({ id: card.id, speaker: card.speaker, en: card.en, ko: card.ko, notes: card.notes || null });
      }
    }
    return merged;
  }

  // 분량 설정 변경 시 현재 커스텀 파일을 rawData로부터 재분할 (기본 교재는 큐레이션 유지)
  async function reSegmentCurrentFile() {
    const id = state.currentFileId;
    if (id === "default_interview") return;
    const f = state.customFiles[id];
    if (!f || !f.rawData) return; // 구버전(원본 미보존) 파일은 재분할 불가
    f.data = segmentDataset(f.rawData, state.settings.cardDensity);
    f.density = state.settings.cardDensity;
    f.updatedAt = Date.now();
    state.currentIndex = 0;
    state.progress[id] = 0;
    await saveCustomFile(id, {
      title: f.title, rawData: f.rawData, data: f.data,
      density: f.density, createdAt: f.createdAt, updatedAt: f.updatedAt
    });
    saveStateToStorage();
    populateFileDropdown();
    renderCurrentSentence();
  }

  async function loadAndActivateNewDataset(title, rawParsed) {
    if (!rawParsed || rawParsed.length === 0) {
      alert("파싱된 문장 데이터가 없습니다. 포맷을 다시 확인해 주세요.");
      return;
    }

    // 임포트 시점에 분량 최적화 알고리즘 적용 (원본은 rawData로 보존 → 분량 재조정 가능)
    const density = state.settings.cardDensity;
    const data = segmentDataset(rawParsed, density);

    const fileId = `file_${Date.now()}`;
    const now = Date.now();
    const fileObj = { title, rawData: rawParsed, data, density, createdAt: now, updatedAt: now };
    state.customFiles[fileId] = { title, rawData: rawParsed, data, density, createdAt: now, updatedAt: now };

    const ok = await saveCustomFile(fileId, fileObj);
    if (!ok) {
      delete state.customFiles[fileId]; // 저장 실패 시 롤백
      return;
    }

    state.currentFileId = fileId;
    state.mode = "all";
    syncModeUI();
    state.currentIndex = 0;
    state.progress[fileId] = 0;

    saveStateToStorage();
    populateFileDropdown();
    renderCurrentSentence();

    alert(`성공! [${title}]\n원문 ${rawParsed.length}개 → 분량 최적화 후 ${data.length}개 카드로 구성되었습니다.`);
    closeSettings();
  }

  // ── 이벤트 핸들러 바인딩 ──
  function bindEvents() {
    settingsBtn.addEventListener("click", openSettings);
    closeSettingsBtn.addEventListener("click", closeSettings);
    dimOverlay.addEventListener("click", () => {
      closeSettings();
      hideWordPopup();
    });

    fileSelect.addEventListener("change", (e) => selectFile(e.target.value));

    prevBtn.addEventListener("click", () => navigate("prev"));
    nextBtn.addEventListener("click", () => navigate("next"));
    bookmarkBtn.addEventListener("click", toggleBookmark);

    // 학습 모드 토글
    modeOpts.forEach(o => o.addEventListener("click", () => setMode(o.dataset.mode)));

    // ── 카드 영역 이벤트 위임 (단어/사전/버튼) ──
    cardElement.addEventListener("click", (e) => {
      const wordEl = e.target.closest(".word-span");
      if (wordEl) {
        e.stopPropagation();
        showWordPopup(wordEl.dataset.word);
        return;
      }
      const dictEl = e.target.closest(".dict-link");
      if (dictEl) {
        e.preventDefault();
        e.stopPropagation();
        showWordPopup(dictEl.dataset.word);
        return;
      }
      if (e.target.closest("#reveal-trigger-btn")) {
        revealTranslation();
        return;
      }
      if (e.target.closest("#card-speak-btn")) {
        if (currentSentence) speak(currentSentence.en);
        return;
      }
      if (e.target.closest("#empty-back-btn")) {
        setMode("all");
        return;
      }
    });

    // 단어 키보드 접근성 (Enter/Space)
    cardElement.addEventListener("keydown", (e) => {
      const wordEl = e.target.closest && e.target.closest(".word-span");
      if (wordEl && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        showWordPopup(wordEl.dataset.word);
      }
    });

    // 설정: 테마
    themeOpts.forEach(opt => {
      opt.addEventListener("click", () => setupTheme(opt.dataset.theme));
    });

    // 설정: 폰트 크기
    fontSizeSlider.addEventListener("input", (e) => {
      const sizes = ["sm", "md", "lg", "xl"];
      setupFontSize(sizes[parseInt(e.target.value)]);
    });

    // 설정: 카드 분량 (변경 시 현재 가져온 파일을 재분할)
    if (cardDensitySlider) {
      cardDensitySlider.addEventListener("change", (e) => {
        const idx = parseInt(e.target.value);
        state.settings.cardDensity = DENSITY_ORDER[idx] || "medium";
        cardDensityVal.textContent = DENSITY_LABEL[state.settings.cardDensity] || "보통";
        saveSettingsToStorage();
        reSegmentCurrentFile();
      });
      cardDensitySlider.addEventListener("input", (e) => {
        const idx = parseInt(e.target.value);
        cardDensityVal.textContent = DENSITY_LABEL[DENSITY_ORDER[idx]] || "보통";
      });
    }

    // 설정: TTS 배속
    ttsSpeedSlider.addEventListener("input", (e) => {
      const speed = parseFloat(e.target.value);
      state.settings.ttsSpeed = speed;
      ttsSpeedVal.textContent = `${speed.toFixed(2)}x`;
      saveSettingsToStorage();
    });

    // 설정: 목소리
    voiceSelect.addEventListener("change", (e) => {
      state.settings.ttsVoice = e.target.value;
      saveSettingsToStorage();
    });

    // 설정: 자동 재생
    autoPlayToggle.addEventListener("change", (e) => {
      state.settings.autoPlay = e.target.checked;
      saveSettingsToStorage();
    });

    // 설정: 번역 상시 노출
    if (alwaysShowToggle) {
      alwaysShowToggle.addEventListener("change", (e) => {
        state.settings.alwaysShowTranslation = e.target.checked;
        saveSettingsToStorage();
        renderCurrentSentence();
      });
    }

    popupClose.addEventListener("click", hideWordPopup);

    // 파일 업로드
    fileUploadInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (evt) {
        const text = evt.target.result;
        const name = file.name;
        try {
          if (name.endsWith(".html") || name.endsWith(".htm")) {
            const parsed = parseHtmlTranscript(text, name);
            loadAndActivateNewDataset(name.replace(/\.[^/.]+$/, ""), parsed);
          } else if (name.endsWith(".json")) {
            const parsed = parseJsonDataset(text);
            loadAndActivateNewDataset(name.replace(/\.[^/.]+$/, ""), parsed);
          } else {
            const parsed = parseRawText(text);
            loadAndActivateNewDataset(name.replace(/\.[^/.]+$/, ""), parsed);
          }
        } catch (err) {
          alert(`파일 파싱에 실패했습니다:\n${err.message}`);
        }
      };
      reader.readAsText(file);
      // 같은 파일 재선택 가능하도록 초기화
      e.target.value = "";
    });

    // 직접 붙여넣기
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
        textPasteArea.value = "";
      } catch (err) {
        alert(`텍스트 파싱 오류: ${err.message}`);
      }
    });

    // 데스크톱 키보드 단축키
    window.addEventListener("keydown", (e) => {
      if (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA") {
        return;
      }
      const key = e.key;
      if (key === " ") {
        e.preventDefault();
        if (!state.revealed) revealTranslation();
      } else if (key === "ArrowLeft") {
        e.preventDefault();
        navigate("prev");
      } else if (key === "ArrowRight") {
        e.preventDefault();
        navigate("next");
      } else if (key === "Enter") {
        e.preventDefault();
        if (currentSentence) speak(currentSentence.en);
      }
    });

    // 모바일 스와이프 제스처
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
      const threshold = 60;
      const diff = touchStartX - touchEndX;
      if (Math.abs(diff) > threshold) {
        if (diff > 0) navigate("next");
        else navigate("prev");
      }
    }
  }

  // ── 실행 ──
  init();
});
