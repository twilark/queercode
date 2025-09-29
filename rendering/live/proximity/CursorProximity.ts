// Cursor proximity detection for emoji visibility
// Determines which emojis should be hidden based on cursor/selection position

import { EditorSelection } from "@codemirror/state";
import { EmojiLocation, ProximityRange } from "../../types/EmojiTypes";

/**
 * Handles proximity-based emoji visibility logic
 * Shows emoji unless cursor is within HIDE_DISTANCE characters of the emoji
 *
 * This class extracts the proximity detection logic from the original EmojiMarker
 * to provide a focused, testable component for cursor-based hiding behavior.
 */
export class CursorProximity {
  /** Distance in characters within which emojis are hidden - 1 means hide when cursor is within 1 character of emoji boundaries */
  private static readonly HIDE_DISTANCE = 1;

  // Removed caching to eliminate timing issues

  /**
   * Determine if an emoji should be hidden due to cursor proximity
   * Extracted from original EmojiMarker.shouldHideEmoji() method
   *
   * @param emojiFrom Start position of emoji in document
   * @param emojiTo End position of emoji in document
   * @param selection Current editor selection/cursor state
   * @returns true if emoji should be hidden, false if it should be visible
   */
  shouldHide(
    emojiFrom: number,
    emojiTo: number,
    selection: EditorSelection
  ): boolean {
    const cursor = selection.main.head;
    const buffer = CursorProximity.HIDE_DISTANCE;

    // Hide emoji if cursor is within buffer distance of emoji boundaries
    // This creates a buffer zone around the emoji where it remains hidden for editing
    return cursor >= (emojiFrom - buffer) && cursor <= (emojiTo + buffer);
  }

  /**
   * OPTIMIZED: Get ranges affected by current cursor/selection position with caching
   * Extracted from original EmojiMarker.getAffectedRanges() method
   *
   * @param selection Current editor selection state
   * @returns Array of ranges that should cause emoji hiding
   */
  getAffectedRanges(selection: EditorSelection): ProximityRange[] {
    const buffer = CursorProximity.HIDE_DISTANCE;
    const mainSelection = selection.main;

    if (mainSelection.empty) {
      // Single cursor position - create buffer around cursor
      return [{
        from: mainSelection.head - buffer,
        to: mainSelection.head + buffer
      }];
    } else {
      // Text selection - create buffer around entire selection
      return [{
        from: mainSelection.from - buffer,
        to: mainSelection.to + buffer
      }];
    }
  }

  /**
   * Check proximity state for all emojis at once
   * Returns a map of emoji keys to their visibility state
   *
   * This method optimizes the common case of checking all emojis
   * and provides the data needed for ProximityState tracking
   *
   * @param emojis Array of emoji locations to check
   * @param selection Current editor selection state
   * @returns Map from emoji key to visibility state (true = visible, false = hidden)
   */
  checkAll(
    emojis: EmojiLocation[],
    selection: EditorSelection
  ): Map<string, boolean> {
    const visibilityMap = new Map<string, boolean>();

    for (const emoji of emojis) {
      const key = `${emoji.from}-${emoji.to}`;
      const shouldShow = !this.shouldHide(emoji.from, emoji.to, selection);
      visibilityMap.set(key, shouldShow);
    }

    return visibilityMap;
  }
}