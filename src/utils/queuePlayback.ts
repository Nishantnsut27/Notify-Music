import type { Track } from '../types/types';

interface QueuePosition {
  queue: readonly Track[];
  currentIndex: number;
  isShuffling: boolean;
  shuffleOrder: readonly number[];
  shufflePosition: number;
  repeatMode: 'none' | 'one' | 'all';
}

/** Shared by playback and prefetch so both choose the same queue occurrence. */
export function getNextQueuePosition(state: QueuePosition): { index: number; shufflePosition: number } | null {
  if (state.queue.length === 0) return null;
  if (state.repeatMode === 'one') {
    return state.currentIndex >= 0 ? { index: state.currentIndex, shufflePosition: state.shufflePosition } : null;
  }
  if (state.isShuffling && state.shuffleOrder.length > 0) {
    let position = state.shufflePosition + 1;
    if (position >= state.shuffleOrder.length) {
      if (state.repeatMode !== 'all') return null;
      position = 0;
    }
    const index = state.shuffleOrder[position];
    return state.queue[index] ? { index, shufflePosition: position } : null;
  }
  let index = state.currentIndex + 1;
  if (index >= state.queue.length) {
    if (state.repeatMode !== 'all') return null;
    index = 0;
  }
  return { index, shufflePosition: state.shufflePosition };
}

/**
 * Where a listener's Next goes. Repeat-one only replays a song that ends on its
 * own; a skip walks the queue as repeat-all would.
 */
export function getSkipQueuePosition(state: QueuePosition): { index: number; shufflePosition: number } | null {
  return getNextQueuePosition(state.repeatMode === 'one' ? { ...state, repeatMode: 'all' } : state);
}

/**
 * Steps the shuffle walk back onto `index`, the entry Previous returns to.
 *
 * It is placed directly before the current slot so Next afterwards comes back
 * to the song that was playing. When it already sits there this is one step
 * back; when it played before shuffle was turned on it is moved there, rather
 * than jumping ahead to wherever the walk had put it.
 */
export function stepBackInShuffle(
  shuffleOrder: readonly number[],
  shufflePosition: number,
  index: number,
): { shuffleOrder: number[]; shufflePosition: number } {
  const removedAt = shuffleOrder.indexOf(index);
  const order = shuffleOrder.filter(i => i !== index);
  let slot = removedAt !== -1 && removedAt < shufflePosition ? shufflePosition - 1 : shufflePosition;
  slot = Math.max(0, Math.min(slot, order.length));
  order.splice(slot, 0, index);
  return { shuffleOrder: order, shufflePosition: slot };
}

/** The queue indices playback will walk through when songs end, stopping where it would. */
export function getUpcomingQueueIndexes(state: QueuePosition, count: number): number[] {
  const indexes: number[] = [];
  let position: QueuePosition = state;
  while (indexes.length < count) {
    const next = getNextQueuePosition(position);
    if (!next) break;
    indexes.push(next.index);
    // Repeat-one, or repeat-all over a single entry, replays the same occurrence.
    if (next.index === position.currentIndex) break;
    position = { ...position, currentIndex: next.index, shufflePosition: next.shufflePosition };
  }
  return indexes;
}
