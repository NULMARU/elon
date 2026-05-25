/**
 * 영한번역 영어 학습 웹앱 - 코어 애플리케이션 스크립트 (app.js)
 * v1.3.5 - 즐겨찾기 복습 모드 / PWA / IndexedDB 저장소 / 파일별 진도 / 핵심 웹문장 추출 정밀화
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
      cardDensity: "medium",       // 카드 분량: "short" | "medium" | "long" (임포트 시 청킹 기준)
      autoEnrichImports: true,     // 업로드 자료에 번역/설명이 없을 때 자동 보강
      externalAutoTranslate: true  // 번역 누락 시 외부 번역 서비스 사용 (문장 단위 전송)
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

  // ── URL 추출 결과의 제목을 다음 카드 저장에 연결 ──
  let pendingWebImport = null;

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
  const autoEnrichToggle = document.getElementById("auto-enrich-toggle");
  const externalTranslateToggle = document.getElementById("external-translate-toggle");
  const cardDensitySlider = document.getElementById("card-density-slider");
  const cardDensityVal = document.getElementById("card-density-val");

  // 파일 추가 입력기
  const fileUploadInput = document.getElementById("file-upload");
  const urlPasteInput = document.getElementById("url-paste");
  const urlImportBtn = document.getElementById("url-import-btn");
  const urlImportStatus = document.getElementById("url-import-status");
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
    if (autoEnrichToggle) {
      autoEnrichToggle.checked = state.settings.autoEnrichImports;
    }
    if (externalTranslateToggle) {
      externalTranslateToggle.checked = state.settings.externalAutoTranslate;
      externalTranslateToggle.disabled = !state.settings.autoEnrichImports;
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
      const savedAutoEnrich = localStorage.getItem("yh_autoEnrichImports") !== "false"; // 기본값 true
      const savedExternalTranslate = localStorage.getItem("yh_externalAutoTranslate") !== "false"; // 기본값 true
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
        cardDensity: (["short", "medium", "long"].includes(savedDensity) ? savedDensity : "medium"),
        autoEnrichImports: savedAutoEnrich,
        externalAutoTranslate: savedExternalTranslate
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
      localStorage.setItem("yh_autoEnrichImports", state.settings.autoEnrichImports);
      localStorage.setItem("yh_externalAutoTranslate", state.settings.externalAutoTranslate);
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

  // 1. HTML 파서
  //    - 전용 dialogue-block 형식 우선
  //    - 일반 HTML 문서의 문단/목록/표 셀도 EN/KO 순서로 자동 페어링
  //    - 한국어 번역이 없는 영어 HTML은 영어 전용 카드로 가져오기
  function parseHtmlTranscript(htmlText, fileName) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");
    const idPrefix = safeImportIdPrefix(fileName);

    const structured = parseStructuredDialogueBlocks(doc, idPrefix);
    if (structured.length > 0) return structured;

    const loose = parseLooseHtmlText(doc, idPrefix);
    if (loose.length > 0) return loose;

    return parseEnglishOnlyHtml(doc, idPrefix);
  }

  function parseStructuredDialogueBlocks(doc, idPrefix) {
    const blocks = Array.from(doc.querySelectorAll(".dialogue-block"));
    const parsedData = [];

    let pending = null;

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      const enText = cleanImportText(block.querySelector(".en-text")?.textContent || "");
      const koText = cleanImportText(block.querySelector(".ko-text")?.textContent || "");
      const speaker = readImportSpeaker(block, parsedData.length);

      if (enText && koText) {
        parsedData.push(makeImportedCard(idPrefix, parsedData.length, speaker, enText, koText));
        pending = null;
      } else if (enText) {
        pending = { speaker, en: enText };
      } else if (koText && pending) {
        parsedData.push(makeImportedCard(idPrefix, parsedData.length, pending.speaker || speaker, pending.en, koText));
        pending = null;
      }
    }

    return parsedData;
  }

  function parseLooseHtmlText(doc, idPrefix) {
    const readableLines = collectReadableHtmlLines(doc);
    const fromLineSequence = parseLineSequenceHtml(readableLines, idPrefix);
    if (fromLineSequence.length > 0) return fromLineSequence;

    const directEntries = [];
    const selector = [
      ".en-text", ".english", ".eng", "[lang^='en']", "[data-lang='en']",
      ".ko-text", ".korean", ".kor", "[lang^='ko']", "[data-lang='ko']"
    ].join(",");

    Array.from(doc.querySelectorAll(selector)).forEach(el => {
      const text = cleanImportText(el.textContent || "");
      if (isImportNoise(text)) return;
      const lang = detectImportLanguage(text, el);
      if (lang === "en" || lang === "ko") {
        directEntries.push({ lang, text, speaker: readImportSpeaker(el, directEntries.length) });
      }
    });

    const fromDirect = pairImportEntries(directEntries, idPrefix);
    if (fromDirect.length > 0) return fromDirect;

    const entries = [];
    const pairedLines = [];
    readableLines.forEach((line, index) => {
      const pair = splitInlineImportPair(line);
      if (pair) {
        pairedLines.push(makeImportedCard(idPrefix, pairedLines.length, "Tutor", pair.en, pair.ko, buildNotesFromImportLines(pair.notes || [])));
        return;
      }

      const extracted = extractSpeakerPrefix(line);
      const lang = detectImportLanguage(extracted.text);
      if (lang === "en" || lang === "ko") {
        entries.push({
          lang,
          text: extracted.text,
          speaker: extracted.speaker || (index % 2 === 0 ? "Speaker A" : "Speaker B")
        });
      }
    });

    return [...pairedLines, ...pairImportEntries(entries, idPrefix, pairedLines.length)];
  }

  function parseEnglishOnlyHtml(doc, idPrefix) {
    const seen = new Set();
    const cards = [];

    collectReadableHtmlLines(doc).forEach(line => {
      const extracted = extractSpeakerPrefix(line);
      const text = extracted.text;
      if (detectImportLanguage(text) !== "en") return;

      const chunks = splitPlainEnglishTextEntries(text);
      chunks.forEach(entry => {
        const clean = cleanImportText(entry.text);
        if (!isEnglishImportCandidate(clean) || seen.has(clean.toLowerCase())) return;
        seen.add(clean.toLowerCase());
        cards.push(makeImportedCard(
          idPrefix,
          cards.length,
          extracted.speaker || "Speaker",
          clean,
          "번역 없음 - 영어 원문만 가져왔습니다.",
          null,
          { preserveUnit: entry.preserveUnit }
        ));
      });
    });

    return cards;
  }

  function collectReadableHtmlLines(doc) {
    const root = doc.body || doc;
    Array.from(root.querySelectorAll("script, style, noscript, svg, canvas, audio, video")).forEach(el => el.remove());

    const blocks = Array.from(root.querySelectorAll("p, li, blockquote, td, th, h1, h2, h3, h4, h5, h6, div, section, article"));
    const lines = blocks
      .filter(el => isReadableImportElement(el))
      .map(el => cleanImportText(el.textContent || ""))
      .filter(text => !isImportNoise(text));

    if (lines.length > 0) return uniqueImportLines(lines);

    const fallback = cleanImportText(root.textContent || "");
    if (!fallback) return [];
    const englishUnits = splitPlainEnglishText(root.textContent || "");
    return englishUnits.length
      ? uniqueImportLines(englishUnits)
      : uniqueImportLines(splitIntoSentences(fallback).filter(text => !isImportNoise(text)));
  }

  // 1-B. 웹주소 → 핵심 영어 문단 추출
  // 브라우저 CORS 제약 때문에 직접 fetch 후 실패하면 읽기용 텍스트 프록시를 사용합니다.
  const WEB_READER_PREFIX = "https://r.jina.ai/http://";
  const WEB_IMPORT_MAX_PARAGRAPHS = 6;
  const WEB_IMPORT_MAX_CHARS = 2200;
  const URL_TOKEN_STOP_WORDS = new Set([
    "about", "after", "again", "also", "article", "before", "best", "coming", "deep", "from",
    "heres", "here", "into", "must", "news", "over", "page", "pass", "review", "reviews",
    "soon", "test", "that", "this", "what", "when", "where", "with", "your"
  ]);

  async function extractLearningTextFromUrl(inputUrl) {
    const url = normalizeWebImportUrl(inputUrl);
    const attempts = [
      { label: "reader", url: buildReaderUrl(url), kind: "reader" },
      { label: "direct", url, kind: "direct" }
    ];

    let lastError = "";
    for (const attempt of attempts) {
      try {
        const raw = await fetchTextWithTimeout(attempt.url, 15000);
        const result = extractCoreEnglishFromWebText(raw, url, attempt.kind);
        if (result.text) {
          return { ...result, sourceUrl: url, via: attempt.label };
        }
      } catch (err) {
        lastError = err?.message || String(err);
      }
    }

    throw new Error(lastError || "웹페이지에서 학습할 영어 문단을 찾지 못했습니다.");
  }

  function normalizeWebImportUrl(inputUrl) {
    const trimmed = cleanImportText(inputUrl);
    if (!trimmed) throw new Error("웹주소를 입력해 주세요.");
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    let url;
    try {
      url = new URL(withProtocol);
    } catch (e) {
      throw new Error("올바른 웹주소 형식이 아닙니다.");
    }
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("http 또는 https 주소만 가져올 수 있습니다.");
    }
    return url.toString();
  }

  function buildReaderUrl(url) {
    return `${WEB_READER_PREFIX}${url}`;
  }

  async function fetchTextWithTimeout(url, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) throw new Error(`웹 요청 실패 (${res.status})`);
      return await res.text();
    } finally {
      clearTimeout(timer);
    }
  }

  function extractCoreEnglishFromWebText(rawText, sourceUrl, kind) {
    const prepared = kind === "direct" && looksLikeHtml(rawText)
      ? htmlToReadableText(rawText)
      : stripReaderMarkdown(rawText);
    const coreText = isolateCoreWebText(prepared, sourceUrl);
    const sections = buildWebTextSections(coreText);
    const selected = selectCoreWebParagraphs(sections, sourceUrl);
    const text = selected.map(item => item.text).join("\n\n");
    return {
      text,
      paragraphCount: selected.length,
      title: deriveWebImportTitle(prepared, sourceUrl)
    };
  }

  function htmlToReadableText(htmlText) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlText, "text/html");
    const title = cleanImportText(doc.querySelector("title")?.textContent || "");
    const description = cleanImportText(doc.querySelector("meta[name='description']")?.getAttribute("content") || "");
    const root = doc.querySelector("main, article, [role='main']") || doc.body || doc;
    Array.from(root.querySelectorAll("script, style, noscript, svg, canvas, audio, video, nav, footer, header, form")).forEach(el => el.remove());
    const lines = Array.from(root.querySelectorAll("h1, h2, h3, p, li, blockquote"))
      .map(el => {
        const tag = el.tagName.toLowerCase();
        const text = cleanImportText(el.textContent || "");
        if (!text) return "";
        return /^h[1-3]$/.test(tag) ? `# ${text}` : text;
      })
      .filter(Boolean);
    return [title ? `Title: ${title}` : "", description, "Markdown Content:", ...lines].filter(Boolean).join("\n\n");
  }

  function stripReaderMarkdown(rawText) {
    const lines = normalizeImportMultilineText(rawText).split("\n");
    const start = lines.findIndex(line => /^Markdown Content:/i.test(line.trim()));
    const bodyLines = start >= 0 ? lines.slice(start + 1) : lines;
    return bodyLines
      .map(line => line
        .replace(/!\[[^\]]*]\([^)]*\)/g, "")
        .replace(/\[]\([^)]*\)/g, "")
        .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
        .replace(/^\s*[*+-]\s+/, "")
        .replace(/\s{2,}/g, " ")
        .trim())
      .join("\n");
  }

  function isolateCoreWebText(text, sourceUrl) {
    const lines = normalizeImportMultilineText(text)
      .split("\n")
      .map(line => line.trim());
    if (!lines.some(Boolean)) return "";

    const startIndex = findArticleStartIndex(lines, sourceUrl);
    const sliced = startIndex >= 0 ? lines.slice(startIndex) : lines;
    const kept = [];
    let contentLineCount = 0;

    for (const rawLine of sliced) {
      const line = rawLine.trim();
      if (!line) {
        if (kept.length > 0 && kept[kept.length - 1] !== "") kept.push("");
        continue;
      }
      if (contentLineCount >= 3 && isArticleEndMarker(line)) break;
      if (shouldSkipWebArticleLine(line)) continue;
      kept.push(line);
      if (!/^#{1,6}\s+/.test(line)) contentLineCount += 1;
    }

    return kept.join("\n");
  }

  function findArticleStartIndex(lines, sourceUrl) {
    let best = { index: -1, score: 0 };
    lines.forEach((line, index) => {
      if (!/^#{1,6}\s+/.test(line)) return;
      const clean = cleanImportText(line.replace(/^#{1,6}\s+/, ""));
      if (!isLikelyArticleHeading(clean)) return;
      const score = scoreArticleHeading(clean, sourceUrl, index);
      if (score > best.score) best = { index, score };
    });
    return best.score >= 14 ? best.index : -1;
  }

  function isLikelyArticleHeading(text) {
    const clean = cleanImportText(text);
    const words = clean.match(/[A-Za-z][A-Za-z'-]*/g) || [];
    if (words.length < 5 || words.length > 24) return false;
    if (isWebImportNoiseLine(clean) || isArticleEndMarker(clean)) return false;
    if (/^(table of contents|contents|latest stories|most popular|popular articles)$/i.test(clean)) return false;
    return true;
  }

  function scoreArticleHeading(text, sourceUrl, index) {
    const lower = text.toLowerCase();
    const urlTokens = extractUrlTokens(sourceUrl);
    let score = 0;
    urlTokens.forEach(token => {
      if (lower.includes(token)) score += 7;
    });
    if (/[.?!:]|['"“”]/.test(text)) score += 3;
    if (index > 10) score += 2;
    if (countWords(text) >= 7) score += 3;
    return score;
  }

  function shouldSkipWebArticleLine(line) {
    const clean = cleanImportText(line.replace(/^#{1,6}\s+/, ""));
    if (!clean) return true;
    if (/^\{?[A-Z-]+\s+Replaced\}?$/i.test(clean)) return true;
    if (/^\(?Credit:|^Photo:|^Image:|^Source:/i.test(clean)) return true;
    if (isWebImportNoiseLine(clean)) return true;
    return false;
  }

  function isArticleEndMarker(line) {
    const clean = cleanImportText(line.replace(/^#{1,6}\s+/, ""));
    if (!clean) return false;
    return /^(about our expert|about the author|author bio|recommended for you|related articles|more from|more recommendations|based on these stories|popular reviews|popular product comparisons|top explainers|popular brands|best products|best picks|latest stories|latest news|follow pcmag|honest, objective, lab-tested reviews|what our ratings mean|read full review|pros & cons|specs & configurations|my best recommendation|here's what i found|keep scrolling|keep reading|hello!|i'm maggie|meet maggie|ask me|newsletter|sign up|subscribe|about pcmag|about ziff davis|advertise with us|privacy policy|terms of use|accessibility|do not sell|events|series)$/i.test(clean);
  }

  function buildWebTextSections(text) {
    const sections = [];
    let current = { heading: "", paragraphs: [] };
    let paragraphLines = [];

    const flushParagraph = () => {
      if (paragraphLines.length === 0) return;
      const paragraph = cleanImportText(paragraphLines.join(" "));
      if (paragraph) current.paragraphs.push(paragraph);
      paragraphLines = [];
    };

    normalizeImportMultilineText(text).split("\n").forEach(rawLine => {
      const line = rawLine.trim();
      if (!line) {
        flushParagraph();
        return;
      }
      const headingMatch = line.match(/^#{1,6}\s+(.+)$/);
      if (headingMatch) {
        flushParagraph();
        if (current.heading || current.paragraphs.length > 0) sections.push(current);
        current = { heading: cleanImportText(headingMatch[1]), paragraphs: [] };
        return;
      }
      if (isWebImportNoiseLine(line)) {
        flushParagraph();
        return;
      }
      paragraphLines.push(line);
    });

    flushParagraph();
    if (current.heading || current.paragraphs.length > 0) sections.push(current);
    return sections;
  }

  function selectCoreWebParagraphs(sections, sourceUrl) {
    const candidates = [];
    sections.forEach((section, sectionIndex) => {
      section.paragraphs.forEach((paragraph, paragraphIndex) => {
        const text = cleanWebParagraph(paragraph);
        if (!isUsefulWebParagraph(text)) return;
        candidates.push({
          text,
          sectionIndex,
          paragraphIndex,
          score: scoreWebParagraph(text, section.heading, sourceUrl)
        });
      });
    });

    const ordered = candidates
      .sort((a, b) => a.sectionIndex - b.sectionIndex || a.paragraphIndex - b.paragraphIndex);
    const strong = ordered.filter((item, index) => index < 3 || item.score >= 34);
    const ranked = (strong.length >= 4 ? strong : ordered)
      .slice(0, WEB_IMPORT_MAX_PARAGRAPHS);

    const selected = [];
    let totalChars = 0;
    ranked.forEach(item => {
      if (totalChars + item.text.length > WEB_IMPORT_MAX_CHARS && selected.length >= 5) return;
      selected.push(item);
      totalChars += item.text.length;
    });

    if (selected.length > 0) return selected;
    return candidates.slice(0, 8);
  }

  function cleanWebParagraph(text) {
    return cleanImportText(text)
      .replace(/"\)/g, "")
      .replace(/\)(?=[.,;:])/g, "")
      .replace(/([.?!])(?=[A-Z“”])/g, "$1 ")
      .replace(/Click through[^.?!]*[.?!]/gi, "")
      .replace(/\s+([”’])/g, "$1")
      .replace(/\s+-\s*$/, "")
      .replace(/\s{2,}/g, " ");
  }

  function isUsefulWebParagraph(text) {
    const clean = cleanImportText(text);
    const words = clean.match(/[A-Za-z][A-Za-z'-]*/g) || [];
    const koreanCount = (clean.match(/[가-힣]/g) || []).length;
    if (koreanCount > 0 || words.length < 8 || words.length > 120) return false;
    if (isWebImportNoiseLine(clean)) return false;
    if ((clean.match(/\d/g) || []).length > clean.length * 0.35) return false;
    return /[.?!]["”’']?$/.test(clean) || words.length >= 14;
  }

  function isWebImportNoiseLine(line) {
    const clean = cleanImportText(line);
    if (!clean || clean.length < 3) return true;
    if (/^(title|url source|published time|markdown content):/i.test(clean)) return true;
    if (/^(vehicles|human spaceflight|company|shop|upcoming launches|all upcoming launches|careers|updates|content|privacy policy|terms of use|suppliers|learn more|droneship|landing zone)$/i.test(clean)) return true;
    if (/^(home|news|ai|artificial intelligence|deals|reviews|how-to|how to|products|best products|computing|mobile|security|software|business|entertainment)$/i.test(clean)) return true;
    if (/^(video|image)\s*\d+/i.test(clean)) return true;
    if (/^\[]\(/.test(clean)) return true;
    if (/^t-\s*$/i.test(clean) || /^[\d\s:.-]+$/.test(clean)) return true;
    if (/^by\s+[A-Z][A-Za-z .'-]{2,}$/i.test(clean)) return true;
    if (/^(may|june|july|august|september|october|november|december|january|february|march|april)\s+\d{1,2},\s+\d{4}$/i.test(clean)) return true;
    if (/^(share|social share|facebook|x\/twitter|twitter|threads|bluesky|reddit|linkedin|flipboard|pinterest|email)$/i.test(clean)) return true;
    if (/\b(threads|bluesky|reddit|facebook|linkedin|pinterest|flipboard|twitter)\b/i.test(clean) && clean.length < 120) return true;
    if (/^(copied|error!|copy link|comments|keep watching|recommended by our editors)$/i.test(clean)) return true;
    if (/^https?:\/\//i.test(clean)) return true;
    if (/^©|copyright|trademark|privacy|mailto:|interested in becoming/i.test(clean)) return true;
    if (/^(starlink|starshield|xai|grok|grokipedia|terafab|spacex)$/i.test(clean)) return true;
    if (/maggie|ai-powered assistant|trained exclusively|affiliate links|pcmag editors select|may contain advertising|advertisement|sponsored|coupon|deal of the day/i.test(clean)) return true;
    if (/^(get our best stories|sign up for|subscribe to|follow us|join our newsletter|our expert industry analysis)/i.test(clean)) return true;
    if (/^\*+\s*$/.test(clean)) return true;
    return false;
  }

  function scoreWebParagraph(text, heading, sourceUrl) {
    const lower = `${heading} ${text}`.toLowerCase();
    const wordCount = countWords(text);
    const urlTokens = extractUrlTokens(sourceUrl);
    const coreKeywords = [
      "mission", "space", "spaceflight", "rocket", "launch", "reusable", "reusability",
      "spacecraft", "orbit", "mars", "moon", "human", "starship", "falcon", "dragon",
      "landing", "facility", "history", "development", "testing", "commercial"
    ];
    let score = Math.min(wordCount, 60);
    urlTokens.forEach(token => {
      if (token.length >= 4 && lower.includes(token)) score += 18;
    });
    coreKeywords.forEach(token => {
      if (lower.includes(token)) score += 6;
    });
    if (heading && !isWebImportNoiseLine(heading)) score += 8;
    if (wordCount >= 16 && wordCount <= 70) score += 12;
    if (/click through|learn more|please email|privacy|suppliers/i.test(text)) score -= 30;
    return score;
  }

  function extractUrlTokens(url) {
    try {
      const parsed = new URL(url);
      return parsed.pathname
        .split(/[/-]+/)
        .map(token => token.toLowerCase().replace(/[^a-z0-9]/g, ""))
        .filter(token => token.length >= 4 && !URL_TOKEN_STOP_WORDS.has(token));
    } catch (e) {
      return [];
    }
  }

  function deriveWebImportTitle(text, sourceUrl) {
    const lines = normalizeImportMultilineText(text)
      .split("\n")
      .map(line => line.trim());
    const titleLine = lines.find(line => /^Title:/i.test(line));
    const headingLine = lines.find(line => /^#{1,6}\s+/.test(line) && !isWebImportNoiseLine(line.replace(/^#{1,6}\s+/, "")));
    const rawTitle = titleLine
      ? titleLine.replace(/^Title:\s*/i, "")
      : (headingLine || "").replace(/^#{1,6}\s+/, "");
    const cleanTitle = cleanImportText(rawTitle)
      .replace(/\s+\|\s+.*$/, "")
      .replace(/\s+-\s+.*$/, "");
    if (cleanTitle && cleanTitle.length <= 90) return cleanTitle;
    try {
      const parsed = new URL(sourceUrl);
      const path = parsed.pathname.split("/").filter(Boolean).pop() || parsed.hostname;
      return path.replace(/[-_]+/g, " ").replace(/\b\w/g, ch => ch.toUpperCase());
    } catch (e) {
      return "웹 추출 자료";
    }
  }

  function parseLineSequenceHtml(lines, idPrefix) {
    const parsedData = [];
    let pending = null;

    const finalizePending = () => {
      if (!pending) return;
      if (pending.en && pending.ko) {
        parsedData.push(makeImportedCard(
          idPrefix,
          parsedData.length,
          pending.speaker,
          pending.en,
          pending.ko,
          buildNotesFromImportLines(pending.notes)
        ));
      }
      pending = null;
    };

    lines.forEach((line, index) => {
      const pair = splitInlineImportPair(line);
      if (pair) {
        finalizePending();
        parsedData.push(makeImportedCard(
          idPrefix,
          parsedData.length,
          "Tutor",
          pair.en,
          pair.ko,
          buildNotesFromImportLines(pair.notes || [])
        ));
        return;
      }

      const extracted = extractSpeakerPrefix(line);
      const rawText = cleanImportText(extracted.text);
      const text = stripImportLabel(rawText);
      if (!text || isImportNoise(text)) return;

      if (isEnglishCardLine(text)) {
        finalizePending();
        pending = {
          speaker: extracted.speaker || (index % 2 === 0 ? "Speaker A" : "Speaker B"),
          en: text,
          ko: "",
          notes: []
        };
        return;
      }

      if (!pending) return;

      if (!pending.ko && isKoreanImportLine(text)) {
        pending.ko = text;
        return;
      }

      if (isUsefulNoteLine(rawText)) {
        pending.notes.push(rawText);
      }
    });

    finalizePending();
    return parsedData;
  }

  function pairImportEntries(entries, idPrefix, offset = 0) {
    const parsedData = [];
    let pending = null;

    entries.forEach(entry => {
      if (entry.lang === "en") {
        pending = entry;
      } else if (entry.lang === "ko" && pending) {
        parsedData.push(makeImportedCard(
          idPrefix,
          offset + parsedData.length,
          pending.speaker || entry.speaker,
          pending.text,
          entry.text
        ));
        pending = null;
      }
    });

    return parsedData;
  }

  function splitInlineImportPair(line) {
    const candidates = line.includes("|")
      ? line.split("|")
      : line.includes("::")
        ? line.split("::")
        : null;

    if (candidates && candidates.length >= 2) {
      const en = cleanImportText(candidates[0]);
      const ko = cleanImportText(candidates.slice(1).join(" "));
      if (isEnglishCardLine(en) && isKoreanImportLine(ko)) return { en, ko };
    }

    const koreanStart = line.search(/[가-힣]/);
    if (koreanStart > 10) {
      const en = cleanImportText(line.slice(0, koreanStart).replace(/[-–—:：/]+$/, ""));
      const ko = cleanImportText(line.slice(koreanStart));
      if (isEnglishCardLine(en) && isKoreanImportLine(ko)) return { en, ko };
    }

    return null;
  }

  function extractSpeakerPrefix(line) {
    const match = line.match(/^([A-Z][A-Za-z .'-]{0,40}|[A-D]|Q|A|Speaker\s*\d+)\s*[:：]\s*(.+)$/);
    if (!match) return { speaker: "", text: line };
    return { speaker: match[1].trim(), text: cleanImportText(match[2]) };
  }

  function detectImportLanguage(text, el) {
    const meta = el
      ? `${el.className || ""} ${el.getAttribute("lang") || ""} ${el.getAttribute("data-lang") || ""}`.toLowerCase()
      : "";
    if (/\b(en|eng|english|en-text)\b/.test(meta)) return "en";
    if (/\b(ko|kor|korean|ko-text)\b/.test(meta)) return "ko";

    const koreanCount = (text.match(/[가-힣]/g) || []).length;
    const englishCount = (text.match(/[A-Za-z]/g) || []).length;
    if (englishCount >= 3 && koreanCount === 0) return "en";
    if (koreanCount >= 2 && englishCount < 12) return "ko";
    if (koreanCount >= 8 && koreanCount > englishCount / 2) return "ko";
    return "mixed";
  }

  function isReadableImportElement(el) {
    const text = cleanImportText(el.textContent || "");
    if (isImportNoise(text)) return false;

    const tag = el.tagName.toLowerCase();
    if (["p", "li", "blockquote", "td", "th", "h1", "h2", "h3", "h4", "h5", "h6"].includes(tag)) return true;

    const meaningfulChild = Array.from(el.children).some(child => {
      const childTag = child.tagName.toLowerCase();
      if (!["p", "li", "blockquote", "td", "th", "h1", "h2", "h3", "h4", "h5", "h6", "div", "section", "article"].includes(childTag)) {
        return false;
      }
      const childText = cleanImportText(child.textContent || "");
      return childText.length >= 4 && childText !== text;
    });

    return !meaningfulChild;
  }

  function isEnglishCardLine(text) {
    const clean = cleanImportText(text);
    const englishWords = clean.match(/[A-Za-z][A-Za-z'-]*/g) || [];
    const koreanCount = (clean.match(/[가-힣]/g) || []).length;
    if (koreanCount > 0 || englishWords.length < 3) return false;
    if (isNoteHeading(clean)) return false;
    if (/^[A-Za-z][A-Za-z\s'-]{1,36}\s*[:：]\s+/.test(clean) && englishWords.length < 10) return false;
    if (/[.?!…]["”’']?$/.test(clean)) return true;
    if (/[—–-]/.test(clean) && englishWords.length >= 4) return true;
    return englishWords.length >= 7;
  }

  function isEnglishImportCandidate(text) {
    const clean = cleanImportText(text);
    const englishWords = clean.match(/[A-Za-z][A-Za-z'-]*/g) || [];
    const koreanCount = (clean.match(/[가-힣]/g) || []).length;
    if (koreanCount > 0 || englishWords.length < 2) return false;
    if (isNoteHeading(clean) || isImportNoise(clean)) return false;
    return true;
  }

  function isKoreanImportLine(text) {
    const clean = cleanImportText(text);
    const koreanCount = (clean.match(/[가-힣]/g) || []).length;
    if (koreanCount < 2) return false;
    if (isNoteHeading(clean)) return false;
    return clean.length >= 5;
  }

  function isUsefulNoteLine(text) {
    const clean = cleanImportText(text);
    if (isImportNoise(clean)) return false;
    if (isEnglishCardLine(clean)) return false;
    if (clean.length > 500) return false;
    return /[A-Za-z가-힣]/.test(clean);
  }

  function isNoteHeading(text) {
    return /^(key\s+vocabulary|vocabulary|words?|단어|어휘|sentence\s+structure|structure|문장\s*구조|구조|must\s+memorize|필수\s*암기|암기|pattern|speaking\s+pattern|패턴|해설|설명|학습\s*포인트|translation|번역|한국어|korean)$/i.test(cleanImportText(text));
  }

  function stripImportLabel(text) {
    return cleanImportText(text)
      .replace(/^(?:english|en|영어|원문|sentence|문장)\s*\d*\s*[:：.-]\s*/i, "")
      .replace(/^(?:translation|korean|ko|번역|해석|한국어)\s*[:：.-]\s*/i, "")
      .replace(/^(?:key\s+vocabulary|vocabulary|words?|단어|어휘|sentence\s+structure|structure|문장\s*구조|must\s+memorize|필수\s*암기|pattern|패턴|해설|설명|학습\s*포인트)\s*[:：.-]\s*/i, "");
  }

  function buildNotesFromImportLines(lines) {
    const cleanLines = (lines || [])
      .map(raw => ({ raw: cleanImportText(raw), clean: stripImportLabel(raw) }))
      .filter(item => item.clean && !isImportNoise(item.clean));
    if (cleanLines.length === 0) return null;

    const words = [];
    const structure = [];
    const mustMemorize = [];
    const pattern = [];
    const extra = [];

    cleanLines.forEach(({ raw, clean }) => {
      const wordPairs = parseWordPairs(clean);
      if (wordPairs.length > 0) {
        wordPairs.forEach(pair => {
          if (!words.some(w => w.word.toLowerCase() === pair.word.toLowerCase())) words.push(pair);
        });
        return;
      }

      if (/(structure|chunk|문장\s*구조|구조|직독직해|해석\s*순서)/i.test(raw)) {
        structure.push(clean);
      } else if (/(pattern|활용|응용|speaking|회화|패턴)/i.test(raw)) {
        pattern.push(clean);
      } else if (/(must|memorize|필수|암기|주의|포인트|핵심|뉘앙스)/i.test(raw)) {
        mustMemorize.push(clean);
      } else {
        extra.push(clean);
      }
    });

    const notes = {};
    if (words.length > 0) notes.words = words.slice(0, 12);
    if (structure.length > 0) notes.structure = bulletJoin(structure);
    if (mustMemorize.length > 0 || extra.length > 0) notes.mustMemorize = bulletJoin([...mustMemorize, ...extra]);
    if (pattern.length > 0) notes.pattern = bulletJoin(pattern);

    return Object.keys(notes).length > 0 ? notes : null;
  }

  function parseWordPairs(line) {
    const parts = cleanImportText(line)
      .replace(/^[-•*]\s*/, "")
      .split(/[;；]|(?:\s{2,})/)
      .map(part => part.trim())
      .filter(Boolean);

    const pairs = [];
    parts.forEach(part => {
      const match = part.match(/^([A-Za-z][A-Za-z0-9'’().,\s-]{0,48})\s*(?:=|:|：|–|—|-)\s*(.{2,120})$/);
      if (!match) return;
      const word = cleanImportText(match[1]).replace(/^[-•*]\s*/, "");
      const meaning = cleanImportText(match[2]);
      if (!/[A-Za-z]/.test(word) || !/[가-힣]/.test(meaning)) return;
      if (word.split(/\s+/).length > 6) return;
      pairs.push({ word, meaning });
    });

    return pairs;
  }

  function bulletJoin(lines) {
    return lines
      .map(line => line.replace(/^[-•*]\s*/, ""))
      .map(line => `• ${line}`)
      .join("<br>");
  }

  function readImportSpeaker(el, index) {
    let cur = el;
    while (cur && cur.nodeType === 1) {
      const speaker = cur.getAttribute("data-speaker") || cur.getAttribute("data-name") || cur.getAttribute("aria-label");
      if (speaker && cleanImportText(speaker)) return cleanImportText(speaker);
      cur = cur.parentElement;
    }
    return index % 2 === 0 ? "Speaker A" : "Speaker B";
  }

  function makeImportedCard(idPrefix, index, speaker, en, ko, notes = null, meta = null) {
    const card = {
      id: `custom_${idPrefix}_${index}`,
      speaker: speaker || "Speaker",
      en: cleanImportText(en),
      ko: cleanImportText(ko),
      notes
    };
    if (meta?.preserveUnit) card.preserveUnit = true;
    return card;
  }

  function safeImportIdPrefix(fileName) {
    return String(fileName || "html")
      .replace(/\.[^/.]+$/, "")
      .replace(/[^a-z0-9가-힣]+/gi, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 48) || "html";
  }

  function cleanImportText(text) {
    return normalizeImportMultilineText(text)
      .replace(/\s+/g, " ")
      .trim();
  }

  function normalizeImportMultilineText(text) {
    return String(text || "")
      .replace(/[\u200B-\u200D\uFEFF]/g, "")
      .replace(/\u00a0/g, " ")
      .replace(/\r\n?/g, "\n");
  }

  function looksLikeHtml(text) {
    return /<\s*(?:!doctype|html|body|main|article|section|div|p|span|table|ul|ol|li)\b/i.test(String(text || ""));
  }

  function uniqueImportLines(lines) {
    const seen = new Set();
    return lines.filter(line => {
      const key = line.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function isImportNoise(text) {
    const clean = cleanImportText(text);
    if (clean.length < 4) return true;
    if (/^\[\d{1,2}:\d{2}/.test(clean)) return true;
    if (/^(contents|table of contents|full transcript|part\s*\d+|목차|대담 전문|영어 원문|한국어 번역)$/i.test(clean)) return true;
    if (!/[A-Za-z가-힣]/.test(clean)) return true;
    return false;
  }

  // ───────────────────────────────────────────────────────────
  // 업로드 자동 보강: 번역 누락 + 단어/설명 누락 보완
  // ───────────────────────────────────────────────────────────
  const MISSING_TRANSLATION_TEXT = "번역 없음 - 영어 원문만 가져왔습니다.";
  const TRANSLATION_CACHE_KEY = "yh_translation_cache_v1";

  const STOP_WORDS = new Set([
    "the", "a", "an", "and", "or", "but", "so", "to", "of", "in", "on", "at", "for", "from", "with", "without", "by",
    "is", "are", "was", "were", "be", "been", "being", "am", "do", "does", "did", "have", "has", "had", "will", "would",
    "can", "could", "should", "may", "might", "must", "this", "that", "these", "those", "it", "its", "we", "you", "they",
    "he", "she", "i", "our", "your", "their", "his", "her", "my", "as", "than", "then", "there", "here", "about", "into"
  ]);

  const PHRASE_MEANINGS = [
    ["without compromise", "타협 없이"],
    ["to deliver", "제공하다 / 전달하다"],
    ["at scale", "대규모로"],
    ["in real time", "실시간으로"],
    ["from time to time", "때때로"],
    ["take seriously", "진지하게 받아들이다"],
    ["play a role", "역할을 하다"],
    ["pose a risk", "위험을 야기하다"],
    ["make sure", "확실히 하다"],
    ["move faster", "더 빠르게 움직이다 / 진행하다"],
    ["lower prices", "더 낮은 가격"],
    ["launch schedule", "출시 일정"],
    ["customer experience", "고객 경험"],
    ["supply chain", "공급망"],
    ["energy storage", "에너지 저장"],
    ["sustainable future", "지속가능한 미래"],
    ["artificial intelligence", "인공지능"],
    ["public safety", "공공 안전"],
    ["competitive advantage", "경쟁 우위"],
    ["market share", "시장 점유율"],
    ["long term", "장기적인"],
    ["short term", "단기적인"],
    ["operating margin", "영업이익률"],
    ["free cash flow", "잉여 현금흐름"],
    ["gross margin", "매출총이익률"],
    ["full self-driving", "완전자율주행"]
  ];

  const WORD_MEANINGS = {
    accelerate: "가속하다",
    access: "접근, 이용 권한",
    adoption: "도입, 채택",
    advanced: "고급의, 발전된",
    advantage: "이점, 우위",
    affordable: "감당 가능한, 저렴한",
    algorithm: "알고리즘",
    artificial: "인공의",
    autonomous: "자율적인",
    battery: "배터리",
    breakthrough: "돌파구, 획기적 진전",
    capacity: "용량, 역량",
    capital: "자본",
    challenge: "과제, 도전",
    charging: "충전",
    climate: "기후",
    commitment: "약속, 전념",
    competitive: "경쟁력 있는",
    compromise: "타협",
    constraint: "제약",
    constrained: "제약을 받는",
    consumer: "소비자",
    customer: "고객",
    data: "데이터",
    demand: "수요",
    deploy: "배치하다, 투입하다",
    deliver: "제공하다, 전달하다",
    delivery: "인도, 배송, 제공",
    design: "설계하다, 디자인",
    development: "개발, 발전",
    efficiency: "효율성",
    efficient: "효율적인",
    electric: "전기의",
    energy: "에너지",
    engineer: "엔지니어",
    expand: "확장하다",
    expansion: "확장",
    expected: "예상되는",
    experience: "경험",
    financial: "재무의, 금융의",
    fleet: "차량군, 함대",
    future: "미래",
    growth: "성장",
    hardware: "하드웨어",
    improve: "개선하다",
    improvement: "개선",
    innovation: "혁신",
    launch: "출시하다, 발사하다",
    leadership: "리더십",
    margin: "이익률, 여백",
    market: "시장",
    mission: "사명, 임무",
    mobility: "이동성",
    model: "모델, 방식",
    optimize: "최적화하다",
    performance: "성능",
    platform: "플랫폼",
    price: "가격",
    production: "생산",
    profitability: "수익성",
    profitable: "수익성 있는",
    progress: "진전, 진행",
    range: "주행거리, 범위",
    reliable: "신뢰할 수 있는",
    revenue: "매출",
    risk: "위험",
    robotaxi: "로보택시",
    safety: "안전",
    scalable: "확장 가능한",
    schedule: "일정",
    software: "소프트웨어",
    strategy: "전략",
    sustainable: "지속가능한",
    sustainability: "지속가능성",
    technology: "기술",
    transition: "전환",
    unconstrained: "제약 없는",
    vehicle: "차량",
    vision: "비전",
    volume: "물량, 규모"
  };

  async function enrichImportedDataset(cards) {
    if (!state.settings.autoEnrichImports) {
      return { cards, translated: 0, notesAdded: 0, fallbackTranslations: 0 };
    }

    const stats = { translated: 0, notesAdded: 0, fallbackTranslations: 0 };
    const enriched = await mapWithConcurrency(cards, 3, async (card) => {
      const next = { ...card };

      if (needsTranslation(next)) {
        const translated = await autoTranslateToKorean(next.en);
        next.ko = translated.text;
        if (translated.fallback) stats.fallbackTranslations += 1;
        else stats.translated += 1;
      }

      const autoNotes = buildAutoStudyNotes(next.en, next.ko);
      const mergedNotes = mergeStudyNotes(next.notes, autoNotes);
      if (notesWereAdded(next.notes, mergedNotes)) stats.notesAdded += 1;
      next.notes = mergedNotes;

      return next;
    });

    return { cards: enriched, ...stats };
  }

  function needsTranslation(card) {
    const ko = cleanImportText(card.ko || "");
    return !ko || ko === MISSING_TRANSLATION_TEXT || ko.startsWith("번역 없음") || ko.startsWith("자동 번역 실패");
  }

  async function autoTranslateToKorean(text) {
    const clean = cleanImportText(text);
    if (!clean) return { text: MISSING_TRANSLATION_TEXT, fallback: true };

    const cached = readTranslationCache(clean);
    if (cached) return { text: cached, fallback: false };

    const builtin = await translateWithBuiltInApi(clean);
    if (builtin) {
      writeTranslationCache(clean, builtin);
      return { text: builtin, fallback: false };
    }

    if (state.settings.externalAutoTranslate) {
      const external = await translateWithGoogleEndpoint(clean);
      if (external) {
        writeTranslationCache(clean, external);
        return { text: external, fallback: false };
      }
    }

    return {
      text: "자동 번역 실패 - 원문과 아래 핵심 표현을 먼저 확인해 주세요.",
      fallback: true
    };
  }

  async function translateWithBuiltInApi(text) {
    try {
      const translatorApi = window.Translator || window.ai?.translator;
      if (!translatorApi?.create) return "";
      const translator = await translatorApi.create({ sourceLanguage: "en", targetLanguage: "ko" });
      const result = await translator.translate(text);
      return cleanImportText(result);
    } catch (e) {
      return "";
    }
  }

  async function translateWithGoogleEndpoint(text) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=ko&dt=t&q=${encodeURIComponent(text)}`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) return "";
      const json = await res.json();
      const translated = Array.isArray(json?.[0])
        ? json[0].map(part => part?.[0] || "").join("")
        : "";
      return cleanImportText(translated);
    } catch (e) {
      return "";
    } finally {
      clearTimeout(timer);
    }
  }

  function readTranslationCache(text) {
    try {
      const cache = JSON.parse(localStorage.getItem(TRANSLATION_CACHE_KEY) || "{}");
      return cache[translationCacheKey(text)] || "";
    } catch (e) {
      return "";
    }
  }

  function writeTranslationCache(text, ko) {
    try {
      const cache = JSON.parse(localStorage.getItem(TRANSLATION_CACHE_KEY) || "{}");
      cache[translationCacheKey(text)] = ko;
      const entries = Object.entries(cache).slice(-300);
      localStorage.setItem(TRANSLATION_CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
    } catch (e) {
      // 캐시 저장 실패는 학습 흐름을 막지 않습니다.
    }
  }

  function translationCacheKey(text) {
    return cleanImportText(text).toLowerCase().slice(0, 240);
  }

  function buildAutoStudyNotes(en, ko) {
    const words = buildAutoVocabulary(en);
    const structure = buildAutoStructureNotes(en);
    const mustMemorize = buildAutoMemorizeNotes(en, ko);
    const notes = {};
    if (words.length > 0) notes.words = words;
    if (structure) notes.structure = structure;
    if (mustMemorize) notes.mustMemorize = mustMemorize;
    return Object.keys(notes).length > 0 ? notes : null;
  }

  function buildAutoVocabulary(en) {
    const lower = ` ${cleanImportText(en).toLowerCase()} `;
    const found = [];

    PHRASE_MEANINGS
      .sort((a, b) => b[0].length - a[0].length)
      .forEach(([phrase, meaning]) => {
        if (found.length >= 8) return;
        const pattern = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, "i");
        if (pattern.test(lower)) found.push({ word: phrase, meaning });
      });

    const tokens = cleanImportText(en).toLowerCase().match(/[a-z][a-z'-]{2,}/g) || [];
    const seen = new Set(found.map(item => item.word.toLowerCase()));
    tokens.forEach(token => {
      const base = normalizeWordToken(token);
      if (found.length >= 10 || seen.has(base) || STOP_WORDS.has(base)) return;
      const meaning = WORD_MEANINGS[base];
      if (meaning) {
        found.push({ word: base, meaning });
        seen.add(base);
      }
    });

    tokens.forEach(token => {
      const base = normalizeWordToken(token);
      if (found.length >= 8 || seen.has(base) || STOP_WORDS.has(base) || base.length < 7) return;
      found.push({ word: base, meaning: "문맥상 핵심어 - 사전에서 정확한 뜻을 확인해 보세요." });
      seen.add(base);
    });

    return found;
  }

  function normalizeWordToken(token) {
    let word = token.toLowerCase().replace(/^'+|'+$/g, "");
    if (WORD_MEANINGS[word]) return word;
    if (word.endsWith("ies") && WORD_MEANINGS[`${word.slice(0, -3)}y`]) return `${word.slice(0, -3)}y`;
    if (word.endsWith("ing") && WORD_MEANINGS[word.slice(0, -3)]) return word.slice(0, -3);
    if (word.endsWith("ed") && WORD_MEANINGS[word.slice(0, -2)]) return word.slice(0, -2);
    if (word.endsWith("s") && WORD_MEANINGS[word.slice(0, -1)]) return word.slice(0, -1);
    return word;
  }

  function buildAutoStructureNotes(en) {
    const text = cleanImportText(en);
    const lower = text.toLowerCase();
    const notes = [];

    if (/^to\s+[a-z]/i.test(text)) notes.push("문장 앞 <strong>To + 동사원형</strong>은 목적을 나타내며 '~하기 위해서'로 해석할 수 있습니다.");
    if (/\bwithout\s+\w+/i.test(text)) notes.push("<strong>without + 명사/동명사</strong>는 '~없이'라는 조건을 만듭니다.");
    if (/[—–-]/.test(text)) notes.push("대시(—) 뒤 표현은 앞 내용을 강조하거나 보충 설명하는 역할을 합니다.");
    if (/\bif\b/i.test(text)) notes.push("<strong>If</strong>는 조건을 열어 주며, 뒤 절이 '만약 ~라면'의 기준이 됩니다.");
    if (/\bbecause\b/i.test(text)) notes.push("<strong>because</strong> 뒤에는 이유가 이어집니다.");
    if (/\b(which|who|that)\b/i.test(text)) notes.push("<strong>which/who/that</strong>은 앞 명사를 설명하거나 문장 내용을 확장합니다.");
    if (/\b(should|could|would|might|must)\b/i.test(text)) notes.push("조동사는 말의 강도와 뉘앙스를 조절합니다. should는 제안, could는 가능성, must는 강한 필요를 나타냅니다.");
    if (/\bwant(?:s|ed)?\s+to\b/i.test(text)) notes.push("<strong>want to + 동사원형</strong>은 '~하고 싶다/원하다'의 기본 패턴입니다.");
    if (/\bgoing to\b/i.test(text)) notes.push("<strong>be going to</strong>는 앞으로의 계획이나 예상되는 변화를 말할 때 씁니다.");

    if (notes.length === 0 && lower.split(/\s+/).length >= 8) {
      notes.push("긴 문장은 핵심 동사와 전치사구를 먼저 나누어 읽으면 의미를 더 쉽게 잡을 수 있습니다.");
    }

    return notes.length > 0 ? bulletJoin(notes.slice(0, 3)) : "";
  }

  function buildAutoMemorizeNotes(en, ko) {
    const lower = cleanImportText(en).toLowerCase();
    const notes = [];

    PHRASE_MEANINGS.forEach(([phrase, meaning]) => {
      if (notes.length >= 3) return;
      const pattern = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, "i");
      if (pattern.test(lower)) notes.push(`<strong>${phrase}</strong>: ${meaning}`);
    });

    if (needsTranslation({ ko })) {
      notes.push("자동 번역이 실패한 문장입니다. 단어 설명과 온라인 사전을 함께 보며 의미를 확인해 주세요.");
    }

    return notes.length > 0 ? bulletJoin(notes) : "";
  }

  function mergeStudyNotes(existing, autoNotes) {
    if (!existing && !autoNotes) return null;
    if (!existing) return autoNotes;
    if (!autoNotes) return existing;

    const merged = { ...existing };
    const existingWords = Array.isArray(existing.words) ? existing.words : [];
    const autoWords = Array.isArray(autoNotes.words) ? autoNotes.words : [];
    const knownWords = new Set(existingWords.map(item => String(item.word || "").toLowerCase()));
    const addedWords = autoWords.filter(item => !knownWords.has(String(item.word || "").toLowerCase()));
    if (existingWords.length > 0 || addedWords.length > 0) {
      merged.words = [...existingWords, ...addedWords].slice(0, 12);
    }
    if (!merged.structure && autoNotes.structure) merged.structure = autoNotes.structure;
    if (!merged.mustMemorize && autoNotes.mustMemorize) merged.mustMemorize = autoNotes.mustMemorize;
    if (!merged.pattern && autoNotes.pattern) merged.pattern = autoNotes.pattern;
    return merged;
  }

  function notesWereAdded(before, after) {
    if (!before && after) return true;
    if (!before || !after) return false;
    const beforeWords = Array.isArray(before.words) ? before.words.length : 0;
    const afterWords = Array.isArray(after.words) ? after.words.length : 0;
    return afterWords > beforeWords
      || (!before.structure && !!after.structure)
      || (!before.mustMemorize && !!after.mustMemorize)
      || (!before.pattern && !!after.pattern);
  }

  async function mapWithConcurrency(items, limit, worker) {
    const results = new Array(items.length);
    let index = 0;
    const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (index < items.length) {
        const current = index++;
        results[current] = await worker(items[current], current);
      }
    });
    await Promise.all(runners);
    return results;
  }

  function escapeRegExp(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  // 2. JSON 파서
  function parseJsonDataset(jsonText) {
    const raw = JSON.parse(jsonText);
    if (!Array.isArray(raw)) throw new Error("JSON 루트 노드는 배열 객체여야 합니다.");
    return raw.map((item, idx) => {
      if (!item.en) throw new Error(`${idx + 1}번째 문장에 'en' 필드가 누락되었습니다.`);
      return {
        id: item.id || `json_${Date.now()}_${idx}`,
        speaker: item.speaker || "Speaker",
        en: item.en,
        ko: item.ko || MISSING_TRANSLATION_TEXT,
        notes: item.notes || null
      };
    });
  }

  // 3. Raw Text 붙여넣기 파서
  function parseRawText(rawText) {
    const lines = normalizeImportMultilineText(rawText).split("\n");
    const parsedData = [];
    const plainEnglishLines = [];

    const flushPlainEnglish = () => {
      if (plainEnglishLines.length === 0) return;
      splitPlainEnglishTextEntries(plainEnglishLines.join("\n"), { dedupe: false }).forEach((entry, offset) => {
        parsedData.push({
          id: `pasted_en_${Date.now()}_${parsedData.length}_${offset}`,
          speaker: "Tutor",
          en: entry.text,
          ko: MISSING_TRANSLATION_TEXT,
          notes: null,
          preserveUnit: entry.preserveUnit
        });
      });
      plainEnglishLines.length = 0;
    };

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
        flushPlainEnglish();
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
      } else if (isEnglishImportCandidate(trimmed)) {
        plainEnglishLines.push(trimmed);
      }
    });

    flushPlainEnglish();
    return parsedData;
  }

  function splitPlainEnglishText(text, options = {}) {
    return splitPlainEnglishTextEntries(text, options).map(entry => entry.text);
  }

  function splitPlainEnglishTextEntries(text, options = {}) {
    const dedupe = options.dedupe !== false;
    const seen = new Set();
    const cards = [];
    const chunks = normalizeImportMultilineText(text)
      .split(/\n{2,}|(?=\n\s*[-•*]\s+)/)
      .map(block => block.replace(/^[-•*]\s*/gm, ""))
      .filter(Boolean);

    chunks.forEach(chunk => {
      splitEnglishLearningUnitEntries(chunk).forEach(entry => {
        const clean = cleanImportText(entry.text);
        const key = clean.toLowerCase();
        if (!isEnglishImportCandidate(clean)) return;
        if (dedupe && seen.has(key)) return;
        if (dedupe) seen.add(key);
        cards.push({ text: clean, preserveUnit: entry.preserveUnit });
      });
    });

    return cards;
  }

  function splitEnglishLearningUnits(text) {
    return splitEnglishLearningUnitEntries(text).map(entry => entry.text);
  }

  function splitEnglishLearningUnitEntries(text) {
    const normalized = normalizeImportMultilineText(text);
    const lineUnits = normalized
      .split("\n")
      .map(line => cleanImportText(line.replace(/^[-•*]\s*/, "")))
      .filter(line => isEnglishImportCandidate(line));
    const sentenceUnits = splitIntoSentences(cleanImportText(normalized))
      .map(cleanImportText)
      .filter(line => isEnglishImportCandidate(line));

    const useLineBased = shouldUseLineBasedSplit(lineUnits, sentenceUnits);
    let units = useLineBased ? lineUnits : sentenceUnits;
    if (useLineBased && units.length > 1 && isLikelyImportTitle(units[0])) {
      units = units.slice(1);
    }

    return units.flatMap(unit => {
      return splitOverlongEnglishUnit(unit).map(part => ({
        text: part,
        preserveUnit: useLineBased
      }));
    });
  }

  function shouldUseLineBasedSplit(lineUnits, sentenceUnits) {
    if (lineUnits.length < 3) return false;
    if (sentenceUnits.length <= 1) return true;
    if (lineUnits.length >= sentenceUnits.length * 2) return true;
    const shortLineCount = lineUnits.filter(line => countWords(line) <= 12).length;
    return shortLineCount >= Math.ceil(lineUnits.length * 0.7);
  }

  function isLikelyImportTitle(text) {
    const clean = cleanImportText(text);
    const words = countWords(clean);
    if (/[.?!…]["”’']?$/.test(clean)) return false;
    return words <= 8 && /[-–—:]/.test(clean);
  }

  function splitOverlongEnglishUnit(text) {
    const clean = cleanImportText(text);
    const words = clean.match(/\S+/g) || [];
    const maxWords = 18;
    const maxChars = 150;
    if (words.length <= maxWords && clean.length <= maxChars) return [clean];

    const sentenceUnits = splitIntoSentences(clean)
      .map(cleanImportText)
      .filter(unit => unit && unit !== clean);
    if (sentenceUnits.length > 1) {
      return sentenceUnits.flatMap(unit => splitOverlongEnglishUnit(unit));
    }

    const chunks = [];
    for (let i = 0; i < words.length; i += maxWords) {
      chunks.push(words.slice(i, i + maxWords).join(" "));
    }
    return chunks;
  }

  // ── 새 학습 리스트 저장 및 활성화 ──
  // ───────────────────────────────────────────────────────────
  // 분량 최적화(휴리스틱 청킹) — 임포트 시 카드 단위를 학습하기 좋은 크기로 재구성
  //  · 스마트 청킹 알고리즘 적용 (맥락, 내용, 중요도, 구분성, 학습자의 편의성 고려)
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
            notes: i === 0 ? (card.notes || null) : null,
            preserveUnit: card.preserveUnit
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
        && !last.preserveUnit && !card.preserveUnit
        && !isImportantCard(last) && !isImportantCard(card)
        && (cardLoad(last) + cardLoad(card)) <= budget;
      if (canMerge) {
        last.en = `${last.en} ${card.en}`.trim();
        last.ko = `${last.ko} ${card.ko}`.trim();
        if (!last.notes && card.notes) last.notes = card.notes;
      } else {
        // 새 카드는 복사본으로 push → 입력(cards/rawData) 불변 보장
        merged.push({
          id: card.id,
          speaker: card.speaker,
          en: card.en,
          ko: card.ko,
          notes: card.notes || null,
          preserveUnit: !!card.preserveUnit
        });
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

    const enrichResult = await enrichImportedDataset(rawParsed);
    const enrichedRaw = enrichResult.cards;

    // 임포트 시점에 분량 최적화 알고리즘 적용 (원본은 rawData로 보존 → 분량 재조정 가능)
    const density = state.settings.cardDensity;
    const data = segmentDataset(enrichedRaw, density);

    const fileId = `file_${Date.now()}`;
    const now = Date.now();
    const fileObj = { title, rawData: enrichedRaw, data, density, createdAt: now, updatedAt: now };
    state.customFiles[fileId] = { title, rawData: enrichedRaw, data, density, createdAt: now, updatedAt: now };

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

    const enrichLine = state.settings.autoEnrichImports
      ? `\n자동 보강: 번역 ${enrichResult.translated}개, 단어/설명 ${enrichResult.notesAdded}개${enrichResult.fallbackTranslations ? `, 번역 실패 ${enrichResult.fallbackTranslations}개` : ""}`
      : "";
    alert(`성공! [${title}]\n원문 ${rawParsed.length}개 → 분량 최적화 후 ${data.length}개 카드로 구성되었습니다.${enrichLine}`);
    closeSettings();
  }

  function setImportBusy(isBusy, label = "자동 보강 중…") {
    if (textSubmitBtn) {
      textSubmitBtn.disabled = isBusy;
      textSubmitBtn.textContent = isBusy ? label : "영문 텍스트로 카드 만들기";
    }
    if (urlImportBtn) {
      urlImportBtn.disabled = isBusy;
      urlImportBtn.textContent = isBusy ? "처리 중…" : "추출";
    }
    if (urlPasteInput) {
      urlPasteInput.disabled = isBusy;
    }
    if (fileUploadInput) {
      fileUploadInput.disabled = isBusy;
    }
  }

  function setUrlImportStatus(message, type = "") {
    if (!urlImportStatus) return;
    urlImportStatus.textContent = message;
    urlImportStatus.classList.remove("success", "error");
    if (type) urlImportStatus.classList.add(type);
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

    // 설정: 업로드 자동 보강
    if (autoEnrichToggle) {
      autoEnrichToggle.addEventListener("change", (e) => {
        state.settings.autoEnrichImports = e.target.checked;
        if (externalTranslateToggle) {
          externalTranslateToggle.disabled = !state.settings.autoEnrichImports;
        }
        saveSettingsToStorage();
      });
    }

    // 설정: 번역 누락 시 외부 자동 번역 사용
    if (externalTranslateToggle) {
      externalTranslateToggle.addEventListener("change", (e) => {
        state.settings.externalAutoTranslate = e.target.checked;
        saveSettingsToStorage();
      });
    }

    popupClose.addEventListener("click", hideWordPopup);

    // 파일 업로드
    fileUploadInput.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async function (evt) {
        const text = evt.target.result;
        const name = file.name;
        setImportBusy(true, "업로드 보강 중…");
        try {
          const lowerName = name.toLowerCase();
          if (lowerName.endsWith(".html") || lowerName.endsWith(".htm")) {
            const parsed = parseHtmlTranscript(text, name);
            await loadAndActivateNewDataset(name.replace(/\.[^/.]+$/, ""), parsed);
          } else if (lowerName.endsWith(".json")) {
            const parsed = parseJsonDataset(text);
            await loadAndActivateNewDataset(name.replace(/\.[^/.]+$/, ""), parsed);
          } else {
            const parsed = looksLikeHtml(text) ? parseHtmlTranscript(text, name) : parseRawText(text);
            await loadAndActivateNewDataset(name.replace(/\.[^/.]+$/, ""), parsed);
          }
        } catch (err) {
          alert(`파일 파싱에 실패했습니다:\n${err.message}`);
        } finally {
          setImportBusy(false);
        }
      };
      reader.onerror = () => {
        setImportBusy(false);
        alert("파일을 읽는 중 오류가 발생했습니다.");
      };
      reader.readAsText(file);
      // 같은 파일 재선택 가능하도록 초기화
      e.target.value = "";
    });

    // 웹주소에서 핵심 영어 추출 → 아래 텍스트칸에 붙여넣기
    if (urlImportBtn && urlPasteInput) {
      urlImportBtn.addEventListener("click", async () => {
        const urlText = urlPasteInput.value.trim();
        if (!urlText) {
          alert("가져올 웹주소를 입력해 주세요.");
          return;
        }

        setImportBusy(true, "웹 추출 중…");
        setUrlImportStatus("웹페이지를 읽고 핵심 영어 문단을 고르는 중입니다...");
        try {
          const result = await extractLearningTextFromUrl(urlText);
          const parsed = parseRawText(result.text);
          if (parsed.length === 0) {
            throw new Error("학습 카드로 만들 수 있는 영어 문장을 찾지 못했습니다.");
          }

          textPasteArea.value = result.text;
          pendingWebImport = { title: result.title, sourceUrl: result.sourceUrl };
          setUrlImportStatus(
            `추출 완료: 핵심 문단 ${result.paragraphCount}개, 예상 카드 ${parsed.length}개가 아래 텍스트칸에 들어갔습니다. 확인 후 '영문 텍스트로 카드 만들기'를 누르세요.`,
            "success"
          );
        } catch (err) {
          setUrlImportStatus("웹 추출 실패: 파일 업로드 또는 직접 붙여넣기를 사용해 주세요.", "error");
          alert(`웹주소 추출에 실패했습니다:\n${err.message}`);
        } finally {
          setImportBusy(false);
        }
      });

      urlPasteInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          urlImportBtn.click();
        }
      });
    }

    // 직접 붙여넣기
    textSubmitBtn.addEventListener("click", async () => {
      const text = textPasteArea.value.trim();
      if (!text) {
        alert("붙여넣을 텍스트 내용을 입력해 주세요.");
        return;
      }
      setImportBusy(true);
      try {
        const parsed = looksLikeHtml(text) ? parseHtmlTranscript(text, "직접입력_HTML") : parseRawText(text);
        if (parsed.length === 0) {
          alert("파싱에 실패했습니다. HTML 문서 또는 '영어 문장 | 한국어 번역 | 단어1=뜻;단어2=뜻' 형식인지 확인해 주세요.");
          return;
        }
        const title = pendingWebImport?.title
          ? `웹 추출: ${pendingWebImport.title}`
          : `직접 입력 카드 (${parsed.length}문장)`;
        await loadAndActivateNewDataset(title, parsed);
        textPasteArea.value = "";
        pendingWebImport = null;
        setUrlImportStatus("* 웹페이지의 핵심 영어 문단을 아래 텍스트칸에 붙여넣습니다. CORS 차단 시 읽기용 텍스트 프록시를 사용합니다.");
      } catch (err) {
        alert(`텍스트 파싱 오류: ${err.message}`);
      } finally {
        setImportBusy(false);
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
