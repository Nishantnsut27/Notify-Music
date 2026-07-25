import { useEffect } from 'react';
import { usePlayerStore } from '../store/playerStore';
import { seekAudio } from './usePlayer';

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;

      // Ignore keyboard shortcuts while user is typing in text inputs or textareas
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable)
      ) {
        return;
      }

      const store = usePlayerStore.getState();
      const key = event.key;
      const code = event.code;

      // Space: Toggle Play / Pause
      if (key === ' ' || code === 'Space') {
        event.preventDefault();
        if (store.currentTrack) {
          store.setIsPlaying(!store.isPlaying);
        }
        return;
      }

      // ArrowLeft: Seek -5 seconds (Clamped to 0)
      if (key === 'ArrowLeft') {
        event.preventDefault();
        if (store.currentTrack) {
          seekAudio(Math.max(0, store.currentTime - 5));
        }
        return;
      }

      // ArrowRight: Seek +5 seconds (Clamped to duration or triggers nextTrack)
      if (key === 'ArrowRight') {
        event.preventDefault();
        if (store.currentTrack) {
          const targetTime = store.currentTime + 5;
          const duration = store.duration || 0;

          if (duration > 0 && targetTime >= duration) {
            if (store.repeatMode === 'one') {
              seekAudio(0);
            } else {
              store.nextTrack();
            }
          } else {
            seekAudio(targetTime);
          }
        }
        return;
      }

      // ArrowUp: Volume +10%
      if (key === 'ArrowUp') {
        event.preventDefault();
        store.setVolume(Math.min(100, store.volume + 10));
        return;
      }

      // ArrowDown: Volume -10%
      if (key === 'ArrowDown') {
        event.preventDefault();
        store.setVolume(Math.max(0, store.volume - 10));
        return;
      }

      // 'm' or 'M': Toggle Mute
      if (key === 'm' || key === 'M' || code === 'KeyM') {
        event.preventDefault();
        store.toggleMute();
        return;
      }

      // 's' or 'S': Toggle Shuffle
      if (key === 's' || key === 'S' || code === 'KeyS') {
        event.preventDefault();
        store.toggleShuffle();
        return;
      }

      // 'r' or 'R': Cycle Repeat Mode ('none' -> 'all' -> 'one' -> 'none')
      if (key === 'r' || key === 'R' || code === 'KeyR') {
        event.preventDefault();
        const nextRepeat = store.repeatMode === 'none' ? 'all' : store.repeatMode === 'all' ? 'one' : 'none';
        store.setRepeatMode(nextRepeat);
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
