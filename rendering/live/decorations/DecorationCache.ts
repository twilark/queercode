// Simple decoration caching for emoji decorations
// Wraps decoration storage with a clean interface

import { Decoration, DecorationSet } from "@codemirror/view";

/**
 * Simple wrapper around decoration storage for emoji widgets
 *
 * This class extracts the decoration caching logic from the original
 * EmojiMarker.decorations property to provide a focused interface.
 */
export class DecorationCache {
  /** Current cached decorations */
  private decorations: DecorationSet = Decoration.none;

  /**
   * Get current decorations
   * @returns Current decoration set
   */
  get(): DecorationSet {
    return this.decorations;
  }

  /**
   * Update cached decorations
   * @param newDecorations New decoration set to cache
   */
  update(newDecorations: DecorationSet): void {
    this.decorations = newDecorations;
  }

  /**
   * Check if cache is empty
   * @returns true if no decorations are cached
   */
  isEmpty(): boolean {
    return this.decorations === Decoration.none;
  }

  /**
   * Clear all cached decorations
   * Sets cache back to empty state
   */
  clear(): void {
    this.decorations = Decoration.none;
  }

  /**
   * Get count of cached decorations for debugging
   * @param docLength Document length for iteration bounds
   * @returns Number of decorations in cache
   */
  getCount(docLength: number): number {
    let count = 0;
    this.decorations.between(0, docLength, () => {
      count++;
    });
    return count;
  }

  /**
   * Iterate over all decorations in cache
   * @param docLength Document length for iteration bounds
   * @param callback Function to call for each decoration
   */
  forEach(docLength: number, callback: (from: number, to: number) => void): void {
    this.decorations.between(0, docLength, callback);
  }

  /**
   * Check if decoration exists at specific position
   * @param position Position to check
   * @param docLength Document length for bounds
   * @returns true if decoration exists at position
   */
  hasDecorationAt(position: number, docLength: number): boolean {
    let found = false;
    this.decorations.between(position, position + 1, () => {
      found = true;
    });
    return found;
  }
}