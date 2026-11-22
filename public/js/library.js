/**
 * AURA - Library & LocalStorage Management
 * Handles Liked Songs, Custom Playlists, History, and Backup/Restore
 */

class MusicLibrary {
  constructor() {
    this.STORAGE_KEYS = {
      LIKED: 'aura_liked_songs',
      PLAYLISTS: 'aura_custom_playlists',
      HISTORY: 'aura_play_history',
      SETTINGS: 'aura_user_settings'
    };

    // Migrate old keys if available
    this.migrateOldKeys();

    this.likedSongs = this.load(this.STORAGE_KEYS.LIKED, []);
    this.playlists = this.load(this.STORAGE_KEYS.PLAYLISTS, []);
    this.history = this.load(this.STORAGE_KEYS.HISTORY, []);
    this.settings = this.load(this.STORAGE_KEYS.SETTINGS, {
      engine: 'ytmusic',
      volume: 0.8,
      repeat: 'off',
      shuffle: false,
      eqPreset: 'flat'
    });
  }

  migrateOldKeys() {
    try {
      const oldKeys = [
        ['spotifree_liked_songs', this.STORAGE_KEYS.LIKED],
        ['spotifree_custom_playlists', this.STORAGE_KEYS.PLAYLISTS],
        ['spotifree_play_history', this.STORAGE_KEYS.HISTORY],
        ['spotifree_user_settings', this.STORAGE_KEYS.SETTINGS],
        ['sonora_liked_songs', this.STORAGE_KEYS.LIKED],
        ['sonora_custom_playlists', this.STORAGE_KEYS.PLAYLISTS],
        ['sonora_play_history', this.STORAGE_KEYS.HISTORY],
        ['sonora_user_settings', this.STORAGE_KEYS.SETTINGS]
      ];
      for (const [oldKey, newKey] of oldKeys) {
        const val = localStorage.getItem(oldKey);
        if (val && !localStorage.getItem(newKey)) {
          localStorage.setItem(newKey, val);
        }
      }
    } catch (e) {
      // Ignore migration errors
    }
  }

  load(key, fallback) {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : fallback;
    } catch (e) {
      console.warn('LocalStorage load error:', e);
      return fallback;
    }
  }

  save(key, val) {
    try {
      localStorage.setItem(key, JSON.stringify(val));
    } catch (e) {
      console.warn('LocalStorage save error:', e);
    }
  }

  // --- Liked Songs ---
  isLiked(songId) {
    return this.likedSongs.some(s => s.id === songId);
  }

  toggleLike(song) {
    if (!song || !song.id) return false;
    const index = this.likedSongs.findIndex(s => s.id === song.id);
    let liked = false;
    if (index >= 0) {
      this.likedSongs.splice(index, 1);
      liked = false;
    } else {
      this.likedSongs.unshift({
        id: song.id,
        title: song.title,
        artist: song.artist,
        duration: song.duration,
        durationSec: song.durationSec || 0,
        thumbnail: song.thumbnail,
        engine: song.engine || 'ytmusic',
        likedAt: Date.now()
      });
      liked = true;
    }
    this.save(this.STORAGE_KEYS.LIKED, this.likedSongs);
    return liked;
  }

  getLikedSongs() {
    return this.likedSongs;
  }

  // --- Playlists ---
  getPlaylists() {
    return this.playlists;
  }

  getPlaylist(id) {
    return this.playlists.find(p => p.id === id);
  }

  createPlaylist(name) {
    const trimmed = (name || '').trim();
    if (!trimmed) return null;
    const newPlaylist = {
      id: 'pl_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: trimmed,
      createdAt: Date.now(),
      songs: []
    };
    this.playlists.push(newPlaylist);
    this.save(this.STORAGE_KEYS.PLAYLISTS, this.playlists);
    return newPlaylist;
  }

  deletePlaylist(id) {
    this.playlists = this.playlists.filter(p => p.id !== id);
    this.save(this.STORAGE_KEYS.PLAYLISTS, this.playlists);
  }

  addSongToPlaylist(playlistId, song) {
    const pl = this.getPlaylist(playlistId);
    if (!pl) return false;
    if (pl.songs.some(s => s.id === song.id)) {
      return false; // already in playlist
    }
    pl.songs.push({
      id: song.id,
      title: song.title,
      artist: song.artist,
      duration: song.duration,
      durationSec: song.durationSec || 0,
      thumbnail: song.thumbnail,
      engine: song.engine || 'ytmusic'
    });
    this.save(this.STORAGE_KEYS.PLAYLISTS, this.playlists);
    return true;
  }

  removeSongFromPlaylist(playlistId, songId) {
    const pl = this.getPlaylist(playlistId);
    if (!pl) return;
    pl.songs = pl.songs.filter(s => s.id !== songId);
    this.save(this.STORAGE_KEYS.PLAYLISTS, this.playlists);
  }

  // --- History ---
  addToHistory(song) {
    if (!song || !song.id) return;
    this.history = this.history.filter(s => s.id !== song.id);
    this.history.unshift({
      id: song.id,
      title: song.title,
      artist: song.artist,
      duration: song.duration,
      durationSec: song.durationSec || 0,
      thumbnail: song.thumbnail,
      engine: song.engine || 'ytmusic',
      playedAt: Date.now()
    });
    if (this.history.length > 50) this.history.pop();
    this.save(this.STORAGE_KEYS.HISTORY, this.history);
  }

  getHistory() {
    return this.history;
  }

  // --- Settings ---
  getSettings() {
    return this.settings;
  }

  updateSettings(partial) {
    this.settings = { ...this.settings, ...partial };
    this.save(this.STORAGE_KEYS.SETTINGS, this.settings);
  }

  // --- Import / Export Backup ---
  exportLibrary() {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      likedSongs: this.likedSongs,
      playlists: this.playlists
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aura_backup_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  importLibrary(jsonData) {
    try {
      const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;
      if (Array.isArray(data.likedSongs)) {
        this.likedSongs = data.likedSongs;
        this.save(this.STORAGE_KEYS.LIKED, this.likedSongs);
      }
      if (Array.isArray(data.playlists)) {
        this.playlists = data.playlists;
        this.save(this.STORAGE_KEYS.PLAYLISTS, this.playlists);
      }
      return true;
    } catch (e) {
      console.error('Import library failed:', e);
      return false;
    }
  }
}

window.library = new MusicLibrary();
