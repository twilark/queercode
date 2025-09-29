// Proximity state tracking for efficient rebuild detection
// Tracks when emoji visibility state changes to avoid unnecessary decoration rebuilds

import { ProximityChange } from "../../types/EmojiTypes";

/**
 * Tracks proximity-based visibility state changes to optimize decoration rebuilds
 * Only triggers rebuilds when emoji visibility actually changes
 *
 * This class extracts the state tracking logic from the original EmojiMarker
 * to provide efficient change detection for proximity-based hiding.
 */
export class ProximityState {
  /** Previous visibility state for each emoji (key: "from-to", value: isVisible) */
  private lastState = new Map<string, boolean>();

  /**
   * Check if proximity state has changed since last update
   * Extracted from original EmojiMarker.proximityStateChanged() method
   *
   * @param currentState Current visibility state for all emojis
   * @returns true if any emoji visibility changed, false if no changes
   */
  hasChanged(currentState: Map<string, boolean>): boolean {
    // Check if any emoji's visibility state changed
    for (const [emojiKey, currentVisible] of currentState) {
      const lastVisible = this.lastState.get(emojiKey);

      // Handle undefined case explicitly - new emojis or visibility changes
      if (lastVisible === undefined || currentVisible !== lastVisible) {
        return true;
      }
    }

    // Also check if any emojis were removed (exist in last but not current)
    for (const emojiKey of this.lastState.keys()) {
      if (!currentState.has(emojiKey)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Update stored state with new visibility information
   * Should be called after rebuilding decorations to store the new baseline
   *
   * @param newState New visibility state to store for future comparisons
   */
  update(newState: Map<string, boolean>): void {
    // Replace the entire state map with the new state
    this.lastState = new Map(newState);
  }

  /**
   * Determine if decorations should be rebuilt based on state changes
   * Combines change detection with update in one operation
   *
   * @param currentState Current visibility state for all emojis
   * @returns true if rebuild is needed, false if current decorations are still valid
   */
  shouldRebuild(currentState: Map<string, boolean>): boolean {
    const changed = this.hasChanged(currentState);

    if (changed) {
      this.update(currentState);
    }

    return changed;
  }

  /**
   * Get detailed information about what changed
   * Useful for debugging and fine-grained update optimizations
   *
   * @param currentState Current visibility state for all emojis
   * @returns Array of changes with before/after state
   */
  getChanges(currentState: Map<string, boolean>): ProximityChange[] {
    const changes: ProximityChange[] = [];

    // Check for visibility changes in current emojis
    for (const [emojiKey, isVisible] of currentState) {
      const wasVisible = this.lastState.get(emojiKey) ?? false;

      if (isVisible !== wasVisible) {
        changes.push({
          emojiKey,
          wasVisible,
          isVisible
        });
      }
    }

    // Check for removed emojis
    for (const emojiKey of this.lastState.keys()) {
      if (!currentState.has(emojiKey)) {
        changes.push({
          emojiKey,
          wasVisible: this.lastState.get(emojiKey) ?? false,
          isVisible: false
        });
      }
    }

    return changes;
  }

  /**
   * Clear all stored state
   * Useful when document changes require a fresh start
   */
  clear(): void {
    this.lastState.clear();
  }
}