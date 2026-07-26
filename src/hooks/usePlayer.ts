import { useEffect, useCallback } from 'react';
import type { Track } from '../types/types';
import { usePlayerStore } from '../store/playerStore';

// ─── Module-level singleton Audio instance ───────────────────────────
// Only ONE Audio element ever exists, shared across all usePlayer() callers.
let singletonAudio: HTMLAudioElement | null = null;
let listenersAttached = false;

export function getAudio(): HTMLAudioElement {
  if (!singletonAudio) {
    if (typeof document !== 'undefined') {
      const existing = document.getElementById('music-player-audio') as HTMLAudioElement;
      if (existing) {
        singletonAudio = existing;
      } else {
        singletonAudio = document.createElement('audio');
        singletonAudio.id = 'music-player-audio';
        singletonAudio.className = 'global-audio-player';
        singletonAudio.preload = 'metadata';
        if (document.body) {
          document.body.appendChild(singletonAudio);
        }
      }
    } else {
      singletonAudio = new Audio();
    }
  } else if (typeof document !== 'undefined' && document.body && !document.body.contains(singletonAudio)) {
    document.body.appendChild(singletonAudio);
  }
  return singletonAudio;
}

export function seekAudio(targetTime: number) {
  const audio = getAudio();
  const state = usePlayerStore.getState();
  if (!state.currentTrack) return;

  const maxDuration = audio.duration && !isNaN(audio.duration) && audio.duration > 0 
    ? audio.duration 
    : (state.duration || state.currentTrack.duration || 0);
    
  let clampedTime = Math.max(0, targetTime);
  if (maxDuration > 0) {
    clampedTime = Math.min(clampedTime, maxDuration);
  }

  if (isFinite(clampedTime)) {
    try {
      audio.currentTime = clampedTime;
    } catch (e) {
      console.warn('[usePlayer] Seek error:', e);
    }
    state.setCurrentTime(clampedTime);
  }
}

// ─── Hook ────────────────────────────────────────────────────────────
export function usePlayer() {
  const audio = getAudio();

  const {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    queue,
    currentIndex,
    isShuffling,
    repeatMode,
    setIsPlaying,
    playTrack,
    pauseTrack,
    nextTrack,
    previousTrack,
    setVolume,
    toggleMute,
  } = usePlayerStore();

  // ── Attach event listeners ONCE (module-level singleton) ──────────
  useEffect(() => {
    if (listenersAttached) return;
    listenersAttached = true;

    const handleTimeUpdate = () => {
      if (singletonAudio) {
        usePlayerStore.getState().setCurrentTime(singletonAudio.currentTime);
      }
    };

    const handleLoadedMetadata = () => {
      if (singletonAudio && singletonAudio.duration && !isNaN(singletonAudio.duration)) {
        usePlayerStore.getState().setDuration(singletonAudio.duration);
      }
    };

    const handleEnded = () => {
      const state = usePlayerStore.getState();
      if (state.repeatMode === 'one' && singletonAudio) {
        singletonAudio.currentTime = 0;
        singletonAudio.play().catch(console.error);
      } else {
        state.nextTrack();
      }
    };

    const handleError = () => {
      console.error('Audio playback error');
      const state = usePlayerStore.getState();
      // Try fallback URL if available
      const track = state.currentTrack;
      if (track && track.audiodownload && track.audiodownload !== track.audio && singletonAudio) {
        singletonAudio.src = track.audiodownload;
        singletonAudio.load();
      } else {
        state.setIsPlaying(false);
      }
    };

    const handleCanPlay = () => {
      const state = usePlayerStore.getState();
      if (state.isPlaying && singletonAudio && singletonAudio.paused) {
        singletonAudio.play().catch(console.error);
      }
    };

    singletonAudio!.addEventListener('timeupdate', handleTimeUpdate);
    singletonAudio!.addEventListener('loadedmetadata', handleLoadedMetadata);
    singletonAudio!.addEventListener('ended', handleEnded);
    singletonAudio!.addEventListener('error', handleError);
    singletonAudio!.addEventListener('canplay', handleCanPlay);
  }, []);

  // ── Sync track changes → same singleton Audio ────────────────────
  useEffect(() => {
    if (currentTrack && audio) {
      if (audio.src !== currentTrack.audio) {
        audio.src = currentTrack.audio;
        audio.load();
        if (isPlaying) {
          audio.play().catch(console.error);
        }
      }
    }
  }, [currentTrack, audio, isPlaying]);

  // ── Sync play/pause → same singleton Audio ───────────────────────
  useEffect(() => {
    if (audio && currentTrack) {
      if (isPlaying && audio.paused) {
        audio.play().catch(console.error);
      } else if (!isPlaying && !audio.paused) {
        audio.pause();
      }
    }
  }, [isPlaying, audio, currentTrack]);

  // ── Sync volume → same singleton Audio ───────────────────────────
  useEffect(() => {
    if (audio) {
      audio.volume = isMuted ? 0 : volume / 100;
    }
  }, [volume, isMuted, audio]);

  // ── Public API (stable callbacks) ─────────────────────────────────
  const play = useCallback(
    (track?: Track) => {
      if (track) {
        playTrack(track);
      } else {
        setIsPlaying(true);
      }
      if (singletonAudio) {
        singletonAudio.play().catch(console.error);
      }
    },
    [playTrack, setIsPlaying],
  );

  const pause = useCallback(() => {
    pauseTrack();
  }, [pauseTrack]);

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  const seek = useCallback(
    (time: number) => {
      seekAudio(time);
    },
    [],
  );

  const changeVolume = useCallback(
    (newVolume: number) => {
      setVolume(newVolume);
    },
    [setVolume],
  );

  const mute = useCallback(() => {
    toggleMute();
  }, [toggleMute]);

  return {
    currentTrack,
    isPlaying,
    volume,
    isMuted,
    queue,
    currentIndex,
    isShuffling,
    repeatMode,
    play,
    pause,
    togglePlayPause,
    nextTrack,
    previousTrack,
    seek,
    changeVolume,
    mute,
    audioRef: { current: audio },
  };
}
