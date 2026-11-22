/**
 * AURA - Progressive Web App (PWA) & Mobile Installer Engine
 * Handles beforeinstallprompt, iOS Add-to-Home-Screen guide, Standalone detection,
 * Screen WakeLock, and continuous background audio state synchronization.
 */

class PWAInstaller {
  constructor() {
    this.deferredPrompt = null;
    this.isIOS = /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
    this.isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    this.wakeLock = null;

    this.cacheDOMElements();
    this.initEventListeners();
    this.registerServiceWorker();
    this.checkStandaloneState();
  }

  cacheDOMElements() {
    this.topbarInstallBtn = document.getElementById('btn-topbar-install');
    this.mobileBanner = document.getElementById('mobile-pwa-banner');
    this.bannerInstallBtn = document.getElementById('btn-banner-install');
    this.bannerDismissBtn = document.getElementById('btn-banner-dismiss');
    this.iosModal = document.getElementById('ios-install-modal');
    this.iosModalClose = document.getElementById('btn-close-ios-modal');
    this.iosDoneBtn = document.getElementById('btn-ios-done');
  }

  registerServiceWorker() {
    if ('serviceWorker' in navigator && (window.location.protocol === 'http:' || window.location.protocol === 'https:')) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js?v=4.6.0')
          .then(reg => {
            console.log('[PWA] Service Worker registered with scope:', reg.scope);
          })
          .catch(err => {
            console.warn('[PWA] SW registration failed:', err);
          });
      });
    }
  }

  initEventListeners() {
    // 1. Android & Chromium beforeinstallprompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      window.deferredPWAInstallPrompt = e;
      console.log('[PWA] beforeinstallprompt event captured');

      // Show topbar button
      if (this.topbarInstallBtn) {
        this.topbarInstallBtn.style.display = 'inline-flex';
      }

      // Show mobile floating banner if not previously dismissed in this session
      const dismissed = sessionStorage.getItem('aura_pwa_dismissed');
      if (this.mobileBanner && !dismissed && !this.isStandalone) {
        this.mobileBanner.style.display = 'flex';
      }
    });

    // 2. Trigger install from topbar or banner
    const handleInstallTrigger = () => this.triggerInstallFlow();

    this.topbarInstallBtn?.addEventListener('click', handleInstallTrigger);
    this.bannerInstallBtn?.addEventListener('click', handleInstallTrigger);

    // 3. Dismiss mobile banner
    this.bannerDismissBtn?.addEventListener('click', () => {
      if (this.mobileBanner) {
        this.mobileBanner.style.display = 'none';
      }
      sessionStorage.setItem('aura_pwa_dismissed', 'true');
    });

    // 4. iOS Modal Controls
    const closeIOSModal = () => {
      if (this.iosModal) this.iosModal.style.display = 'none';
    };
    this.iosModalClose?.addEventListener('click', closeIOSModal);
    this.iosDoneBtn?.addEventListener('click', closeIOSModal);
    this.iosModal?.addEventListener('click', (e) => {
      if (e.target === this.iosModal) closeIOSModal();
    });

    // 5. Successful install event
    window.addEventListener('appinstalled', () => {
      console.log('[PWA] Aura App successfully installed!');
      this.deferredPrompt = null;
      window.deferredPWAInstallPrompt = null;
      if (this.mobileBanner) this.mobileBanner.style.display = 'none';
      if (this.topbarInstallBtn) {
        this.topbarInstallBtn.innerHTML = `
          <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          <span class="btn-install-text">Aura Terpasang</span>
        `;
        this.topbarInstallBtn.classList.add('installed');
      }
      if (window.ui) {
        window.ui.showToast('Aura berhasil dipasang di layar utama perangkat Anda!', 'info');
      }
    });

    // 6. Network Online / Offline notifications
    window.addEventListener('online', () => {
      if (window.ui) window.ui.showToast('Koneksi internet terhubung kembali.', 'info');
    });
    window.addEventListener('offline', () => {
      if (window.ui) window.ui.showToast('Koneksi terputus. Mode offline aktif.', 'error');
    });

    // 7. Visibility Change: Keep audio and WakeLock active
    document.addEventListener('visibilitychange', () => {
      const p = window.player;
      if (!p) return;

      if (!document.hidden && p.isPlaying) {
        // Resume AudioContext if suspended
        if (p.audioCtx && p.audioCtx.state === 'suspended') {
          p.audioCtx.resume();
        }
        this.requestWakeLock();
      }
    });
  }

  async triggerInstallFlow() {
    if (this.deferredPrompt) {
      // Android / Chromium native install prompt
      this.deferredPrompt.prompt();
      const choice = await this.deferredPrompt.userChoice;
      console.log('[PWA] User choice:', choice.outcome);
      if (choice.outcome === 'accepted') {
        if (window.ui) window.ui.showToast('Memasang Aura di perangkat Anda...', 'info');
        if (this.mobileBanner) this.mobileBanner.style.display = 'none';
      }
      this.deferredPrompt = null;
      window.deferredPWAInstallPrompt = null;
    } else if (this.isIOS) {
      // iOS Safari Add to Home Screen guide
      if (this.iosModal) {
        this.iosModal.style.display = 'flex';
      }
    } else {
      // Already installed or Desktop non-prompting browser
      if (this.isStandalone) {
        if (window.ui) window.ui.showToast('Aura sudah berjalan dalam mode aplikasi penuh.', 'info');
      } else {
        // Fallback: Guide user to browser menu
        if (window.ui) {
          window.ui.showToast('Buka menu browser (Titik 3) lalu pilih "Pasang Aplikasi" / "Tambahkan ke Layar Utama".', 'info');
        }
      }
    }
  }

  checkStandaloneState() {
    if (this.isStandalone) {
      document.body.classList.add('pwa-standalone');
      if (this.topbarInstallBtn) {
        this.topbarInstallBtn.style.display = 'none';
      }
      if (this.mobileBanner) {
        this.mobileBanner.style.display = 'none';
      }
    } else if (this.isIOS) {
      // On iOS Safari, display the install button so user can open instructions anytime
      if (this.topbarInstallBtn) {
        this.topbarInstallBtn.style.display = 'inline-flex';
      }
      const dismissed = sessionStorage.getItem('aura_pwa_dismissed');
      if (this.mobileBanner && !dismissed) {
        this.mobileBanner.style.display = 'flex';
      }
    }
  }

  // --- Screen Wake Lock Management ---
  async requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        if (!this.wakeLock) {
          this.wakeLock = await navigator.wakeLock.request('screen');
          this.wakeLock.addEventListener('release', () => {
            this.wakeLock = null;
          });
        }
      } catch (err) {
        // WakeLock request can fail if battery saver is aggressive
      }
    }
  }

  releaseWakeLock() {
    if (this.wakeLock) {
      try {
        this.wakeLock.release();
        this.wakeLock = null;
      } catch (e) {}
    }
  }
}

// Instantiate PWA Engine
window.pwaInstaller = new PWAInstaller();
