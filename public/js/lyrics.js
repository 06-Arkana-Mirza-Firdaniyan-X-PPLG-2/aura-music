/**
 * AURA - Synced & Plain Lyrics Controller
 * Real-time karaoke-style auto-scroll, vocal lead compensation, and click-to-seek
 */

class LyricsManager {
  constructor() {
    this.lyricsContainer = document.getElementById('lyrics-container');
    this.titleEl = document.getElementById('lyrics-track-title');
    this.artistEl = document.getElementById('lyrics-track-artist');

    this.currentLyrics = []; // [{ time: seconds, text: string, el: HTMLElement }]
    this.activeIndex = -1;
    this.isLoading = false;
    this.currentSongId = null;

    // User manual scroll detection
    this.userInteracting = false;
    this.userScrollTimer = null;

    // Vocal lead compensation (220ms lead eliminates perceptible audio pipeline & vocal onset delay)
    this.syncLeadOffset = 0.22;

    this.initScrollListeners();
  }

  initScrollListeners() {
    if (!this.lyricsContainer) return;

    const onUserScroll = () => {
      this.userInteracting = true;
      if (this.userScrollTimer) clearTimeout(this.userScrollTimer);
      // Resume auto-scroll after 3.2 seconds of no user touch/wheel
      this.userScrollTimer = setTimeout(() => {
        this.userInteracting = false;
        if (this.activeIndex >= 0 && this.currentLyrics[this.activeIndex]?.el) {
          this.scrollToActiveLine(this.currentLyrics[this.activeIndex].el);
        }
      }, 3200);
    };

    this.lyricsContainer.addEventListener('wheel', onUserScroll, { passive: true });
    this.lyricsContainer.addEventListener('touchmove', onUserScroll, { passive: true });
  }

  async loadLyrics(song) {
    if (!song || !song.id) {
      this.clear();
      return;
    }

    if (this.currentSongId === song.id && this.currentLyrics.length > 0) {
      return; // already loaded
    }

    this.currentSongId = song.id;
    this.activeIndex = -1;
    this.currentLyrics = [];

    if (this.titleEl) this.titleEl.textContent = song.title || 'Lagu';
    if (this.artistEl) this.artistEl.textContent = song.artist || 'Artis';

    if (this.lyricsContainer) {
      this.lyricsContainer.innerHTML = '<p class="lyrics-placeholder">Mencari lirik lagu...</p>';
    }

    try {
      const params = new URLSearchParams({
        track: song.title,
        artist: song.artist,
        duration: song.durationSec || ''
      });

      const res = await fetch(`${window.API_BASE || ''}/api/lyrics?${params.toString()}`);
      const data = await res.json();

      if (data.syncedLyrics) {
        this.renderSyncedLyrics(data.syncedLyrics);
      } else if (data.plainLyrics) {
        this.renderPlainLyrics(data.plainLyrics);
      } else {
        if (this.lyricsContainer) {
          this.lyricsContainer.innerHTML = '<p class="lyrics-placeholder">Lirik tidak ditemukan untuk lagu ini.</p>';
        }
      }
    } catch (err) {
      console.warn('Lyrics fetch failed:', err);
      if (this.lyricsContainer) {
        this.lyricsContainer.innerHTML = '<p class="lyrics-placeholder">Gagal memuat lirik.</p>';
      }
    }
  }

  parseLRC(lrcText) {
    const lines = lrcText.split('\n');
    const result = [];
    const timeRegex = /\[(\d{2}):(\d{2})(?:\.(\d{2,3}))?\]/g;
    const offsetRegex = /\[offset:\s*([+-]?\d+)\]/i;
    let globalOffsetSec = 0;

    // Check for global [offset:xxx] (in ms)
    for (const line of lines) {
      const offsetMatch = line.match(offsetRegex);
      if (offsetMatch) {
        globalOffsetSec = (parseInt(offsetMatch[1], 10) || 0) / 1000;
        break;
      }
    }

    for (const line of lines) {
      // Skip metadata tags
      if (/^\[(ti|ar|al|by|offset|length):/i.test(line.trim())) continue;

      const matches = [...line.matchAll(timeRegex)];
      const text = line.replace(timeRegex, '').trim();

      if (matches.length > 0 && text) {
        for (const m of matches) {
          const minutes = parseInt(m[1], 10);
          const seconds = parseInt(m[2], 10);
          let ms = 0;
          if (m[3]) {
            // If 2 digits, it's centiseconds (.50 = 500ms)
            // If 3 digits, it's milliseconds (.500 = 500ms)
            ms = m[3].length === 2 ? parseInt(m[3], 10) * 10 : parseInt(m[3], 10);
          }
          const time = (minutes * 60) + seconds + (ms / 1000) + globalOffsetSec;
          result.push({ time: Math.max(0, time), text });
        }
      }
    }

    result.sort((a, b) => a.time - b.time);
    return result;
  }

  renderSyncedLyrics(lrcText) {
    const parsed = this.parseLRC(lrcText);
    if (parsed.length === 0) {
      this.renderPlainLyrics(lrcText);
      return;
    }

    if (!this.lyricsContainer) return;
    this.lyricsContainer.innerHTML = '';
    this.currentLyrics = [];

    const fragment = document.createDocumentFragment();

    parsed.forEach((item, index) => {
      const div = document.createElement('div');
      div.className = 'lyric-line';
      div.textContent = item.text;
      div.dataset.time = item.time;
      div.dataset.index = index;

      div.addEventListener('click', () => {
        if (window.player) {
          window.player.seek(item.time);
        }
      });

      fragment.appendChild(div);
      this.currentLyrics.push({
        time: item.time,
        text: item.text,
        el: div
      });
    });

    this.lyricsContainer.appendChild(fragment);

    // Initial positioning if already playing
    if (window.player && window.player.audio) {
      this.updateTime(window.player.audio.currentTime || 0);
    }
  }

  renderPlainLyrics(plainText) {
    if (!this.lyricsContainer) return;
    this.lyricsContainer.innerHTML = '';
    this.currentLyrics = [];

    const lines = plainText.split('\n');
    const fragment = document.createDocumentFragment();

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const div = document.createElement('div');
      div.className = 'lyric-line plain';
      div.textContent = trimmed;
      fragment.appendChild(div);
    });

    this.lyricsContainer.appendChild(fragment);
  }

  updateTime(currentTime) {
    if (!this.currentLyrics || this.currentLyrics.length === 0) return;

    // Apply vocal onset lead compensation
    const targetTime = currentTime + this.syncLeadOffset;

    // Binary search or linear scan for current line
    let newIndex = -1;
    for (let i = 0; i < this.currentLyrics.length; i++) {
      if (targetTime >= this.currentLyrics[i].time) {
        newIndex = i;
      } else {
        break;
      }
    }

    if (newIndex !== this.activeIndex) {
      // Remove active class from previous line
      if (this.activeIndex >= 0 && this.currentLyrics[this.activeIndex]?.el) {
        this.currentLyrics[this.activeIndex].el.classList.remove('active');
      }

      this.activeIndex = newIndex;

      // Add active class to new line
      if (this.activeIndex >= 0 && this.currentLyrics[this.activeIndex]?.el) {
        const activeEl = this.currentLyrics[this.activeIndex].el;
        activeEl.classList.add('active');

        // Smooth centered auto-scroll (only if user is not manually scrolling)
        if (!this.userInteracting && this.lyricsContainer) {
          this.scrollToActiveLine(activeEl);
        }
      }
    }
  }

  scrollToActiveLine(activeEl) {
    if (!this.lyricsContainer || !activeEl) return;
    const container = this.lyricsContainer;
    const containerHeight = container.clientHeight;
    const elOffsetTop = activeEl.offsetTop;
    const elHeight = activeEl.clientHeight;

    const targetTop = elOffsetTop - (containerHeight / 2) + (elHeight / 2);
    container.scrollTo({
      top: Math.max(0, targetTop),
      behavior: 'smooth'
    });
  }

  clear() {
    this.currentSongId = null;
    this.currentLyrics = [];
    this.activeIndex = -1;
    if (this.titleEl) this.titleEl.textContent = '-';
    if (this.artistEl) this.artistEl.textContent = '-';
    if (this.lyricsContainer) {
      this.lyricsContainer.innerHTML = '<p class="lyrics-placeholder">Lirik akan muncul di sini saat lagu diputar...</p>';
    }
  }
}

window.lyricsManager = new LyricsManager();
