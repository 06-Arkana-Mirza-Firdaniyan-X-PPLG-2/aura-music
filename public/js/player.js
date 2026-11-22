/**
 * AURA - Audio Playback Engine & Controller
 * Integrates HTML5 Audio, Web Audio API (EQ & Visualizer), MediaSession API, and Queue
 */

class AudioPlayer {
  constructor() {
    this.audio = document.getElementById('audio-engine');
    this.currentSong = null;
    this.queue = [];
    this.historyStack = [];
    this.queueIndex = -1;

    // Playback state
    this.isPlaying = false;
    this.isMuted = false;
    this.volume = 0.8;
    this.repeatMode = 'off'; // 'off', 'all', 'one'
    this.isShuffle = false;

    // Web Audio API context & nodes (lazily created)
    this.audioCtx = null;
    this.audioSource = null;
    this.analyser = null;
    this.lowFilter = null;
    this.midFilter = null;
    this.highFilter = null;
    this.visualizerActive = false;
    this.visAnimFrame = null;

    // Ambient Player Visualizer & High-precision Lyrics Sync
    this.ambientCanvas = null;
    this.ambientCtx = null;
    this.ambientAnimFrame = null;
    this.ambientDataArray = null;
    this.playerMiniVis = null;
    this.lyricsTicker = null;
    this.scVisMode = 'wave'; // 'wave', 'bars', 'quantum'

    // Sleep Timer
    this.sleepTimerId = null;
    this.sleepRemainingMs = 0;
    this.sleepEndTime = 0;

    // DOM Elements cache
    this.cacheDOMElements();
    this.bindAudioEvents();
    this.setupMediaSession();
    this.restoreSettings();
    this.initSoundCardInteractions();
  }

  cacheDOMElements() {
    // Desktop Player Elements
    this.dtThumb = document.getElementById('player-thumb');
    this.dtTitle = document.getElementById('player-title');
    this.dtArtist = document.getElementById('player-artist');
    this.dtPlayPauseBtn = document.getElementById('btn-play-pause');
    this.dtPlayIcon = this.dtPlayPauseBtn?.querySelector('.icon-play');
    this.dtPauseIcon = this.dtPlayPauseBtn?.querySelector('.icon-pause');
    this.dtTimeCurrent = document.getElementById('time-current');
    this.dtTimeDuration = document.getElementById('time-duration');
    this.dtProgressFill = document.getElementById('progress-bar-fill');
    this.dtProgressHandle = document.getElementById('progress-handle');
    this.dtProgressContainer = document.getElementById('progress-bar-container');
    this.dtLikeBtn = document.getElementById('player-like-btn');
    this.dtRepeatBtn = document.getElementById('btn-repeat');
    this.dtRepeatOneBadge = this.dtRepeatBtn?.querySelector('.repeat-one-indicator');
    this.dtShuffleBtn = document.getElementById('btn-shuffle');
    this.dtVolFill = document.getElementById('volume-bar-fill');
    this.dtMuteBtn = document.getElementById('btn-mute');
    this.dtVolIconHigh = this.dtMuteBtn?.querySelector('.vol-icon-high');
    this.dtVolIconMuted = this.dtMuteBtn?.querySelector('.vol-icon-muted');

    // Mobile Mini Player Elements
    this.mbMiniPlayer = document.getElementById('mobile-mini-player');
    this.mbMiniThumb = document.getElementById('mini-thumb');
    this.mbMiniTitle = document.getElementById('mini-title');
    this.mbMiniArtist = document.getElementById('mini-artist');
    this.mbMiniPlayPauseBtn = document.getElementById('mini-play-pause');
    this.mbMiniPlayIcon = this.mbMiniPlayPauseBtn?.querySelector('.mini-icon-play');
    this.mbMiniPauseIcon = this.mbMiniPlayPauseBtn?.querySelector('.mini-icon-pause');
    this.mbMiniProgress = document.getElementById('mini-progress-bar');
    this.mbMiniLikeBtn = document.getElementById('mini-like-btn');

    // Fullscreen Mobile Player Elements
    this.fsModal = document.getElementById('fullscreen-player-modal');
    this.fsAmbientBg = document.getElementById('fullscreen-ambient-bg');
    this.fsArtwork = document.getElementById('fs-artwork-img');
    this.fsTitle = document.getElementById('fs-title');
    this.fsArtist = document.getElementById('fs-artist');
    this.fsPlayPauseBtn = document.getElementById('fs-play-pause');
    this.fsPlayIcon = this.fsPlayPauseBtn?.querySelector('.fs-icon-play');
    this.fsPauseIcon = this.fsPlayPauseBtn?.querySelector('.fs-icon-pause');
    this.fsTimeCurrent = document.getElementById('fs-time-current');
    this.fsTimeDuration = document.getElementById('fs-time-duration');
    this.fsProgressFill = document.getElementById('fs-progress-fill');
    this.fsProgressThumb = document.getElementById('fs-progress-thumb');
    this.fsProgressContainer = document.getElementById('fs-progress-container');
    this.fsLikeBtn = document.getElementById('fs-like-btn');
    this.fsShuffleBtn = document.getElementById('fs-shuffle-btn');
    this.fsRepeatBtn = document.getElementById('fs-repeat-btn');
    this.fsEngineBadge = document.getElementById('fs-engine-badge');

    // Visualizer canvas
    this.canvas = document.getElementById('visualizer-canvas');
    this.canvasCtx = this.canvas?.getContext('2d');

    // Ambient Player Visualizer Canvas & Mini Soundwave Bars
    this.ambientCanvas = document.getElementById('ambient-visualizer-bar');
    this.ambientCtx = this.ambientCanvas?.getContext('2d');
    this.playerMiniVis = document.getElementById('player-mini-vis');

    // Now Playing Sound Card Elements (Desktop & Mobile)
    this.scArtImg = document.getElementById('soundcard-art-img');
    this.scTitle = document.getElementById('soundcard-track-title');
    this.scArtist = document.getElementById('soundcard-track-artist');
    this.scEngineBadge = document.getElementById('soundcard-engine-badge');
    this.scEngineLabel = document.getElementById('soundcard-engine-label');
    this.scLikeBtn = document.getElementById('soundcard-like-btn');
    this.scVisCanvas = document.getElementById('soundcard-vis-canvas');
    this.scVisCtx = this.scVisCanvas?.getContext('2d');
    this.scBassMeter = document.getElementById('soundcard-bass-meter');
    this.scPeakMeter = document.getElementById('soundcard-peak-meter');
    this.scUpnextThumb = document.getElementById('soundcard-upnext-thumb');
    this.scUpnextTitle = document.getElementById('soundcard-upnext-title');
    this.scUpnextArtist = document.getElementById('soundcard-upnext-artist');

    this.mbScVisCanvas = document.getElementById('mobile-soundcard-vis');
    this.mbScVisCtx = this.mbScVisCanvas?.getContext('2d');

    // Default Fallback Placeholders (Monochrome Aura Cover)
    const defaultCover = 'icons/cover-placeholder.svg?v=4.4.0';
    if (this.dtThumb) {
      this.dtThumb.onerror = () => { this.dtThumb.src = defaultCover; };
    }
    if (this.mbMiniThumb) {
      this.mbMiniThumb.onerror = () => { this.mbMiniThumb.src = defaultCover; };
    }
    if (this.fsArtwork) {
      this.fsArtwork.onerror = () => { this.fsArtwork.src = defaultCover; };
    }
    if (this.scArtImg) {
      this.scArtImg.onerror = () => { this.scArtImg.src = defaultCover; };
    }
    if (this.scUpnextThumb) {
      this.scUpnextThumb.onerror = () => { this.scUpnextThumb.src = defaultCover; };
    }
  }

  restoreSettings() {
    if (!window.library) return;
    const s = window.library.getSettings();
    this.setVolume(s.volume !== undefined ? s.volume : 0.8);
    this.setRepeat(s.repeat || 'off', false);
    if (s.shuffle) this.toggleShuffle(false);
  }

  // --- Web Audio API Initialization (EQ & Spectrum) ---
  initWebAudio() {
    if (this.audioCtx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.audioCtx = new AudioContext();

      this.audioSource = this.audioCtx.createMediaElementSource(this.audio);
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      // 3-Band Equalizer Filters
      this.lowFilter = this.audioCtx.createBiquadFilter();
      this.lowFilter.type = 'lowshelf';
      this.lowFilter.frequency.value = 250;

      this.midFilter = this.audioCtx.createBiquadFilter();
      this.midFilter.type = 'peaking';
      this.midFilter.frequency.value = 1500;
      this.midFilter.Q.value = 1.0;

      this.highFilter = this.audioCtx.createBiquadFilter();
      this.highFilter.type = 'highshelf';
      this.highFilter.frequency.value = 4000;

      // Connect graph: Source -> Low -> Mid -> High -> Analyser -> Destination
      this.audioSource.connect(this.lowFilter);
      this.lowFilter.connect(this.midFilter);
      this.midFilter.connect(this.highFilter);
      this.highFilter.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);

      // Restore EQ preset
      if (window.library) {
        this.setEqualizerPreset(window.library.getSettings().eqPreset || 'flat');
      }
    } catch (e) {
      console.warn('Web Audio initialization error:', e);
    }
  }

  setEqualizerPreset(preset) {
    if (!this.lowFilter || !this.midFilter || !this.highFilter) return;
    switch (preset) {
      case 'bass':
        this.lowFilter.gain.value = 8;
        this.midFilter.gain.value = 1;
        this.highFilter.gain.value = -1;
        break;
      case 'vocal':
        this.lowFilter.gain.value = -2;
        this.midFilter.gain.value = 6;
        this.highFilter.gain.value = 3;
        break;
      case 'rock':
        this.lowFilter.gain.value = 6;
        this.midFilter.gain.value = -1;
        this.highFilter.gain.value = 6;
        break;
      case 'electronic':
        this.lowFilter.gain.value = 8;
        this.midFilter.gain.value = 0;
        this.highFilter.gain.value = 7;
        break;
      case 'acoustic':
        this.lowFilter.gain.value = 4;
        this.midFilter.gain.value = 3;
        this.highFilter.gain.value = 2;
        break;
      case 'flat':
      default:
        this.lowFilter.gain.value = 0;
        this.midFilter.gain.value = 0;
        this.highFilter.gain.value = 0;
        break;
    }
    if (window.library) {
      window.library.updateSettings({ eqPreset: preset });
    }
  }

  // --- Native HTML5 Audio Event Listeners ---
  bindAudioEvents() {
    this.audio.addEventListener('play', () => {
      this.isPlaying = true;
      this.streamRetryCount = 0;
      this.updatePlayPauseUI(true);

      if ('mediaSession' in navigator && 'playbackState' in navigator.mediaSession) {
        navigator.mediaSession.playbackState = 'playing';
      }

      if (window.pwaInstaller) {
        window.pwaInstaller.requestWakeLock();
      }

      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      this.startAmbientVisualizer();
      this.startLyricsSync();
      if (this.visualizerActive) {
        this.startVisualizerLoop();
      }
    });

    this.audio.addEventListener('pause', () => {
      this.isPlaying = false;
      this.updatePlayPauseUI(false);

      if ('mediaSession' in navigator && 'playbackState' in navigator.mediaSession) {
        navigator.mediaSession.playbackState = 'paused';
      }

      if (window.pwaInstaller) {
        window.pwaInstaller.releaseWakeLock();
      }

      this.stopAmbientVisualizer();
      this.stopLyricsSync();
      this.stopVisualizerLoop();
    });

    this.audio.addEventListener('timeupdate', () => {
      this.onTimeUpdate();
    });

    this.audio.addEventListener('ended', () => {
      this.stopAmbientVisualizer();
      this.stopLyricsSync();
      this.onTrackEnded();
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('Audio playback stream error:', e);
      if (!this.streamRetryCount) this.streamRetryCount = 0;

      // Resilience: 1 automatic retry or engine fallback
      if (this.streamRetryCount === 0 && this.currentSong) {
        this.streamRetryCount++;
        console.log('Retrying stream with failover engine...');
        const altEngine = this.currentEngine === 'youtube' ? 'youtube_music' : 'youtube';
        this.currentEngine = altEngine;
        this.saveSettings();
        if (window.ui) {
          window.ui.showToast(`Koneksi audio dipulihkan via ${altEngine === 'youtube_music' ? 'YT Music' : 'YouTube'}...`, 'info');
        }
        setTimeout(() => this.playSong(this.currentSong, this.currentQueueIndex), 600);
        return;
      }

      if (window.ui) {
        window.ui.showToast('Gagal memutar audio. Memutar lagu berikutnya...', 'error');
      }
      setTimeout(() => this.playNext(), 1500);
    });

    // Scrubber drag & click
    this.bindScrubber(this.dtProgressContainer);
    this.bindScrubber(this.fsProgressContainer);
  }

  bindScrubber(container) {
    if (!container) return;
    let isDragging = false;

    const handleSeek = (e) => {
      const rect = container.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      if (this.audio.duration) {
        this.audio.currentTime = pos * this.audio.duration;
      }
    };

    container.addEventListener('mousedown', (e) => {
      isDragging = true;
      handleSeek(e);
    });
    window.addEventListener('mousemove', (e) => {
      if (isDragging) handleSeek(e);
    });
    window.addEventListener('mouseup', () => {
      isDragging = false;
    });

    // Touch support for mobile
    container.addEventListener('touchstart', (e) => {
      isDragging = true;
      handleSeek(e);
    }, { passive: true });
    window.addEventListener('touchmove', (e) => {
      if (isDragging) handleSeek(e);
    }, { passive: true });
    window.addEventListener('touchend', () => {
      isDragging = false;
    });
  }

  // --- Track Loading & Playback ---
  async playSong(song, queueContext = null) {
    if (!song || !song.id) return;

    this.initWebAudio();

    this.currentSong = song;
    if (queueContext && Array.isArray(queueContext)) {
      this.queue = [...queueContext];
      this.queueIndex = this.queue.findIndex(s => s.id === song.id);
    } else {
      if (!this.queue.some(s => s.id === song.id)) {
        this.queue.push(song);
      }
      this.queueIndex = this.queue.findIndex(s => s.id === song.id);
    }

    // Save to user history
    if (window.library) {
      window.library.addToHistory(song);
    }

    // Update UI details immediately
    this.updateTrackInfoUI(song);

    // Auto-open right drawer showing Now Playing Sound Card on desktop
    if (window.innerWidth > 768 && window.openAppDrawer) {
      window.openAppDrawer('nowplaying');
    }

    // Set audio source to streaming endpoint
    this.audio.src = `${window.API_BASE || ''}/api/stream?id=${encodeURIComponent(song.id)}`;
    this.audio.load();

    try {
      await this.audio.play();
    } catch (err) {
      console.warn('Playback play request error:', err);
    }

    // Update MediaSession
    this.updateMediaSessionMetadata(song);

    // Load lyrics in background
    if (window.lyricsManager) {
      window.lyricsManager.loadLyrics(song);
    }

    // Sync active row in lists
    if (window.ui) {
      window.ui.highlightActiveSong(song.id);
      window.ui.updateQueueUI();
    }
  }

  togglePlayPause() {
    if (!this.currentSong) {
      if (this.queue.length > 0) {
        this.playSong(this.queue[0]);
      }
      return;
    }

    this.initWebAudio();
    if (this.audio.paused) {
      this.audio.play().catch(e => console.warn(e));
    } else {
      this.audio.pause();
    }
  }

  playNext() {
    if (this.queue.length === 0) return;

    if (this.isShuffle) {
      const randomIndex = Math.floor(Math.random() * this.queue.length);
      this.queueIndex = randomIndex;
      this.playSong(this.queue[randomIndex]);
      return;
    }

    if (this.queueIndex + 1 < this.queue.length) {
      this.queueIndex++;
      this.playSong(this.queue[this.queueIndex]);
    } else if (this.repeatMode === 'all') {
      this.queueIndex = 0;
      this.playSong(this.queue[0]);
    } else {
      // End of playlist
      this.audio.pause();
      this.audio.currentTime = 0;
    }
  }

  playPrev() {
    if (this.audio.currentTime > 3) {
      this.audio.currentTime = 0;
      return;
    }

    if (this.queueIndex > 0) {
      this.queueIndex--;
      this.playSong(this.queue[this.queueIndex]);
    } else {
      this.audio.currentTime = 0;
    }
  }

  seek(seconds) {
    if (this.audio) {
      const dur = this.audio.duration || this.currentSong?.durationSec || 999999;
      this.audio.currentTime = Math.max(0, Math.min(seconds, dur));
      this.onTimeUpdate();
      if (window.lyricsManager) {
        window.lyricsManager.updateTime(this.audio.currentTime);
      }
    }
  }

  onTrackEnded() {
    if (this.repeatMode === 'one') {
      this.audio.currentTime = 0;
      this.audio.play();
    } else {
      this.playNext();
    }
  }

  onTimeUpdate() {
    const cur = this.audio.currentTime || 0;
    const dur = this.audio.duration || this.currentSong?.durationSec || 0;
    const pct = dur > 0 ? (cur / dur) * 100 : 0;

    const curFormatted = this.formatTime(cur);
    const durFormatted = this.formatTime(dur);

    // Desktop timeline
    if (this.dtTimeCurrent) this.dtTimeCurrent.textContent = curFormatted;
    if (this.dtTimeDuration && dur > 0) this.dtTimeDuration.textContent = durFormatted;
    if (this.dtProgressFill) this.dtProgressFill.style.width = pct + '%';
    if (this.dtProgressHandle) this.dtProgressHandle.style.left = pct + '%';

    // Mobile Mini player progress
    if (this.mbMiniProgress) this.mbMiniProgress.style.width = pct + '%';

    // Mobile Fullscreen modal timeline
    if (this.fsTimeCurrent) this.fsTimeCurrent.textContent = curFormatted;
    if (this.fsTimeDuration && dur > 0) this.fsTimeDuration.textContent = durFormatted;
    if (this.fsProgressFill) this.fsProgressFill.style.width = pct + '%';
    if (this.fsProgressThumb) this.fsProgressThumb.style.left = pct + '%';

    // Update synced lyrics
    if (window.lyricsManager) {
      window.lyricsManager.updateTime(cur);
    }

    // Update MediaSession lockscreen position state
    if ('mediaSession' in navigator && 'setPositionState' in navigator.mediaSession && dur > 0) {
      if (!this._lastMediaPosUpdate || Date.now() - this._lastMediaPosUpdate > 2000) {
        this._lastMediaPosUpdate = Date.now();
        try {
          navigator.mediaSession.setPositionState({
            duration: dur,
            playbackRate: this.audio.playbackRate || 1,
            position: Math.min(cur, dur)
          });
        } catch (e) {}
      }
    }
  }

  // --- Volume & Repeat/Shuffle Controls ---
  setVolume(val) {
    this.volume = Math.max(0, Math.min(1, val));
    this.audio.volume = this.volume;
    if (this.dtVolFill) this.dtVolFill.style.width = (this.volume * 100) + '%';
    if (this.volume === 0) {
      this.isMuted = true;
      if (this.dtVolIconHigh) this.dtVolIconHigh.style.display = 'none';
      if (this.dtVolIconMuted) this.dtVolIconMuted.style.display = 'block';
    } else {
      this.isMuted = false;
      if (this.dtVolIconHigh) this.dtVolIconHigh.style.display = 'block';
      if (this.dtVolIconMuted) this.dtVolIconMuted.style.display = 'none';
    }
    if (window.library) {
      window.library.updateSettings({ volume: this.volume });
    }
  }

  toggleMute() {
    if (this.isMuted) {
      this.setVolume(this.volume || 0.8);
    } else {
      this.audio.volume = 0;
      this.isMuted = true;
      if (this.dtVolFill) this.dtVolFill.style.width = '0%';
      if (this.dtVolIconHigh) this.dtVolIconHigh.style.display = 'none';
      if (this.dtVolIconMuted) this.dtVolIconMuted.style.display = 'block';
    }
  }

  setRepeat(mode, save = true) {
    this.repeatMode = mode; // 'off', 'all', 'one'
    if (this.dtRepeatBtn) {
      this.dtRepeatBtn.classList.toggle('active', mode !== 'off');
      if (this.dtRepeatOneBadge) {
        this.dtRepeatOneBadge.style.display = mode === 'one' ? 'block' : 'none';
      }
    }
    if (this.fsRepeatBtn) {
      this.fsRepeatBtn.classList.toggle('active', mode !== 'off');
    }
    if (save && window.library) {
      window.library.updateSettings({ repeat: mode });
    }
  }

  cycleRepeat() {
    if (this.repeatMode === 'off') this.setRepeat('all');
    else if (this.repeatMode === 'all') this.setRepeat('one');
    else this.setRepeat('off');
  }

  toggleShuffle(save = true) {
    this.isShuffle = !this.isShuffle;
    if (this.dtShuffleBtn) this.dtShuffleBtn.classList.toggle('active', this.isShuffle);
    if (this.fsShuffleBtn) this.fsShuffleBtn.classList.toggle('active', this.isShuffle);
    if (save && window.library) {
      window.library.updateSettings({ shuffle: this.isShuffle });
    }
  }

  // --- Sleep Timer ---
  setSleepTimer(minutes) {
    if (this.sleepTimerId) {
      clearTimeout(this.sleepTimerId);
      this.sleepTimerId = null;
    }

    const dot = document.getElementById('sleep-active-dot');
    if (!minutes || minutes <= 0) {
      if (dot) dot.style.display = 'none';
      if (window.ui) window.ui.showToast('Pengatur waktu tidur dinonaktifkan.');
      return;
    }

    if (dot) dot.style.display = 'block';
    if (window.ui) window.ui.showToast(`Musik akan berhenti dalam ${minutes} menit. Mode tidur aktif.`, 'success');

    const ms = minutes * 60 * 1000;
    this.sleepTimerId = setTimeout(() => {
      this.fadeVolumeAndStop();
    }, ms);
  }

  fadeVolumeAndStop() {
    const fadeDuration = 10000; // 10 seconds fade out
    const initialVol = this.audio.volume;
    const interval = 200;
    const step = initialVol / (fadeDuration / interval);

    const fadeTimer = setInterval(() => {
      if (this.audio.volume > step) {
        this.audio.volume -= step;
      } else {
        clearInterval(fadeTimer);
        this.audio.pause();
        this.audio.volume = initialVol;
        const dot = document.getElementById('sleep-active-dot');
        if (dot) dot.style.display = 'none';
      }
    }, interval);
  }

  // --- UI Synchronizations ---
  updateTrackInfoUI(song) {
    const thumb = song.thumbnail || 'icons/cover-placeholder.svg?v=4.4.0';

    // Desktop
    if (this.dtThumb) this.dtThumb.src = thumb;
    if (this.dtTitle) this.dtTitle.textContent = song.title;
    if (this.dtArtist) this.dtArtist.textContent = song.artist;
    this.updateLikeButton(this.dtLikeBtn, song.id);

    // Mobile Mini Player
    if (this.mbMiniThumb) this.mbMiniThumb.src = thumb;
    if (this.mbMiniTitle) this.mbMiniTitle.textContent = song.title;
    if (this.mbMiniArtist) this.mbMiniArtist.textContent = song.artist;
    this.updateLikeButton(this.mbMiniLikeBtn, song.id);

    // Mobile Fullscreen Modal
    if (this.fsArtwork) this.fsArtwork.src = thumb;
    if (this.fsTitle) this.fsTitle.textContent = song.title;
    if (this.fsArtist) this.fsArtist.textContent = song.artist;
    if (this.fsEngineBadge) {
      this.fsEngineBadge.textContent = song.engine === 'youtube' ? 'YouTube Standard' : 'YouTube Music';
    }
    if (this.fsAmbientBg) {
      this.fsAmbientBg.style.backgroundImage = `url('${thumb}')`;
    }
    this.updateLikeButton(this.fsLikeBtn, song.id);

    // Update Right Drawer & Mobile Sound Card
    this.updateSoundCardUI(song);
  }

  updateSoundCardUI(song) {
    if (!song) return;
    const thumb = song.thumbnail || 'icons/cover-placeholder.svg?v=4.4.0';

    if (this.scArtImg) this.scArtImg.src = thumb;
    if (this.scTitle) this.scTitle.textContent = song.title || 'Pilih Lagu';
    if (this.scArtist) this.scArtist.textContent = song.artist || 'Aura Sound System';

    const engineText = song.engine === 'youtube' ? 'YouTube Standard' : 'YouTube Music';
    if (this.scEngineBadge) this.scEngineBadge.textContent = engineText;
    if (this.scEngineLabel) this.scEngineLabel.textContent = song.engine === 'youtube' ? 'YouTube' : 'YT Music';

    const aboutDesc = document.getElementById('soundcard-about-desc');
    if (aboutDesc) {
      aboutDesc.textContent = `Audio resolusi tinggi 48 kHz Opus tanpa iklan langsung dari pipeline ${engineText}. Menghadirkan reproduksi suara natural dan jernih.`;
    }

    if (this.scLikeBtn) this.updateLikeButton(this.scLikeBtn, song.id);

    // Update Up-Next Preview Card
    const nextSong = this.queue[this.queueIndex + 1] || null;
    if (nextSong) {
      if (this.scUpnextThumb) this.scUpnextThumb.src = nextSong.thumbnail || 'icons/cover-placeholder.svg?v=4.4.0';
      if (this.scUpnextTitle) this.scUpnextTitle.textContent = nextSong.title;
      if (this.scUpnextArtist) this.scUpnextArtist.textContent = nextSong.artist;
    } else {
      if (this.scUpnextThumb) this.scUpnextThumb.src = 'icons/cover-placeholder.svg?v=4.4.0';
      if (this.scUpnextTitle) this.scUpnextTitle.textContent = 'Akhir Antrean';
      if (this.scUpnextArtist) this.scUpnextArtist.textContent = 'Pilih lagu untuk menambah antrean';
    }
  }

  updatePlayPauseUI(playing) {
    // Desktop
    if (this.dtPlayIcon) this.dtPlayIcon.style.display = playing ? 'none' : 'block';
    if (this.dtPauseIcon) this.dtPauseIcon.style.display = playing ? 'block' : 'none';

    // Mobile Mini
    if (this.mbMiniPlayIcon) this.mbMiniPlayIcon.style.display = playing ? 'none' : 'block';
    if (this.mbMiniPauseIcon) this.mbMiniPauseIcon.style.display = playing ? 'block' : 'none';

    // Mobile Fullscreen
    if (this.fsPlayIcon) this.fsPlayIcon.style.display = playing ? 'none' : 'block';
    if (this.fsPauseIcon) this.fsPauseIcon.style.display = playing ? 'block' : 'none';

    // Interactive Sound Card Artwork glow
    const artWrap = document.querySelector('.soundcard-art-wrap');
    if (artWrap) artWrap.classList.toggle('playing', playing);
  }

  updateLikeButton(btn, songId) {
    if (!btn || !window.library) return;
    const liked = window.library.isLiked(songId);
    btn.classList.toggle('liked', liked);
  }

  // --- Native MediaSession API (Lockscreen & Bluetooth Controls) ---
  setupMediaSession() {
    if (!('mediaSession' in navigator)) return;

    try {
      navigator.mediaSession.setActionHandler('play', () => this.togglePlayPause());
      navigator.mediaSession.setActionHandler('pause', () => this.togglePlayPause());
      navigator.mediaSession.setActionHandler('stop', () => {
        this.audio.pause();
        this.isPlaying = false;
        this.updatePlayPauseUI(false);
      });
      navigator.mediaSession.setActionHandler('nexttrack', () => this.playNext());
      navigator.mediaSession.setActionHandler('previoustrack', () => this.playPrev());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) this.seek(details.seekTime);
      });
      navigator.mediaSession.setActionHandler('seekbackward', (details) => {
        this.seek(Math.max(0, this.audio.currentTime - (details.seekOffset || 10)));
      });
      navigator.mediaSession.setActionHandler('seekforward', (details) => {
        const dur = this.audio.duration || 0;
        this.seek(Math.min(dur, this.audio.currentTime + (details.seekOffset || 10)));
      });
    } catch (e) {
      console.warn('MediaSession handler registration error:', e);
    }
  }

  updateMediaSessionMetadata(song) {
    if (!('mediaSession' in navigator) || !song) return;

    const defaultCover = 'icons/icon-512.png?v=4.6.0';
    const thumbUrl = song.thumbnail || defaultCover;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: song.title,
      artist: song.artist,
      album: 'Aura Music',
      artwork: [
        { src: thumbUrl, sizes: '192x192', type: 'image/png' },
        { src: thumbUrl, sizes: '512x512', type: 'image/png' },
        { src: 'icons/icon-512.png?v=4.6.0', sizes: '512x512', type: 'image/png' }
      ]
    });

    if ('playbackState' in navigator.mediaSession) {
      navigator.mediaSession.playbackState = this.isPlaying ? 'playing' : 'paused';
    }
  }

  // --- Real-time 60fps Canvas Spectrum Visualizer ---
  startVisualizer() {
    this.initWebAudio();
    this.visualizerActive = true;
    const overlay = document.getElementById('visualizer-overlay');
    if (overlay) overlay.style.display = 'flex';
    this.resizeCanvas();
    this.startVisualizerLoop();
  }

  stopVisualizer() {
    this.visualizerActive = false;
    const overlay = document.getElementById('visualizer-overlay');
    if (overlay) overlay.style.display = 'none';
    this.stopVisualizerLoop();
  }

  resizeCanvas() {
    if (!this.canvas) return;
    this.canvas.width = this.canvas.offsetWidth * window.devicePixelRatio || 600;
    this.canvas.height = this.canvas.offsetHeight * window.devicePixelRatio || 300;
  }

  startVisualizerLoop() {
    if (this.visAnimFrame || !this.analyser || !this.canvasCtx) return;

    const bufferLength = this.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      // Pause drawing if tab hidden to save CPU/battery completely
      if (document.hidden || !this.isPlaying || !this.visualizerActive) {
        this.stopVisualizerLoop();
        return;
      }

      this.visAnimFrame = requestAnimationFrame(draw);
      this.analyser.getByteFrequencyData(dataArray);

      const width = this.canvas.width;
      const height = this.canvas.height;
      const ctx = this.canvasCtx;

      ctx.clearRect(0, 0, width, height);

      const barCount = 48;
      const barWidth = (width / barCount) * 0.75;
      const gap = (width / barCount) * 0.25;

      for (let i = 0; i < barCount; i++) {
        const val = dataArray[i * 2] || 0;
        const barHeight = (val / 255) * (height * 0.85);
        const x = i * (barWidth + gap) + gap;
        const y = height - barHeight;

        const grad = ctx.createLinearGradient(0, height, 0, 0);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
        grad.addColorStop(0.6, 'rgba(255, 255, 255, 0.85)');
        grad.addColorStop(1, '#ffffff');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, [4, 4, 0, 0]);
        ctx.fill();
      }
    };

    draw();
  }

  stopVisualizerLoop() {
    if (this.visAnimFrame) {
      cancelAnimationFrame(this.visAnimFrame);
      this.visAnimFrame = null;
    }
  }

  // --- Thin Ambient Player Visualizer & Live Sound Card Render Engine ---
  startAmbientVisualizer() {
    this.initWebAudio();

    if (this.ambientCanvas) {
      this.ambientCanvas.classList.add('active');
      const w = this.ambientCanvas.parentElement?.clientWidth || window.innerWidth;
      this.ambientCanvas.width = w;
      this.ambientCanvas.height = 5;
    }

    if (this.playerMiniVis) {
      this.playerMiniVis.classList.add('animating');
    }

    if (!this.ambientDataArray && this.analyser) {
      this.ambientDataArray = new Uint8Array(this.analyser.frequencyBinCount);
    }

    // Initialize smoothed lerp buffers
    if (!this.lerpSpectrum) {
      this.lerpSpectrum = new Float32Array(96);
    }

    if (this.ambientAnimFrame) return;

    // Helper to render live oscilloscope / soundwave on Sound Card canvas
    const renderSoundCardCanvas = (canvas, ctx) => {
      if (!canvas || !ctx) return;
      const w = canvas.parentElement?.clientWidth || 280;
      const h = canvas.parentElement?.clientHeight || 64;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }

      ctx.clearRect(0, 0, w, h);

      // Background subtle studio grid lines
      ctx.setLineDash([3, 4]);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, h * 0.33); ctx.lineTo(w, h * 0.33);
      ctx.moveTo(0, h * 0.66); ctx.lineTo(w, h * 0.66);
      ctx.stroke();
      ctx.setLineDash([]);

      if (!this.ambientDataArray) return;

      if (this.scVisMode === 'bars') {
        // Mode 2: Geometric Studio Spectrum Bars
        const bars = 22;
        const bw = (w / bars) * 0.72;
        const gap = (w / bars) * 0.28;
        for (let i = 0; i < bars; i++) {
          const bin = Math.floor(i * (this.ambientDataArray.length / (bars * 1.15)));
          const val = this.ambientDataArray[bin] || 0;
          const bh = Math.max(3, (val / 255) * (h - 10));
          const x = i * (bw + gap) + gap / 2;
          const y = h - bh;
          
          ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
          ctx.fillRect(x, y, bw, bh);
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(x, y, bw, 2); // White peak cap
        }
      } else if (this.scVisMode === 'quantum') {
        // Mode 3: Symmetrical Center-out Quantum Wave
        const midY = h / 2;
        const slices = 32;
        const step = w / slices;
        ctx.beginPath();
        for (let i = 0; i < slices; i++) {
          const distCenter = Math.abs(i - slices / 2) / (slices / 2);
          const bin = Math.floor((1 - distCenter) * (this.ambientDataArray.length * 0.65));
          const val = this.ambientDataArray[bin] || 0;
          const amp = (val / 255) * (h * 0.44);
          const x = i * step;
          if (i === 0) ctx.moveTo(x, midY - amp);
          else ctx.lineTo(x, midY - amp);
        }
        for (let i = slices - 1; i >= 0; i--) {
          const distCenter = Math.abs(i - slices / 2) / (slices / 2);
          const bin = Math.floor((1 - distCenter) * (this.ambientDataArray.length * 0.65));
          const val = this.ambientDataArray[bin] || 0;
          const amp = (val / 255) * (h * 0.44);
          const x = i * step;
          ctx.lineTo(x, midY + amp);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6;
        ctx.stroke();
      } else {
        // Mode 1: Smooth Oscilloscope Waveform with Quadratic Spline
        const points = 28;
        const sliceW = w / (points - 1);

        // Draw Gradient Wave Fill
        ctx.beginPath();
        ctx.moveTo(0, h);
        for (let i = 0; i < points; i++) {
          const bin = Math.floor(i * (this.ambientDataArray.length / points));
          const val = this.ambientDataArray[bin] || 0;
          const normY = h - 6 - ((val / 255) * (h - 12));
          const x = i * sliceW;
          if (i === 0) {
            ctx.lineTo(x, normY);
          } else {
            const prevX = (i - 1) * sliceW;
            const prevBin = Math.floor((i - 1) * (this.ambientDataArray.length / points));
            const prevY = h - 6 - (((this.ambientDataArray[prevBin] || 0) / 255) * (h - 12));
            const cpX = (prevX + x) / 2;
            ctx.quadraticCurveTo(cpX, prevY, x, normY);
          }
        }
        ctx.lineTo(w, h);
        ctx.closePath();

        const waveGrad = ctx.createLinearGradient(0, 0, 0, h);
        waveGrad.addColorStop(0, 'rgba(255, 255, 255, 0.35)');
        waveGrad.addColorStop(1, 'rgba(255, 255, 255, 0.02)');
        ctx.fillStyle = waveGrad;
        ctx.fill();

        // Draw Pure White Glowing Wave Stroke
        ctx.beginPath();
        for (let i = 0; i < points; i++) {
          const bin = Math.floor(i * (this.ambientDataArray.length / points));
          const val = this.ambientDataArray[bin] || 0;
          const normY = h - 6 - ((val / 255) * (h - 12));
          const x = i * sliceW;
          if (i === 0) {
            ctx.moveTo(x, normY);
          } else {
            const prevX = (i - 1) * sliceW;
            const prevBin = Math.floor((i - 1) * (this.ambientDataArray.length / points));
            const prevY = h - 6 - (((this.ambientDataArray[prevBin] || 0) / 255) * (h - 12));
            const cpX = (prevX + x) / 2;
            ctx.quadraticCurveTo(cpX, prevY, x, normY);
          }
        }
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.75;
        ctx.stroke();

        // Bottom Micro-Bar Spectrum Peaks
        const barSlots = 14;
        const barStep = w / barSlots;
        for (let b = 0; b < barSlots; b++) {
          const bin = Math.floor(b * (this.ambientDataArray.length / barSlots));
          const val = this.ambientDataArray[bin] || 0;
          const barH = Math.max(2, (val / 255) * 16);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.fillRect(b * barStep + 4, h - barH, barStep - 8, barH);
        }
      }
    };

    const drawAmbient = () => {
      if (!this.isPlaying) {
        this.stopAmbientVisualizer();
        return;
      }

      this.ambientAnimFrame = requestAnimationFrame(drawAmbient);

      if (this.analyser && this.ambientDataArray) {
        this.analyser.getByteFrequencyData(this.ambientDataArray);

        // 1. Render Top-Border Player Bar Visualizer with Symmetrical Fluid Physics
        if (this.ambientCanvas && this.ambientCtx) {
          const ctx = this.ambientCtx;
          const w = this.ambientCanvas.width;
          const h = this.ambientCanvas.height;

          ctx.clearRect(0, 0, w, h);

          const barCount = 96;
          const barWidth = w / barCount;
          const halfBars = barCount / 2;

          let sumBass = 0;
          for (let b = 0; b < 8; b++) sumBass += this.ambientDataArray[b] || 0;
          const bassRatio = (sumBass / 8) / 255;

          // Subtle ambient bloom glow along player border
          ctx.fillStyle = `rgba(255, 255, 255, ${(0.08 + bassRatio * 0.22).toFixed(2)})`;
          ctx.fillRect(0, 0, w, 1);

          for (let i = 0; i < barCount; i++) {
            const distFromCenter = Math.abs(i - halfBars) / halfBars;
            const binIdx = Math.min(
              this.ambientDataArray.length - 1,
              Math.floor((1 - distFromCenter) * (this.ambientDataArray.length * 0.72))
            );
            const targetVal = this.ambientDataArray[binIdx] || 0;
            // Smooth lerp
            this.lerpSpectrum[i] += (targetVal - this.lerpSpectrum[i]) * 0.28;

            const ratio = this.lerpSpectrum[i] / 255;
            const barH = Math.max(0.6, ratio * h);

            const alpha = 0.25 + (ratio * 0.75);
            ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
            ctx.fillRect(i * barWidth, 0, Math.max(1, barWidth - 0.4), barH);
          }
        }

        // 2. Render Sound Card Oscilloscope (Desktop & Mobile)
        if (this.scVisCanvas && this.scVisCtx) {
          renderSoundCardCanvas(this.scVisCanvas, this.scVisCtx);
        }
        if (this.mbScVisCanvas && this.mbScVisCtx) {
          renderSoundCardCanvas(this.mbScVisCanvas, this.mbScVisCtx);
        }

        // 3. Update Dynamic Sound Card Metrics
        if (this.scBassMeter || this.scPeakMeter) {
          let sumBass = 0;
          let peak = 0;
          for (let b = 0; b < 10; b++) {
            const v = this.ambientDataArray[b] || 0;
            sumBass += v;
            if (v > peak) peak = v;
          }
          const avgBass = sumBass / 10;
          if (this.scBassMeter) {
            this.scBassMeter.textContent = avgBass > 140 ? 'POWER' : avgBass > 70 ? 'DYNAMIC' : 'CLEAN';
          }
          if (this.scPeakMeter) {
            const db = peak > 0 ? (20 * Math.log10(peak / 255)).toFixed(1) + ' dB' : '-48 dB';
            this.scPeakMeter.textContent = db;
          }
        }

        // 4. Drive Mini Equalizer Bars in Track Info
        if (this.playerMiniVis) {
          const bars = this.playerMiniVis.querySelectorAll('.bar');
          if (bars.length >= 4) {
            const b0 = this.ambientDataArray[3] || 0;
            const b1 = this.ambientDataArray[10] || 0;
            const b2 = this.ambientDataArray[24] || 0;
            const b3 = this.ambientDataArray[48] || 0;
            bars[0].style.height = Math.max(3, (b0 / 255) * 12) + 'px';
            bars[1].style.height = Math.max(3, (b1 / 255) * 12) + 'px';
            bars[2].style.height = Math.max(3, (b2 / 255) * 12) + 'px';
            bars[3].style.height = Math.max(3, (b3 / 255) * 12) + 'px';
          }
        }
      }
    };

    this.ambientAnimFrame = requestAnimationFrame(drawAmbient);
  }

  stopAmbientVisualizer() {
    if (this.ambientAnimFrame) {
      cancelAnimationFrame(this.ambientAnimFrame);
      this.ambientAnimFrame = null;
    }
    if (this.ambientCanvas) {
      this.ambientCanvas.classList.remove('active');
      if (this.ambientCtx) {
        this.ambientCtx.clearRect(0, 0, this.ambientCanvas.width, this.ambientCanvas.height);
      }
    }
    if (this.playerMiniVis) {
      this.playerMiniVis.classList.remove('animating');
      const bars = this.playerMiniVis.querySelectorAll('.bar');
      bars.forEach(b => b.style.height = '3px');
    }
    if (this.scVisCanvas && this.scVisCtx) {
      this.scVisCtx.clearRect(0, 0, this.scVisCanvas.width, this.scVisCanvas.height);
    }
    if (this.mbScVisCanvas && this.mbScVisCtx) {
      this.mbScVisCtx.clearRect(0, 0, this.mbScVisCanvas.width, this.mbScVisCanvas.height);
    }
  }

  // --- High Precision Realtime Lyrics Synchronizer ---
  startLyricsSync() {
    if (this.lyricsTicker) clearInterval(this.lyricsTicker);
    // 35ms interval (~28fps) for instant, lag-free lyrics update
    this.lyricsTicker = setInterval(() => {
      if (this.isPlaying && window.lyricsManager && this.audio && !this.audio.paused) {
        window.lyricsManager.updateTime(this.audio.currentTime || 0);
      }
    }, 35);
  }

  stopLyricsSync() {
    if (this.lyricsTicker) {
      clearInterval(this.lyricsTicker);
      this.lyricsTicker = null;
    }
  }

  initSoundCardInteractions() {
    // EQ Preset pills on Sound Card (Desktop & Mobile)
    const pills = document.querySelectorAll('.eq-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', (e) => {
        const preset = e.currentTarget.dataset.preset || 'flat';
        this.setEqualizerPreset(preset);
        
        // Update all pills across desktop & mobile
        pills.forEach(p => p.classList.toggle('active', p.dataset.preset === preset));
        
        const statusLabel = document.getElementById('soundcard-eq-status');
        if (statusLabel) {
          const names = {
            flat: 'NATURAL',
            bass: 'BASS BOOST',
            vocal: 'VOKAL JERNIH',
            treble: 'TREBLE BRIGHT'
          };
          statusLabel.textContent = names[preset] || preset.toUpperCase();
        }

        if (window.ui) {
          window.ui.showToast(`Mode Suara: ${preset.toUpperCase()}`);
        }
      });
    });

    // Share button
    const btnShare = document.getElementById('btn-soundcard-share');
    if (btnShare) {
      btnShare.addEventListener('click', () => {
        const cur = this.currentSong;
        if (cur) {
          const text = `${cur.title} - ${cur.artist} • Dengarkan di Aura`;
          if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
              if (window.ui) window.ui.showToast('Info lagu disalin ke clipboard!');
            }).catch(() => {
              if (window.ui) window.ui.showToast(text);
            });
          } else {
            if (window.ui) window.ui.showToast(text);
          }
        }
      });
    }

    // Quick lyrics button
    const btnLyrics = document.getElementById('btn-soundcard-lyrics');
    if (btnLyrics) {
      btnLyrics.addEventListener('click', () => {
        if (window.openAppDrawer) window.openAppDrawer('lyrics');
      });
    }

    // Visualizer mode switcher button
    const btnVisMode = document.getElementById('btn-soundcard-vis-mode');
    if (btnVisMode) {
      btnVisMode.addEventListener('click', () => this.cycleVisMode());
    }

    // Clicking Sound Card canvas to toggle visualizer mode
    if (this.scVisCanvas) {
      this.scVisCanvas.style.cursor = 'pointer';
      this.scVisCanvas.addEventListener('click', () => this.cycleVisMode());
    }
    if (this.mbScVisCanvas) {
      this.mbScVisCanvas.style.cursor = 'pointer';
      this.mbScVisCanvas.addEventListener('click', () => this.cycleVisMode());
    }
  }

  cycleVisMode() {
    const modes = ['wave', 'bars', 'quantum'];
    const nextIdx = (modes.indexOf(this.scVisMode) + 1) % modes.length;
    this.scVisMode = modes[nextIdx];
    const label = document.getElementById('label-vis-mode');
    if (label) {
      label.textContent = this.scVisMode === 'wave' ? 'Gelombang' : this.scVisMode === 'bars' ? 'Spektrum Bar' : 'Kuantum';
    }
    if (window.ui) {
      const names = { wave: 'Mode Gelombang', bars: 'Mode Spektrum Bar', quantum: 'Mode Kuantum' };
      window.ui.showToast(`Visualizer: ${names[this.scVisMode]}`);
    }
  }

  // --- Helper ---
  formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }
}

window.player = new AudioPlayer();
