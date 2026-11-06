/**
 * hudInteface - Core Frontend Controller
 */

(function () {
  'use strict';

  // --- State ---
  const THEMES = [
    { id: 'serbian-orthodox', name: 'Српски (Тамни) ☦' },
    { id: 'serbian-parchment', name: 'Српски (Пергамент) 📜' },
    { id: 'zastava', name: 'Застава 🇷🇸' },
    { id: 'russian-orthodox', name: 'Русский ☦' },
    { id: 'byzantine-orthodox', name: 'Βυζάντιο ☧' },
    { id: 'japanese', name: 'Japan 🌸' },
    { id: 'cyberpunk', name: 'Cyber ⚡' }
  ];
  let currentTheme = 'serbian-orthodox';
  let activeModuleId = 'search';
  let pendingRequests = new Map();
  let searchDebounceTimer = null;
  let statsPollInterval = null;
  let noteAutoSaveTimer = null;
  let activeNote = null;
  let allNotes = [];

  // Psalter State (3-Tier Layer Architecture: Katizmas -> Psalms -> Single Psalm)
  let psalterData = null;
  let psalmInstructions = (typeof window !== "undefined" && window.PSALM_INSTRUCTIONS) ? window.PSALM_INSTRUCTIONS : null;
  let katizmaPrayers = (typeof window !== "undefined" && window.KATIZMA_PRAYERS) ? window.KATIZMA_PRAYERS : null;
  let psalterPreface = (typeof window !== "undefined" && window.PSALTER_PREFACE) ? window.PSALTER_PREFACE : null;
  let psalmsCsOld = (typeof window !== "undefined" && window.psalmsCsOld) ? window.psalmsCsOld : null;
  let psalmsCsCyrillic = (typeof window !== "undefined" && window.psalmsCsCyrillic) ? window.psalmsCsCyrillic : null;
  let psalmAlignments = (typeof window !== "undefined" && window.psalmAlignments) ? window.psalmAlignments : null;
  let currentPsalterLanguage = localStorage.getItem('hud_psalter_language') || 'serbian';
  let psalterParallelModes = JSON.parse(localStorage.getItem('hud_psalter_parallel') || '[]');
  let selectedQuoteText = '';
  let isViewingKatizmaPrayer = false;
  let prefaceExpanded = false;
  let postPrayerInlineExpanded = false;
  let currentKatizmaNumber = 1;
  let currentPsalmNumber = 1;
  let psalterLayer = 'single'; // 'katizmas', 'psalms', or 'single'
  let currentPsalmScrollPos = 0;
  let psalmScrollPositions = {};

  // --- DOM Elements ---
  const hudRoot = document.getElementById('hud-root');
  const themeStylesheet = document.getElementById('theme-stylesheet');
  const activeThemeName = document.getElementById('active-theme-name');
  const quickThemeToggle = document.getElementById('quick-theme-toggle');
  const btnHideHud = document.getElementById('btn-hide-hud');
  const navButtons = document.querySelectorAll('.nav-btn');
  const moduleViews = document.querySelectorAll('.module-view');
  const contextMenu = document.getElementById('hud-context-menu');
  const checkSerbian = document.getElementById('check-serbian-orthodox');
  const checkSerbianParchment = document.getElementById('check-serbian-parchment');
  const checkZastava = document.getElementById('check-zastava');
  const checkRussian = document.getElementById('check-russian-orthodox');
  const checkByzantine = document.getElementById('check-byzantine-orthodox');
  const checkJapanese = document.getElementById('check-japanese');
  const checkCyberpunk = document.getElementById('check-cyberpunk');
  const footerIndexerLabel = document.getElementById('footer-indexer-label');
  const hudStatusIndicator = document.getElementById('hud-status-indicator');

  // Search Elements
  const globalSearchWrap = document.getElementById('global-search-wrap');
  const searchInput = document.getElementById('search-input');
  const searchCounter = document.getElementById('search-counter');
  const indexerStatus = document.getElementById('indexer-status');
  const tabActionHint = document.getElementById('tab-action-hint');
  const searchResultsContainer = document.getElementById('search-results-container');
  const readerInstructionContainer = document.getElementById('reader-instruction-container');

  // Stats Elements
  const statsSystemInfo = document.getElementById('stats-system-info');
  const statsUptime = document.getElementById('stats-uptime');
  const cpuPercent = document.getElementById('cpu-percent');
  const cpuBar = document.getElementById('cpu-bar');
  const cpuStatusText = document.getElementById('cpu-status-text');
  const ramPercent = document.getElementById('ram-percent');
  const ramBar = document.getElementById('ram-bar');
  const ramDetails = document.getElementById('ram-details');
  const powerPercent = document.getElementById('power-percent');
  const powerBar = document.getElementById('power-bar');
  const powerStatusText = document.getElementById('power-status-text');
  const drivesContainer = document.getElementById('drives-container');
  const processesContainer = document.getElementById('processes-container');

  // Notes Elements
  const notesListContainer = document.getElementById('notes-list-container');
  const noteTitleInput = document.getElementById('note-title-input');
  const noteContentInput = document.getElementById('note-content-input');
  const noteWordCount = document.getElementById('note-word-count');
  const noteSaveBadge = document.getElementById('note-save-badge');
  const btnAddNote = document.getElementById('btn-add-note');
  const btnDeleteNote = document.getElementById('btn-delete-note');

  // Psalter Elements (3-Tier Full-Width Layer Architecture)
  const layerKatizmasView = document.getElementById('layer-katizmas-view');
  const layerPsalmsView = document.getElementById('layer-psalms-view');
  const layerSingleView = document.getElementById('layer-single-view');
  const katizmasGridContainer = document.getElementById('katizmas-grid-container');
  const psalmsGridContainer = document.getElementById('psalms-grid-container');
  const layerPsalmsTitle = document.getElementById('layer-psalms-title');
  const layerPsalmsRange = document.getElementById('layer-psalms-range');
  const bcKatizmas = document.getElementById('bc-katizmas');
  const bcPsalms = document.getElementById('bc-psalms');
  const bcSinglePsalm = document.getElementById('bc-single-psalm');
  const bcSep1 = document.getElementById('bc-sep-1');
  const bcSep2 = document.getElementById('bc-sep-2');
  const pillLayerKatizmas = document.getElementById('pill-layer-katizmas');
  const pillLayerPsalms = document.getElementById('pill-layer-psalms');
  const pillLayerSingle = document.getElementById('pill-layer-single');
  const btnLayerUp = document.getElementById('btn-layer-up');
  const btnLayerDown = document.getElementById('btn-layer-down');
  const btnBackToKatizmas = document.getElementById('btn-back-to-katizmas');
  const btnBackToPsalms = document.getElementById('btn-back-to-psalms');
  const btnPrefaceLink = document.getElementById('btn-preface-link');
  const readerKatizmaBadge = document.getElementById('reader-katizma-badge');
  const readerRangeBadge = document.getElementById('reader-range-badge');
  const readerPsalmTitle = document.getElementById('reader-psalm-title');
  const readerPsalmSubtitle = document.getElementById('reader-psalm-subtitle');
  const readerPsalmText = document.getElementById('reader-psalm-text');
  const prefacePrayersBanner = document.getElementById('preface-prayers-banner');
  const postKatizmaBanner = document.getElementById('post-katizma-banner');
  const readerPsalmOrnament = document.getElementById('reader-psalm-ornament');
  const readerPsalmCounter = document.getElementById('reader-psalm-counter');
  const psalterReaderScroll = document.getElementById('psalter-reader-scroll');
  const btnPrevPsalm = document.getElementById('btn-prev-psalm');
  const btnNextPsalm = document.getElementById('btn-next-psalm');

  // ========================================================
  // Logging Bridge to Disk (%APPDATA%\hudInteface\hud.log)
  // ========================================================

  function logToHost(message, level = 'INFO') {
    postToHost({ type: 'log', message: String(message), level });
  }

  window.onerror = function (msg, url, line, col, error) {
    logToHost(`Uncaught Error: ${msg} at ${url}:${line}:${col}`, 'ERROR');
  };

  window.addEventListener('unhandledrejection', function (event) {
    logToHost(`Unhandled Promise Rejection: ${event.reason}`, 'ERROR');
  });

  document.addEventListener('click', (e) => {
    const el = e.target;
    logToHost(`Click on <${el.tagName}> class="${el.className || ''}" id="${el.id || ''}"`);
  }, true);

  window.addEventListener('contextmenu', (e) => {
    logToHost(`Contextmenu triggered at (${e.clientX}, ${e.clientY}) on <${e.target.tagName}>`);
  }, true);

  // ========================================================
  // WebView2 Communication Bridge
  // ========================================================

  function postToHost(msg) {
    if (window.chrome && window.chrome.webview) {
      window.chrome.webview.postMessage(msg);
    } else {
      console.log('[Host Post]', msg);
    }
  }

  function callHost(type, payload = {}) {
    return new Promise((resolve) => {
      const id = 'req_' + Math.random().toString(36).substring(2, 10);
      pendingRequests.set(id, resolve);
      postToHost({ id, type, ...payload });

      setTimeout(() => {
        if (pendingRequests.has(id)) {
          pendingRequests.delete(id);
          resolve(null);
        }
      }, 5000);
    });
  }

  function callModule(moduleId, action, params = {}) {
    return callHost('module_action', { moduleId, action, params });
  }

  if (window.chrome && window.chrome.webview) {
    window.chrome.webview.addEventListener('message', (event) => {
      const msg = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      handleHostMessage(msg);
    });
  }

  function handleHostMessage(msg) {
    if (!msg) return;

    if (msg.type === 'response' && msg.id && pendingRequests.has(msg.id)) {
      const resolver = pendingRequests.get(msg.id);
      pendingRequests.delete(msg.id);
      resolver(msg.data);
      return;
    }

    if (msg.type === 'event') {
      const ev = msg.event || msg['@event'];
      switch (ev) {
        case 'index_status':
          updateIndexerStatus(msg.data);
          break;

        case 'theme_changed':
          applyTheme(msg.data);
          break;

        case 'hud_visibility':
          if (msg.data && msg.data.visible) {
            onHudOpened(msg.data.targetModule);
          } else {
            onHudClosed();
          }
          break;
      }
    }
  }

  // ========================================================
  // Theme Switching (Multi-Theme Controller)
  // ========================================================

  function applyTheme(theme) {
    const validTheme = THEMES.find((t) => t.id === theme) || THEMES[0];
    currentTheme = validTheme.id;
    document.body.className = 'theme-' + currentTheme;
    themeStylesheet.href = `themes/${currentTheme}.css`;
    activeThemeName.textContent = validTheme.name;

    if (checkSerbian) checkSerbian.textContent = currentTheme === 'serbian-orthodox' ? '✓' : '';
    if (checkSerbianParchment) checkSerbianParchment.textContent = currentTheme === 'serbian-parchment' ? '✓' : '';
    if (checkZastava) checkZastava.textContent = currentTheme === 'zastava' ? '✓' : '';
    if (checkRussian) checkRussian.textContent = currentTheme === 'russian-orthodox' ? '✓' : '';
    if (checkByzantine) checkByzantine.textContent = currentTheme === 'byzantine-orthodox' ? '✓' : '';
    if (checkJapanese) checkJapanese.textContent = currentTheme === 'japanese' ? '✓' : '';
    if (checkCyberpunk) checkCyberpunk.textContent = currentTheme === 'cyberpunk' ? '✓' : '';

    logToHost(`Applied theme: ${currentTheme}`);
  }

  function toggleTheme() {
    const currentIndex = THEMES.findIndex((t) => t.id === currentTheme);
    const nextIndex = (currentIndex + 1) % THEMES.length;
    const nextTheme = THEMES[nextIndex].id;
    applyTheme(nextTheme);
    callHost('set_theme', { theme: nextTheme });
  }

  // ========================================================
  // Module Switching
  // ========================================================

  function switchModule(targetId) {
    if (!targetId) return;

    // If leaving psalter reader, save current scroll position
    if (activeModuleId === 'psalter' && targetId !== 'psalter') {
      if (psalterReaderScroll && psalterLayer === 'single') {
        const pos = Math.round(psalterReaderScroll.scrollTop);
        currentPsalmScrollPos = pos;
        psalmScrollPositions[currentPsalmNumber] = pos;
        persistPsalterState();
      }
    }

    activeModuleId = targetId;
    logToHost(`Switching module to: ${targetId}`);

    navButtons.forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.module === targetId);
    });

    moduleViews.forEach((view) => {
      const match = view.id === 'view-' + targetId;
      view.classList.toggle('active', match);
    });

    if (targetId !== 'stats' && statsPollInterval) {
      clearInterval(statsPollInterval);
      statsPollInterval = null;
    }

    // Search bar is visible ONLY on the Search tab
    if (globalSearchWrap) {
      globalSearchWrap.style.display = (targetId === 'search') ? 'flex' : 'none';
    }

    if (targetId === 'search') {
      setTimeout(() => {
        if (searchInput) {
          searchInput.focus();
          if (searchInput.value.trim().length > 0) {
            performSearch(searchInput.value.trim());
          } else {
            renderEmptySearchState();
          }
        }
      }, 50);
    } else if (targetId === 'stats') {
      refreshStats();
      if (!statsPollInterval) {
        statsPollInterval = setInterval(refreshStats, 2000);
      }
    } else if (targetId === 'notes') {
      loadNotes();
      setTimeout(() => {
        if (noteContentInput) {
          noteContentInput.focus();
        }
      }, 60);
    } else if (targetId === 'psalter') {
      if (searchInput) searchInput.blur();
      loadPsalter();
    }
  }

  function onHudOpened(preferredModule) {
    window.focus();
    logToHost(`onHudOpened: preferred=${preferredModule}`);
    if (preferredModule) {
      switchModule(preferredModule);
    } else {
      if (activeModuleId === 'psalter' && psalterLayer === 'single') {
        // Restore scroll on reopening HUD on psalter
        requestAnimationFrame(() => {
          if (psalterReaderScroll) {
            const targetScroll = psalmScrollPositions[currentPsalmNumber] !== undefined
              ? psalmScrollPositions[currentPsalmNumber]
              : currentPsalmScrollPos;
            psalterReaderScroll.scrollTop = targetScroll;
            logToHost(`onHudOpened restored scroll to ${targetScroll}`);
          }
        });
      } else {
        switchModule(activeModuleId || 'search');
      }
    }

    if (activeModuleId === 'search') {
      setTimeout(() => {
        if (searchInput) {
          searchInput.focus();
          if (searchInput.value.trim().length > 0) {
            searchInput.select();
          } else {
            renderEmptySearchState();
          }
        }
      }, 50);
    }
  }

  function onHudClosed() {
    logToHost('onHudClosed called');
    if (activeModuleId === 'psalter' && psalterReaderScroll && psalterLayer === 'single') {
      const pos = Math.round(psalterReaderScroll.scrollTop);
      currentPsalmScrollPos = pos;
      psalmScrollPositions[currentPsalmNumber] = pos;
      persistPsalterState();
    }
  }

  window.focusHudSearch = function () {
    window.focus();
    if (searchInput) {
      searchInput.focus();
      searchInput.select();
    }
  };

  // ========================================================
  // Global Keyboard Shortcuts
  // ========================================================

  document.addEventListener('keydown', (e) => {
    logToHost(`Global Keydown: key=${e.key}, alt=${e.altKey}, ctrl=${e.ctrlKey}, target=${e.target?.tagName}`);

    // 1. Esc hides HUD and triggers save
    if (e.key === 'Escape') {
      e.preventDefault();
      closeContextMenu();
      saveAndHideHud();
      return;
    }

    // 2. Alt + S / D / N or Ctrl + S / D / N
    if ((e.altKey || e.ctrlKey) && !e.shiftKey) {
      const key = e.key.toLowerCase();
      if (key === 's') { e.preventDefault(); switchModule('search'); return; }
      if (key === 'd') { e.preventDefault(); switchModule('stats'); return; }
      if (key === 'n') { e.preventDefault(); switchModule('notes'); return; }
    }

    // 3. Navigation in Psalter module (Arrow keys, Space key, Enter key)
    if (activeModuleId === 'psalter') {
      const isSearchTyping = document.activeElement === searchInput && searchInput.value.trim().length > 0;
      if (!isSearchTyping) {
        if (e.key === ' ' || e.code === 'Space') {
          e.preventDefault();
          psalterOnSpaceKey();
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          psalterGoUpLayer();
          return;
        }
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          psalterGoDownLayer();
          return;
        }
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          psalterTraverseLeft();
          return;
        }
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          psalterTraverseRight();
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          psalterOnEnterKey();
          return;
        }
      }
    }

    // 4. Typing on ANY tab immediately switches to Search tab and starts searching
    const activeEl = document.activeElement;
    const tag = (activeEl && activeEl.tagName) || '';
    const isTyping = tag === 'INPUT' || tag === 'TEXTAREA' || activeEl?.isContentEditable;

    if (!isTyping && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.length === 1) {
      e.preventDefault();
      switchModule('search');
      if (searchInput) {
        searchInput.value = e.key;
        searchInput.focus();
        updateTabHint(e.key);
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
          performSearch(e.key);
        }, 120);
      }
      return;
    }

    if (!isTyping && e.key === 'Backspace' && activeModuleId !== 'search') {
      e.preventDefault();
      switchModule('search');
      if (searchInput) searchInput.focus();
      return;
    }
  });

  // ========================================================
  // Search Bar with Tab / Enter Command Completion
  // ========================================================

  function updateTabHint(text) {
    if (!tabActionHint) return;
    const clean = text.trim().toLowerCase();
    if (clean === 'note' || clean === 'notes' || clean === 'n') {
      tabActionHint.textContent = '⇥ Tab to open Notes';
      tabActionHint.style.display = 'block';
    } else if (clean === 'telemetry' || clean === 'stats' || clean === 'tele' || clean === 'd') {
      tabActionHint.textContent = '⇥ Tab to open Telemetry';
      tabActionHint.style.display = 'block';
    } else if (clean === 'search' || clean === 's') {
      tabActionHint.textContent = '⇥ Tab to open Search';
      tabActionHint.style.display = 'block';
    } else if (clean === 'psalm' || clean === 'psalms' || clean === 'psaltir' || clean === 'ps' || clean === 'псалам' || clean === 'псалтир') {
      tabActionHint.textContent = '⇥ Tab to open Psalter (Псалтир)';
      tabActionHint.style.display = 'block';
    } else {
      tabActionHint.style.display = 'none';
    }
  }

  function handleCommandTabOrEnter(inputVal) {
    clearTimeout(searchDebounceTimer);
    renderEmptySearchState();

    const raw = inputVal.trim().toLowerCase();
    if (raw === 'note' || raw === 'notes' || raw.startsWith('not') || raw === 'n') {
      searchInput.value = '';
      updateTabHint('');
      switchModule('notes');
      return true;
    }
    if (raw === 'telemetry' || raw === 'stats' || raw.startsWith('tele') || raw === 'd') {
      searchInput.value = '';
      updateTabHint('');
      switchModule('stats');
      return true;
    }
    if (raw === 'search' || raw.startsWith('sear') || raw === 's') {
      searchInput.value = '';
      updateTabHint('');
      switchModule('search');
      return true;
    }
    if (raw === 'psalm' || raw === 'psalms' || raw === 'psaltir' || raw === 'ps' || raw.startsWith('psalm') || raw.startsWith('psalt') || raw === 'псалам' || raw === 'псалтир') {
      searchInput.value = '';
      updateTabHint('');
      switchModule('psalter');
      return true;
    }
    return false;
  }

  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchDebounceTimer);
    const query = e.target.value;
    const trimmed = query.trim();

    updateTabHint(query);

    if (!trimmed) {
      renderEmptySearchState();
      return;
    }

    const cleanCmd = trimmed.toLowerCase();
    const isPendingCmd = cleanCmd === 'note' || cleanCmd === 'notes' || cleanCmd === 'telemetry' || cleanCmd === 'stats' || cleanCmd === 'search' || cleanCmd === 'psalm' || cleanCmd === 'psalms' || cleanCmd === 'psaltir' || cleanCmd === 'ps' || cleanCmd === 'псалам' || cleanCmd === 'псалтир';
    if (!isPendingCmd && activeModuleId !== 'search') {
      switchModule('search');
    }

    searchDebounceTimer = setTimeout(() => {
      performSearch(trimmed);
    }, 120);
  });

  searchInput.addEventListener('keydown', (e) => {
    logToHost(`searchInput keydown: key=${e.key}, value="${searchInput.value}"`);

    // Tab Completion for 'note<tab>' and 'telemetry<tab>'
    if (e.key === 'Tab') {
      const handled = handleCommandTabOrEnter(searchInput.value);
      if (handled) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
    }

    // Enter can also execute the tab command or open first result
    if (e.key === 'Enter') {
      const handled = handleCommandTabOrEnter(searchInput.value);
      if (handled) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      const firstResult = searchResultsContainer.querySelector('.result-card');
      if (firstResult) {
        const path = firstResult.dataset.path;
        if (e.ctrlKey) {
          revealFile(path);
        } else {
          openFile(path);
        }
      }
    }
  });

  async function performSearch(query) {
    const trimmed = (query || '').trim();
    if (!trimmed) {
      renderEmptySearchState();
      return;
    }

    searchCounter.textContent = 'Searching...';
    const results = await callModule('search', 'search', { query: trimmed });

    // Ensure search input hasn't been cleared or changed while searching
    if (!searchInput.value.trim() || searchInput.value.trim().toLowerCase() !== trimmed.toLowerCase()) {
      return;
    }

    renderSearchResults(results || [], trimmed);
  }

  function renderSearchResults(results, query) {
    // If no search results: NOTHING should be shown
    if (!results || results.length === 0) {
      searchCounter.textContent = '0 results';
      searchResultsContainer.innerHTML = '';
      return;
    }

    searchCounter.textContent = `${results.length} result${results.length > 1 ? 's' : ''}`;
    let html = '';

    for (const item of results) {
      const fileName = item.fileName || item.FileName || 'Untitled File';
      const filePath = item.filePath || item.FilePath || '';
      const directoryPath = item.directoryPath || item.DirectoryPath || '';
      const rawExt = item.extension || item.Extension || '';
      const ext = rawExt ? rawExt.replace('.', '').toUpperCase() : 'FILE';
      const formattedSize = item.formattedSize || item.FormattedSize || '';
      const lastModified = item.lastModified || item.LastModified || '';
      const excerpts = item.excerpts || item.Excerpts || [];

      let excerptsHtml = '';
      if (excerpts && excerpts.length > 0) {
        excerptsHtml = '<div class="excerpts-box">';
        for (const ex of excerpts) {
          const lineNo = ex.lineNumber ?? ex.LineNumber ?? 1;
          const snippet = ex.snippet ?? ex.Snippet ?? '';
          const matchStart = ex.matchStart ?? ex.MatchStart ?? 0;
          const matchLength = ex.matchLength ?? ex.MatchLength ?? 0;

          const highlighted = highlightExcerpt(snippet, matchStart, matchLength);
          excerptsHtml += `
            <div class="excerpt-line">
              <span class="line-no">L${lineNo}</span>
              <span class="snippet-text">${highlighted}</span>
            </div>
          `;
        }
        excerptsHtml += '</div>';
      }

      html += `
        <div class="result-card" data-path="${escapeHtml(filePath)}">
          <div class="result-card-top">
            <div class="file-info-group">
              <span class="file-ext-badge">${escapeHtml(ext)}</span>
              <span class="file-name">${escapeHtml(fileName)}</span>
            </div>
            <div class="file-meta">
              <span>${escapeHtml(formattedSize)}</span>
              <span>${escapeHtml(lastModified)}</span>
            </div>
          </div>
          <div class="file-path">${escapeHtml(directoryPath)}</div>
          ${excerptsHtml}
        </div>
      `;
    }

    searchResultsContainer.innerHTML = html;

    searchResultsContainer.querySelectorAll('.result-card').forEach((card) => {
      card.addEventListener('click', (e) => {
        const path = card.dataset.path;
        if (e.ctrlKey) {
          revealFile(path);
        } else {
          openFile(path);
        }
      });
    });
  }

  function highlightExcerpt(snippet, matchStart, matchLength) {
    if (!snippet) return '';
    if (matchStart < 0 || matchLength <= 0 || matchStart >= snippet.length) {
      return escapeHtml(snippet);
    }
    const before = snippet.substring(0, matchStart);
    const match = snippet.substring(matchStart, matchStart + matchLength);
    const after = snippet.substring(matchStart + matchLength);
    return `${escapeHtml(before)}<mark class="highlight">${escapeHtml(match)}</mark>${escapeHtml(after)}`;
  }

  function renderEmptySearchState() {
    searchCounter.textContent = '';
    searchResultsContainer.innerHTML = '';
  }

  function openFile(path) {
    logToHost(`openFile: ${path}`);
    callModule('search', 'open', { path });
  }

  function revealFile(path) {
    logToHost(`revealFile: ${path}`);
    callModule('search', 'reveal', { path });
  }

  function updateIndexerStatus(status) {
    if (!status) return;
    const count = status.totalFilesIndexed ?? status.TotalFilesIndexed ?? 0;
    const isIndexing = status.isIndexing ?? status.IsIndexing ?? false;
    const formattedCount = Number(count).toLocaleString();
    const msg = status.statusMessage || status.StatusMessage || (count > 0 ? `Indexed ${formattedCount} files` : 'Ready');

    indexerStatus.textContent = isIndexing ? 'Indexing...' : `${formattedCount} files`;
    footerIndexerLabel.textContent = msg;
    hudStatusIndicator.textContent = isIndexing ? 'INDEXING...' : 'ONLINE';
  }

  // ========================================================
  // Module 2: System Stats / Telemetry Implementation
  // ========================================================

  async function refreshStats() {
    const data = await callModule('stats', 'snapshot');
    if (!data) return;

    // Support both camelCase and PascalCase
    const rawCpu = data.cpuPercent ?? data.CpuPercent ?? 0;
    const cpu = Math.round(Number(rawCpu) || 0);
    cpuPercent.textContent = `${cpu}%`;
    cpuBar.style.width = `${Math.min(100, Math.max(0, cpu))}%`;

    const machine = data.machineName || data.MachineName || 'System';
    cpuStatusText.textContent = `${machine} Telemetry`;

    // RAM
    const ramPct = Math.round(Number(data.ramPercent ?? data.RamPercent ?? 0));
    const ramUsed = data.ramUsedGb ?? data.RamUsedGb ?? 0;
    const ramTotal = data.ramTotalGb ?? data.RamTotalGb ?? 0;
    ramPercent.textContent = `${ramPct}%`;
    ramBar.style.width = `${Math.min(100, Math.max(0, ramPct))}%`;
    ramDetails.textContent = `${ramUsed} GB / ${ramTotal} GB Used`;

    // Power
    const pwrPct = Math.round(Number(data.batteryPercent ?? data.BatteryPercent ?? 100));
    powerPercent.textContent = `${pwrPct}%`;
    powerBar.style.width = `${Math.min(100, Math.max(0, pwrPct))}%`;
    powerStatusText.textContent = data.batteryStatus || data.BatteryStatus || 'AC Connected';

    // Uptime & System
    statsUptime.textContent = data.uptimeFormatted || data.UptimeFormatted || '0h 0m';
    const osVer = data.osVersion || data.OsVersion || '';
    statsSystemInfo.textContent = `${machine} • ${osVer}`;

    // Storage Volumes
    const drives = data.drives || data.Drives || [];
    let drivesHtml = '';
    if (drives && drives.length > 0) {
      for (const d of drives) {
        const name = d.name || d.Name || '';
        const label = d.volumeLabel || d.VolumeLabel || '';
        const free = d.freeGb ?? d.FreeGb ?? 0;
        const total = d.totalGb ?? d.TotalGb ?? 0;
        const pct = d.percentUsed ?? d.PercentUsed ?? 0;
        drivesHtml += `
          <div class="drive-item">
            <div class="drive-info-line">
              <span class="drive-name">${escapeHtml(name)} (${escapeHtml(label)})</span>
              <span class="drive-size">${free} GB free of ${total} GB (${pct}%)</span>
            </div>
            <div class="bar-track">
              <div class="bar-fill" style="width: ${pct}%"></div>
            </div>
          </div>
        `;
      }
    } else {
      drivesHtml = '<div style="opacity:0.6;font-size:0.8rem;padding:8px;">No fixed drives found</div>';
    }
    drivesContainer.innerHTML = drivesHtml;

    // Top Processes
    const procs = data.topProcesses || data.TopProcesses || [];
    let procHtml = '';
    if (procs && procs.length > 0) {
      for (const p of procs) {
        const pName = p.name || p.Name || 'Process';
        const pMem = p.memoryMb ?? p.MemoryMb ?? 0;
        procHtml += `
          <div class="process-item">
            <span class="process-name">${escapeHtml(pName)}</span>
            <span class="process-mem">${pMem} MB</span>
          </div>
        `;
      }
    } else {
      procHtml = '<div style="opacity:0.6;font-size:0.8rem;padding:8px;">No process telemetry</div>';
    }
    processesContainer.innerHTML = procHtml;
  }

  // ========================================================
  // Module 3: Notes Tool Implementation with Persistent Auto-Save
  // ========================================================

  async function loadNotes() {
    const data = await callModule('notes', 'get_all');
    if (data) {
      allNotes = data.notes || data.Notes || [];
      const activeId = data.activeNoteId || data.ActiveNoteId;
      activeNote = allNotes.find((n) => (n.id || n.Id) === activeId) || allNotes[0] || null;
      renderNotesSidebar();
      renderActiveNote();
    }
  }

  function renderNotesSidebar() {
    if (!allNotes || allNotes.length === 0) {
      notesListContainer.innerHTML = '<div style="padding:10px;font-size:0.75rem;opacity:0.5;">No notes yet</div>';
      return;
    }

    let html = '';
    for (const note of allNotes) {
      const noteId = note.id || note.Id;
      const noteTitle = note.title || note.Title || 'Untitled Note';
      const noteDate = note.updatedAt || note.UpdatedAt || note.createdAt || note.CreatedAt;
      const isActive = activeNote && (activeNote.id || activeNote.Id) === noteId;
      const dateStr = noteDate ? new Date(noteDate).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }) : '';

      html += `
        <div class="note-item-card ${isActive ? 'active' : ''}" data-id="${noteId}">
          <span class="note-item-title">${escapeHtml(noteTitle)}</span>
          <span class="note-item-date">${dateStr}</span>
        </div>
      `;
    }

    notesListContainer.innerHTML = html;

    notesListContainer.querySelectorAll('.note-item-card').forEach((card) => {
      card.addEventListener('click', () => {
        const id = card.dataset.id;
        selectNote(id);
      });
    });
  }

  function selectNote(id) {
    if (activeNote && (activeNote.id || activeNote.Id) === id) return;
    saveActiveNoteImmediate();

    activeNote = allNotes.find((n) => (n.id || n.Id) === id) || null;
    callModule('notes', 'set_active', { id });
    renderNotesSidebar();
    renderActiveNote();
  }

  function renderActiveNote() {
    if (!activeNote) {
      noteTitleInput.value = '';
      noteContentInput.value = '';
      updateWordCount('');
      return;
    }

    const title = activeNote.title || activeNote.Title || '';
    const content = activeNote.content || activeNote.Content || '';

    noteTitleInput.value = title;
    noteContentInput.value = content;
    updateWordCount(content);
    noteSaveBadge.textContent = 'Saved';
    noteSaveBadge.style.opacity = '0.7';
  }

  function updateWordCount(text) {
    const words = text ? text.trim().split(/\s+/).filter(Boolean).length : 0;
    const chars = text ? text.length : 0;
    noteWordCount.textContent = `${words} words, ${chars} chars`;
  }

  // Live Auto-Save for Notes
  noteTitleInput.addEventListener('input', scheduleNoteAutoSave);
  noteContentInput.addEventListener('input', () => {
    updateWordCount(noteContentInput.value);
    scheduleNoteAutoSave();
  });

  function scheduleNoteAutoSave() {
    noteSaveBadge.textContent = 'Saving...';
    noteSaveBadge.style.opacity = '1';

    clearTimeout(noteAutoSaveTimer);
    noteAutoSaveTimer = setTimeout(() => {
      saveActiveNoteImmediate();
    }, 300);
  }

  function saveActiveNoteImmediate() {
    if (!activeNote) return;
    const title = noteTitleInput.value;
    const content = noteContentInput.value;

    const noteId = activeNote.id || activeNote.Id;

    activeNote.title = title;
    activeNote.content = content;
    activeNote.updatedAt = new Date().toISOString();

    callModule('notes', 'update', {
      id: noteId,
      title,
      content,
      immediateSave: true
    });

    noteSaveBadge.textContent = 'Saved';
    noteSaveBadge.style.opacity = '0.7';

    const activeCard = notesListContainer.querySelector(`.note-item-card[data-id="${noteId}"] .note-item-title`);
    if (activeCard) {
      activeCard.textContent = title || 'Untitled Note';
    }
  }

  btnAddNote.addEventListener('click', async () => {
    saveActiveNoteImmediate();
    const created = await callModule('notes', 'create', {
      title: 'New Note',
      content: ''
    });
    if (created) {
      allNotes.unshift(created);
      activeNote = created;
      renderNotesSidebar();
      renderActiveNote();
      noteTitleInput.focus();
      noteTitleInput.select();
    }
  });

  btnDeleteNote.addEventListener('click', async () => {
    if (!activeNote) return;
    const noteId = activeNote.id || activeNote.Id;
    const noteTitle = activeNote.title || activeNote.Title || 'Note';
    if (confirm(`Delete "${noteTitle}"?`)) {
      await callModule('notes', 'delete', { id: noteId });
      allNotes = allNotes.filter((n) => (n.id || n.Id) !== noteId);
      activeNote = allNotes[0] || null;
      renderNotesSidebar();
      renderActiveNote();
    }
  });

  // ========================================================
  // Module 4: Psalter (Свети Псалтир) - 3-Tier Full-Width Layer Architecture
  // ========================================================

  async function ensurePsalterResources() {
    // 1. Instructions
    if (!psalmInstructions && typeof window !== 'undefined' && window.PSALM_INSTRUCTIONS) {
      psalmInstructions = window.PSALM_INSTRUCTIONS;
    }
    if (!psalmInstructions) {
      try {
        const hostInst = await callModule('psalter', 'get_instructions');
        if (hostInst && typeof hostInst === 'object' && Object.keys(hostInst).length > 0) {
          psalmInstructions = hostInst;
          logToHost(`Loaded psalm instructions via host module for ${Object.keys(psalmInstructions).length} psalms`);
        }
      } catch (e) {}
    }
    if (!psalmInstructions) {
      try {
        const respInst = await fetch('data/psalm_instructions.json');
        psalmInstructions = await respInst.json();
      } catch (e) {}
    }

    // 2. Katizma Prayers
    if (!katizmaPrayers && typeof window !== 'undefined' && window.KATIZMA_PRAYERS) {
      katizmaPrayers = window.KATIZMA_PRAYERS;
    }
    if (!katizmaPrayers) {
      try {
        const hostPrayers = await callModule('psalter', 'get_katizma_prayers');
        if (hostPrayers && typeof hostPrayers === 'object' && Object.keys(hostPrayers).length > 0) {
          katizmaPrayers = hostPrayers;
          logToHost(`Loaded katizma prayers via host module for ${Object.keys(katizmaPrayers).length} katizmas`);
        }
      } catch (e) {}
    }
    if (!katizmaPrayers) {
      try {
        const respPrayers = await fetch('data/katizma_prayers.json');
        katizmaPrayers = await respPrayers.json();
      } catch (e) {}
    }

    // 3. Preface Prayers
    if (!psalterPreface && typeof window !== 'undefined' && window.PSALTER_PREFACE) {
      psalterPreface = window.PSALTER_PREFACE;
    }
    if (!psalterPreface) {
      try {
        const hostPref = await callModule('psalter', 'get_preface');
        if (hostPref && typeof hostPref === 'object') {
          psalterPreface = hostPref;
          logToHost(`Loaded preface prayers via host module`);
        }
      } catch (e) {}
    }
    if (!psalterPreface) {
      try {
        const respPref = await fetch('data/psalter_preface.json');
        psalterPreface = await respPref.json();
      } catch (e) {}
    }

    // 4. Old CS Psalms
    if (!psalmsCsOld && typeof window !== 'undefined' && window.psalmsCsOld) {
      psalmsCsOld = window.psalmsCsOld;
    }
    if (!psalmsCsOld) {
      try {
        const hostCsOld = await callModule('psalter', 'get_cs_old');
        if (hostCsOld && typeof hostCsOld === 'object' && Object.keys(hostCsOld).length > 0) {
          psalmsCsOld = hostCsOld;
          logToHost(`Loaded Old CS psalms via host module`);
        }
      } catch (e) {}
    }
    if (!psalmsCsOld) {
      try {
        const respCsOld = await fetch('data/psalms_cs_old.json');
        psalmsCsOld = await respCsOld.json();
      } catch (e) {}
    }

    // 5. Cyrillic CS Psalms
    if (!psalmsCsCyrillic && typeof window !== 'undefined' && window.psalmsCsCyrillic) {
      psalmsCsCyrillic = window.psalmsCsCyrillic;
    }
    if (!psalmsCsCyrillic) {
      try {
        const hostCsCyr = await callModule('psalter', 'get_cs_cyrillic');
        if (hostCsCyr && typeof hostCsCyr === 'object' && Object.keys(hostCsCyr).length > 0) {
          psalmsCsCyrillic = hostCsCyr;
          logToHost(`Loaded Cyrillic CS psalms via host module`);
        }
      } catch (e) {}
    }
    if (!psalmsCsCyrillic) {
      try {
        const respCsCyr = await fetch('data/psalms_cs_cyrillic.json');
        psalmsCsCyrillic = await respCsCyr.json();
      } catch (e) {}
    }

    // 6. Psalm Alignments
    if (!psalmAlignments && typeof window !== 'undefined' && window.psalmAlignments) {
      psalmAlignments = window.psalmAlignments;
    }
    if (!psalmAlignments) {
      try {
        const respAlign = await fetch('data/psalm_alignments.json');
        psalmAlignments = await respAlign.json();
      } catch (e) {}
    }
  }

  async function loadPsalter() {
    logToHost(`loadPsalter() called, currentPsalm=${currentPsalmNumber}, currentKatizma=${currentKatizmaNumber}, layer=${psalterLayer}`);
    await ensurePsalterResources();
    if (psalterData) {
      setPsalterLayer(psalterLayer, true);
      return;
    }

    try {
      // 1. Try host module
      let data = await callModule('psalter', 'get_all');
      if (!data || !data.katizmas || data.katizmas.length === 0) {
        // 2. Fallback to data/psalter.json
        const resp = await fetch('data/psalter.json');
        data = await resp.json();
      }

      if (!psalmInstructions && typeof window !== 'undefined' && window.PSALM_INSTRUCTIONS) {
        psalmInstructions = window.PSALM_INSTRUCTIONS;
      }

      if (!psalmInstructions) {
        try {
          const hostInst = await callModule('psalter', 'get_instructions');
          if (hostInst && typeof hostInst === 'object' && Object.keys(hostInst).length > 0) {
            psalmInstructions = hostInst;
            logToHost(`Loaded psalm instructions via host module for ${Object.keys(psalmInstructions).length} psalms`);
          }
        } catch (e) {
          // ignore host module failure
        }
      }

      if (!psalmInstructions) {
        try {
          const respInst = await fetch('data/psalm_instructions.json');
          psalmInstructions = await respInst.json();
          logToHost(`Loaded psalm instructions for ${Object.keys(psalmInstructions).length} psalms`);
        } catch (e) {
          logToHost(`Could not load psalm instructions: ${e}`, 'WARN');
        }
      }

      if (data && data.katizmas && data.katizmas.length > 0) {
        psalterData = data;
        logToHost(`Psalter loaded: ${data.katizmas.length} katizmas, ${data.totalPsalms || 151} psalms`);
        setPsalterLayer(psalterLayer, true);
      } else {
        logToHost('Psalter data failed to load or empty', 'WARN');
      }
    } catch (err) {
      logToHost(`Error loading psalter: ${err}`, 'ERROR');
    }
  }

  function persistPsalterState() {
    try {
      if (psalterReaderScroll && psalterLayer === 'single') {
        currentPsalmScrollPos = Math.round(psalterReaderScroll.scrollTop);
        psalmScrollPositions[currentPsalmNumber] = currentPsalmScrollPos;
      }
      localStorage.setItem('hud_last_psalm_num', String(currentPsalmNumber));
      localStorage.setItem('hud_last_katizma_num', String(currentKatizmaNumber));
      localStorage.setItem('hud_last_psalter_level', psalterLayer);
      localStorage.setItem('hud_last_psalm_scroll', String(currentPsalmScrollPos));
    } catch (e) {}

    callHost('save_psalter_state', {
      psalmNumber: currentPsalmNumber,
      katizmaNumber: currentKatizmaNumber,
      level: psalterLayer,
      scrollPos: currentPsalmScrollPos
    });
  }

  function setPsalterLayer(layer, restoreScroll = false) {
    if (layer !== 'katizmas' && layer !== 'psalms' && layer !== 'single') {
      layer = 'single';
    }

    // If leaving single psalm layer, record current scroll
    if (psalterLayer === 'single' && layer !== 'single' && psalterReaderScroll) {
      currentPsalmScrollPos = Math.round(psalterReaderScroll.scrollTop);
      psalmScrollPositions[currentPsalmNumber] = currentPsalmScrollPos;
    }

    psalterLayer = layer;
    logToHost(`setPsalterLayer: ${layer}, restoreScroll=${restoreScroll}`);

    // 1. View visibility
    if (layerKatizmasView) layerKatizmasView.classList.toggle('active', layer === 'katizmas');
    if (layerPsalmsView) layerPsalmsView.classList.toggle('active', layer === 'psalms');
    if (layerSingleView) layerSingleView.classList.toggle('active', layer === 'single');

    // 2. Pill indicators
    if (pillLayerKatizmas) pillLayerKatizmas.classList.toggle('active', layer === 'katizmas');
    if (pillLayerPsalms) pillLayerPsalms.classList.toggle('active', layer === 'psalms');
    if (pillLayerSingle) pillLayerSingle.classList.toggle('active', layer === 'single');

    // 3. Breadcrumbs
    if (bcPsalms) {
      bcPsalms.textContent = `Катизма ${currentKatizmaNumber}`;
      bcPsalms.style.display = (layer === 'psalms' || layer === 'single') ? 'inline-block' : 'none';
    }
    if (bcSep1) {
      bcSep1.style.display = (layer === 'psalms' || layer === 'single') ? 'inline-block' : 'none';
    }
    if (bcSinglePsalm) {
      bcSinglePsalm.textContent = `Псалам ${currentPsalmNumber}`;
      bcSinglePsalm.style.display = (layer === 'single') ? 'inline-block' : 'none';
    }
    if (bcSep2) {
      bcSep2.style.display = (layer === 'single') ? 'inline-block' : 'none';
    }

    // 4. Render active layer content
    if (layer === 'katizmas') {
      renderKatizmasGrid();
    } else if (layer === 'psalms') {
      renderPsalmsGrid();
    } else if (layer === 'single') {
      displayCurrentPsalm(restoreScroll);
    }

    persistPsalterState();
  }

  function renderKatizmasGrid() {
    if (!psalterData || !katizmasGridContainer) return;
    const katizmas = psalterData.katizmas || [];
    let html = '';

    for (const k of katizmas) {
      const kNum = k.number || k.Number;
      const kName = k.name || k.Name || `Катизма ${kNum}`;
      const kRange = k.range || k.Range || '';
      const psalms = k.psalms || k.Psalms || [];
      const isSelected = kNum === currentKatizmaNumber;

      html += `
        <div class="katizma-card ${isSelected ? 'selected' : ''}" data-katizma="${kNum}">
          <div class="katizma-card-top">
            <span class="katizma-card-num">${kNum}</span>
            <span class="katizma-card-range">${escapeHtml(kRange)}</span>
          </div>
          <div class="katizma-card-title">${escapeHtml(kName)}</div>
          <div class="katizma-card-count">${psalms.length} псалама</div>
        </div>
      `;
    }

    katizmasGridContainer.innerHTML = html;

    katizmasGridContainer.querySelectorAll('.katizma-card').forEach((card) => {
      card.addEventListener('click', () => {
        const kNum = parseInt(card.dataset.katizma, 10);
        selectKatizma(kNum);
        setPsalterLayer('psalms');
      });
    });

    setTimeout(() => {
      const sel = katizmasGridContainer.querySelector('.katizma-card.selected');
      if (sel) sel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 40);
  }

  function renderPsalmsGrid() {
    if (!psalterData || !psalmsGridContainer) return;
    const katizmas = psalterData.katizmas || [];
    const currentK = katizmas.find((k) => (k.number || k.Number) === currentKatizmaNumber) || katizmas[0];
    if (!currentK) return;

    const kNum = currentK.number || currentK.Number;
    const kName = currentK.name || currentK.Name || `Катизма ${kNum}`;
    const kRange = currentK.range || currentK.Range || '';
    const psalms = currentK.psalms || currentK.Psalms || [];

    if (layerPsalmsTitle) layerPsalmsTitle.textContent = kName;
    if (layerPsalmsRange) layerPsalmsRange.textContent = kRange;

    let html = '';
    for (const p of psalms) {
      const pNum = p.number || p.Number || p.id || p.Id;
      const firstVerse = p.firstVerse || p.FirstVerse || (p.lines && p.lines[0]) || '';
      const isSelected = pNum === currentPsalmNumber;
      const instObj = psalmInstructions ? psalmInstructions[String(pNum)] : null;
      const instText = instObj ? instObj.instruction : '';

      let cardTitle = `Псалам ${pNum}`;
      let cardSnippet = firstVerse;
      let isCsOldCard = false;

      if (currentPsalterLanguage === 'cs_old') {
        const csOldObj = (psalmsCsOld && psalmsCsOld[String(pNum)]) || (window.psalmsCsOld && window.psalmsCsOld[String(pNum)]) || null;
        if (csOldObj) {
          cardTitle = csOldObj.title;
          if (csOldObj.verses && csOldObj.verses[0]) {
            cardSnippet = csOldObj.verses[0].text;
          }
        }
        isCsOldCard = true;
      } else if (currentPsalterLanguage === 'cs_cyrillic') {
        const csCyrObj = (psalmsCsCyrillic && psalmsCsCyrillic[String(pNum)]) || (window.psalmsCsCyrillic && window.psalmsCsCyrillic[String(pNum)]) || null;
        if (csCyrObj) {
          cardTitle = csCyrObj.title;
          if (csCyrObj.verses && csCyrObj.verses[0]) {
            cardSnippet = csCyrObj.verses[0].text;
          }
        }
      }

      html += `
        <div class="psalm-card ${isSelected ? 'selected' : ''} ${isCsOldCard ? 'font-churchslavonic' : ''}" data-psalm="${pNum}">
          <div class="psalm-card-num">${escapeHtml(cardTitle)}</div>
          ${instText ? `
            <div class="psalm-card-instruction">
              <span class="inst-icon">🕊️</span>
              <span class="inst-text">${escapeHtml(instText)}</span>
            </div>
          ` : ''}
          ${cardSnippet ? `<div class="psalm-card-snippet">${escapeHtml(cardSnippet)}</div>` : ''}
        </div>
      `;
    }

    psalmsGridContainer.innerHTML = html;

    psalmsGridContainer.querySelectorAll('.psalm-card').forEach((card) => {
      card.addEventListener('click', () => {
        const pNum = parseInt(card.dataset.psalm, 10);
        selectPsalm(pNum, false);
        setPsalterLayer('single', true);
      });
    });

    setTimeout(() => {
      const sel = psalmsGridContainer.querySelector('.psalm-card.selected');
      if (sel) sel.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 40);
  }

  const KATIZMA_LAST_PSALMS = {
    1: 8, 2: 16, 3: 23, 4: 31, 5: 36, 6: 45, 7: 54, 8: 63, 9: 69, 10: 76,
    11: 84, 12: 90, 13: 100, 14: 104, 15: 108, 16: 117, 17: 118, 18: 133, 19: 142, 20: 151
  };

  function getLastPsalmOfKatizma(kNum) {
    if (!psalterData) return KATIZMA_LAST_PSALMS[kNum] || 8;
    const katizmas = psalterData.katizmas || [];
    const k = katizmas.find((item) => (item.number || item.Number) === kNum);
    if (!k) return KATIZMA_LAST_PSALMS[kNum] || 8;
    const psalms = k.psalms || k.Psalms || [];
    if (psalms.length === 0) return KATIZMA_LAST_PSALMS[kNum] || 8;
    const lastP = psalms[psalms.length - 1];
    return lastP.number || lastP.Number || lastP.id;
  }

  function getFirstPsalmOfKatizma(kNum) {
    if (!psalterData) return 1;
    const katizmas = psalterData.katizmas || [];
    const k = katizmas.find((item) => (item.number || item.Number) === kNum);
    if (!k) return 1;
    const psalms = k.psalms || k.Psalms || [];
    if (psalms.length === 0) return 1;
    const firstP = psalms[0];
    return firstP.number || firstP.Number || firstP.id;
  }

  function isLastPsalmOfCurrentKatizma() {
    return currentPsalmNumber === getLastPsalmOfKatizma(currentKatizmaNumber);
  }

  function formatLiturgicalMarkup(raw) {
    if (!raw) return '';
    let escaped = escapeHtml(raw);
    escaped = escaped.replace(/(Слава:|И сада:)/g, '<span class="liturgical-gloria">$1</span>');
    escaped = escaped.replace(/(Трисвето;|Пресвета Тројице;|Оче наш;|Трисвето\.|Оче наш\.)/g, '<span class="liturgical-rubric">$1</span>');
    escaped = escaped.replace(/(Господе помилуј\s*\([^)]+\)|Господе помилуј\s*\d+\s*пута\.?|Господе ломилуј\s*\([^)]+\))/gi, '<span class="liturgical-rubric">$1</span>');
    escaped = escaped.replace(/(Молитва:\s*|Затим тропари[^\n:]*:?|И ове Тропаре[^\n:]*:?)/gi, '<span class="liturgical-heading">$1</span>');
    return escaped;
  }

  function renderPrefacePrayersBanner() {
    const bannerEl = document.getElementById('preface-prayers-banner') || document.getElementById('preface-prayers-container');
    if (!bannerEl) return;
    if (isViewingKatizmaPrayer || !psalterPreface) {
      bannerEl.innerHTML = '';
      bannerEl.style.display = 'none';
      return;
    }

    bannerEl.style.display = 'block';
    let bodyHtml = '';
    const sections = psalterPreface.sections || [];
    for (const s of sections) {
      bodyHtml += `
        <div class="liturgical-section">
          <div class="liturgical-heading">✤ ${escapeHtml(s.heading)}</div>
          <div class="liturgical-text">${formatLiturgicalMarkup(s.text)}</div>
        </div>
      `;
    }

    bannerEl.innerHTML = `
      <div class="liturgical-banner-header" id="btn-toggle-preface">
        <div class="liturgical-banner-badge">
          <span class="liturgical-cross">☦</span>
          <span class="liturgical-badge-text">Устав Светих Отаца</span>
        </div>
        <div class="liturgical-banner-title-wrap">
          <span class="liturgical-banner-title">МОЛИТВЕ ПРЕ ЧИТАЊА ПСАЛТИРА</span>
          <span class="liturgical-banner-sub">Света Гора Атонска • Да се зна како треба посебно певати Псалтир</span>
        </div>
        <div class="liturgical-banner-actions">
          <button class="btn-toggle-liturgical" id="btn-toggle-preface-btn" type="button">
            <span class="toggle-text">${prefaceExpanded ? 'Сакриј молитве' : 'Прикажи уводне молитве'}</span>
            <span class="toggle-icon">${prefaceExpanded ? '▲' : '▼'}</span>
          </button>
        </div>
      </div>
      <div class="liturgical-banner-body" id="preface-banner-body" style="display: ${prefaceExpanded ? 'block' : 'none'};">
        ${bodyHtml}
      </div>
    `;

    const toggleBtn = bannerEl.querySelector('#btn-toggle-preface');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        prefaceExpanded = !prefaceExpanded;
        const bodyEl = document.getElementById('preface-banner-body');
        const textEl = bannerEl.querySelector('.toggle-text');
        const iconEl = bannerEl.querySelector('.toggle-icon');
        if (bodyEl) bodyEl.style.display = prefaceExpanded ? 'block' : 'none';
        if (textEl) textEl.textContent = prefaceExpanded ? 'Сакриј молитве' : 'Прикажи уводне молитве';
        if (iconEl) iconEl.textContent = prefaceExpanded ? '▲' : '▼';
      });
    }
  }

  function renderPostKatizmaBanner() {
    const bannerEl = document.getElementById('post-katizma-banner') || document.getElementById('post-katizma-container');
    if (!bannerEl) return;
    if (isViewingKatizmaPrayer || !isLastPsalmOfCurrentKatizma()) {
      bannerEl.innerHTML = '';
      bannerEl.style.display = 'none';
      return;
    }

    const prayerObj = katizmaPrayers ? katizmaPrayers[String(currentKatizmaNumber)] : null;
    if (!prayerObj) {
      bannerEl.innerHTML = '';
      bannerEl.style.display = 'none';
      return;
    }

    bannerEl.style.display = 'block';
    bannerEl.innerHTML = `
      <div class="liturgical-banner-header" id="btn-toggle-post-prayer-header">
        <div class="liturgical-banner-badge">
          <span class="liturgical-cross">☦</span>
          <span class="liturgical-badge-text">Катизма ${currentKatizmaNumber}</span>
        </div>
        <div class="liturgical-banner-title-wrap">
          <span class="liturgical-banner-title">МОЛИТВЕ ПОСЛЕ ${currentKatizmaNumber}. КАТИЗМЕ</span>
          <span class="liturgical-banner-sub">Трисвето, тропари, 40х Господе помилуј и завршна молитва</span>
        </div>
        <div class="liturgical-banner-actions">
          <button class="btn-toggle-liturgical" id="btn-toggle-post-prayer-btn" type="button">
            <span class="toggle-text">${postPrayerInlineExpanded ? 'Сакриј' : 'Прикажи овде'}</span>
            <span class="toggle-icon">${postPrayerInlineExpanded ? '▲' : '▼'}</span>
          </button>
          <button class="btn-open-prayer-full" id="btn-open-post-prayer-full" type="button" title="Отвори молитве на целој страни (→ или Space)">
            <span>Отвори молитве</span>
            <span class="nav-key-badge">→ / Space</span>
          </button>
        </div>
      </div>
      <div class="liturgical-banner-body" id="post-prayer-banner-body" style="display: ${postPrayerInlineExpanded ? 'block' : 'none'};">
        <div class="liturgical-text">${formatLiturgicalMarkup(prayerObj.fullText)}</div>
        <div class="prayer-nav-action-card" style="margin-top: 18px;">
          <div class="action-card-text">
            <span class="action-card-icon">📖</span>
            <span>Завршетак ${currentKatizmaNumber}. катизме</span>
          </div>
          <button class="btn-proceed-next-katizma" id="btn-inline-proceed" type="button">
            <span>${currentKatizmaNumber === 20 ? 'Повратак на 1. Катизму (Псалам 1)' : 'Пређи на ' + (currentKatizmaNumber + 1) + '. Катизму'}</span>
            <span class="nav-key-badge">→ / Space</span>
          </button>
        </div>
      </div>
    `;

    const toggleBtn = bannerEl.querySelector('#btn-toggle-post-prayer-btn');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        postPrayerInlineExpanded = !postPrayerInlineExpanded;
        const bodyEl = document.getElementById('post-prayer-banner-body');
        const textEl = toggleBtn.querySelector('.toggle-text');
        const iconEl = toggleBtn.querySelector('.toggle-icon');
        if (bodyEl) bodyEl.style.display = postPrayerInlineExpanded ? 'block' : 'none';
        if (textEl) textEl.textContent = postPrayerInlineExpanded ? 'Сакриј' : 'Прикажи овде';
        if (iconEl) iconEl.textContent = postPrayerInlineExpanded ? '▲' : '▼';
      });
    }

    const openFullBtn = bannerEl.querySelector('#btn-open-post-prayer-full');
    if (openFullBtn) {
      openFullBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        displayKatizmaPrayers(currentKatizmaNumber);
      });
    }

    const inlineProceedBtn = bannerEl.querySelector('#btn-inline-proceed');
    if (inlineProceedBtn) {
      inlineProceedBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        advanceAfterKatizmaPrayer();
      });
    }
  }

  function displayKatizmaPrayers(katizmaNum) {
    if (!katizmaPrayers) return;
    const prayerObj = katizmaPrayers[String(katizmaNum)];
    if (!prayerObj) return;

    isViewingKatizmaPrayer = true;
    currentKatizmaNumber = katizmaNum;

    if (bcKatizmas) bcKatizmas.textContent = `Катизме (1–20)`;
    if (bcPsalms) {
      bcPsalms.textContent = `Катизма ${katizmaNum}`;
      bcPsalms.style.display = 'inline-block';
    }
    if (bcSep1) bcSep1.style.display = 'inline-block';
    if (bcSinglePsalm) {
      bcSinglePsalm.textContent = `Молитве после ${katizmaNum}. катизме`;
      bcSinglePsalm.style.display = 'inline-block';
    }
    if (bcSep2) bcSep2.style.display = 'inline-block';

    if (readerKatizmaBadge) readerKatizmaBadge.textContent = `Катизма ${katizmaNum}`;
    if (readerRangeBadge) readerRangeBadge.textContent = `Завршне молитве`;
    if (readerPsalmCounter) readerPsalmCounter.textContent = `Молитве • Катизма ${katizmaNum} / 20`;

    if (prefacePrayersBanner) {
      prefacePrayersBanner.innerHTML = '';
      prefacePrayersBanner.style.display = 'none';
    }
    if (postKatizmaBanner) {
      postKatizmaBanner.innerHTML = '';
      postKatizmaBanner.style.display = 'none';
    }
    if (readerInstructionContainer) {
      readerInstructionContainer.innerHTML = '';
      readerInstructionContainer.style.display = 'none';
    }
    if (readerPsalmOrnament) readerPsalmOrnament.style.display = 'flex';

    if (readerPsalmTitle) {
      readerPsalmTitle.classList.remove('font-churchslavonic');
      readerPsalmTitle.textContent = `МОЛИТВЕ ПОСЛЕ ${katizmaNum}. КАТИЗМЕ`;
    }
    if (readerPsalmSubtitle) {
      readerPsalmSubtitle.textContent = prayerObj.header || `После прочитане ${katizmaNum}. катизме говори се:`;
      readerPsalmSubtitle.style.display = 'block';
    }

    const lastP = getLastPsalmOfKatizma(katizmaNum);
    const nextK = katizmaNum === 20 ? 1 : katizmaNum + 1;
    const nextP = katizmaNum === 20 ? 1 : getFirstPsalmOfKatizma(nextK);

    if (btnPrevPsalm) {
      btnPrevPsalm.disabled = false;
      btnPrevPsalm.innerHTML = `◀ Псалам ${lastP} (←)`;
    }
    if (btnNextPsalm) {
      btnNextPsalm.disabled = false;
      btnNextPsalm.innerHTML = katizmaNum === 20 
        ? `Прва Катизма (Псалам 1) (→ / Space) ▶` 
        : `Катизма ${nextK} (Псалам ${nextP}) (→ / Space) ▶`;
    }

    if (readerPsalmText) {
      readerPsalmText.classList.remove('psalm-parallel-container');
      readerPsalmText.classList.remove('font-churchslavonic');
      readerPsalmText.style.removeProperty('--parallel-cols');

      let contentHtml = `
        <div class="katizma-prayer-full-sheet">
          <div class="liturgical-text" style="font-size: 1.05rem; line-height: 1.8;">
            ${formatLiturgicalMarkup(prayerObj.fullText)}
          </div>
          <div class="prayer-nav-action-card">
            <div class="action-card-text">
              <span class="action-card-icon">📖</span>
              <span>Завршили сте молитве после ${katizmaNum}. катизме</span>
            </div>
            <button class="btn-proceed-next-katizma" id="btn-proceed-next-katizma" type="button">
              <span>${katizmaNum === 20 ? 'Повратак на 1. Катизму (Псалам 1)' : 'Пређи на ' + nextK + '. Катизму (Псалам ' + nextP + ')'}</span>
              <span class="nav-key-badge">→ / Space</span>
            </button>
          </div>
        </div>
      `;
      readerPsalmText.innerHTML = contentHtml;

      const proceedBtn = readerPsalmText.querySelector('#btn-proceed-next-katizma');
      if (proceedBtn) {
        proceedBtn.addEventListener('click', () => {
          advanceAfterKatizmaPrayer();
        });
      }
    }

    if (psalterReaderScroll) {
      psalterReaderScroll.scrollTop = 0;
    }
  }

  function advanceAfterKatizmaPrayer() {
    isViewingKatizmaPrayer = false;
    if (currentKatizmaNumber === 20) {
      selectKatizma(1);
      selectPsalm(1, true);
    } else {
      const nextK = currentKatizmaNumber + 1;
      selectKatizma(nextK);
      const nextP = getFirstPsalmOfKatizma(nextK);
      selectPsalm(nextP, true);
    }
    displayCurrentPsalm(false);
  }

  function displayCurrentPsalm(restoreScroll = false) {
    if (!psalterData) return;
    isViewingKatizmaPrayer = false;

    const katizmas = psalterData.katizmas || [];
    const currentKatizma = katizmas.find((k) => (k.number || k.Number) === currentKatizmaNumber);
    if (!currentKatizma) return;

    const psalms = currentKatizma.psalms || currentKatizma.Psalms || [];
    const psalm = psalms.find((p) => (p.number || p.Number || p.id) === currentPsalmNumber);
    if (!psalm) return;

    const kName = currentKatizma.name || currentKatizma.Name || `Катизма ${currentKatizmaNumber}`;
    const kRange = currentKatizma.range || currentKatizma.Range || '';

    if (readerKatizmaBadge) readerKatizmaBadge.textContent = kName;
    if (readerRangeBadge) readerRangeBadge.textContent = kRange;
    if (readerPsalmCounter) readerPsalmCounter.textContent = `${psalm.number || currentPsalmNumber} / 151`;

    if (readerPsalmOrnament) readerPsalmOrnament.style.display = 'flex';

    // 1. Uniform Preface Prayers Banner
    renderPrefacePrayersBanner();

    const activeParallel = (psalterParallelModes && psalterParallelModes.length > 0);

    // 2. Psalm Titles & Formatting
    if (!activeParallel) {
      if (currentPsalterLanguage === 'cs_old') {
        const csOldObj = (psalmsCsOld && psalmsCsOld[String(currentPsalmNumber)]) || (window.psalmsCsOld && window.psalmsCsOld[String(currentPsalmNumber)]) || null;
        if (readerPsalmTitle) {
          readerPsalmTitle.classList.add('font-churchslavonic');
          readerPsalmTitle.textContent = csOldObj ? csOldObj.title : `Ѱало́мъ ${currentPsalmNumber}`;
        }
        const sub = csOldObj ? (csOldObj.subtitle || '') : '';
        if (readerPsalmSubtitle) {
          readerPsalmSubtitle.textContent = sub;
          readerPsalmSubtitle.style.display = sub ? 'block' : 'none';
        }
      } else if (currentPsalterLanguage === 'cs_cyrillic') {
        const csCyrObj = (psalmsCsCyrillic && psalmsCsCyrillic[String(currentPsalmNumber)]) || (window.psalmsCsCyrillic && window.psalmsCsCyrillic[String(currentPsalmNumber)]) || null;
        if (readerPsalmTitle) {
          readerPsalmTitle.classList.remove('font-churchslavonic');
          readerPsalmTitle.textContent = csCyrObj ? csCyrObj.title : `Псалом ${currentPsalmNumber}. (${currentPsalmNumber})`;
        }
        const sub = csCyrObj ? (csCyrObj.subtitle || '') : '';
        if (readerPsalmSubtitle) {
          readerPsalmSubtitle.textContent = sub;
          readerPsalmSubtitle.style.display = sub ? 'block' : 'none';
        }
      } else {
        if (readerPsalmTitle) {
          readerPsalmTitle.classList.remove('font-churchslavonic');
          readerPsalmTitle.textContent = psalm.title || psalm.Title || `Псалам ${currentPsalmNumber}.`;
        }
        const sub = psalm.subtitle || psalm.Subtitle || '';
        if (readerPsalmSubtitle) {
          readerPsalmSubtitle.textContent = sub;
          readerPsalmSubtitle.style.display = sub ? 'block' : 'none';
        }
      }
    } else {
      if (readerPsalmTitle) {
        readerPsalmTitle.classList.remove('font-churchslavonic');
        readerPsalmTitle.textContent = `Псалам / Ѱало́мъ ${currentPsalmNumber}`;
      }
      if (readerPsalmSubtitle) {
        const sub = psalm.subtitle || psalm.Subtitle || '';
        readerPsalmSubtitle.textContent = sub;
        readerPsalmSubtitle.style.display = sub ? 'block' : 'none';
      }
    }

    // 3. St. Paisios Instructions
    if (readerInstructionContainer) {
      const instObj = psalmInstructions ? psalmInstructions[String(currentPsalmNumber)] : null;
      const instText = instObj ? instObj.instruction : '';
      if (instText) {
        readerInstructionContainer.innerHTML = `
          <div class="reader-instruction-banner">
            <div class="instruction-badge-tag">
              <span class="instruction-cross">☦</span>
              <span>Упутство Св. Пајсија Светогорца</span>
            </div>
            <div class="instruction-body">
              ${escapeHtml(instText)}
            </div>
          </div>
        `;
        readerInstructionContainer.style.display = 'block';
      } else {
        readerInstructionContainer.innerHTML = '';
        readerInstructionContainer.style.display = 'none';
      }
    }

    // 4. Psalm Verses (Single or Parallel Multi-Column View)
    if (readerPsalmText) {
      if (!activeParallel) {
        readerPsalmText.classList.remove('psalm-parallel-container');
        readerPsalmText.style.removeProperty('--parallel-cols');

        let versesList = [];
        let isCsOld = (currentPsalterLanguage === 'cs_old');

        if (isCsOld) {
          readerPsalmText.classList.add('font-churchslavonic');
          versesList = getVersesForLang('cs_old', currentPsalmNumber, psalm);
        } else if (currentPsalterLanguage === 'cs_cyrillic') {
          readerPsalmText.classList.remove('font-churchslavonic');
          versesList = getVersesForLang('cs_cyrillic', currentPsalmNumber, psalm);
        } else {
          readerPsalmText.classList.remove('font-churchslavonic');
          versesList = getVersesForLang('serbian', currentPsalmNumber, psalm);
        }

        let versesHtml = '';
        for (const v of versesList) {
          versesHtml += `
            <div class="psalm-verse">
              <span class="verse-num">${escapeHtml(v.num)}</span>
              <span class="verse-text">${escapeHtml(v.text)}</span>
            </div>
          `;
        }
        readerPsalmText.innerHTML = versesHtml;
      } else {
        readerPsalmText.classList.remove('font-churchslavonic');

        const activeCols = [currentPsalterLanguage, ...psalterParallelModes];
        const numCols = activeCols.length;

        // Auto-expand window width if too narrow
        const minW = numCols >= 3 ? 1440 : 1160;
        if (window.innerWidth < minW) {
          callHost('ensure_window_width', { minWidth: minW });
        }

        const colVerses = activeCols.map((col) => getVersesForLang(col, currentPsalmNumber, psalm));
        const alignments = (psalmAlignments && psalmAlignments[String(currentPsalmNumber)]) || (window.psalmAlignments && window.psalmAlignments[String(currentPsalmNumber)]) || 'default';

        let parallelRowsHtml = '';
        if (Array.isArray(alignments)) {
          // Customized semantic mapping for split psalms
          for (let r = 0; r < alignments.length; r++) {
            const rowMap = alignments[r]; // [s_idx, c_idx, o_idx]
            let cellsHtml = '';
            for (let c = 0; c < activeCols.length; c++) {
              const colLang = activeCols[c];
              let cellData = 0;
              if (colLang === 'serbian') cellData = rowMap[0];
              else if (colLang === 'cs_cyrillic') cellData = rowMap[1];
              else if (colLang === 'cs_old') cellData = rowMap[2];

              let v = { num: '', text: '' };
              if (typeof cellData === 'number') {
                v = colVerses[c][cellData] || { num: '', text: '' };
              } else if (cellData && typeof cellData === 'object') {
                v = cellData;
              }

              const isCsOld = (colLang === 'cs_old');
              cellsHtml += `
                <div class="parallel-cell ${isCsOld ? 'font-churchslavonic' : ''}">
                  <span class="verse-num">${escapeHtml(v.num)}</span>
                  <span class="verse-text">${escapeHtml(v.text)}</span>
                </div>
              `;
            }
            parallelRowsHtml += `
              <div class="parallel-row">
                ${cellsHtml}
              </div>
            `;
          }
        } else {
          // Default 1-to-1 semantic chanted verse alignment
          const maxV = Math.max(...colVerses.map((v) => v.length));
          for (let r = 0; r < maxV; r++) {
            let cellsHtml = '';
            for (let c = 0; c < activeCols.length; c++) {
              const colLang = activeCols[c];
              const v = colVerses[c][r] || { num: '', text: '' };
              const isCsOld = (colLang === 'cs_old');
              cellsHtml += `
                <div class="parallel-cell ${isCsOld ? 'font-churchslavonic' : ''}">
                  <span class="verse-num">${escapeHtml(v.num)}</span>
                  <span class="verse-text">${escapeHtml(v.text)}</span>
                </div>
              `;
            }
            parallelRowsHtml += `
              <div class="parallel-row">
                ${cellsHtml}
              </div>
            `;
          }
        }

        readerPsalmText.innerHTML = `
          <div class="psalm-parallel-container" style="--parallel-cols: ${numCols};">
            <div class="parallel-header-row">
              ${activeCols.map((col) => `
                <div class="parallel-col-header">
                  <span>${getColumnTitle(col, currentPsalmNumber)}</span>
                  <span class="parallel-col-lang-tag">${getColumnTag(col)}</span>
                </div>
              `).join('')}
            </div>
            ${parallelRowsHtml}
          </div>
        `;
      }
    }

    // 5. Uniform Post-Katizma Prayer Banner (on the last psalm)
    renderPostKatizmaBanner();

    if (psalterReaderScroll) {
      psalterReaderScroll.scrollTop = 0; // Immediate reset
      if (restoreScroll) {
        const targetScroll = psalmScrollPositions[currentPsalmNumber] || 0;
        requestAnimationFrame(() => {
          if (psalterReaderScroll) {
            psalterReaderScroll.scrollTop = targetScroll;
            logToHost(`Restored psalm ${currentPsalmNumber} scroll to ${targetScroll}`);
          }
        });
      }
    }

    if (btnPrevPsalm) {
      btnPrevPsalm.disabled = currentPsalmNumber <= 1;
      btnPrevPsalm.innerHTML = `◀ Претходни (←)`;
    }

    if (btnNextPsalm) {
      if (isLastPsalmOfCurrentKatizma()) {
        btnNextPsalm.disabled = false;
        btnNextPsalm.innerHTML = `Молитве после катизме (→ / Space) ▶`;
      } else {
        btnNextPsalm.disabled = currentPsalmNumber >= 151;
        btnNextPsalm.innerHTML = `Следећи (→ / Space) ▶`;
      }
    }

    if (bcPsalms) bcPsalms.textContent = `Катизма ${currentKatizmaNumber}`;
    if (bcSinglePsalm) {
      if (currentPsalterLanguage === 'cs_old') {
        const csOldObj = (psalmsCsOld && psalmsCsOld[String(currentPsalmNumber)]) || null;
        bcSinglePsalm.textContent = csOldObj ? csOldObj.title : `Ѱало́мъ ${currentPsalmNumber}`;
      } else if (currentPsalterLanguage === 'cs_cyrillic') {
        bcSinglePsalm.textContent = `Псалом ${currentPsalmNumber}`;
      } else {
        bcSinglePsalm.textContent = `Псалам ${currentPsalmNumber}`;
      }
    }
  }

  function selectKatizma(katizmaNum) {
    if (!psalterData) return;
    isViewingKatizmaPrayer = false;
    const katizmas = psalterData.katizmas || [];
    const k = katizmas.find((item) => (item.number || item.Number) === katizmaNum);
    if (!k) return;

    currentKatizmaNumber = katizmaNum;
    const psalms = k.psalms || k.Psalms || [];
    if (psalms.length > 0) {
      currentPsalmNumber = psalms[0].number || psalms[0].Number || psalms[0].id;
    }
    persistPsalterState();
  }

  function selectPsalm(psalmNum, resetScroll = true) {
    if (!psalterData) return;
    isViewingKatizmaPrayer = false;
    const katizmas = psalterData.katizmas || [];
    let foundPsalm = null;
    let foundKatizma = null;

    for (const k of katizmas) {
      const psalms = k.psalms || k.Psalms || [];
      const p = psalms.find((x) => (x.number || x.Number || x.id) === psalmNum);
      if (p) {
        foundPsalm = p;
        foundKatizma = k;
        break;
      }
    }

    if (!foundPsalm || !foundKatizma) return;

    if (psalmNum !== currentPsalmNumber) {
      // 1. Save scroll position of the OLD psalm before changing psalm number!
      if (psalterReaderScroll && psalterLayer === 'single') {
        psalmScrollPositions[currentPsalmNumber] = Math.round(psalterReaderScroll.scrollTop);
      }
      // 2. Change to new psalm
      currentPsalmNumber = psalmNum;
      currentKatizmaNumber = foundKatizma.number || foundKatizma.Number;
      // 3. Reset scroll position for the new psalm when navigating with buttons
      if (resetScroll) {
        psalmScrollPositions[psalmNum] = 0;
        currentPsalmScrollPos = 0;
        if (psalterReaderScroll) {
          psalterReaderScroll.scrollTop = 0;
        }
      }
    }

    persistPsalterState();
  }

  // --- Layer Navigation Controls (Up / Down) ---
  // Hierarchy: Katizmas (Layer 1) -> Psalms (Layer 2) -> Single Psalm (Layer 3)
  // Up button: Single Psalm -> Psalms -> Katizmas
  function psalterGoUpLayer() {
    logToHost(`psalterGoUpLayer from ${psalterLayer}`);
    isViewingKatizmaPrayer = false;
    if (psalterLayer === 'single') {
      setPsalterLayer('psalms');
    } else if (psalterLayer === 'psalms') {
      setPsalterLayer('katizmas');
    }
  }

  // Down button: Katizmas -> Psalms -> Single Psalm
  function psalterGoDownLayer() {
    logToHost(`psalterGoDownLayer from ${psalterLayer}`);
    if (psalterLayer === 'katizmas') {
      setPsalterLayer('psalms');
    } else if (psalterLayer === 'psalms') {
      setPsalterLayer('single');
    }
  }

  // --- Horizontal Traversal (Left / Right) ---
  // Layer 1: traverses katizmas 1..20
  // Layer 2: traverses psalms within katizma/all psalms
  // Layer 3: traverses previous / next psalm
  function psalterTraverseLeft() {
    if (!psalterData) return;
    logToHost(`psalterTraverseLeft in layer ${psalterLayer}`);

    if (psalterLayer === 'katizmas') {
      if (currentKatizmaNumber > 1) {
        selectKatizma(currentKatizmaNumber - 1);
        renderKatizmasGrid();
      }
    } else if (psalterLayer === 'psalms') {
      if (currentPsalmNumber > 1) {
        selectPsalm(currentPsalmNumber - 1);
        renderPsalmsGrid();
      }
    } else if (psalterLayer === 'single') {
      if (isViewingKatizmaPrayer) {
        const lastP = getLastPsalmOfKatizma(currentKatizmaNumber);
        isViewingKatizmaPrayer = false;
        selectPsalm(lastP, true);
        displayCurrentPsalm(false);
      } else if (currentPsalmNumber > 1) {
        selectPsalm(currentPsalmNumber - 1, true);
        displayCurrentPsalm(false);
      }
    }
  }

  function psalterTraverseRight() {
    if (!psalterData) return;
    logToHost(`psalterTraverseRight in layer ${psalterLayer}`);

    if (psalterLayer === 'katizmas') {
      if (currentKatizmaNumber < 20) {
        selectKatizma(currentKatizmaNumber + 1);
        renderKatizmasGrid();
      }
    } else if (psalterLayer === 'psalms') {
      if (currentPsalmNumber < 151) {
        selectPsalm(currentPsalmNumber + 1, false);
        renderPsalmsGrid();
      }
    } else if (psalterLayer === 'single') {
      if (isViewingKatizmaPrayer) {
        advanceAfterKatizmaPrayer();
      } else if (isLastPsalmOfCurrentKatizma()) {
        displayKatizmaPrayers(currentKatizmaNumber);
      } else if (currentPsalmNumber < 151) {
        selectPsalm(currentPsalmNumber + 1, true);
        displayCurrentPsalm(false);
      }
    }
  }

  function psalterOnSpaceKey() {
    if (!psalterData) return;
    logToHost(`psalterOnSpaceKey in layer ${psalterLayer}`);
    if (psalterLayer === 'single') {
      psalterTraverseRight();
    } else if (psalterLayer === 'psalms') {
      setPsalterLayer('single');
    } else if (psalterLayer === 'katizmas') {
      setPsalterLayer('psalms');
    }
  }


  function psalterOnEnterKey() {
    logToHost(`psalterOnEnterKey in layer ${psalterLayer}`);
    if (psalterLayer === 'katizmas') {
      setPsalterLayer('psalms');
    } else if (psalterLayer === 'psalms') {
      setPsalterLayer('single');
    }
  }

  // Psalter toolbar and layer navigation button bindings
  if (bcKatizmas) bcKatizmas.addEventListener('click', () => setPsalterLayer('katizmas'));
  if (bcPsalms) bcPsalms.addEventListener('click', () => setPsalterLayer('psalms'));
  if (pillLayerKatizmas) pillLayerKatizmas.addEventListener('click', () => setPsalterLayer('katizmas'));
  if (pillLayerPsalms) pillLayerPsalms.addEventListener('click', () => setPsalterLayer('psalms'));
  if (pillLayerSingle) pillLayerSingle.addEventListener('click', () => setPsalterLayer('single', true));
  if (btnLayerUp) btnLayerUp.addEventListener('click', psalterGoUpLayer);
  if (btnLayerDown) btnLayerDown.addEventListener('click', psalterGoDownLayer);
  if (btnBackToKatizmas) btnBackToKatizmas.addEventListener('click', () => setPsalterLayer('katizmas'));
  if (btnBackToPsalms) btnBackToPsalms.addEventListener('click', () => setPsalterLayer('psalms'));
  if (btnPrefaceLink) {
    btnPrefaceLink.addEventListener('click', (e) => {
      e.stopPropagation();
      prefaceExpanded = !prefaceExpanded;
      renderPrefacePrayersBanner();
      if (prefaceExpanded && psalterReaderScroll) {
        psalterReaderScroll.scrollTop = 0;
      }
    });
  }
  if (btnPrevPsalm) btnPrevPsalm.addEventListener('click', psalterTraverseLeft);
  if (btnNextPsalm) btnNextPsalm.addEventListener('click', psalterTraverseRight);

  // Window Resize Handles
  document.querySelectorAll('.resize-handle, .resize-grip').forEach((el) => {
    el.addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const dir = el.dataset.dir || 'bottom-right';
      callHost('resize_window', { direction: dir });
    });
  });

  // Continuously record scroll position while user is reading/scrolling
  if (psalterReaderScroll) {
    psalterReaderScroll.addEventListener('scroll', () => {
      if (psalterLayer === 'single') {
        const pos = Math.round(psalterReaderScroll.scrollTop);
        currentPsalmScrollPos = pos;
        psalmScrollPositions[currentPsalmNumber] = pos;
      }
    }, { passive: true });
  }

  // ========================================================
  // Right-Click Context Menu Implementation
  // ========================================================

  window.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openContextMenu(e.clientX, e.clientY);
  }, true);

  document.addEventListener('click', (e) => {
    if (!contextMenu.contains(e.target)) {
      closeContextMenu();
    }
  });

  function openContextMenu(x, y) {
    // 1. Check if user selected text in psalm
    const sel = window.getSelection().toString().trim();
    const ctxSaveCitation = document.getElementById('ctx-save-citation');
    if (ctxSaveCitation) {
      if (sel && activeModuleId === 'psalter' && psalterLayer === 'single') {
        ctxSaveCitation.style.display = 'flex';
        selectedQuoteText = sel;
      } else {
        ctxSaveCitation.style.display = 'none';
        selectedQuoteText = '';
      }
    }

    // 2. Update Psalter options dynamically
    updateContextMenuPsalterOptions();

    contextMenu.style.display = 'flex';
    contextMenu.classList.add('open');

    const menuWidth = contextMenu.offsetWidth || 250;
    const menuHeight = contextMenu.offsetHeight || 380;
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;

    let posX = x;
    let posY = y;

    if (posX + menuWidth > winWidth - 10) posX = winWidth - menuWidth - 10;
    if (posY + menuHeight > winHeight - 10) posY = winHeight - menuHeight - 10;

    contextMenu.style.left = `${posX}px`;
    contextMenu.style.top = `${posY}px`;
    logToHost(`Opened context menu at (${posX}, ${posY})`);
  }

  function closeContextMenu() {
    contextMenu.classList.remove('open');
    contextMenu.style.display = 'none';
  }

  contextMenu.addEventListener('click', (e) => {
    const item = e.target.closest('.ctx-item');
    if (!item) return;

    const action = item.dataset.action;
    logToHost(`Context menu action selected: ${action}`);
    closeContextMenu();

    if (action === 'switch_module') {
      const target = item.dataset.target;
      switchModule(target);
    } else if (action === 'change_theme') {
      const theme = item.dataset.theme;
      applyTheme(theme);
      callHost('set_theme', { theme });
    } else if (action === 'set_psalter_lang') {
      setPsalterLanguage(item.dataset.lang);
    } else if (action === 'toggle_parallel') {
      toggleParallelMode(item.dataset.parallel);
    } else if (action === 'disable_parallel') {
      disableParallelModes();
    } else if (action === 'save_citation') {
      saveCurrentCitation();
    } else if (action === 'reindex') {
      callModule('search', 'reindex');
      indexerStatus.textContent = 'Re-indexing...';
    } else if (action === 'save_and_hide') {
      saveAndHideHud();
    } else if (action === 'exit') {
      callHost('exit_app');
    }
  });

  function getVersesForLang(lang, pNum, defaultPsalmObj) {
    if (lang === 'cs_old') {
      const obj = (psalmsCsOld && psalmsCsOld[String(pNum)]) || (window.psalmsCsOld && window.psalmsCsOld[String(pNum)]) || null;
      if (obj && obj.verses && obj.verses.length > 0) return obj.verses;
    } else if (lang === 'cs_cyrillic') {
      const obj = (psalmsCsCyrillic && psalmsCsCyrillic[String(pNum)]) || (window.psalmsCsCyrillic && window.psalmsCsCyrillic[String(pNum)]) || null;
      if (obj && obj.verses && obj.verses.length > 0) return obj.verses;
    }
    // Serbian default
    if (defaultPsalmObj && Array.isArray(defaultPsalmObj.verses) && defaultPsalmObj.verses.length > 0) {
      return defaultPsalmObj.verses.map((v, i) => {
        if (typeof v === 'object' && v.num && v.text) return v;
        const s = String(v).trim();
        const m = s.match(/^(\d+)[\.\s]+(.*)$/);
        return m ? { num: m[1] + '.', text: m[2] } : { num: (i + 1) + '.', text: s };
      });
    }
    const rawLines = defaultPsalmObj ? (defaultPsalmObj.lines || defaultPsalmObj.Lines || (defaultPsalmObj.content || defaultPsalmObj.Content ? (defaultPsalmObj.content || defaultPsalmObj.Content).split('\n') : [])) : [];
    const list = [];
    let idx = 1;
    for (const rawLine of rawLines) {
      const trimmed = String(rawLine).trim();
      if (!trimmed || /^Пагес:|^Pages:/i.test(trimmed)) continue;
      const numMatch = trimmed.match(/^(\d+)[\.\s]+(.*)$/);
      if (numMatch) {
        list.push({ num: numMatch[1] + '.', text: numMatch[2] });
      } else {
        list.push({ num: idx + '.', text: trimmed });
        idx++;
      }
    }
    return list;
  }

  function getColumnTitle(col, pNum) {
    if (col === 'cs_old') {
      const csOldObj = (psalmsCsOld && psalmsCsOld[String(pNum)]) || (window.psalmsCsOld && window.psalmsCsOld[String(pNum)]) || null;
      return csOldObj ? csOldObj.title : `Ѱало́мъ ${pNum}`;
    } else if (col === 'cs_cyrillic') {
      return `Псалом ${pNum}. (${pNum})`;
    } else {
      return `Псалам ${pNum}.`;
    }
  }

  function getColumnTag(col) {
    if (col === 'cs_old') return 'Црквенословенски';
    if (col === 'cs_cyrillic') return 'Црквенослов. ћирилица';
    return 'Српски превод';
  }

  function setPsalterLanguage(lang) {
    if (!lang) return;
    currentPsalterLanguage = lang;
    localStorage.setItem('hud_psalter_language', currentPsalterLanguage);

    psalterParallelModes = psalterParallelModes.filter((m) => m !== lang);
    localStorage.setItem('hud_psalter_parallel', JSON.stringify(psalterParallelModes));

    if (activeModuleId === 'psalter') {
      if (psalterLayer === 'single') {
        if (isViewingKatizmaPrayer) {
          displayKatizmaPrayers(currentKatizmaNumber);
        } else {
          displayCurrentPsalm(true);
        }
      } else if (psalterLayer === 'psalms') {
        renderPsalmsGrid();
      }
    }
    showToast(`Језик Псалтира: ${getColumnTag(lang)}`);
  }

  function toggleParallelMode(mode) {
    if (!mode) return;
    const idx = psalterParallelModes.indexOf(mode);
    if (idx >= 0) {
      psalterParallelModes.splice(idx, 1);
    } else {
      psalterParallelModes.push(mode);
    }
    localStorage.setItem('hud_psalter_parallel', JSON.stringify(psalterParallelModes));

    if (psalterParallelModes.length > 0) {
      const minW = psalterParallelModes.length >= 2 ? 1440 : 1160;
      if (window.innerWidth < minW) {
        callHost('ensure_window_width', { minWidth: minW });
      }
    }

    if (activeModuleId === 'psalter' && psalterLayer === 'single') {
      if (isViewingKatizmaPrayer) {
        displayKatizmaPrayers(currentKatizmaNumber);
      } else {
        displayCurrentPsalm(true);
      }
    }
  }

  function disableParallelModes() {
    psalterParallelModes = [];
    localStorage.setItem('hud_psalter_parallel', JSON.stringify(psalterParallelModes));
    if (activeModuleId === 'psalter' && psalterLayer === 'single') {
      if (isViewingKatizmaPrayer) {
        displayKatizmaPrayers(currentKatizmaNumber);
      } else {
        displayCurrentPsalm(true);
      }
    }
    showToast('Упоредни приказ искључен');
  }

  function showToast(msg, duration = 3000) {
    const toast = document.getElementById('hud-toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('visible');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => {
      toast.classList.remove('visible');
    }, duration);
  }

  async function saveCurrentCitation() {
    const textToSave = selectedQuoteText || window.getSelection().toString().trim();
    if (!textToSave) {
      showToast('Молимо прво означите текст за цитат.');
      return;
    }

    const pNum = currentPsalmNumber || 1;
    const citationFormatted = `"${textToSave}" Ps: ${pNum}`;

    try {
      if (!allNotes || allNotes.length === 0) {
        const data = await callModule('notes', 'get_all');
        if (data) {
          allNotes = data.notes || data.Notes || [];
        }
      }

      let trackedId = localStorage.getItem('hud_beleske_quote_note_id');
      let targetNote = null;

      if (trackedId) {
        targetNote = allNotes.find((n) => (n.id || n.Id) === trackedId);
      }

      if (!targetNote) {
        targetNote = allNotes.find((n) => {
          const t = (n.title || n.Title || '').trim().toLowerCase();
          return t === 'белешке' || t === 'beleske';
        });
        if (targetNote) {
          trackedId = targetNote.id || targetNote.Id;
          localStorage.setItem('hud_beleske_quote_note_id', trackedId);
        }
      }

      if (targetNote) {
        const currContent = (targetNote.content || targetNote.Content || '').trim();
        const newContent = currContent ? `${currContent}\n\n${citationFormatted}` : citationFormatted;
        const noteId = targetNote.id || targetNote.Id;
        const noteTitle = targetNote.title || targetNote.Title || 'Белешке';

        targetNote.content = newContent;
        targetNote.updatedAt = new Date().toISOString();

        await callModule('notes', 'update', {
          id: noteId,
          title: noteTitle,
          content: newContent,
          immediateSave: true
        });

        if (activeNote && (activeNote.id || activeNote.Id) === noteId) {
          if (noteContentInput) {
            noteContentInput.value = newContent;
            updateWordCount(newContent);
          }
        }
        showToast(`📌 Цитат сачуван у "${noteTitle}"!`);
      } else {
        const created = await callModule('notes', 'create', {
          title: 'Белешке',
          content: citationFormatted
        });
        if (created) {
          const newId = created.id || created.Id;
          localStorage.setItem('hud_beleske_quote_note_id', newId);
          allNotes.unshift(created);
          renderNotesSidebar();
          showToast(`📌 Цитат сачуван у нову белешку "Белешке"!`);
        }
      }
    } catch (err) {
      logToHost(`Error saving citation: ${err.message}`, 'ERROR');
      showToast('Грешка при чувању цитата.');
    }
  }

  function updateContextMenuPsalterOptions() {
    const isPsalter = (activeModuleId === 'psalter');
    document.querySelectorAll('.ctx-psalter-only').forEach((el) => {
      el.style.display = isPsalter ? 'flex' : 'none';
    });

    if (!isPsalter) return;

    const checkSerb = document.getElementById('check-lang-serbian');
    const checkOld = document.getElementById('check-lang-cs-old');
    const checkCyr = document.getElementById('check-lang-cs-cyrillic');
    if (checkSerb) checkSerb.textContent = (currentPsalterLanguage === 'serbian') ? '✓' : '';
    if (checkOld) checkOld.textContent = (currentPsalterLanguage === 'cs_old') ? '✓' : '';
    if (checkCyr) checkCyr.textContent = (currentPsalterLanguage === 'cs_cyrillic') ? '✓' : '';

    const opt1 = document.getElementById('ctx-parallel-opt1');
    const text1 = document.getElementById('ctx-parallel-text1');
    const check1 = document.getElementById('check-parallel-opt1');

    const opt2 = document.getElementById('ctx-parallel-opt2');
    const text2 = document.getElementById('ctx-parallel-text2');
    const check2 = document.getElementById('check-parallel-opt2');

    const disableOpt = document.getElementById('ctx-disable-parallel');

    let mode1Key = '';
    let mode1Label = '';
    let mode2Key = '';
    let mode2Label = '';

    if (currentPsalterLanguage === 'serbian') {
      mode1Key = 'cs_old';
      mode1Label = 'Упоредно: Црквенословенски';
      mode2Key = 'cs_cyrillic';
      mode2Label = 'Упоредно: Црквенословенски ћирилично';
    } else if (currentPsalterLanguage === 'cs_old') {
      mode1Key = 'serbian';
      mode1Label = 'Упоредно: Српски';
      mode2Key = 'cs_cyrillic';
      mode2Label = 'Упоредно: Црквенословенски ћирилично';
    } else if (currentPsalterLanguage === 'cs_cyrillic') {
      mode1Key = 'serbian';
      mode1Label = 'Упоредно: Српски';
      mode2Key = 'cs_old';
      mode2Label = 'Упоредно: Црквенословенски';
    }

    if (opt1 && text1 && check1) {
      opt1.dataset.parallel = mode1Key;
      text1.textContent = mode1Label;
      check1.textContent = psalterParallelModes.includes(mode1Key) ? '✓' : '';
    }

    if (opt2 && text2 && check2) {
      opt2.dataset.parallel = mode2Key;
      text2.textContent = mode2Label;
      check2.textContent = psalterParallelModes.includes(mode2Key) ? '✓' : '';
    }

    if (disableOpt) {
      disableOpt.style.display = (psalterParallelModes.length > 0) ? 'flex' : 'none';
    }
  }

  // ========================================================
  // HUD Actions & Init
  // ========================================================

  function saveAndHideHud() {
    if (activeModuleId === 'psalter' && psalterReaderScroll && psalterLayer === 'single') {
      const pos = Math.round(psalterReaderScroll.scrollTop);
      currentPsalmScrollPos = pos;
      psalmScrollPositions[currentPsalmNumber] = pos;
      persistPsalterState();
    }
    saveActiveNoteImmediate();
    callHost('hide_hud');
  }

  btnHideHud.addEventListener('click', saveAndHideHud);
  quickThemeToggle.addEventListener('click', toggleTheme);

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      switchModule(btn.dataset.module);
    });
  });

  // Drag handle for header
  const dragHandle = document.getElementById('drag-handle');
  dragHandle.addEventListener('mousedown', (e) => {
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('.hud-nav') || e.target.closest('.theme-switch-pill')) {
      return;
    }
    callHost('drag_window');
  });

  // Bootstrap Init
  async function init() {
    logToHost('Frontend init() started.');
    const initData = await callHost('get_init_data');
    if (initData) {
      const theme = initData.theme || initData.Theme;
      if (theme) {
        applyTheme(theme);
      }
      const status = initData.indexStatus || initData.IndexStatus;
      if (status) {
        updateIndexerStatus(status);
      }

      // Restore persisted psalter state
      const pNum = initData.lastPsalmNumber || initData.LastPsalmNumber;
      if (pNum) currentPsalmNumber = parseInt(pNum, 10);
      const kNum = initData.lastKatizmaNumber || initData.LastKatizmaNumber;
      if (kNum) currentKatizmaNumber = parseInt(kNum, 10);
      const level = initData.lastPsalterLevel || initData.LastPsalterLevel;
      if (level) psalterLayer = level;
      const scrollPos = initData.lastPsalmScrollPos ?? initData.LastPsalmScrollPos;
      if (scrollPos !== undefined && scrollPos !== null) {
        currentPsalmScrollPos = parseInt(scrollPos, 10) || 0;
        psalmScrollPositions[currentPsalmNumber] = currentPsalmScrollPos;
      }
    }

    // LocalStorage fallback
    try {
      const localP = localStorage.getItem('hud_last_psalm_num');
      if (localP && (!currentPsalmNumber || currentPsalmNumber === 1)) {
        currentPsalmNumber = parseInt(localP, 10);
      }
      const localK = localStorage.getItem('hud_last_katizma_num');
      if (localK && (!currentKatizmaNumber || currentKatizmaNumber === 1)) {
        currentKatizmaNumber = parseInt(localK, 10);
      }
      const localL = localStorage.getItem('hud_last_psalter_level');
      if (localL) {
        psalterLayer = localL;
      }
      const localS = localStorage.getItem('hud_last_psalm_scroll');
      if (localS && !currentPsalmScrollPos) {
        currentPsalmScrollPos = parseInt(localS, 10) || 0;
        psalmScrollPositions[currentPsalmNumber] = currentPsalmScrollPos;
      }
    } catch (e) {}

    logToHost(`Initial psalter state restored: psalm=${currentPsalmNumber}, katizma=${currentKatizmaNumber}, layer=${psalterLayer}, scroll=${currentPsalmScrollPos}`);

    renderEmptySearchState();
    switchModule('search');
    logToHost('Frontend init() completed.');
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  init();
})();
