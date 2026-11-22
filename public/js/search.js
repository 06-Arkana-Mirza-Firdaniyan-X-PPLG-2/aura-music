/**
 * SPOTIFREE - Search Controller (YouTube Music & YouTube Standard)
 * Fast debounced queries, dual engine switching, and result rendering
 */

class SearchManager {
  constructor() {
    this.searchInput = document.getElementById('global-search-input');
    this.clearBtn = document.getElementById('search-clear-btn');
    this.resultsList = document.getElementById('search-results-list');
    this.initialState = document.getElementById('search-initial-state');
    this.loadingEl = document.getElementById('search-loading');

    this.activeEngine = 'ytmusic'; // 'ytmusic' or 'youtube'
    this.debounceTimer = null;
    this.lastQuery = '';
    this.currentResults = [];

    this.init();
  }

  init() {
    if (!this.searchInput) return;

    // Restore saved engine
    if (window.library) {
      const s = window.library.getSettings();
      if (s.engine) {
        this.setEngine(s.engine);
      }
    }

    // Input debounce listener
    this.searchInput.addEventListener('input', (e) => {
      const q = e.target.value.trim();
      if (this.clearBtn) {
        this.clearBtn.style.display = q ? 'flex' : 'none';
      }

      // Always switch to search view when typing
      if (window.ui && window.ui.currentView !== 'search') {
        window.ui.switchView('search');
      }

      clearTimeout(this.debounceTimer);
      if (!q) {
        this.clearResults();
        return;
      }

      this.debounceTimer = setTimeout(() => {
        this.executeSearch(q);
      }, 350);
    });

    // Instant search on Enter key
    this.searchInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        clearTimeout(this.debounceTimer);
        const q = this.searchInput.value.trim();
        if (q) {
          if (window.ui && window.ui.currentView !== 'search') {
            window.ui.switchView('search');
          }
          this.executeSearch(q, true);
        }
      }
    });

    this.searchInput.addEventListener('focus', () => {
      if (window.ui && window.ui.currentView !== 'search') {
        window.ui.switchView('search');
      }
    });

    if (this.clearBtn) {
      this.clearBtn.addEventListener('click', () => {
        this.searchInput.value = '';
        this.clearBtn.style.display = 'none';
        this.clearResults();
        this.searchInput.focus();
      });
    }

    // Engine toggle buttons (Sidebar and Search View)
    document.querySelectorAll('[data-engine]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const engine = e.currentTarget.dataset.engine;
        this.setEngine(engine);
        if (this.searchInput.value.trim()) {
          this.executeSearch(this.searchInput.value.trim(), true);
        }
      });
    });

    // Topbar engine badge click to toggle
    const badge = document.getElementById('active-engine-badge');
    if (badge) {
      badge.addEventListener('click', () => {
        const next = this.activeEngine === 'ytmusic' ? 'youtube' : 'ytmusic';
        this.setEngine(next);
        if (this.searchInput.value.trim()) {
          this.executeSearch(this.searchInput.value.trim(), true);
        }
      });
    }

    // Quick Genre / Filter Chips
    document.querySelectorAll('.chip[data-query]').forEach(chip => {
      chip.addEventListener('click', (e) => {
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const q = e.currentTarget.dataset.query;
        this.searchQuery(q);
      });
    });
  }

  setEngine(engine) {
    this.activeEngine = engine;
    if (window.library) {
      window.library.updateSettings({ engine });
    }

    // Update buttons UI
    document.querySelectorAll('[data-engine]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.engine === engine);
    });

    // Update topbar badge
    const badgeText = document.querySelector('#active-engine-badge .badge-text');
    if (badgeText) {
      badgeText.textContent = engine === 'ytmusic' ? 'YT Music' : 'YouTube';
    }

    if (window.ui) {
      window.ui.showToast(`Engine diubah ke: ${engine === 'ytmusic' ? 'YouTube Music (Lagu & Album)' : 'YouTube Standard (Video & Cover)'}`);
    }
  }

  searchQuery(q) {
    if (!q) return;
    if (this.searchInput) {
      this.searchInput.value = q;
      if (this.clearBtn) this.clearBtn.style.display = 'flex';
    }
    if (window.ui) {
      window.ui.switchView('search');
    }
    this.executeSearch(q);
  }

  async executeSearch(query, force = false) {
    if (!query || (!force && query === this.lastQuery)) return;
    this.lastQuery = query;

    if (this.initialState) this.initialState.style.display = 'none';
    if (this.loadingEl) this.loadingEl.style.display = 'block';
    if (this.resultsList) this.resultsList.style.display = 'none';

    try {
      const url = `${window.API_BASE || ''}/api/search?q=${encodeURIComponent(query)}&engine=${this.activeEngine}`;
      const res = await fetch(url);
      const data = await res.json();

      this.currentResults = data.songs || [];

      if (this.loadingEl) this.loadingEl.style.display = 'none';

      if (this.currentResults.length === 0) {
        if (this.resultsList) {
          this.resultsList.innerHTML = `<div class="empty-text">Tidak ada hasil ditemukan untuk "${query}". Coba kata kunci lain atau ganti search engine.</div>`;
          this.resultsList.style.display = 'flex';
        }
        return;
      }

      this.renderResults(this.currentResults);
    } catch (err) {
      console.error('Search request failed:', err);
      if (this.loadingEl) this.loadingEl.style.display = 'none';
      if (this.resultsList) {
        this.resultsList.innerHTML = `<div class="empty-text">Terjadi kesalahan saat mencari lagu.</div>`;
        this.resultsList.style.display = 'flex';
      }
    }
  }

  renderResults(songs) {
    if (!this.resultsList) return;
    this.resultsList.innerHTML = '';
    this.resultsList.style.display = 'flex';

    if (window.ui) {
      window.ui.renderTrackRows(this.resultsList, songs, songs);
    }
  }

  clearResults() {
    this.lastQuery = '';
    this.currentResults = [];
    if (this.resultsList) {
      this.resultsList.innerHTML = '';
      this.resultsList.style.display = 'none';
    }
    if (this.initialState) this.initialState.style.display = 'flex';
    if (this.loadingEl) this.loadingEl.style.display = 'none';
  }
}

window.searchManager = new SearchManager();
