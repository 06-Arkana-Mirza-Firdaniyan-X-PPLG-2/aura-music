/**
 * AURA - Main Application Bootstrap
 * Event listeners, keyboard shortcuts, PWA registration, and initial trending feed
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log('Aura Music Initializing...');

  // 1. Service Worker & PWA Installer initialized via js/pwa.js

  // 2. Bind Core Player Buttons
  bindPlaybackButtons();

  // 3. Bind Keyboard Shortcuts (Desktop)
  bindKeyboardShortcuts();

  // 4. Initial Render of Sidebar Playlists
  if (window.ui) {
    window.ui.updateSidebarPlaylists();
  }

  // 5. Load Trending Music on Startup
  loadTrendingData();
});

function bindPlaybackButtons() {
  const p = window.player;
  if (!p) return;

  // Play / Pause toggles
  document.getElementById('btn-play-pause')?.addEventListener('click', () => p.togglePlayPause());
  document.getElementById('mini-play-pause')?.addEventListener('click', (e) => {
    e.stopPropagation();
    p.togglePlayPause();
  });
  document.getElementById('fs-play-pause')?.addEventListener('click', () => p.togglePlayPause());

  // Next buttons
  document.getElementById('btn-next')?.addEventListener('click', () => p.playNext());
  document.getElementById('mini-next')?.addEventListener('click', (e) => {
    e.stopPropagation();
    p.playNext();
  });
  document.getElementById('fs-next-btn')?.addEventListener('click', () => p.playNext());

  // Prev buttons
  document.getElementById('btn-prev')?.addEventListener('click', () => p.playPrev());
  document.getElementById('fs-prev-btn')?.addEventListener('click', () => p.playPrev());

  // Shuffle & Repeat
  document.getElementById('btn-shuffle')?.addEventListener('click', () => p.toggleShuffle());
  document.getElementById('fs-shuffle-btn')?.addEventListener('click', () => p.toggleShuffle());
  document.getElementById('btn-repeat')?.addEventListener('click', () => p.cycleRepeat());
  document.getElementById('fs-repeat-btn')?.addEventListener('click', () => p.cycleRepeat());

  // Like buttons
  const handleLikeCurrent = (e) => {
    if (e) e.stopPropagation();
    if (!p.currentSong) return;
    const liked = window.library.toggleLike(p.currentSong);
    p.updateLikeButton(document.getElementById('player-like-btn'), p.currentSong.id);
    p.updateLikeButton(document.getElementById('mini-like-btn'), p.currentSong.id);
    p.updateLikeButton(document.getElementById('fs-like-btn'), p.currentSong.id);
    if (window.ui) {
      window.ui.showToast(liked ? 'Ditambahkan ke Lagu yang Disukai' : 'Dihapus dari Lagu yang Disukai');
    }
  };

  document.getElementById('player-like-btn')?.addEventListener('click', handleLikeCurrent);
  document.getElementById('mini-like-btn')?.addEventListener('click', handleLikeCurrent);
  document.getElementById('fs-like-btn')?.addEventListener('click', handleLikeCurrent);

  // Mute & Volume Bar
  document.getElementById('btn-mute')?.addEventListener('click', () => p.toggleMute());

  const volContainer = document.getElementById('volume-bar-container');
  if (volContainer) {
    let isDraggingVol = false;
    const updateVol = (e) => {
      const rect = volContainer.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      p.setVolume(pos);
    };

    volContainer.addEventListener('mousedown', (e) => {
      isDraggingVol = true;
      updateVol(e);
    });
    window.addEventListener('mousemove', (e) => {
      if (isDraggingVol) updateVol(e);
    });
    window.addEventListener('mouseup', () => {
      isDraggingVol = false;
    });
  }
}

function bindKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    // Avoid triggering shortcuts while typing in search or modal inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const p = window.player;
    if (!p) return;

    switch (e.code) {
      case 'Space':
        e.preventDefault();
        p.togglePlayPause();
        break;
      case 'ArrowRight':
        if (e.shiftKey) {
          p.seek(p.audio.currentTime + 5);
        } else {
          p.playNext();
        }
        break;
      case 'ArrowLeft':
        if (e.shiftKey) {
          p.seek(p.audio.currentTime - 5);
        } else {
          p.playPrev();
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        p.setVolume(Math.min(1, p.volume + 0.05));
        break;
      case 'ArrowDown':
        e.preventDefault();
        p.setVolume(Math.max(0, p.volume - 0.05));
        break;
      case 'KeyM':
        p.toggleMute();
        break;
      case 'KeyL':
        document.getElementById('player-like-btn')?.click();
        break;
    }
  });
}

async function loadTrendingData() {
  try {
    const res = await fetch(`${window.API_BASE || ''}/api/trending`);
    const data = await res.json();
    if (window.ui) {
      window.ui.renderHomeShelves(data);
    }
  } catch (err) {
    console.warn('Failed to load initial trending:', err);
    const container = document.getElementById('home-shelves-container');
    if (container) {
      container.innerHTML = '<p class="empty-text">Gagal memuat rekomendasi musik. Periksa koneksi internet Anda.</p>';
    }
  }
}
