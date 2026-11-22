import express from 'express';
import cors from 'cors';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import ytSearch from 'yt-search';
import { Ytdl } from '@distube/ytdl-core';
import QRCode from 'qrcode';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const ytdlClient = new Ytdl();

// In-memory caches for maximum speed and 0 lag
const streamUrlCache = new Map(); // id -> { url, mimeType, contentLength, expiresAt }
const searchCache = new Map();    // queryKey -> { data, expiresAt }
const lyricsCache = new Map();    // trackKey -> { syncedLyrics, plainLyrics }
const trendingCache = { data: null, expiresAt: 0 };

app.use(cors());
app.use(express.json());
// Disable caching in development so browser always gets the newest CSS/JS immediately
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: 0,
  etag: false,
  lastModified: false,
  setHeaders: (res, filePath) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
}));
app.use('/public', express.static(path.join(__dirname, 'public')));

// Helper: Get local network IP
function getLocalNetworkIp() {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
}

// ----------------------------------------------------
// 1. STREAM ENDPOINT (Zero Ads, Range Request Support)
// ----------------------------------------------------
app.get('/api/stream', async (req, res) => {
  const videoId = req.query.id;
  if (!videoId || typeof videoId !== 'string' || videoId.length < 5) {
    return res.status(400).json({ error: 'Missing or invalid video ID' });
  }

  try {
    let cached = streamUrlCache.get(videoId);
    const now = Date.now();

    if (!cached || cached.expiresAt < now) {
      const info = await ytdlClient.getInfo(videoId);
      
      // Prefer standard m4a (AAC 128kbps) for universal mobile & desktop support
      let format = info.formats.find(f => f.itag === 140 && f.url);
      
      // Fallback to best available audio-only stream (e.g. webm opus 160/130kbps)
      if (!format) {
        const audioOnly = info.formats.filter(f => f.hasAudio && !f.hasVideo && f.url);
        audioOnly.sort((a, b) => (b.audioBitrate || 0) - (a.audioBitrate || 0));
        format = audioOnly[0];
      }

      // Final fallback to any format with audio
      if (!format) {
        format = info.formats.find(f => f.hasAudio && f.url);
      }

      if (!format || !format.url) {
        return res.status(404).json({ error: 'Audio stream format not available' });
      }

      cached = {
        url: format.url,
        mimeType: format.mimeType?.split(';')[0] || 'audio/mp4',
        contentLength: format.contentLength,
        expiresAt: now + (3 * 60 * 60 * 1000) // 3 hours cache
      };
      streamUrlCache.set(videoId, cached);
    }

    const rangeHeader = req.headers.range;
    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    };
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    const streamResponse = await fetch(cached.url, {
      headers: fetchHeaders
    });

    if (!streamResponse.ok && streamResponse.status !== 206) {
      // If cached URL expired on Google's CDN, clear cache and retry once
      streamUrlCache.delete(videoId);
      return res.status(502).json({ error: 'Upstream stream request failed. Please retry.' });
    }

    const responseHeaders = {
      'Content-Type': cached.mimeType,
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600'
    };

    if (streamResponse.headers.has('content-range')) {
      responseHeaders['Content-Range'] = streamResponse.headers.get('content-range');
    }
    if (streamResponse.headers.has('content-length')) {
      responseHeaders['Content-Length'] = streamResponse.headers.get('content-length');
    }

    res.writeHead(streamResponse.status, responseHeaders);

    // Stream body chunks smoothly to client with backpressure
    const reader = streamResponse.body.getReader();
    req.on('close', () => {
      reader.cancel().catch(() => {});
    });

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!res.write(value)) {
        await new Promise(resolve => res.once('drain', resolve));
      }
    }
    res.end();
  } catch (err) {
    console.error(`Stream error for [${videoId}]:`, err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to process audio stream', details: err.message });
    }
  }
});

// ----------------------------------------------------
// 2. SEARCH ENDPOINT (YouTube Music & Standard YouTube)
// ----------------------------------------------------
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  const engine = req.query.engine || 'ytmusic'; // 'ytmusic' or 'youtube'

  if (!query || typeof query !== 'string' || !query.trim()) {
    return res.json({ songs: [] });
  }

  const cacheKey = `${engine}:${query.trim().toLowerCase()}`;
  const now = Date.now();
  if (searchCache.has(cacheKey)) {
    const cached = searchCache.get(cacheKey);
    if (cached.expiresAt > now) {
      return res.json({ songs: cached.data });
    }
  }

  try {
    let songs = [];

    if (engine === 'ytmusic') {
      songs = await searchYouTubeMusic(query.trim());
      // If YouTube Music returned fewer than 5 songs, supplement with yt-search audio
      if (songs.length < 5) {
        const fallback = await searchYouTubeStandard(query.trim() + ' audio', 15);
        const existingIds = new Set(songs.map(s => s.id));
        for (const f of fallback) {
          if (!existingIds.has(f.id)) {
            songs.push(f);
            existingIds.add(f.id);
          }
        }
      }
    } else {
      songs = await searchYouTubeStandard(query.trim(), 25);
    }

    if (songs && songs.length > 0) {
      searchCache.set(cacheKey, {
        data: songs,
        expiresAt: now + (30 * 60 * 1000) // 30 min cache
      });
    }

    res.json({ songs });
  } catch (err) {
    console.error('Search error:', err.message);
    res.status(500).json({ error: 'Failed to search', details: err.message });
  }
});

// YouTube Music Search Parser
async function searchYouTubeMusic(query) {
  try {
    const res = await fetch('https://music.youtube.com/youtubei/v1/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'X-YouTube-Client-Name': '67',
        'X-YouTube-Client-Version': '1.20240101.01.00',
        'Origin': 'https://music.youtube.com'
      },
      body: JSON.stringify({
        context: { client: { clientName: 'WEB_REMIX', clientVersion: '1.20240101.01.00', hl: 'en', gl: 'US' } },
        query: query
      })
    });

    if (!res.ok) return [];
    const data = await res.json();
    const sections = data?.contents?.tabbedSearchResultsRenderer?.tabs?.[0]?.tabRenderer?.content?.sectionListRenderer?.contents || [];
    const songs = [];
    const seen = new Set();

    for (const section of sections) {
      const cardShelf = section.musicCardShelfRenderer;
      const shelf = cardShelf || section.musicShelfRenderer || section.itemSectionRenderer;
      if (!shelf || !shelf.contents) continue;

      const shelfArtist = cardShelf?.title?.runs?.[0]?.text;

      for (const item of shelf.contents) {
        const r = item.musicResponsiveListItemRenderer;
        if (!r) continue;

        const col0 = r.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs?.[0];
        const title = col0?.text;
        const videoId = r.playlistItemData?.videoId || col0?.navigationEndpoint?.watchEndpoint?.videoId;

        if (!videoId || !title || seen.has(videoId)) continue;
        seen.add(videoId);

        const col1Runs = r.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text?.runs || [];
        const typeKeywords = ['song', 'video', 'album', 'single', 'ep', 'artist', 'track'];
        
        const validRuns = col1Runs
          .map(x => x.text?.trim())
          .filter(t => t && t !== '•' && !/^\d{1,2}:\d{2}(:\d{2})?$/.test(t) && !typeKeywords.includes(t.toLowerCase()));

        const artist = validRuns[0] || shelfArtist || 'Unknown Artist';

        // Extract duration
        const allRuns = (r.flexColumns || []).flatMap(c => c.musicResponsiveListItemFlexColumnRenderer?.text?.runs || []);
        const durRun = allRuns.find(x => /^\d{1,2}:\d{2}(:\d{2})?$/.test(x.text?.trim()));
        const duration = durRun?.text?.trim() || '';

        // High quality thumbnail URL
        const thumbUrls = r.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails || [];
        const bestThumb = thumbUrls.length > 0 
          ? thumbUrls[thumbUrls.length - 1].url 
          : `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

        songs.push({
          id: videoId,
          title: cleanTitle(title),
          artist: artist,
          duration: duration.includes(':') ? duration : '',
          durationSec: parseDuration(duration),
          thumbnail: bestThumb,
          engine: 'ytmusic'
        });
      }
    }
    return songs;
  } catch (err) {
    console.error('YTMusic error:', err.message);
    return [];
  }
}

// Regular YouTube Search Parser
async function searchYouTubeStandard(query, limit = 25) {
  try {
    const res = await ytSearch(query);
    const videos = res.videos || [];
    return videos.slice(0, limit).map(v => ({
      id: v.videoId,
      title: cleanTitle(v.title),
      artist: v.author?.name || 'YouTube',
      duration: v.duration?.timestamp || '',
      durationSec: v.duration?.seconds || 0,
      thumbnail: v.thumbnail || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
      views: v.views ? formatViews(v.views) : '',
      engine: 'youtube'
    }));
  } catch (err) {
    console.error('yt-search error:', err.message);
    return [];
  }
}

// ----------------------------------------------------
// 3. TRENDING / DISCOVERY ENDPOINT
// ----------------------------------------------------
app.get('/api/trending', async (req, res) => {
  const now = Date.now();
  if (trendingCache.data && trendingCache.expiresAt > now) {
    return res.json(trendingCache.data);
  }

  try {
    // Fetch Indonesian Pop Hits & Global Top Hits
    const [indoHits, globalHits, lofiHits] = await Promise.all([
      searchYouTubeStandard('top lagu indonesia hits populer 2024 2025 official audio', 12),
      searchYouTubeStandard('top billboard global 100 hits 2024 official audio', 12),
      searchYouTubeStandard('lofi hip hop beats chill study relax music', 8)
    ]);

    const result = {
      sections: [
        { title: 'Top Hits Indonesia', id: 'indo-hits', items: indoHits },
        { title: 'Global Viral Top 50', id: 'global-hits', items: globalHits },
        { title: 'Lofi & Chill Lounge', id: 'lofi-hits', items: lofiHits }
      ]
    };

    trendingCache.data = result;
    trendingCache.expiresAt = now + (60 * 60 * 1000); // 1 hour cache
    res.json(result);
  } catch (err) {
    console.error('Trending fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch trending', details: err.message });
  }
});

// ----------------------------------------------------
// 4. LYRICS ENDPOINT (Synced & Plain via LRCLIB)
// ----------------------------------------------------
app.get('/api/lyrics', async (req, res) => {
  const { track, artist, duration } = req.query;
  if (!track) {
    return res.status(400).json({ error: 'Track name required' });
  }

  // Clean track and artist for highest accuracy match on LRCLIB
  const cleanTrack = track
    .replace(/\[[^\]]*\]/g, '')
    .replace(/\((official\s*(music\s*)?video|audio|lyrics?|remaster(ed)?|live|explicit|visualizer|album version)\)/gi, '')
    .replace(/(feat\.|ft\.)\s+[^-\(\]]+/gi, '')
    .replace(/[-–—]\s*(official\s*(music\s*)?video|audio|lyrics?)/gi, '')
    .trim();
  const cleanArtist = (artist || '')
    .replace(/\([^)]*\)|\[[^\]]*\]/g, '')
    .replace(/[-–—]\s*topic/gi, '')
    .trim();

  const cacheKey = `${cleanTrack.toLowerCase()}|${cleanArtist.toLowerCase()}`;
  if (lyricsCache.has(cacheKey)) {
    return res.json(lyricsCache.get(cacheKey));
  }

  try {
    let url = `https://lrclib.net/api/get?track_name=${encodeURIComponent(cleanTrack)}`;
    if (cleanArtist) url += `&artist_name=${encodeURIComponent(cleanArtist)}`;
    if (duration && !isNaN(duration) && Number(duration) > 0) {
      url += `&duration=${encodeURIComponent(Math.round(Number(duration)))}`;
    }

    let response = await fetch(url, { headers: { 'User-Agent': 'AuraMusic/1.0' } });
    
    // If exact get failed, fallback to search endpoint
    if (!response.ok) {
      const query = cleanArtist ? `${cleanTrack} ${cleanArtist}` : cleanTrack;
      const searchUrl = `https://lrclib.net/api/search?q=${encodeURIComponent(query)}`;
      const searchRes = await fetch(searchUrl, { headers: { 'User-Agent': 'AuraMusic/1.0' } });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        if (Array.isArray(searchData) && searchData.length > 0) {
          // Prioritize result that has synced lyrics
          const match = searchData.find(item => item.syncedLyrics) || searchData.find(item => item.plainLyrics) || searchData[0];
          const result = {
            syncedLyrics: match.syncedLyrics || null,
            plainLyrics: match.plainLyrics || null
          };
          lyricsCache.set(cacheKey, result);
          return res.json(result);
        }
      }
      const emptyResult = { syncedLyrics: null, plainLyrics: null };
      lyricsCache.set(cacheKey, emptyResult);
      return res.json(emptyResult);
    }

    const data = await response.json();
    const result = {
      syncedLyrics: data.syncedLyrics || null,
      plainLyrics: data.plainLyrics || null
    };
    lyricsCache.set(cacheKey, result);
    res.json(result);
  } catch (err) {
    console.error('Lyrics error:', err.message);
    res.json({ syncedLyrics: null, plainLyrics: null });
  }
});

// ----------------------------------------------------
// 5. NETWORK INFO & QR CODE (For Easy Mobile Pairing)
// ----------------------------------------------------
app.get('/api/network-info', async (req, res) => {
  const ip = getLocalNetworkIp();
  const mobileUrl = `http://${ip}:${PORT}`;
  try {
    const qrCodeDataUrl = await QRCode.toDataURL(mobileUrl, {
      margin: 1,
      color: {
        dark: '#6366f1',
        light: '#121217'
      },
      width: 256
    });

    res.json({
      port: PORT,
      localIp: ip,
      mobileUrl: mobileUrl,
      qrCodeDataUrl: qrCodeDataUrl
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate QR', details: err.message });
  }
});

// ----------------------------------------------------
// Helpers
// ----------------------------------------------------
function cleanTitle(str) {
  if (!str) return '';
  return str
    .replace(/(\(|\[)(Official Video|Official Audio|Music Video|Lyric Video|Audio|MV|HD|4K)(\)|\])/gi, '')
    .trim();
}

function parseDuration(str) {
  if (!str) return 0;
  const parts = str.split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function formatViews(num) {
  if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(1) + 'B views';
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M views';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K views';
  return num + ' views';
}

// Start Server on all interfaces (0.0.0.0) so phone and PC can connect
app.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalNetworkIp();
  console.log(`\n======================================================`);
  console.log(`  AURA - MODERN AD-FREE MUSIC (MOBILE & PC)           `);
  console.log(`======================================================`);
  console.log(`  Desktop (PC):  http://localhost:${PORT}`);
  console.log(`  Mobile (HP):   http://${localIp}:${PORT}`);
  console.log(`======================================================\n`);
});
