---
title: Aura Music Player
emoji: 🎵
colorFrom: gray
colorTo: black
sdk: docker
app_port: 7860
pinned: false
---

# 🎵 Aura Music Player — Ad-Free High Fidelity Music for Mobile & PC

Aplikasi pemutar musik modern bergaya **Spotify**, **100% bebas iklan**, super ringan, dan tidak membuat HP atau PC lag. Mendukung **Dual Search Engine**: **YouTube Music** (lagu & album resmi) serta **YouTube Standard** (video, cover, live, & remix).

---

## ✨ Fitur Unggulan

1. **Bebas Iklan Total (Zero Ads)**:
   - Audio di-stream langsung dengan protokol *HTTP 206 Partial Content* (tanpa iklan video, tanpa jeda audio sponsor).
2. **Support Penuh HP & PC (Responsive & PWA)**:
   - **PC / Laptop**: Tampilan lengkap dengan sidebar navigasi, bar pemutar bawah, lirik karaoke, dan daftar antrean lagu.
   - **HP (Android & iPhone)**: Desain responsif dengan mini-player bawah yang bisa di-tap menjadi tampilan *Now Playing Fullscreen* elegan dengan ambient backlight glow.
   - **Install sebagai Aplikasi Native (PWA)**: Di browser HP (Chrome/Safari), tap *"Tambahkan ke Layar Utama"* (Add to Home Screen) agar menjadi aplikasi mandiri full screen tanpa bar browser.
3. **Dual Search Engine**:
   - **YouTube Music**: Fokus pada rilisan resmi studio, album musisi, dan audio jernih.
   - **YouTube Standard**: Akses jutaan lagu cover, live concert, unreleased music, remix DJ, dan podcast.
4. **Performa Ultra Smooth & Zero Lag**:
   - Dibuat dengan arsitektur **Vanilla JS & GPU-accelerated CSS** (ukuran paket di bawah 100KB, bukan ribuan MB framework berat).
   - Rendering virtual DOM yang hemat memori RAM, tidak membebani prosesor HP/PC.
   - Streaming hemat kuota internet (hanya mengunduh audio bitrate tinggi, bukan video resolusi tinggi).
5. **Lirik Karaoke Real-Time (Synced Lyrics)**:
   - Terintegrasi dengan database *LRCLIB* jutaan lagu.
   - Lirik bergerak otomatis secara sinkron dengan alur musik.
   - Tap baris lirik mana pun untuk langsung melompat (*seek*) ke bagian lagu tersebut!
6. **Audio Spectrum Visualizer (60 FPS)**:
   - Visualisasi grafis gelombang suara interaktif.
   - Otomatis berhenti saat tab diminimalkan agar 0% konsumsi baterai di latar belakang.
7. **Pengatur Waktu Tidur (Sleep Timer)**:
   - Pilihan 15m, 30m, 45m, 1 jam, atau akhir lagu dengan efek *fade-out* volume lembut.
8. **Equalizer Audio (6 Presets)**:
   - *Bass Boost*, *Vocal Clarity*, *Rock Punch*, *Electronic EDM*, *Acoustic Warm*, dan *Flat*.
9. **Koneksi Mudah ke HP via QR Code**:
   - Klik tombol **"Buka di HP (QR Code)"** di pojok atas / sidebar PC, scan dengan kamera HP, dan aplikasi langsung terbuka di HP tanpa mengetik alamat IP manual.
10. **Manajemen Koleksi Lagu**:
    - Tombol Like (Lagu yang Disukai).
    - Buat playlist kustom tanpa batas.
    - Ekspor & Impor file cadangan playlist (format JSON) antar perangkat.
11. **Dukungan MediaSession (Lockscreen HP & Tombol Headset)**:
    - Judul lagu, musisi, dan cover album tampil di layar kunci HP dan panel volume Windows.
    - Kontrol Play, Pause, Next, Prev langsung dari tombol earphone/headset Bluetooth.

---

## 🚀 Cara Menjalankan Aplikasi

### Cara 1: Menggunakan File Batch (1-Klik di Windows)
Cukup klik ganda file **`start.bat`** di dalam folder `C:\Users\arknm\.gemini\antigravity\scratch\spotifree`.
Browser Anda akan otomatis terbuka ke `http://localhost:3000`.

### Cara 2: Melalui Terminal / PowerShell
```powershell
cd C:\Users\arknm\.gemini\antigravity\scratch\spotifree
npm start
```

---

## 📱 Cara Membuka di HP (Smartphone)

1. Pastikan HP dan PC Anda terhubung ke jaringan Wi-Fi yang sama.
2. Buka aplikasi di PC (`http://localhost:3000`).
3. Klik tombol **"Buka di HP (QR Code)"** di PC.
4. Buka kamera di HP Anda dan arahkan ke layar PC untuk memindai QR code tersebut.
5. Tap link yang muncul (contoh: `http://192.168.1.61:3000`).
6. *(Opsional)* Di browser HP (Chrome atau Safari), tekan menu titik tiga / tombol bagikan lalu pilih **"Tambahkan ke Layar Utama" (Add to Home Screen)** agar menjadi aplikasi Spotify mandiri di HP Anda!

---

## ⌨️ Shortcut Keyboard (Khusus PC)
- **Spasi**: Putar / Jeda musik (Play/Pause)
- **Panah Kanan**: Lagu Berikutnya (Next)
- **Panah Kiri**: Lagu Sebelumnya (Prev)
- **Shift + Panah Kanan**: Maju cepat 5 detik
- **Shift + Panah Kiri**: Mundur cepat 5 detik
- **Panah Atas / Bawah**: Naikkan / Turunkan Volume
- **M**: Bisu / Aktifkan Suara (Mute/Unmute)
- **L**: Sukai lagu yang sedang diputar (Like)
