/**
 * SPOTIFREE - UI Controller
 * Views navigation, rendering components, modals, toasts, and mobile interactions
 */

window.API_BASE = (window.location.protocol === 'file:' || (window.location.port !== '3000' && window.location.port !== ''))
  ? 'http://localhost:3000'
  : '';

class UIManager {
  constructor() {
    this.currentView = 'home';
    this.viewHistory = ['home'];
    this.historyPos = 0;
    this.activePlaylistId = null;

    this.initNavigation();
    this.initDrawers();
    this.initMobileModals();
    this.initModals();
  }

  // --- Views Navigation ---
  initNavigation() {
    // Desktop sidebar nav items
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const view = e.currentTarget.dataset.view;
        this.navigateTo(view);
      });
    });

    // Mobile bottom nav items
    document.querySelectorAll('.mobile-bottom-nav .mobile-nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const view = e.currentTarget.dataset.view;
        this.navigateTo(view);
      });
    });

    // Topbar back / forward buttons
    const backBtn = document.getElementById('btn-nav-back');
    const fwdBtn = document.getElementById('btn-nav-forward');
    if (backBtn) {
      backBtn.addEventListener('click', () => {
        if (this.historyPos > 0) {
          this.historyPos--;
          this.switchView(this.viewHistory[this.historyPos], false);
        }
      });
    }
    if (fwdBtn) {
      fwdBtn.addEventListener('click', () => {
        if (this.historyPos < this.viewHistory.length - 1) {
          this.historyPos++;
          this.switchView(this.viewHistory[this.historyPos], false);
        }
      });
    }

    // Genre Cards on Explore view
    document.querySelectorAll('.genre-card[data-query]').forEach(card => {
      card.addEventListener('click', (e) => {
        const q = e.currentTarget.dataset.query;
        if (window.searchManager) {
          window.searchManager.searchQuery(q);
        }
      });
    });

    // Hero Play Popular button
    const heroPlay = document.getElementById('btn-hero-play-popular');
    if (heroPlay) {
      heroPlay.addEventListener('click', () => {
        const firstShelfCard = document.querySelector('#home-shelves-container .music-card');
        if (firstShelfCard && firstShelfCard.dataset.song) {
          const song = JSON.parse(firstShelfCard.dataset.song);
          if (window.player) window.player.playSong(song);
        } else if (window.searchManager) {
          window.searchManager.searchQuery('top hits indonesia 2024');
        }
      });
    }

    const heroExplore = document.getElementById('btn-hero-explore');
    if (heroExplore) {
      heroExplore.addEventListener('click', () => this.navigateTo('explore'));
    }

    // Open Liked songs card
    const cardOpenLiked = document.getElementById('card-open-liked');
    if (cardOpenLiked) {
      cardOpenLiked.addEventListener('click', (e) => {
        if (e.target.closest('#btn-play-liked-all')) return;
        this.openLikedView();
      });
    }
    const btnPlayLikedAll = document.getElementById('btn-play-liked-all');
    if (btnPlayLikedAll) {
      btnPlayLikedAll.addEventListener('click', () => {
        const liked = window.library.getLikedSongs();
        if (liked.length > 0 && window.player) {
          window.player.playSong(liked[0], liked);
        } else {
          this.showToast('Belum ada lagu yang disukai.');
        }
      });
    }

    // Playlist detail play all & shuffle
    const detailPlayAll = document.getElementById('btn-detail-play-all');
    if (detailPlayAll) {
      detailPlayAll.addEventListener('click', () => {
        let songs = [];
        if (this.activePlaylistId === 'liked') {
          songs = window.library.getLikedSongs();
        } else if (this.activePlaylistId) {
          const pl = window.library.getPlaylist(this.activePlaylistId);
          songs = pl?.songs || [];
        }
        if (songs.length > 0 && window.player) {
          window.player.playSong(songs[0], songs);
        }
      });
    }

    const detailShuffle = document.getElementById('btn-detail-shuffle');
    if (detailShuffle) {
      detailShuffle.addEventListener('click', () => {
        if (window.player) {
          window.player.toggleShuffle();
          const detailPlay = document.getElementById('btn-detail-play-all');
          if (detailPlay) detailPlay.click();
        }
      });
    }
  }

  navigateTo(view) {
    if (view === 'liked') {
      this.openLikedView();
      return;
    }
    this.switchView(view, true);
  }

  switchView(viewId, pushHistory = true) {
    if (pushHistory) {
      this.viewHistory = this.viewHistory.slice(0, this.historyPos + 1);
      this.viewHistory.push(viewId);
      this.historyPos = this.viewHistory.length - 1;
    }

    this.currentView = viewId;

    // Hide all views, activate target
    document.querySelectorAll('.view-content').forEach(view => {
      view.classList.remove('active');
    });

    const target = document.getElementById(`view-${viewId}`);
    if (target) {
      target.classList.add('active');
    }

    // Sync Desktop Sidebar Active
    document.querySelectorAll('.sidebar-nav .nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewId);
    });

    // Sync Mobile Bottom Nav Active
    document.querySelectorAll('.mobile-bottom-nav .mobile-nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === viewId);
    });

    // Scroll main container to top
    const mainContainer = document.getElementById('main-container');
    if (mainContainer) mainContainer.scrollTop = 0;

    // View specific updates
    if (viewId === 'library') {
      this.updateLibraryView();
    }
  }

  openLikedView() {
    this.activePlaylistId = 'liked';
    this.switchView('playlist-detail');

    const cover = document.getElementById('detail-cover');
    const title = document.getElementById('detail-title');
    const desc = document.getElementById('detail-desc');
    const count = document.getElementById('detail-track-count');
    const delBtn = document.getElementById('btn-detail-delete-playlist');
    const tracklist = document.getElementById('detail-tracklist');

    if (cover) cover.innerHTML = `<svg viewBox="0 0 24 24" style="fill:#ffffff;"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>`;
    if (title) title.textContent = 'Lagu yang Disukai';
    if (desc) desc.textContent = 'Koleksi seluruh lagu favorit Anda yang tersimpan di perangkat ini.';
    if (delBtn) delBtn.style.display = 'none';

    const songs = window.library.getLikedSongs();
    if (count) count.textContent = `${songs.length} lagu`;

    if (tracklist) {
      if (songs.length === 0) {
        tracklist.innerHTML = `<p class="empty-text">Belum ada lagu yang disukai. Klik ikon hati pada lagu untuk menambahkannya ke sini!</p>`;
      } else {
        tracklist.innerHTML = '';
        this.renderTrackRows(tracklist, songs, songs);
      }
    }
  }

  openPlaylistDetail(playlistId) {
    const pl = window.library.getPlaylist(playlistId);
    if (!pl) return;
    this.activePlaylistId = playlistId;
    this.switchView('playlist-detail');

    const cover = document.getElementById('detail-cover');
    const title = document.getElementById('detail-title');
    const desc = document.getElementById('detail-desc');
    const count = document.getElementById('detail-track-count');
    const delBtn = document.getElementById('btn-detail-delete-playlist');
    const tracklist = document.getElementById('detail-tracklist');

    if (cover) cover.innerHTML = `<svg viewBox="0 0 24 24"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>`;
    if (title) title.textContent = pl.name;
    if (desc) desc.textContent = `Dibuat pada ${new Date(pl.createdAt).toLocaleDateString('id-ID')}`;
    if (count) count.textContent = `${pl.songs.length} lagu`;

    if (delBtn) {
      delBtn.style.display = 'flex';
      delBtn.onclick = () => {
        if (confirm(`Hapus playlist "${pl.name}"?`)) {
          window.library.deletePlaylist(pl.id);
          this.updateSidebarPlaylists();
          this.switchView('library');
          this.showToast('Playlist dihapus.');
        }
      };
    }

    if (tracklist) {
      if (pl.songs.length === 0) {
        tracklist.innerHTML = `<p class="empty-text">Playlist ini masih kosong. Cari lagu dan tambahkan ke playlist ini!</p>`;
      } else {
        tracklist.innerHTML = '';
        this.renderTrackRows(tracklist, pl.songs, pl.songs, true, pl.id);
      }
    }
  }

  // --- Right Drawer (Desktop & Mobile Sheet) ---
  initDrawers() {
    const appLayout = document.getElementById('app');
    const btnNowPlaying = document.getElementById('btn-nowplaying-toggle');
    const btnLyrics = document.getElementById('btn-lyrics-toggle');
    const btnQueue = document.getElementById('btn-queue-toggle');
    const btnClose = document.getElementById('btn-close-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    const tabs = document.querySelectorAll('.drawer-tab');

    const openDrawer = (tabName) => {
      appLayout.classList.add('drawer-open');
      tabs.forEach(t => t.classList.toggle('active', t.dataset.drawer === tabName));
      document.querySelectorAll('.drawer-body').forEach(b => {
        b.classList.toggle('active', b.id === `drawer-${tabName}-content`);
      });

      if (btnNowPlaying) btnNowPlaying.classList.toggle('active', tabName === 'nowplaying');
      if (btnLyrics) btnLyrics.classList.toggle('active', tabName === 'lyrics');
      if (btnQueue) btnQueue.classList.toggle('active', tabName === 'queue');

      if (tabName === 'queue') this.updateQueueUI();
      if (tabName === 'nowplaying' && window.player) {
        window.player.updateSoundCardUI(window.player.currentSong);
      }
    };

    window.openAppDrawer = openDrawer;

    if (btnNowPlaying) {
      btnNowPlaying.addEventListener('click', () => {
        if (appLayout.classList.contains('drawer-open') && document.getElementById('drawer-nowplaying-content').classList.contains('active')) {
          appLayout.classList.remove('drawer-open');
          btnNowPlaying.classList.remove('active');
        } else {
          openDrawer('nowplaying');
        }
      });
    }

    if (btnLyrics) {
      btnLyrics.addEventListener('click', () => {
        if (appLayout.classList.contains('drawer-open') && document.getElementById('drawer-lyrics-content').classList.contains('active')) {
          appLayout.classList.remove('drawer-open');
        } else {
          openDrawer('lyrics');
        }
      });
    }

    if (btnQueue) {
      btnQueue.addEventListener('click', () => {
        if (appLayout.classList.contains('drawer-open') && document.getElementById('drawer-queue-content').classList.contains('active')) {
          appLayout.classList.remove('drawer-open');
        } else {
          openDrawer('queue');
        }
      });
    }

    if (btnClose) {
      btnClose.addEventListener('click', () => {
        appLayout.classList.remove('drawer-open');
        if (btnNowPlaying) btnNowPlaying.classList.remove('active');
      });
    }

    if (backdrop) {
      backdrop.addEventListener('click', () => {
        appLayout.classList.remove('drawer-open');
        if (btnNowPlaying) btnNowPlaying.classList.remove('active');
      });
    }

    // Clicking desktop player song thumbnail or title opens the Now Playing Sound Card
    const dtThumbWrap = document.getElementById('player-thumb-wrapper');
    const dtTitle = document.getElementById('player-title');
    if (dtThumbWrap) {
      dtThumbWrap.style.cursor = 'pointer';
      dtThumbWrap.addEventListener('click', () => openDrawer('nowplaying'));
    }
    if (dtTitle) {
      dtTitle.addEventListener('click', () => openDrawer('nowplaying'));
    }

    // Sound Card Like button
    const scLikeBtn = document.getElementById('soundcard-like-btn');
    if (scLikeBtn) {
      scLikeBtn.addEventListener('click', () => {
        const cur = window.player?.currentSong;
        if (cur && window.library) {
          window.library.toggleLike(cur);
          if (window.player) {
            window.player.updateLikeButton(scLikeBtn, cur.id);
            window.player.updateLikeButton(window.player.dtLikeBtn, cur.id);
            window.player.updateLikeButton(window.player.fsLikeBtn, cur.id);
          }
        }
      });
    }

    // Sound Card Up-Next click to play
    const upnextCard = document.getElementById('soundcard-upnext-card');
    if (upnextCard) {
      upnextCard.addEventListener('click', () => {
        if (window.player && window.player.queue.length > 0) {
          window.player.playNext();
        }
      });
    }

    tabs.forEach(t => {
      t.addEventListener('click', (e) => {
        openDrawer(e.currentTarget.dataset.drawer);
      });
    });

    const clearQueueBtn = document.getElementById('btn-clear-queue');
    if (clearQueueBtn) {
      clearQueueBtn.addEventListener('click', () => {
        if (window.player) {
          window.player.queue = window.player.currentSong ? [window.player.currentSong] : [];
          window.player.queueIndex = 0;
          this.updateQueueUI();
          this.showToast('Antrean dibersihkan.');
        }
      });
    }
  }

  // --- Mobile Mini Player & Fullscreen Modal ---
  initMobileModals() {
    const miniInfo = document.getElementById('mini-info-tap');
    const miniThumb = document.querySelector('.mini-thumb-wrap');
    const fsModal = document.getElementById('fullscreen-player-modal');
    const fsDismiss = document.getElementById('btn-fs-dismiss');

    const openFs = () => {
      if (fsModal) {
        fsModal.classList.add('open');
        if (window.player) {
          window.player.updateSoundCardUI(window.player.currentSong);
        }
      }
    };

    if (miniInfo) miniInfo.addEventListener('click', openFs);
    if (miniThumb) miniThumb.addEventListener('click', openFs);

    if (fsDismiss && fsModal) {
      fsDismiss.addEventListener('click', () => {
        fsModal.classList.remove('open');
      });
    }

    // Touch swipe down on fullscreen player to dismiss smoothly
    if (fsModal) {
      let touchStartY = 0;
      fsModal.addEventListener('touchstart', (e) => {
        touchStartY = e.touches[0].clientY;
      }, { passive: true });

      fsModal.addEventListener('touchmove', (e) => {
        const deltaY = e.touches[0].clientY - touchStartY;
        if (deltaY > 80) {
          fsModal.classList.remove('open');
        }
      }, { passive: true });
    }

    // Mobile fullscreen action buttons
    const fsBtnSoundcard = document.getElementById('fs-btn-soundcard');
    if (fsBtnSoundcard) {
      fsBtnSoundcard.addEventListener('click', () => {
        if (window.openAppDrawer) window.openAppDrawer('nowplaying');
      });
    }

    const fsBtnLyrics = document.getElementById('fs-btn-lyrics');
    if (fsBtnLyrics) {
      fsBtnLyrics.addEventListener('click', () => {
        if (window.openAppDrawer) window.openAppDrawer('lyrics');
      });
    }

    const fsBtnQueue = document.getElementById('fs-btn-queue');
    if (fsBtnQueue) {
      fsBtnQueue.addEventListener('click', () => {
        if (window.openAppDrawer) window.openAppDrawer('queue');
      });
    }

    const fsBtnSleep = document.getElementById('fs-btn-sleep');
    if (fsBtnSleep) {
      fsBtnSleep.addEventListener('click', () => {
        this.openModal('modal-sleep-timer');
      });
    }
  }

  // --- Track Rows Rendering (60fps Optimized) ---
  renderTrackRows(container, songs, queueContext = null, inCustomPlaylist = false, playlistId = null) {
    if (!container || !Array.isArray(songs)) return;

    const currentSongId = window.player?.currentSong?.id;
    const fragment = document.createDocumentFragment();

    songs.forEach((song, index) => {
      const row = document.createElement('div');
      row.className = `track-row ${currentSongId === song.id ? 'active' : ''}`;
      row.dataset.id = song.id;

      const isLiked = window.library.isLiked(song.id);

      const sourceLabel = song.engine === 'youtube' ? 'YouTube' : 'YT Music';
      const sourceClass = song.engine === 'youtube' ? 'badge-yt' : 'badge-ytm';

      row.innerHTML = `
        <div class="track-num">${index + 1}</div>
        <svg class="track-row-play-icon" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        <img class="track-thumb" src="${song.thumbnail || 'icons/cover-placeholder.svg?v=4.3.0'}" alt="Cover" loading="lazy" onerror="this.src='icons/cover-placeholder.svg?v=4.3.0'">
        <div class="track-info-col">
          <div class="track-title-text" title="${song.title}">${song.title}</div>
          <div class="track-artist-text" title="${song.artist}">${song.artist}</div>
        </div>
        <div class="track-source-col">
          <span class="track-source-pill ${sourceClass}">${sourceLabel}</span>
        </div>
        <div class="track-duration-col">${song.duration || ''}</div>
        <div class="track-action-col">
          <button class="btn-track-action btn-row-like ${isLiked ? 'liked' : ''}" title="Sukai">
            <svg viewBox="0 0 24 24"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
          </button>
          <button class="btn-track-action btn-row-more" title="Opsi">
            <svg viewBox="0 0 24 24"><path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"/></svg>
          </button>
        </div>
      `;

      // Play on click
      row.addEventListener('click', (e) => {
        if (e.target.closest('.track-action-col')) return;
        if (window.player) {
          window.player.playSong(song, queueContext || songs);
        }
      });

      // Like button click
      const likeBtn = row.querySelector('.btn-row-like');
      if (likeBtn) {
        likeBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const liked = window.library.toggleLike(song);
          likeBtn.classList.toggle('liked', liked);
          this.showToast(liked ? 'Ditambahkan ke Lagu yang Disukai' : 'Dihapus dari Lagu yang Disukai');
          if (this.currentView === 'liked') this.openLikedView();
        });
      }

      // More options button (Add to playlist / Remove)
      const moreBtn = row.querySelector('.btn-row-more');
      if (moreBtn) {
        moreBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openAddToPlaylistModal(song, inCustomPlaylist ? playlistId : null);
        });
      }

      fragment.appendChild(row);
    });

    container.appendChild(fragment);
  }

  highlightActiveSong(songId) {
    document.querySelectorAll('.track-row').forEach(row => {
      row.classList.toggle('active', row.dataset.id === songId);
    });
  }

  // --- Render Home Shelves & Cards ---
  renderHomeShelves(data) {
    const container = document.getElementById('home-shelves-container');
    if (!container || !data || !Array.isArray(data.sections)) return;

    container.innerHTML = '';
    const fragment = document.createDocumentFragment();

    data.sections.forEach(section => {
      const shelf = document.createElement('div');
      shelf.className = 'shelf-section';

      shelf.innerHTML = `
        <div class="shelf-header">
          <h2 class="shelf-title">${section.title}</h2>
        </div>
        <div class="shelf-grid"></div>
      `;

      const grid = shelf.querySelector('.shelf-grid');

      section.items.forEach(song => {
        const card = document.createElement('div');
        card.className = 'music-card';
        card.dataset.song = JSON.stringify(song);

        card.innerHTML = `
          <div class="card-thumb-wrap">
            <img src="${song.thumbnail || 'icons/cover-placeholder.svg?v=4.3.0'}" alt="${song.title}" loading="lazy" onerror="this.src='icons/cover-placeholder.svg?v=4.3.0'">
            <button class="card-play-btn" title="Putar">
              <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </button>
          </div>
          <div class="card-title" title="${song.title}">${song.title}</div>
          <div class="card-artist" title="${song.artist}">${song.artist}</div>
        `;

        card.addEventListener('click', () => {
          if (window.player) {
            window.player.playSong(song, section.items);
          }
        });

        grid.appendChild(card);
      });

      fragment.appendChild(shelf);
    });

    container.appendChild(fragment);
  }

  // --- Library & Sidebar Playlists Sync ---
  updateSidebarPlaylists() {
    const list = document.getElementById('sidebar-playlist-items');
    if (!list) return;
    list.innerHTML = '';

    const playlists = window.library.getPlaylists();
    playlists.forEach(pl => {
      const li = document.createElement('li');
      li.className = `playlist-item ${this.activePlaylistId === pl.id ? 'active' : ''}`;
      li.textContent = pl.name;
      li.addEventListener('click', () => {
        this.openPlaylistDetail(pl.id);
      });
      list.appendChild(li);
    });
  }

  updateLibraryView() {
    // Liked songs count
    const likedCount = document.getElementById('library-liked-count');
    const likedSongs = window.library.getLikedSongs();
    if (likedCount) likedCount.textContent = `${likedSongs.length} lagu`;

    // Dynamic playlists grid
    const grid = document.getElementById('library-playlists-grid');
    if (grid) {
      grid.innerHTML = '';
      const playlists = window.library.getPlaylists();
      playlists.forEach(pl => {
        const card = document.createElement('div');
        card.className = 'music-card';
        card.innerHTML = `
          <div class="card-thumb-wrap" style="background:#282828; display:flex; align-items:center; justify-content:center;">
            <svg viewBox="0 0 24 24" style="width:48px;height:48px;fill:#b3b3b3;"><path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/></svg>
            <button class="card-play-btn" title="Putar">
              <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            </button>
          </div>
          <div class="card-title">${pl.name}</div>
          <div class="card-artist">${pl.songs.length} lagu</div>
        `;

        card.addEventListener('click', () => {
          this.openPlaylistDetail(pl.id);
        });

        grid.appendChild(card);
      });
    }

    // History tracklist
    const historyList = document.getElementById('history-tracklist');
    if (historyList) {
      const history = window.library.getHistory();
      if (history.length === 0) {
        historyList.innerHTML = `<p class="empty-text">Belum ada riwayat lagu yang diputar.</p>`;
      } else {
        historyList.innerHTML = '';
        this.renderTrackRows(historyList, history.slice(0, 15), history);
      }
    }
  }

  updateQueueUI() {
    const nowPlayingEl = document.getElementById('queue-now-playing-item');
    const upcomingList = document.getElementById('queue-upcoming-list');
    if (!window.player) return;

    const cur = window.player.currentSong;
    if (nowPlayingEl) {
      nowPlayingEl.innerHTML = cur ? `
        <div class="queue-item">
          <img class="queue-thumb" src="${cur.thumbnail || 'icons/cover-placeholder.svg?v=4.3.0'}" alt="Cover" onerror="this.src='icons/cover-placeholder.svg?v=4.3.0'">
          <div class="queue-item-info">
            <div class="queue-item-title">${cur.title}</div>
            <div class="queue-item-artist">${cur.artist}</div>
          </div>
        </div>
      ` : '<p class="empty-text">Tidak ada lagu yang sedang diputar.</p>';
    }

    if (upcomingList) {
      upcomingList.innerHTML = '';
      const queue = window.player.queue;
      const curIndex = window.player.queueIndex;
      const upcoming = queue.slice(curIndex + 1);

      if (upcoming.length === 0) {
        upcomingList.innerHTML = '<p class="empty-text">Antrean selesai atau kosong.</p>';
        return;
      }

      upcoming.forEach((song, idx) => {
        const item = document.createElement('div');
        item.className = 'queue-item';
        item.innerHTML = `
          <img class="queue-thumb" src="${song.thumbnail || 'icons/cover-placeholder.svg?v=4.3.0'}" alt="Cover" onerror="this.src='icons/cover-placeholder.svg?v=4.3.0'">
          <div class="queue-item-info">
            <div class="queue-item-title">${song.title}</div>
            <div class="queue-item-artist">${song.artist}</div>
          </div>
        `;
        item.addEventListener('click', () => {
          window.player.playSong(song, queue);
        });
        upcomingList.appendChild(item);
      });
    }
  }

  // --- Modals Management ---
  initModals() {
    // Mobile QR Modal
    const btnMobileConnect = document.getElementById('btn-mobile-connect');
    const btnTopbarQR = document.getElementById('btn-topbar-qr');
    const closeQRModal = document.getElementById('btn-close-qr-modal');

    const openQR = async () => {
      this.openModal('modal-qr');
      try {
        const res = await fetch(`${window.API_BASE}/api/network-info`);
        const data = await res.json();
        const img = document.getElementById('qr-code-img');
        const urlText = document.getElementById('qr-mobile-url');
        if (img) img.src = data.qrCodeDataUrl;
        if (urlText) urlText.textContent = data.mobileUrl;

        const copyBtn = document.getElementById('btn-copy-mobile-url');
        if (copyBtn) {
          copyBtn.onclick = () => {
            navigator.clipboard.writeText(data.mobileUrl);
            this.showToast('Alamat URL disalin ke clipboard!', 'success');
          };
        }
      } catch (e) {
        console.warn('Network info error:', e);
      }
    };

    if (btnMobileConnect) btnMobileConnect.addEventListener('click', openQR);
    if (btnTopbarQR) btnTopbarQR.addEventListener('click', openQR);
    if (closeQRModal) closeQRModal.addEventListener('click', () => this.closeModal('modal-qr'));

    // Visualizer Toggle
    const btnVisualizer = document.getElementById('btn-topbar-visualizer');
    const btnCloseVis = document.getElementById('btn-close-visualizer');
    if (btnVisualizer) {
      btnVisualizer.addEventListener('click', () => {
        if (window.player) {
          if (window.player.visualizerActive) {
            window.player.stopVisualizer();
          } else {
            window.player.startVisualizer();
          }
        }
      });
    }
    if (btnCloseVis) {
      btnCloseVis.addEventListener('click', () => {
        if (window.player) window.player.stopVisualizer();
      });
    }

    // Create Playlist Modal
    const btnCreatePlaylist = document.getElementById('btn-create-playlist');
    const btnLibNewPl = document.getElementById('btn-library-new-playlist');
    const closePlModal = document.getElementById('btn-close-playlist-modal');
    const cancelPlModal = document.getElementById('btn-cancel-create-playlist');
    const confirmPlModal = document.getElementById('btn-confirm-create-playlist');
    const inputPlName = document.getElementById('input-new-playlist-name');

    const openCreatePl = () => {
      if (inputPlName) inputPlName.value = '';
      this.openModal('modal-create-playlist');
      if (inputPlName) inputPlName.focus();
    };

    if (btnCreatePlaylist) btnCreatePlaylist.addEventListener('click', openCreatePl);
    if (btnLibNewPl) btnLibNewPl.addEventListener('click', openCreatePl);
    if (closePlModal) closePlModal.addEventListener('click', () => this.closeModal('modal-create-playlist'));
    if (cancelPlModal) cancelPlModal.addEventListener('click', () => this.closeModal('modal-create-playlist'));

    if (confirmPlModal) {
      confirmPlModal.addEventListener('click', () => {
        const name = inputPlName?.value.trim();
        if (name) {
          window.library.createPlaylist(name);
          this.updateSidebarPlaylists();
          this.updateLibraryView();
          this.closeModal('modal-create-playlist');
          this.showToast(`Playlist "${name}" berhasil dibuat!`, 'success');
        }
      });
    }

    // Add To Playlist Modal close
    const closeAddModal = document.getElementById('btn-close-add-modal');
    if (closeAddModal) {
      closeAddModal.addEventListener('click', () => this.closeModal('modal-add-to-playlist'));
    }

    // Equalizer Modal
    const btnOpenEQ = document.getElementById('btn-equalizer-modal');
    const closeEQ = document.getElementById('btn-close-eq-modal');
    if (btnOpenEQ) {
      btnOpenEQ.addEventListener('click', () => {
        this.openModal('modal-equalizer');
      });
    }
    if (closeEQ) {
      closeEQ.addEventListener('click', () => this.closeModal('modal-equalizer'));
    }

    document.querySelectorAll('.eq-preset-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        document.querySelectorAll('.eq-preset-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        const preset = e.currentTarget.dataset.preset;
        if (window.player) {
          window.player.setEqualizerPreset(preset);
          this.showToast(`Preset Equalizer: ${preset.toUpperCase()}`);
        }
      });
    });

    // Sleep Timer Modal
    const btnOpenSleep = document.getElementById('btn-sleep-timer-modal');
    const closeSleep = document.getElementById('btn-close-sleep-modal');
    if (btnOpenSleep) {
      btnOpenSleep.addEventListener('click', () => {
        this.openModal('modal-sleep-timer');
      });
    }
    if (closeSleep) {
      closeSleep.addEventListener('click', () => this.closeModal('modal-sleep-timer'));
    }

    document.querySelectorAll('.sleep-opt-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const min = e.currentTarget.dataset.minutes;
        if (window.player) {
          if (min === 'end-of-track') {
            window.player.repeatMode = 'off';
            this.showToast('Musik akan berhenti setelah lagu ini selesai.');
            const dot = document.getElementById('sleep-active-dot');
            if (dot) dot.style.display = 'block';
          } else {
            window.player.setSleepTimer(parseInt(min, 10));
          }
        }
        this.closeModal('modal-sleep-timer');
      });
    });

    // Library Export / Import
    const btnExport = document.getElementById('btn-export-library');
    const btnImport = document.getElementById('btn-import-library');
    const fileInput = document.getElementById('file-import-input');

    if (btnExport) {
      btnExport.addEventListener('click', () => {
        window.library.exportLibrary();
        this.showToast('Cadangan playlist berhasil diekspor!', 'success');
      });
    }

    if (btnImport && fileInput) {
      btnImport.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
          const success = window.library.importLibrary(evt.target.result);
          if (success) {
            this.updateSidebarPlaylists();
            this.updateLibraryView();
            this.showToast('Data koleksi musik berhasil diimpor!', 'success');
          } else {
            this.showToast('Gagal mengimpor file. Format tidak valid.', 'error');
          }
        };
        reader.readAsText(file);
      });
    }
  }

  openAddToPlaylistModal(song, currentPlaylistId = null) {
    const modal = document.getElementById('modal-add-to-playlist');
    const container = document.getElementById('modal-playlist-options');
    if (!modal || !container) return;

    container.innerHTML = '';
    const playlists = window.library.getPlaylists();

    if (currentPlaylistId) {
      const delItem = document.createElement('div');
      delItem.className = 'modal-playlist-item-btn';
      delItem.style.color = '#e91429';
      delItem.textContent = 'Hapus dari Playlist Ini';
      delItem.addEventListener('click', () => {
        window.library.removeSongFromPlaylist(currentPlaylistId, song.id);
        this.closeModal('modal-add-to-playlist');
        this.openPlaylistDetail(currentPlaylistId);
        this.showToast('Lagu dihapus dari playlist.');
      });
      container.appendChild(delItem);
    }

    if (playlists.length === 0) {
      container.innerHTML += '<p class="empty-text">Belum ada playlist kustom. Buat playlist baru terlebih dahulu!</p>';
    } else {
      playlists.forEach(pl => {
        const item = document.createElement('div');
        item.className = 'modal-playlist-item-btn';
        item.textContent = `${pl.name} (${pl.songs.length} lagu)`;
        item.addEventListener('click', () => {
          const added = window.library.addSongToPlaylist(pl.id, song);
          this.closeModal('modal-add-to-playlist');
          if (added) {
            this.showToast(`Ditambahkan ke playlist "${pl.name}"`, 'success');
          } else {
            this.showToast(`Lagu sudah ada di "${pl.name}"`);
          }
        });
        container.appendChild(item);
      });
    }

    this.openModal('modal-add-to-playlist');
  }

  openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('open');
  }

  closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('open');
  }

  // --- Toast Notification ---
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type === 'success' ? 'toast-success' : type === 'error' ? 'toast-error' : ''}`;
    toast.textContent = message;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(8px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }
}

window.ui = new UIManager();
