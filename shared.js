const CONFIG_KEY = "prothesmia:config";

const DEFAULT_CONFIG = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  sessionsBeforeLongBreak: 4,
  autoStartNext: false,
  focusLabel: "focus",
  shortBreakLabel: "short break",
  longBreakLabel: "long break",
  showNotes: false,
};

function loadConfig() {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return { ...DEFAULT_CONFIG };
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig(config) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  window.dispatchEvent(new CustomEvent("prothesmia:config-change", { detail: config }));
}

const THEME_KEY = "prothesmia:theme";

const TOKEN_CSS_VAR = {
  bg: "--bg",
  surface: "--surface",
  surface2: "--surface-2",
  border: "--border",
  borderStrong: "--border-strong",
  fg: "--fg",
  muted: "--muted",
  muted2: "--muted-2",
  accent: "--accent",
  focus: "--focus-color",
  break: "--break-color",
};

const PRESETS = {
  mono: {
    bg: "#1e1e1e", surface: "#242424", surface2: "#2a2a2a", border: "#333333", borderStrong: "#3a3a3a",
    fg: "#e8e8e6", muted: "#8a8a8a", muted2: "#6e6e6e", accent: "#f2f2f0", focus: "#b5665c", break: "#7c9b7e",
  },
  paper: {
    bg: "#e1e1e1", surface: "#dbdbdb", surface2: "#d5d5d5", border: "#cccccc", borderStrong: "#c5c5c5",
    fg: "#171719", muted: "#444444", muted2: "#666666", accent: "#0d0d0f", focus: "#b5665c", break: "#7c9b7e",
  },
  dusk: {
    bg: "#241e1b", surface: "#2c2521", surface2: "#332b26", border: "#3d332c", borderStrong: "#4a3f36",
    fg: "#f0e6da", muted: "#a89484", muted2: "#8c7a6c", accent: "#d9a46b", focus: "#c17a5a", break: "#8fae7a",
  },
  noir: {
    bg: "#000000", surface: "#111111", surface2: "#1a1a1a", border: "#2a2a2a", borderStrong: "#3a3a3a",
    fg: "#ffffff", muted: "#999999", muted2: "#777777", accent: "#ffffff", focus: "#ff6b57", break: "#79d68c",
  },
};

function hexToRgb(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || "");
  if (!m) return "0, 0, 0";
  return [1, 2, 3].map((i) => parseInt(m[i], 16)).join(", ");
}

function loadTheme() {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.tokens) return parsed;
    }
  } catch {
  }
  return { preset: "mono", tokens: { ...PRESETS.mono } };
}

function applyTheme(tokens, preset) {
  const root = document.documentElement.style;
  Object.entries(TOKEN_CSS_VAR).forEach(([key, cssVar]) => {
    if (tokens[key]) root.setProperty(cssVar, tokens[key]);
  });
  root.setProperty("--accent-rgb", hexToRgb(tokens.accent));
  root.setProperty("--focus-color-rgb", hexToRgb(tokens.focus));
  root.setProperty("--break-color-rgb", hexToRgb(tokens.break));
  if (preset && document.body) document.body.dataset.preset = preset;
}

function saveTheme(theme) {
  localStorage.setItem(THEME_KEY, JSON.stringify(theme));
  applyTheme(theme.tokens, theme.preset);
  window.dispatchEvent(new CustomEvent("prothesmia:theme-change", { detail: theme }));
}

function saveRimColor(field, hex) {
  const theme = loadTheme();
  saveTheme({ preset: theme.preset, tokens: { ...theme.tokens, [field]: hex } });
}

{
  const initialTheme = loadTheme();
  applyTheme(initialTheme.tokens, initialTheme.preset);
}

const BUTTON_PROFILE_KEY = "prothesmia:buttonProfile";
const BUTTON_PROFILES = ["translucent", "opaque", "retro"];

function loadButtonProfile() {
  try {
    const stored = localStorage.getItem(BUTTON_PROFILE_KEY);
    if (BUTTON_PROFILES.includes(stored)) return stored;
  } catch {
  }
  return "opaque";s
}

function applyButtonProfile(profile) {
  document.body.classList.toggle("btn-profile-opaque", profile === "opaque");
  document.body.classList.toggle("btn-profile-retro", profile === "retro");
}

function saveButtonProfile(profile) {
  localStorage.setItem(BUTTON_PROFILE_KEY, profile);
  applyButtonProfile(profile);
  window.dispatchEvent(new CustomEvent("prothesmia:button-profile-change", { detail: profile }));
}

applyButtonProfile(loadButtonProfile());

const BG_KEY = "prothesmia:background";
const BG_IMAGE_KEY = "prothesmia:bgImage";

const DEFAULT_BG = {
  imageOpacity: 60,
  overlay: 40,
  videoUrl: "",
};

function loadBgSettings() {
  try {
    const raw = localStorage.getItem(BG_KEY);
    if (raw) return { ...DEFAULT_BG, ...JSON.parse(raw) };
  } catch {
  }
  return { ...DEFAULT_BG };
}

function saveBgSettings(settings) {
  localStorage.setItem(BG_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent("prothesmia:bg-change", { detail: settings }));
}

function loadBgImage() {
  try {
    return localStorage.getItem(BG_IMAGE_KEY) || "";
  } catch {
    return "";
  }
}

function saveBgImage(dataUrl) {
  try {
    if (dataUrl) localStorage.setItem(BG_IMAGE_KEY, dataUrl);
    else localStorage.removeItem(BG_IMAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

function getMediaState(mediaId) {
  try {
    const db = JSON.parse(localStorage.getItem("prothesmia:mediaState") || "{}");
    return db[mediaId] || null;
  } catch { return null; }
}

function saveMediaState(mediaId, state) {
  if (!mediaId) return;
  try {
    const db = JSON.parse(localStorage.getItem("prothesmia:mediaState") || "{}");
    db[mediaId] = state;
    localStorage.setItem("prothesmia:mediaState", JSON.stringify(db));
  } catch {}
}

function parseYouTubeUrl(url) {
  if (!url) return null;
  let videoId = null;
  let listId = null;
  try {
    const u = new URL(url.includes("://") ? url : `https://${url}`);
    listId = u.searchParams.get("list");
    if (u.hostname.includes("youtube.com")) {
      if (u.pathname === "/watch") videoId = u.searchParams.get("v");
      else if (u.pathname.startsWith("/embed/")) videoId = u.pathname.split("/")[2];
      else if (u.pathname.startsWith("/shorts/")) videoId = u.pathname.split("/")[2];
    } else if (u.hostname.includes("youtu.be")) {
      videoId = u.pathname.substring(1);
    }
  } catch {}
  
  if (!videoId) {
    const m = /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/))([\w-]{11})/.exec(url || "");
    if (m) videoId = m[1];
  }
  if (!listId) {
    const mList = /[?&]list=([\w-]+)/.exec(url || "");
    if (mList) listId = mList[1];
  }
  
  if (listId && (listId.startsWith("RD") || listId.startsWith("LL") || listId.startsWith("WL") || listId.startsWith("LM"))) {
    if (videoId) listId = null;
  }
  
  if (!videoId && !listId) return null;
  return { videoId, listId };
}

const AUDIO_KEY = "prothesmia:audioSettings";
const CUSTOM_AUDIO_KEY = "prothesmia:customAudio";

const DEFAULT_AUDIO = {
  sessionEndSound: true,
  tickSound: false,
  videoSoundOn: false,
  videoVol: 70,
  customOn: false,
  customVol: 45,
  customName: "",
  ytMusicUrl: "",
  ytMusicOn: false,
  ytMusicCardVisible: true,
  ytMusicVol: 50,
};

function loadAudioSettings() {
  try {
    const raw = localStorage.getItem(AUDIO_KEY);
    if (raw) return { ...DEFAULT_AUDIO, ...JSON.parse(raw) };
  } catch {
  }
  return { ...DEFAULT_AUDIO };
}

function saveAudioSettings(settings) {
  localStorage.setItem(AUDIO_KEY, JSON.stringify(settings));
  window.dispatchEvent(new CustomEvent("prothesmia:audio-change", { detail: settings }));
}

function loadCustomAudio() {
  try {
    return localStorage.getItem(CUSTOM_AUDIO_KEY) || "";
  } catch {
    return "";
  }
}

function saveCustomAudio(dataUrl) {
  try {
    if (dataUrl) localStorage.setItem(CUSTOM_AUDIO_KEY, dataUrl);
    else localStorage.removeItem(CUSTOM_AUDIO_KEY);
    return true;
  } catch {
    return false;
  }
}

function formatDuration(totalSeconds) {
  if (!totalSeconds || !isFinite(totalSeconds)) return "";
  const m = Math.floor(totalSeconds / 60);
  const s = Math.floor(totalSeconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playTone(freq, duration, { type = "sine", gain = 0.15, delay = 0 } = {}) {
  const ctx = getAudioCtx();
  const osc = ctx.createOscillator();
  const gainNode = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const startAt = ctx.currentTime + delay;
  gainNode.gain.setValueAtTime(0, startAt);
  gainNode.gain.linearRampToValueAtTime(gain, startAt + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.05);
}

function playSessionEndChime() {
  playTone(660, 0.18, { gain: 0.18 });
  playTone(880, 0.28, { gain: 0.18, delay: 0.16 });
}

function playTickSound() {
  playTone(1000, 0.045, { type: "square", gain: 0.05 });
}

window.prothesmiaAudioCues = { playSessionEndChime, playTickSound, primeAudioContext: getAudioCtx };

function mountCustomAudio() {
  const audioEl = new Audio();
  audioEl.loop = true;

  function applySettings() {
    const settings = loadAudioSettings();
    audioEl.volume = settings.customVol / 100;
    const src = loadCustomAudio();
    if (src && audioEl.src !== src) {
      audioEl.src = src;
    }
    if (settings.customOn && src) {
      audioEl.play().catch(() => {
      });
    } else {
      audioEl.pause();
    }
  }

  audioEl.addEventListener("loadedmetadata", () => {
    window.dispatchEvent(new CustomEvent("prothesmia:audio-change", { detail: loadAudioSettings() }));
  });

  applySettings();
  window.addEventListener("prothesmia:audio-change", applySettings);

  window.prothesmiaCustomAudio = {
    getDuration: () => audioEl.duration || 0,
  };
}

function mountYouTubeMusic() {
  const cardEl = document.getElementById("ytmusic-card");
  const targetEl = document.getElementById("ytmusic-player");
  const thumbEl = document.getElementById("ytmusic-thumb");
  const titleEl = document.getElementById("ytmusic-title");
  const artistEl = document.getElementById("ytmusic-artist");
  const playBtn = document.getElementById("ytmusic-play");
  const prevBtn = document.getElementById("ytmusic-prev");
  const nextBtn = document.getElementById("ytmusic-next");
  const seekEl = document.getElementById("ytmusic-seek");
  if (!cardEl || !targetEl) return;

  let ytPlayer = null;
  let currentMediaId = null;
  let playing = false;
  let seeking = false;
  const metaCache = {};

  function fetchMeta(parsed) {
    const key = parsed.videoId || parsed.listId;
    if (metaCache[key]) return Promise.resolve(metaCache[key]);
    let watchUrl = "https://www.youtube.com/";
    if (parsed.videoId && parsed.listId) watchUrl += `watch?v=${parsed.videoId}&list=${parsed.listId}`;
    else if (parsed.listId) watchUrl += `playlist?list=${parsed.listId}`;
    else watchUrl += `watch?v=${parsed.videoId}`;
    
    return fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(watchUrl)}&format=json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) metaCache[key] = data;
        return data;
      })
      .catch(() => null);
  }

  function stripYouTubeTitleNoise(title) {
    return (title || "")
      .replace(/[([][^)\]]*(official|video|audio|lyric|visualizer|mv|hd|4k)[^)\]]*[)\]]/gi, "")
      .replace(/\s{2,}/g, " ")
      .trim();
  }

  function stripTopicChannelSuffix(artist) {
    return (artist || "").replace(/\s*-\s*topic\s*$/i, "").trim();
  }

  function fetchArtwork(title, artist) {
    const term = [stripTopicChannelSuffix(artist), stripYouTubeTitleNoise(title)].filter(Boolean).join(" ").trim();
    if (!term) return Promise.resolve(null);
    const url = `https://itunes.apple.com/search?media=music&entity=song&limit=1&term=${encodeURIComponent(term)}`;
    return fetch(url)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        const art = data?.results?.[0]?.artworkUrl100;
        return art ? art.replace("100x100bb", "600x600bb") : null;
      })
      .catch(() => null);
  }

  function updatePlayIcon() {
    if (!playBtn) return;
    playBtn.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
    playBtn.dataset.tip = playing ? "pause" : "play";
  }

  let currentVideoId = null;
  let lastArtTerm = "";

  function syncMetadata() {
    if (!ytPlayer || !ytPlayer.getVideoData) return;
    const data = ytPlayer.getVideoData();
    if (!data || !data.video_id) return;
    
    currentVideoId = data.video_id;
    
    const title = stripYouTubeTitleNoise(data.title) || "youtube audio";
    const author = stripTopicChannelSuffix(data.author) || "";
    
    titleEl.textContent = title;
    artistEl.textContent = author;
    
    const term = `${title} ${author}`.trim();
    if (term !== lastArtTerm && title !== "youtube audio") {
      lastArtTerm = term;
      thumbEl.style.backgroundImage = `url("https://i.ytimg.com/vi/${data.video_id}/mqdefault.jpg")`;
      fetchArtwork(title, author).then((artUrl) => {
        if (lastArtTerm !== term || !artUrl) return;
        thumbEl.style.backgroundImage = `url("${artUrl}")`;
      });
    }
  }

  function ensurePlayer(parsed) {
    loadYouTubeApi().then(() => {
      const savedState = getMediaState(parsed.videoId || parsed.listId) || {};
      
      if (ytPlayer) {
        if (parsed.listId) {
          ytPlayer.loadPlaylist({ listType: "playlist", list: parsed.listId, index: savedState.index || 0, startSeconds: savedState.time || 0 });
        } else if (parsed.videoId) {
          ytPlayer.loadVideoById({ videoId: parsed.videoId, startSeconds: savedState.time || 0 });
        }
        return;
      }
      
      let target = document.getElementById("ytmusic-player");
      if (!target) {
        target = document.createElement("div");
        target.id = "ytmusic-player";
        document.querySelector(".ytmusic-player-clip").appendChild(target);
      }
      
      const playerVars = { autoplay: 1, controls: 0 };
      if (savedState.time) playerVars.start = Math.floor(savedState.time);
      
      if (parsed.listId) {
        playerVars.listType = "playlist";
        playerVars.list = parsed.listId;
        playerVars.loop = 1;
        if (savedState.index) playerVars.index = savedState.index;
      } else {
        playerVars.loop = 1;
        playerVars.playlist = parsed.videoId;
      }
      
      playing = false;
      updatePlayIcon();
      
      const config = {
        width: 1,
        height: 1,
        playerVars,
        events: {
          onReady: () => {
            ytPlayer.setVolume(loadAudioSettings().ytMusicVol);
            playing = true;
            updatePlayIcon();
            syncMetadata();
          },
          onStateChange: (e) => {
            if (e.data === 1) {
              playing = true;
              updatePlayIcon();
              syncMetadata();
            } else if (e.data === 2) {
              playing = false;
              updatePlayIcon();
            }
          },
        },
      };
      if (parsed.videoId) config.videoId = parsed.videoId;
      
      ytPlayer = new YT.Player(target, config);
    });
  }

  function render() {
    const audio = loadAudioSettings();
    const parsed = parseYouTubeUrl(audio.ytMusicUrl);
    const mediaId = parsed ? (parsed.videoId || parsed.listId) : null;

    if (!parsed || !audio.ytMusicOn) {
      cardEl.hidden = true;
      if (ytPlayer) {
        ytPlayer.destroy();
        ytPlayer = null;
        currentMediaId = null;
      }
      return;
    }

    cardEl.hidden = audio.ytMusicCardVisible === false;

    if (mediaId !== currentMediaId) {
      currentMediaId = mediaId;
      currentVideoId = null;
      lastArtTerm = "";
      ensurePlayer(parsed);
      thumbEl.style.backgroundImage = "";
      titleEl.textContent = "loading…";
      artistEl.textContent = "";
      fetchMeta(parsed).then((meta) => {
        if (mediaId !== currentMediaId || currentVideoId || !meta) return; 
        titleEl.textContent = meta.title || "youtube audio";
        artistEl.textContent = stripTopicChannelSuffix(meta.author_name) || "";
        if (meta.thumbnail_url) thumbEl.style.backgroundImage = `url("${meta.thumbnail_url}")`;
        fetchArtwork(meta.title, meta.author_name).then((artUrl) => {
          if (mediaId !== currentMediaId || currentVideoId || !artUrl) return;
          thumbEl.style.backgroundImage = `url("${artUrl}")`;
        });
      });
    } else if (ytPlayer?.setVolume) {
      ytPlayer.setVolume(audio.ytMusicVol);
    }
  }

  playBtn?.addEventListener("click", () => {
    if (!ytPlayer) return;
    if (playing) ytPlayer.pauseVideo();
    else ytPlayer.playVideo();
    playing = !playing;
    updatePlayIcon();
  });

  prevBtn?.addEventListener("click", () => {
    if (ytPlayer && ytPlayer.previousVideo) ytPlayer.previousVideo();
  });

  nextBtn?.addEventListener("click", () => {
    if (ytPlayer && ytPlayer.nextVideo) ytPlayer.nextVideo();
  });

  const timeEl = document.getElementById("ytmusic-time");

  function formatTime(sec) {
    if (isNaN(sec) || sec <= 0) return "0:00";
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  if (seekEl) {
    setInterval(() => {
      if (!ytPlayer || !seekEl || seeking) return;
      const dur = ytPlayer.getDuration?.() || 0;
      const cur = ytPlayer.getCurrentTime?.() || 0;
      if (dur > 0) {
        seekEl.max = String(dur);
        seekEl.value = String(cur);
        seekEl.style.setProperty("--val", `${(cur / dur) * 100}%`);
        if (timeEl) timeEl.textContent = `${formatTime(cur)} / ${formatTime(dur)}`;
      }
      if (currentMediaId && dur > 0) {
        saveMediaState(currentMediaId, {
          index: Math.max(0, ytPlayer.getPlaylistIndex?.() || 0),
          time: cur
        });
      }
    }, 500);

    seekEl.addEventListener("input", (e) => {
      seeking = true;
      const dur = ytPlayer?.getDuration?.() || 1;
      const val = Number(e.target.value);
      seekEl.style.setProperty("--val", `${(val / dur) * 100}%`);
      if (timeEl) timeEl.textContent = `${formatTime(val)} / ${formatTime(dur)}`;
    });
    seekEl.addEventListener("change", (e) => {
      seeking = false;
      if (ytPlayer && ytPlayer.seekTo) ytPlayer.seekTo(Number(e.target.value), true);
    });
  }

  const closeBtn = document.getElementById("ytmusic-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      const audio = { ...loadAudioSettings(), ytMusicCardVisible: false };
      saveAudioSettings(audio);
    });
  }

  render();
  window.addEventListener("prothesmia:audio-change", render);
}

let ytApiPromise = null;
function loadYouTubeApi() {
  if (window.YT && window.YT.Player) return Promise.resolve();
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    const prevReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prevReady?.();
      resolve();
    };
    const script = document.createElement("script");
    script.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(script);
  });
  return ytApiPromise;
}

const ICON_SPEAKER = '<svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M3 8v4h3l4 4V4L6 8H3z" fill="currentColor"/><path d="M13 7c1 1 1 5 0 6M15.5 5c2 2 2 8 0 10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
const ICON_SPEAKER_MUTED = '<svg width="14" height="14" viewBox="0 0 20 20" fill="none"><path d="M3 8v4h3l4 4V4L6 8H3z" fill="currentColor"/><path d="M13 7l5 6M18 7l-5 6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
const ICON_PAUSE = '<svg width="12" height="12" viewBox="0 0 20 20" fill="none"><rect x="4" y="3" width="4" height="14" fill="currentColor"/><rect x="12" y="3" width="4" height="14" fill="currentColor"/></svg>';
const ICON_PLAY = '<svg width="12" height="12" viewBox="0 0 20 20"><path d="M6 4l10 6-10 6V4z" fill="currentColor"/></svg>';

function mountBackgroundLayer() {
  const imageEl = document.getElementById("bg-image");
  const videoWrap = document.getElementById("bg-video-wrap");
  const videoTarget = document.getElementById("bg-video");
  const overlayEl = document.getElementById("bg-overlay");
  const controlsEl = document.getElementById("bg-video-controls");
  const muteBtn = document.getElementById("bg-video-mute");
  const playBtn = document.getElementById("bg-video-play");
  const seekEl = document.getElementById("bg-video-seek");
  if (!imageEl || !videoWrap || !videoTarget || !overlayEl) return;

  let ytPlayer = null;
  let currentMediaId = null;
  let muted = true;
  let playing = true;
  let seeking = false;

  setInterval(() => {
    if (!ytPlayer || !seekEl || seeking) return;
    const dur = ytPlayer.getDuration?.() || 0;
    const cur = ytPlayer.getCurrentTime?.() || 0;
    if (dur > 0) {
      seekEl.max = String(dur);
      seekEl.value = String(cur);
      seekEl.style.setProperty("--val", `${(cur / dur) * 100}%`);
    }
    if (currentMediaId && dur > 0) {
      saveMediaState(currentMediaId, {
        index: Math.max(0, ytPlayer.getPlaylistIndex?.() || 0),
        time: cur
      });
    }
  }, 500);

  function updateControlsUI() {
    if (muteBtn) {
      muteBtn.innerHTML = muted ? ICON_SPEAKER_MUTED : ICON_SPEAKER;
      muteBtn.dataset.tip = muted ? "unmute" : "mute";
    }
    if (playBtn) {
      playBtn.innerHTML = playing ? ICON_PAUSE : ICON_PLAY;
      playBtn.dataset.tip = playing ? "pause" : "play";
    }
  }

  function setMuted(m) {
    muted = m;
    if (ytPlayer) {
      if (m) ytPlayer.mute();
      else ytPlayer.unMute();
    }
    updateControlsUI();
  }

  function setVolume(v) {
    if (ytPlayer) ytPlayer.setVolume(v);
  }

  window.prothesmiaVideoAudio = {
    setMuted,
    setVolume,
    isMuted: () => muted,
    hasPlayer: () => Boolean(ytPlayer),
  };

  function ensurePlayer(parsed) {
    loadYouTubeApi().then(() => {
      const savedState = getMediaState(parsed.videoId || parsed.listId) || {};
      
      if (ytPlayer) {
        if (parsed.listId) {
          ytPlayer.loadPlaylist({ listType: "playlist", list: parsed.listId, index: savedState.index || 0, startSeconds: savedState.time || 0 });
        } else if (parsed.videoId) {
          ytPlayer.loadVideoById({ videoId: parsed.videoId, startSeconds: savedState.time || 0 });
        }
        return;
      }
      muted = true;
      playing = true;
      
      let target = document.getElementById("bg-video");
      if (!target) {
        target = document.createElement("div");
        target.id = "bg-video";
        document.getElementById("bg-video-wrap").appendChild(target);
      }

      const playerVars = {
        autoplay: 1,
        mute: 1,
        controls: 0,
        showinfo: 0,
        modestbranding: 1,
        rel: 0,
      };
      
      if (savedState.time) playerVars.start = Math.floor(savedState.time);
      
      if (parsed.listId) {
        playerVars.listType = "playlist";
        playerVars.list = parsed.listId;
        playerVars.loop = 1;
        if (savedState.index) playerVars.index = savedState.index;
      } else {
        playerVars.loop = 1;
        playerVars.playlist = parsed.videoId;
      }

      const config = {
        width: 1920,
        height: 1080,
        playerVars,
        events: {
          onReady: () => {
            const audio = loadAudioSettings();
            setVolume(audio.videoVol);
            setMuted(!audio.videoSoundOn);
          },
        },
      };
      if (parsed.videoId) config.videoId = parsed.videoId;
      
      ytPlayer = new YT.Player(target, config);
    });
  }

  function render() {
    const allowMedia = loadButtonProfile() === "translucent";
    const settings = loadBgSettings();
    const image = allowMedia ? loadBgImage() : "";
    const parsed = allowMedia ? parseYouTubeUrl(settings.videoUrl) : null;
    const mediaId = parsed ? (parsed.videoId || parsed.listId) : null;
    const hasMedia = Boolean(mediaId) || Boolean(image);

    if (parsed) {
      videoWrap.hidden = false;
      if (controlsEl) controlsEl.hidden = false;
      imageEl.hidden = true;
      if (mediaId !== currentMediaId) {
        currentMediaId = mediaId;
        ensurePlayer(parsed);
      }
    } else {
      videoWrap.hidden = true;
      if (controlsEl) controlsEl.hidden = true;
      currentMediaId = null;
      if (ytPlayer) {
        ytPlayer.destroy();
        ytPlayer = null;
      }
      if (seekEl) {
        seekEl.value = "0";
        seekEl.style.setProperty("--val", "0%");
      }
      if (image) {
        imageEl.src = image;
        imageEl.hidden = false;
        imageEl.style.opacity = String(settings.imageOpacity / 100);
      } else {
        imageEl.hidden = true;
      }
    }

    overlayEl.style.opacity = hasMedia ? String(settings.overlay / 100) : "0";
  }

  muteBtn?.addEventListener("click", () => {
    if (!ytPlayer) return;
    const nowMuted = !muted;
    setMuted(nowMuted);
    const audio = { ...loadAudioSettings(), videoSoundOn: !nowMuted };
    saveAudioSettings(audio);
  });

  playBtn?.addEventListener("click", () => {
    if (!ytPlayer) return;
    if (playing) ytPlayer.pauseVideo();
    else ytPlayer.playVideo();
    playing = !playing;
    updateControlsUI();
  });

  seekEl?.addEventListener("input", () => {
    seeking = true;
    const dur = Number(seekEl.max) || 0;
    if (dur > 0) seekEl.style.setProperty("--val", `${(Number(seekEl.value) / dur) * 100}%`);
  });

  seekEl?.addEventListener("change", () => {
    if (ytPlayer) ytPlayer.seekTo(Number(seekEl.value), true);
    seeking = false;
  });

  render();
  window.addEventListener("prothesmia:bg-change", render);
  window.addEventListener("prothesmia:button-profile-change", render);
}

const LAYOUT_KEY = "prothesmia:layout";

function loadLayout() {
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
  }
  return {};
}

function saveLayoutEntry(key, entry) {
  const layout = loadLayout();
  layout[key] = entry;
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout));
}

function clearLayout() {
  localStorage.removeItem(LAYOUT_KEY);
}

function mountLayoutEditor(slots) {
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
  let editMode = false;

  function applyEntry(el, entry) {
    if (!entry) {
      el.style.transform = "";
      el.style.zIndex = "";
      return;
    }
    el.style.transform = `translate(${entry.dxPct}vw, ${entry.dyPct}vh) scale(${entry.scale})`;
    el.style.zIndex = "2";
  }

  function initSlot(key, el) {
    applyEntry(el, loadLayout()[key]);

    let dragging = false;
    let startClientX = 0;
    let startClientY = 0;
    let baseDxPct = 0;
    let baseDyPct = 0;
    let scale = loadLayout()[key]?.scale ?? 1;
    let lastDxPct = 0;
    let lastDyPct = 0;

    el.addEventListener("pointerdown", (e) => {
      if (!editMode) return;
      dragging = true;
      el.setPointerCapture(e.pointerId);
      startClientX = e.clientX;
      startClientY = e.clientY;
      const current = loadLayout()[key];
      baseDxPct = current?.dxPct ?? 0;
      baseDyPct = current?.dyPct ?? 0;
      e.preventDefault();
    });

    el.addEventListener("pointermove", (e) => {
      if (!dragging) return;
      lastDxPct = clamp(baseDxPct + ((e.clientX - startClientX) / window.innerWidth) * 100, -70, 70);
      lastDyPct = clamp(baseDyPct + ((e.clientY - startClientY) / window.innerHeight) * 100, -70, 70);
      applyEntry(el, { dxPct: lastDxPct, dyPct: lastDyPct, scale });
    });

    el.addEventListener("pointerup", () => {
      if (!dragging) return;
      dragging = false;
      saveLayoutEntry(key, { dxPct: lastDxPct, dyPct: lastDyPct, scale });
    });

    el.addEventListener(
      "wheel",
      (e) => {
        if (!editMode || dragging) return;
        e.preventDefault();
        const current = loadLayout()[key] || { dxPct: 0, dyPct: 0, scale: 1 };
        scale = clamp(current.scale + (e.deltaY > 0 ? -0.05 : 0.05), 0.5, 1.8);
        const next = { dxPct: current.dxPct, dyPct: current.dyPct, scale };
        applyEntry(el, next);
        saveLayoutEntry(key, next);
      },
      { passive: false }
    );
  }

  Object.entries(slots).forEach(([key, el]) => {
    if (el) initSlot(key, el);
  });

  function setEditMode(on) {
    editMode = on;
    Object.values(slots).forEach((el) => el?.classList.toggle("layout-editable", on));
    const bar = document.getElementById("layout-edit-bar");
    if (bar) bar.hidden = !on;
  }

  document.getElementById("layout-reset")?.addEventListener("click", () => {
    clearLayout();
    Object.values(slots).forEach((el) => el && applyEntry(el, null));
  });
  document.getElementById("layout-done")?.addEventListener("click", () => setEditMode(false));

  window.prothesmiaLayoutEditor = { enter: () => setEditMode(true), exit: () => setEditMode(false) };
}

function mountHeader() {
  const root = document.getElementById("header");
  if (!root) return;
  root.innerHTML = `
    <div class="wordmark"><span class="wordmark-dot"></span><span class="wordmark-text">προθεσμία</span></div>
    <div class="header-icons">
      <button class="icon-btn" type="button" id="fullscreen-toggle" data-tip="fullscreen"></button>
      <button class="icon-btn" type="button" id="settings-toggle" data-tip="settings">
        <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
          <path d="M3 6h8M15 6h2M3 14h2M9 14h8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" />
          <circle cx="12" cy="6" r="2" fill="var(--surface)" stroke="currentColor" stroke-width="1.4" />
          <circle cx="6" cy="14" r="2" fill="var(--surface)" stroke="currentColor" stroke-width="1.4" />
        </svg>
      </button>
    </div>
  `;
  document.getElementById("settings-toggle").addEventListener("click", () => {
    window.prothesmiaSettings?.toggle();
  });

  const ICON_FULLSCREEN_ENTER =
    '<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M3 7V4a1 1 0 0 1 1-1h3M17 7V4a1 1 0 0 0-1-1h-3M3 13v3a1 1 0 0 0 1 1h3M17 13v3a1 1 0 0 1-1 1h-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" /></svg>';
  const ICON_FULLSCREEN_EXIT =
    '<svg width="16" height="16" viewBox="0 0 20 20" fill="none"><path d="M2 6h3a1 1 0 0 0 1-1V2M18 6h-3a1 1 0 0 1-1-1V2M2 14h3a1 1 0 0 1 1 1v3M18 14h-3a1 1 0 0 0-1 1v3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" /></svg>';

  const fullscreenBtn = document.getElementById("fullscreen-toggle");
  if (!document.documentElement.requestFullscreen) {
    fullscreenBtn.hidden = true;
    return;
  }

  function updateFullscreenIcon() {
    const isFullscreen = Boolean(document.fullscreenElement);
    fullscreenBtn.innerHTML = isFullscreen ? ICON_FULLSCREEN_EXIT : ICON_FULLSCREEN_ENTER;
    fullscreenBtn.dataset.tip = isFullscreen ? "exit fullscreen" : "fullscreen";
  }

  fullscreenBtn.addEventListener("click", () => {
    if (document.fullscreenElement) {
      document.exitFullscreen?.();
    } else {
      document.documentElement.requestFullscreen?.().catch(() => {
      });
    }
  });

  document.addEventListener("fullscreenchange", updateFullscreenIcon);
  updateFullscreenIcon();
}

function mountSettingsPanel() {
  const root = document.getElementById("settings-root");
  if (!root) return;

  root.innerHTML = `
    <div class="settings-scrim" id="settings-scrim" hidden></div>
    <div class="preview-badge" id="preview-badge" hidden>preview</div>
    <aside class="settings-panel" id="settings-panel" hidden>
      <div class="settings-top row">
        <div class="settings-title">settings</div>
        <button class="close-btn" type="button" id="settings-close" aria-label="close settings">
          <svg width="12" height="12" viewBox="0 0 20 20" fill="none">
            <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </button>
      </div>

      <div class="settings-tabs" id="settings-tabs">
        <button class="settings-tab-btn is-active" data-tab="appearance" type="button">appearance</button>
        <button class="settings-tab-btn" data-tab="audio" type="button">audio</button>
        <button class="settings-tab-btn" data-tab="timer" type="button">timer</button>
      </div>

      <div class="settings-tab-panel" data-panel="appearance">
        <div class="settings-card">
          <div class="section-label">presets</div>
          <div class="preset-list" id="preset-swatches">
            <button class="preset-row" type="button" data-preset="mono"><span class="preset-name">mono</span><span class="preset-status"></span></button>
            <button class="preset-row" type="button" data-preset="noir"><span class="preset-name">noir</span><span class="preset-status"></span></button>
            <button class="preset-row" type="button" data-preset="paper"><span class="preset-name">paper</span><span class="preset-status"></span></button>
            <button class="preset-row" type="button" data-preset="dusk"><span class="preset-name">dusk</span><span class="preset-status"></span></button>
            
          </div>
        </div>

        <div class="settings-card">
          <div class="section-label">rim color</div>
          <div class="color-list">
            <div class="color-row row"><div class="row-label">focus</div><div class="color-val"><input class="color-input" type="color" data-field="focus" /><span class="mono-val" data-field-val="focus"></span></div></div>
            <div class="color-row row"><div class="row-label">break</div><div class="color-val"><input class="color-input" type="color" data-field="break" /><span class="mono-val" data-field-val="break"></span></div></div>
          </div>
        </div>

        <div class="settings-card">
          <div class="section-label">button style</div>
          <div class="profile-toggle" id="button-profile-toggle">
            <button type="button" class="profile-btn" data-profile="translucent">translucent</button>
            <button type="button" class="profile-btn" data-profile="opaque">opaque</button>
            <button type="button" class="profile-btn" data-profile="retro">retro</button>
          </div>
        </div>

        <div class="settings-card">
          <div class="section-label">widgets</div>
          <div class="shaded-list">
            <div class="row shaded-row">
              <div class="row-label">notes</div>
              <button class="toggle" type="button" id="notes-widget-toggle"></button>
            </div>
          </div>
        </div>

        <div class="settings-card" id="bg-media-card">
          <div class="section-label">background media</div>
          <div id="bg-media-locked-hint" class="hint" hidden>works with translucent buttons</div>
          <div id="bg-media-controls">
            <div class="shaded-list">
              <div class="row shaded-row">
                <div class="media-upload-label"><span class="upload-icon">⬒</span><span class="row-label">image</span></div>
                <div style="display:flex; align-items:center; gap:10px;">
                  <button class="link-action" type="button" id="bg-image-clear" hidden>remove</button>
                  <label class="link-action" for="bg-image-input" id="bg-image-label" style="cursor:pointer;">upload</label>
                </div>
                <input type="file" accept="image/*" id="bg-image-input" hidden />
              </div>
              <div class="slider-row shaded-row">
                <div class="row-label">image opacity <span class="mono-val" id="bg-opacity-val">60%</span></div>
                <input class="range-input" type="range" id="bg-opacity" min="0" max="100" value="60" />
              </div>
              <div class="row shaded-row">
                <div class="media-upload-label"><span class="upload-icon">▶</span><span class="row-label">audiovisual</span></div>
              </div>
              <div class="shaded-row">
                <input class="text-input bare-input" type="text" id="bg-video-url" placeholder="YouTube URL" />
              </div>
              <div class="slider-row shaded-row">
                <div class="row-label">dark overlay <span class="mono-val" id="bg-overlay-val">40%</span></div>
                <input class="range-input" type="range" id="bg-overlay-slider" min="0" max="100" value="40" />
              </div>
            </div>
            <div class="hint">  </div>
          </div>
        </div>

        <div class="settings-card">
          <div class="section-label">layout</div>
          <div class="row shaded-row">
            <div class="row-label">reposition timer elements</div>
            <button class="pill-btn" type="button" id="customize-layout-btn">customize</button>
          </div>
          
        </div>
      </div>

      <div class="settings-tab-panel" data-panel="audio" hidden>
        <div class="settings-card">
          <div class="section-label">notification sounds</div>
          <div class="shaded-list">
            <div class="row shaded-row"><div class="row-label">session end sound</div><button class="toggle" type="button" id="session-end-toggle"></button></div>
            <div class="row shaded-row"><div class="row-label">tick sound</div><button class="toggle" type="button" id="tick-toggle"></button></div>
          </div>
        </div>

        <div class="settings-card" id="video-audio-card">
          <div class="section-label">video audio</div>
          <div class="shaded-list">
            <div class="row shaded-row audio-gate"><div class="row-label">play video sound</div><button class="toggle" type="button" id="video-sound-toggle"></button></div>
            <div class="slider-row shaded-row audio-gate">
              <div class="row-label">volume <span class="mono-val" id="video-vol-val">70%</span></div>
              <input class="range-input" type="range" id="video-vol" min="0" max="100" value="70" />
            </div>
          </div>
          <div class="hint"> </div>
        </div>

        <div class="settings-card" id="custom-audio-card">
          <div class="section-label">custom audio</div>
          <div class="shaded-list">
            <div class="row shaded-row audio-gate">
              <div class="track-info"><span class="row-label" id="custom-track-name" style="color:var(--fg)">no track imported</span><span class="hint" id="custom-track-meta"></span></div>
              <button class="toggle" type="button" id="custom-toggle" disabled></button>
            </div>
            <div class="slider-row shaded-row audio-gate">
              <div class="row-label">volume <span class="mono-val" id="custom-vol-val">45%</span></div>
              <input class="range-input" type="range" id="custom-vol" min="0" max="100" value="45" />
            </div>
            <div class="row shaded-row">
              <label class="link-action" for="custom-audio-input" id="custom-import-label" style="cursor:pointer;">+ import audio</label>
              <button class="link-action" type="button" id="custom-audio-clear" hidden>remove</button>
            </div>
          </div>
          <input type="file" accept="audio/*" id="custom-audio-input" hidden />
        </div>

        <div class="settings-card" id="ytmusic-audio-card">
          <div class="section-label">youtube audio</div>
          <div class="shaded-list">
            <div class="row shaded-row audio-gate"><div class="row-label">enable</div><button class="toggle" type="button" id="ytmusic-toggle" disabled></button></div>
            <div class="row shaded-row audio-gate"><div class="row-label">show player card</div><button class="toggle" type="button" id="ytmusic-card-toggle" disabled></button></div>
            <div class="slider-row shaded-row audio-gate">
              <div class="row-label">volume <span class="mono-val" id="ytmusic-vol-val">50%</span></div>
              <input class="range-input" type="range" id="ytmusic-vol" min="0" max="100" value="50" />
            </div>
            <div class="shaded-row">
              <input class="text-input bare-input" type="text" id="ytmusic-url" placeholder="YouTube Music track / playlist URL" />
            </div>
          </div>
          <div class="hint"> </div>
        </div>

        <div class="settings-card is-disabled">
          <div class="section-label">spotify</div>
          <div class="shaded-list">
            <div class="row shaded-row">
              <div class="row-label">spotify</div>
              <span class="mono-val">coming soon</span>
            </div>
          </div>
          <div class="hint"> </div>
        </div>
      </div>

      <div class="settings-tab-panel" data-panel="timer" hidden>
        <div class="settings-card">
          <div class="section-label">durations</div>
          <div class="shaded-list">
            <div class="row shaded-row">
              <div class="row-label">focus</div>
              <div class="stepper" data-field="focusMinutes">
                <button class="stepper-btn" data-dir="-1" type="button">−</button>
                <div class="stepper-val"><input class="stepper-input val" type="number" /> min</div>
                <button class="stepper-btn" data-dir="1" type="button">+</button>
              </div>
            </div>
            <div class="row shaded-row">
              <div class="row-label">short break</div>
              <div class="stepper" data-field="shortBreakMinutes">
                <button class="stepper-btn" data-dir="-1" type="button">−</button>
                <div class="stepper-val"><input class="stepper-input val" type="number" /> min</div>
                <button class="stepper-btn" data-dir="1" type="button">+</button>
              </div>
            </div>
            <div class="row shaded-row">
              <div class="row-label">long break</div>
              <div class="stepper" data-field="longBreakMinutes">
                <button class="stepper-btn" data-dir="-1" type="button">−</button>
                <div class="stepper-val"><input class="stepper-input val" type="number" /> min</div>
                <button class="stepper-btn" data-dir="1" type="button">+</button>
              </div>
            </div>
          </div>
        </div>

        <div class="settings-card">
          <div class="section-label">sessions</div>
          <div class="shaded-list">
            <div class="row shaded-row">
              <div class="row-label">long break after</div>
              <div class="stepper" data-field="sessionsBeforeLongBreak">
                <button class="stepper-btn" data-dir="-1" type="button">−</button>
                <div class="stepper-val"><input class="stepper-input val" type="number" /></div>
                <button class="stepper-btn" data-dir="1" type="button">+</button>
              </div>
            </div>
            <div class="row shaded-row">
              <div class="row-label">auto-start next</div>
              <button class="toggle" type="button" id="auto-start-toggle"></button>
            </div>
          </div>
        </div>

        <div class="settings-card">
          <div class="section-label">labels</div>
          <div class="shaded-list">
            <div class="row shaded-row">
              <div class="row-label">focus</div>
              <input class="text-input label-input" type="text" data-label-field="focusLabel" maxlength="24" />
            </div>
            <div class="row shaded-row">
              <div class="row-label">short break</div>
              <input class="text-input label-input" type="text" data-label-field="shortBreakLabel" maxlength="24" />
            </div>
            <div class="row shaded-row">
              <div class="row-label">long break</div>
              <input class="text-input label-input" type="text" data-label-field="longBreakLabel" maxlength="24" />
            </div>
          </div>
          <div class="hint"> </div>
        </div>
      </div>
    </aside>
  `;

  const scrim = document.getElementById("settings-scrim");
  const panel = document.getElementById("settings-panel");
  const closeBtn = document.getElementById("settings-close");
  const settingsToggleBtn = document.getElementById("settings-toggle");

  function open() {
    scrim.hidden = false;
    panel.hidden = false;
    settingsToggleBtn?.classList.add("is-active");
  }
  function close() {
    scrim.hidden = true;
    panel.hidden = true;
    settingsToggleBtn?.classList.remove("is-active");
  }
  function toggle() {
    if (panel.hidden) open();
    else close();
  }

  scrim.addEventListener("click", close);
  closeBtn.addEventListener("click", close);

  const tabBtns = [...document.querySelectorAll(".settings-tab-btn")];
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      tabBtns.forEach((b) => b.classList.toggle("is-active", b === btn));
      document.querySelectorAll(".settings-tab-panel").forEach((p) => {
        p.hidden = p.dataset.panel !== btn.dataset.tab;
      });
    });
  });

  function renderAppearanceTab() {
    const theme = loadTheme();
    document.querySelectorAll("#preset-swatches .preset-row").forEach((btn) => {
      const isActive = btn.dataset.preset === theme.preset;
      btn.classList.toggle("is-active", isActive);
      const status = btn.querySelector(".preset-status");
      if (status) status.textContent = isActive ? "active" : "—";
    });
    const buttonProfile = loadButtonProfile();
    document.querySelectorAll("#button-profile-toggle .profile-btn").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.profile === buttonProfile);
    });
    document.querySelectorAll(".color-input[data-field]").forEach((input) => {
      const field = input.dataset.field;
      const value = theme.tokens[field] || "#000000";
      input.value = value;
      const label = document.querySelector(`[data-field-val="${field}"]`);
      if (label) label.textContent = value.toUpperCase();
    });

    const mediaAllowed = buttonProfile === "translucent";
    document.getElementById("bg-media-card").classList.toggle("is-disabled", !mediaAllowed);
    document.getElementById("bg-media-locked-hint").hidden = mediaAllowed;

    const bg = loadBgSettings();
    const hasImage = Boolean(loadBgImage());
    const hasVideo = Boolean(parseYouTubeUrl(bg.videoUrl));
    const opacityInput = document.getElementById("bg-opacity");
    const overlayInput = document.getElementById("bg-overlay-slider");
    opacityInput.value = bg.imageOpacity;
    opacityInput.style.setProperty("--val", `${bg.imageOpacity}%`);
    opacityInput.disabled = !hasImage;
    document.getElementById("bg-opacity-val").textContent = `${bg.imageOpacity}%`;
    overlayInput.value = bg.overlay;
    overlayInput.style.setProperty("--val", `${bg.overlay}%`);
    overlayInput.disabled = !(hasImage || hasVideo);
    document.getElementById("bg-overlay-val").textContent = `${bg.overlay}%`;
    document.getElementById("bg-video-url").value = bg.videoUrl;
    document.getElementById("bg-image-clear").hidden = !hasImage;
    document.getElementById("bg-image-label").textContent = hasImage ? "change" : "upload";
    
    const config = loadConfig();
    document.getElementById("notes-widget-toggle").classList.toggle("is-on", config.showNotes);
  }

  document.querySelectorAll("#preset-swatches .preset-row").forEach((btn) => {
    btn.addEventListener("click", () => {
      const preset = btn.dataset.preset;
      saveTheme({ preset, tokens: { ...PRESETS[preset] } });
      renderAppearanceTab();
    });
  });

  document.querySelectorAll("#button-profile-toggle .profile-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      saveButtonProfile(btn.dataset.profile);
      renderAppearanceTab();
    });
  });

  document.querySelectorAll(".color-input[data-field]").forEach((input) => {
    input.addEventListener("input", () => {
      saveRimColor(input.dataset.field, input.value);
      renderAppearanceTab();
    });
  });

  const bgImageInput = document.getElementById("bg-image-input");
  bgImageInput.addEventListener("change", () => {
    const file = bgImageInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = saveBgImage(String(reader.result));
      window.dispatchEvent(new CustomEvent("prothesmia:bg-change", { detail: loadBgSettings() }));
      renderAppearanceTab();
      if (!ok) {
        alert("that image is too large to save permanently, but it'll stay applied for this session");
      }
    };
    reader.readAsDataURL(file);
  });

  document.getElementById("bg-image-clear").addEventListener("click", () => {
    saveBgImage("");
    bgImageInput.value = "";
    window.dispatchEvent(new CustomEvent("prothesmia:bg-change", { detail: loadBgSettings() }));
    renderAppearanceTab();
  });

  const previewBadge = document.getElementById("preview-badge");
  let previewTimeout = null;
  let previewHeld = false;

  function showPreview() {
    clearTimeout(previewTimeout);
    scrim.classList.add("is-previewing");
    if (previewBadge) previewBadge.hidden = false;
  }

  function scheduleHidePreview() {
    clearTimeout(previewTimeout);
    previewTimeout = setTimeout(() => {
      scrim.classList.remove("is-previewing");
      if (previewBadge) previewBadge.hidden = true;
    }, 500);
  }

  function armPreviewSlider(el) {
    el.addEventListener("pointerdown", () => {
      previewHeld = true;
      showPreview();
    });
    el.addEventListener("input", () => {
      showPreview();
      if (!previewHeld) scheduleHidePreview();
    });
    el.addEventListener("change", () => {
      previewHeld = false;
      scheduleHidePreview();
    });
  }

  armPreviewSlider(document.getElementById("bg-opacity"));
  armPreviewSlider(document.getElementById("bg-overlay-slider"));

  document.getElementById("bg-opacity").addEventListener("input", (e) => {
    const settings = { ...loadBgSettings(), imageOpacity: Number(e.target.value) };
    saveBgSettings(settings);
    renderAppearanceTab();
  });

  document.getElementById("bg-overlay-slider").addEventListener("input", (e) => {
    const settings = { ...loadBgSettings(), overlay: Number(e.target.value) };
    saveBgSettings(settings);
    renderAppearanceTab();
  });

  document.getElementById("bg-video-url").addEventListener("input", (e) => {
    const settings = { ...loadBgSettings(), videoUrl: e.target.value.trim() };
    saveBgSettings(settings);
    renderAppearanceTab();
  });

  document.getElementById("customize-layout-btn").addEventListener("click", () => {
    close();
    window.prothesmiaLayoutEditor?.enter();
  });

  const notesToggle = document.getElementById("notes-widget-toggle");
  notesToggle.addEventListener("click", () => {
    const config = loadConfig();
    config.showNotes = !config.showNotes;
    saveConfig(config);
    notesToggle.classList.toggle("is-on", config.showNotes);
    window.dispatchEvent(new CustomEvent("prothesmia:notes-toggle", { detail: config.showNotes }));
  });

  renderAppearanceTab();

  function renderAudioTab() {
    const audio = loadAudioSettings();

    document.getElementById("session-end-toggle").classList.toggle("is-on", audio.sessionEndSound);
    document.getElementById("tick-toggle").classList.toggle("is-on", audio.tickSound);

    const hasBgVideo = Boolean(parseYouTubeUrl(loadBgSettings().videoUrl));
    document.getElementById("video-audio-card").classList.toggle("is-locked", !hasBgVideo);
    const videoSoundToggle = document.getElementById("video-sound-toggle");
    const videoVolInput = document.getElementById("video-vol");
    videoSoundToggle.disabled = !hasBgVideo;
    videoVolInput.disabled = !hasBgVideo;
    videoSoundToggle.classList.toggle("is-on", audio.videoSoundOn);
    videoVolInput.value = audio.videoVol;
    document.getElementById("video-vol-val").textContent = `${audio.videoVol}%`;

    const customSrc = loadCustomAudio();
    document.getElementById("custom-audio-card").classList.toggle("is-locked", !customSrc);
    const customToggle = document.getElementById("custom-toggle");
    const customVolInput = document.getElementById("custom-vol");
    customToggle.classList.toggle("is-on", audio.customOn && Boolean(customSrc));
    customToggle.disabled = !customSrc;
    customVolInput.disabled = !customSrc;
    customVolInput.value = audio.customVol;
    document.getElementById("custom-vol-val").textContent = `${audio.customVol}%`;
    document.getElementById("custom-track-name").textContent = audio.customName || "no track imported";
    const dur = window.prothesmiaCustomAudio?.getDuration() || 0;
    const durLabel = dur ? formatDuration(dur) : "";
    document.getElementById("custom-track-meta").textContent = customSrc
      ? [audio.customOn ? "looping" : "paused", durLabel].filter(Boolean).join(" · ")
      : "";
    document.getElementById("custom-audio-clear").hidden = !customSrc;
    document.getElementById("custom-import-label").textContent = customSrc ? "change" : "+ import audio";

    const ytUrlInput = document.getElementById("ytmusic-url");
    const ytToggle = document.getElementById("ytmusic-toggle");
    const ytCardToggle = document.getElementById("ytmusic-card-toggle");
    const ytVolInput = document.getElementById("ytmusic-vol");
    
    if (document.activeElement !== ytUrlInput) ytUrlInput.value = audio.ytMusicUrl;
    
    ytToggle.classList.toggle("is-on", audio.ytMusicOn);
    ytToggle.disabled = false;
    
    ytCardToggle.classList.toggle("is-on", audio.ytMusicCardVisible !== false && audio.ytMusicOn);
    ytCardToggle.disabled = !audio.ytMusicOn;
    ytVolInput.disabled = !audio.ytMusicOn;
    ytVolInput.value = audio.ytMusicVol;
    ytUrlInput.disabled = !audio.ytMusicOn;
    
    document.getElementById("ytmusic-vol-val").textContent = `${audio.ytMusicVol}%`;
  }

  document.getElementById("session-end-toggle").addEventListener("click", () => {
    const audio = { ...loadAudioSettings() };
    audio.sessionEndSound = !audio.sessionEndSound;
    saveAudioSettings(audio);
    if (audio.sessionEndSound) window.prothesmiaAudioCues?.playSessionEndChime();
    renderAudioTab();
  });

  document.getElementById("tick-toggle").addEventListener("click", () => {
    const audio = { ...loadAudioSettings() };
    audio.tickSound = !audio.tickSound;
    saveAudioSettings(audio);
    if (audio.tickSound) window.prothesmiaAudioCues?.playTickSound();
    renderAudioTab();
  });

  document.getElementById("video-sound-toggle").addEventListener("click", () => {
    const audio = { ...loadAudioSettings() };
    audio.videoSoundOn = !audio.videoSoundOn;
    saveAudioSettings(audio);
    window.prothesmiaVideoAudio?.setMuted(!audio.videoSoundOn);
    renderAudioTab();
  });

  document.getElementById("video-vol").addEventListener("input", (e) => {
    const audio = { ...loadAudioSettings(), videoVol: Number(e.target.value) };
    saveAudioSettings(audio);
    window.prothesmiaVideoAudio?.setVolume(audio.videoVol);
    renderAudioTab();
  });

  document.getElementById("custom-toggle").addEventListener("click", () => {
    if (!loadCustomAudio()) return;
    const audio = { ...loadAudioSettings() };
    audio.customOn = !audio.customOn;
    saveAudioSettings(audio);
    renderAudioTab();
  });

  document.getElementById("custom-vol").addEventListener("input", (e) => {
    const audio = { ...loadAudioSettings(), customVol: Number(e.target.value) };
    saveAudioSettings(audio);
    renderAudioTab();
  });

  const customInput = document.getElementById("custom-audio-input");
  customInput.addEventListener("change", () => {
    const file = customInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = saveCustomAudio(String(reader.result));
      const audio = { ...loadAudioSettings(), customName: file.name, customOn: true };
      saveAudioSettings(audio);
      renderAudioTab();
      if (!ok) {
        alert("that audio file is too large to save permanently, but it'll keep playing for this session");
      }
    };
    reader.readAsDataURL(file);
  });

  document.getElementById("custom-audio-clear").addEventListener("click", () => {
    saveCustomAudio("");
    customInput.value = "";
    const audio = { ...loadAudioSettings(), customOn: false, customName: "" };
    saveAudioSettings(audio);
    renderAudioTab();
  });

  document.getElementById("ytmusic-url").addEventListener("input", (e) => {
    const url = e.target.value.trim();
    const audio = { ...loadAudioSettings(), ytMusicUrl: url };
    saveAudioSettings(audio);
    renderAudioTab();
  });

  document.getElementById("ytmusic-toggle").addEventListener("click", () => {
    const audio = { ...loadAudioSettings() };
    audio.ytMusicOn = !audio.ytMusicOn;
    saveAudioSettings(audio);
    renderAudioTab();
  });

  document.getElementById("ytmusic-card-toggle").addEventListener("click", () => {
    const audio = { ...loadAudioSettings() };
    audio.ytMusicCardVisible = audio.ytMusicCardVisible === false ? true : false;
    saveAudioSettings(audio);
    renderAudioTab();
  });

  document.getElementById("ytmusic-vol").addEventListener("input", (e) => {
    const audio = { ...loadAudioSettings(), ytMusicVol: Number(e.target.value) };
    saveAudioSettings(audio);
    renderAudioTab();
  });

  window.addEventListener("prothesmia:audio-change", renderAudioTab);
  window.addEventListener("prothesmia:bg-change", renderAudioTab);
  renderAudioTab();

  const STEPS = {
    focusMinutes: { min: 1, max: 9999, step: 1 },
    shortBreakMinutes: { min: 1, max: 9999, step: 1 },
    longBreakMinutes: { min: 1, max: 9999, step: 1 },
    sessionsBeforeLongBreak: { min: 1, max: 99, step: 1 },
  };

  function renderTimerTab() {
    const config = loadConfig();
    document.querySelectorAll(".stepper").forEach((stepperEl) => {
      const field = stepperEl.dataset.field;
      const inputEl = stepperEl.querySelector(".val");
      if (document.activeElement !== inputEl) {
        inputEl.value = config[field];
      }
    });
    const autoBtn = document.getElementById("auto-start-toggle");
    autoBtn.classList.toggle("is-on", config.autoStartNext);

    document.querySelectorAll(".label-input[data-label-field]").forEach((input) => {
      if (document.activeElement === input) return;
      input.value = config[input.dataset.labelField];
    });
  }

  document.querySelectorAll(".stepper").forEach((stepperEl) => {
    const field = stepperEl.dataset.field;
    const { min, max, step } = STEPS[field];
    
    stepperEl.querySelectorAll(".stepper-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const config = loadConfig();
        const dir = Number(btn.dataset.dir);
        config[field] = Math.min(max, Math.max(min, config[field] + dir * step));
        saveConfig(config);
        renderTimerTab();
      });
    });

    const inputEl = stepperEl.querySelector(".val");
    inputEl.addEventListener("keydown", (e) => {
      if (["e", "E", "+", "-", "."].includes(e.key)) {
        e.preventDefault();
      }
    });
    inputEl.addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, "");
    });
    inputEl.addEventListener("change", (e) => {
      const config = loadConfig();
      let val = parseInt(e.target.value, 10);
      if (isNaN(val)) val = config[field];
      config[field] = Math.min(max, Math.max(min, val));
      saveConfig(config);
      renderTimerTab();
    });
  });

  document.getElementById("auto-start-toggle").addEventListener("click", () => {
    const config = loadConfig();
    config.autoStartNext = !config.autoStartNext;
    saveConfig(config);
    renderTimerTab();
  });

  document.querySelectorAll(".label-input[data-label-field]").forEach((input) => {
    input.addEventListener("input", () => {
      const config = loadConfig();
      config[input.dataset.labelField] = input.value;
      saveConfig(config);
    });
    input.addEventListener("blur", () => {
      if (input.value.trim()) return;
      const config = loadConfig();
      config[input.dataset.labelField] = DEFAULT_CONFIG[input.dataset.labelField];
      saveConfig(config);
      renderTimerTab();
    });
  });

  renderTimerTab();

  window.prothesmiaSettings = { open, close, toggle };
}
