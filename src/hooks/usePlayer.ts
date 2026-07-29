import { useCallback, useEffect, useRef } from 'react';
import type { Track } from '../types/types';
import { STORAGE_KEYS } from '../config/constants';
import { usePlayerStore } from '../store/playerStore';

let singletonAudio: HTMLAudioElement | null = null;
let listenersAttached = false;
let activeTrackId = '';
let sourceGeneration = 0;
let fallbackGeneration = -1;
let lastReportedTime = -1;
let suppressPauseEvent = false;

export function getAudio(): HTMLAudioElement {
  if (!singletonAudio) {
    const existing = typeof document !== 'undefined' ? document.getElementById('music-player-audio') as HTMLAudioElement | null : null;
    singletonAudio = existing || new Audio();
    singletonAudio.id = 'music-player-audio';
    singletonAudio.preload = 'auto';
    if (typeof document !== 'undefined' && document.body && !document.body.contains(singletonAudio)) document.body.appendChild(singletonAudio);
  }
  return singletonAudio;
}

export function seekAudio(targetTime: number) {
  const audio = getAudio();
  const state = usePlayerStore.getState();
  const max = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : state.duration || state.currentTrack?.duration || 0;
  const time = Math.max(0, max ? Math.min(targetTime, max) : targetTime);
  if (!Number.isFinite(time) || !state.currentTrack) return;
  try { audio.currentTime = time; state.setCurrentTime(time); } catch { /* Media is not seekable yet. */ }
}

function persistPlayback() {
  const { currentTrack, currentTime } = usePlayerStore.getState();
  if (!currentTrack || typeof sessionStorage === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEYS.PLAYBACK, JSON.stringify({ track: currentTrack, position: currentTime }));
}

function updateMediaSession(track: Track) {
  if (!('mediaSession' in navigator)) return;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: track.name,
    artist: track.artist_name,
    album: track.album_name,
    artwork: [{ src: track.image || track.album_image || '/Favicon.png', sizes: '512x512', type: 'image/jpeg' }],
  });
}

function attachAudioListeners(audio: HTMLAudioElement) {
  if (listenersAttached) return;
  listenersAttached = true;
  const store = () => usePlayerStore.getState();
  audio.addEventListener('timeupdate', () => {
    if (Math.abs(audio.currentTime - lastReportedTime) >= 0.15 || lastReportedTime < 0) {
      lastReportedTime = audio.currentTime;
      store().setCurrentTime(audio.currentTime);
      if ('mediaSession' in navigator && Number.isFinite(audio.duration) && audio.duration > 0) {
        try { navigator.mediaSession.setPositionState({ duration: audio.duration, position: Math.min(audio.currentTime, audio.duration) }); } catch { /* Unsupported media-session state. */ }
      }
      persistPlayback();
    }
  });
  audio.addEventListener('loadedmetadata', () => {
    if (Number.isFinite(audio.duration) && audio.duration > 0) store().setDuration(audio.duration);
  });
  audio.addEventListener('waiting', () => store().setBuffering(true));
  audio.addEventListener('stalled', () => store().setBuffering(true));
  audio.addEventListener('canplay', () => {
    const state = store();
    state.setBuffering(false);
    if (state.isPlaying && audio.paused) {
      void audio.play().catch((err) => {
        if (err?.name === 'AbortError') return;
        state.setPlaybackError('Playback could not start. Please try again.');
      });
    }
  });
  audio.addEventListener('playing', () => { store().setBuffering(false); store().setIsPlaying(true); });
  audio.addEventListener('pause', () => { if (!audio.ended && !suppressPauseEvent) store().setIsPlaying(false); });
  audio.addEventListener('ended', () => {
    const state = store();
    if (state.repeatMode === 'one') { audio.currentTime = 0; void audio.play().catch(() => {}); } else state.nextTrack();
  });
  audio.addEventListener('error', () => {
    const state = store();
    const track = state.currentTrack;
    if (track && fallbackGeneration !== sourceGeneration && track.audiodownload && track.audiodownload !== audio.currentSrc) {
      fallbackGeneration = sourceGeneration;
      audio.src = track.audiodownload;
      audio.load();
      return;
    }
    state.setIsPlaying(false);
    state.setPlaybackError('This stream is unavailable. Check your connection and retry.');
  });
}

export function usePlayer() {
  const audio = getAudio();
  const restored = useRef(false);
  const state = usePlayerStore();
  const { currentTrack, isPlaying, volume, isMuted, queue, currentIndex, isShuffling, repeatMode, playTrack, pauseTrack, nextTrack, previousTrack, setIsPlaying, setVolume, toggleMute, setBuffering, setPlaybackError } = state;

  useEffect(() => { attachAudioListeners(audio); }, [audio]);
  useEffect(() => {
    if (restored.current || currentTrack || typeof sessionStorage === 'undefined') return;
    restored.current = true;
    try {
      const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEYS.PLAYBACK) || '');
      if (saved?.track?.id) usePlayerStore.setState({ currentTrack: saved.track, currentTime: Number(saved.position) || 0, duration: saved.track.duration || 0, isPlaying: false });
    } catch { /* Nothing to restore. */ }
  }, [currentTrack]);

  useEffect(() => {
    if (!currentTrack) {
      if (activeTrackId) {
        suppressPauseEvent = true;
        audio.pause();
        audio.removeAttribute('src');
        audio.load();
        activeTrackId = '';
        queueMicrotask(() => { suppressPauseEvent = false; });
      }
      return;
    }
    updateMediaSession(currentTrack);
    if (activeTrackId === currentTrack.id) return;
    activeTrackId = currentTrack.id;
    sourceGeneration += 1;
    fallbackGeneration = -1;
    lastReportedTime = -1;
    suppressPauseEvent = true;
    audio.pause();
    queueMicrotask(() => { suppressPauseEvent = false; });
    audio.removeAttribute('src');
    audio.load();
    audio.src = currentTrack.audio || currentTrack.audiodownload;
    audio.load();
    setPlaybackError(null);
    setBuffering(isPlaying);
  }, [audio, currentTrack, isPlaying, setBuffering, setPlaybackError]);

  useEffect(() => {
    audio.volume = isMuted ? 0 : Math.max(0, Math.min(1, volume / 100));
  }, [audio, volume, isMuted]);
  useEffect(() => {
    if (!currentTrack) return;
    if (isPlaying) {
      setBuffering(audio.readyState < HTMLMediaElement.HAVE_FUTURE_DATA);
      void audio.play().catch((err) => {
        if (err?.name === 'AbortError') return;
        setIsPlaying(false);
        setPlaybackError('Playback was blocked or the stream could not start. Retry to continue.');
      });
    } else if (!audio.paused) audio.pause();
  }, [audio, currentTrack, isPlaying, setBuffering, setIsPlaying, setPlaybackError]);
  useEffect(() => {
    if (!('mediaSession' in navigator)) return;
    navigator.mediaSession.setActionHandler('play', () => setIsPlaying(true));
    navigator.mediaSession.setActionHandler('pause', () => pauseTrack());
    navigator.mediaSession.setActionHandler('nexttrack', () => nextTrack());
    navigator.mediaSession.setActionHandler('previoustrack', () => previousTrack());
    navigator.mediaSession.setActionHandler('seekbackward', () => seekAudio(audio.currentTime - 10));
    navigator.mediaSession.setActionHandler('seekforward', () => seekAudio(audio.currentTime + 10));
  }, [audio, nextTrack, pauseTrack, previousTrack, setIsPlaying]);
  useEffect(() => () => persistPlayback(), []);

  const play = useCallback((track?: Track) => { if (track) playTrack(track); else setIsPlaying(true); }, [playTrack, setIsPlaying]);
  const pause = useCallback(() => pauseTrack(), [pauseTrack]);
  const togglePlayPause = useCallback(() => { if (isPlaying) pause(); else play(); }, [isPlaying, pause, play]);
  return { currentTrack, isPlaying, isBuffering: state.isBuffering, playbackError: state.playbackError, volume, isMuted, queue, currentIndex, isShuffling, repeatMode, play, pause, togglePlayPause, nextTrack, previousTrack, seek: seekAudio, changeVolume: setVolume, mute: toggleMute, retry: () => setIsPlaying(true), audioRef: { current: audio } };
}
