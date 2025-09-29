// Decoration creation and management for emoji widgets
// Extracts decoration building logic from EmojiMarker.buildDecorationsFromCache()

import { Decoration, DecorationSet } from "@codemirror/view";
// Access RangeSet for atomic ranges
// @ts-ignore - External dependency available at runtime
const { RangeSet } = require('@codemirror/state');

import { EmojiWidget } from "../EmojiWidget";
import { EmojiLocation } from "../../types/EmojiTypes";

/**
 * Creates and manages CodeMirror 6 decorations for emoji widgets
 *
 * This class extracts the decoration creation logic from the original
 * EmojiMarker.buildDecorationsFromCache() method to provide focused
 * decoration management.
 */
export class EmojiDecorator {

  /**
   * Create a single emoji widget decoration
   * Extracted from the widget creation logic in buildDecorationsFromCache()
   *
   * @param emoji Emoji location and metadata
   * @returns Decoration for this emoji
   */
  createWidget(emoji: EmojiLocation): Decoration {
    return Decoration.replace({
      widget: new EmojiWidget(emoji.shortcode, emoji.imagePath, emoji.label)
    });
  }

  /**
   * Build complete decoration set from emoji locations
   * Extracted from EmojiMarker.buildDecorationsFromCache() with all optimizations preserved
   *
   * @param visibleEmojis Array of emojis that should be visible (not hidden by proximity)
   * @returns DecorationSet for CodeMirror 6
   */
  buildDecorations(visibleEmojis: EmojiLocation[]): DecorationSet {
    const decorations: Array<{from: number, to: number, decoration: Decoration}> = [];

    for (const emoji of visibleEmojis) {
      try {
        const widgetDecoration = this.createWidget(emoji);
        decorations.push({
          from: emoji.from,
          to: emoji.to,
          decoration: widgetDecoration
        });
      } catch (error) {
        console.warn("EmojiDecorator: Error creating emoji decoration:", error);
      }
    }

    // Handle empty case
    if (decorations.length === 0) {
      return Decoration.none;
    }

    // Sort and remove overlaps (shouldn't happen with our scanning, but safety first)
    // Preserves original safety mechanism
    decorations.sort((a, b) => a.from - b.from);
    const cleanDecorations = [];
    let lastEnd = 0;

    for (const dec of decorations) {
      if (dec.from >= lastEnd) {
        cleanDecorations.push(dec);
        lastEnd = dec.to;
      }
    }

    return Decoration.set(cleanDecorations.map(d => d.decoration.range(d.from, d.to)));
  }

  /**
   * Create atomic ranges for emoji widgets
   * Extracted from EmojiMarker.getAtomicRanges() method
   *
   * @param decorations Current decoration set
   * @param docLength Document length for bounds checking
   * @returns RangeSet for atomic behavior
   */
  createAtomicRanges(decorations: DecorationSet, docLength: number): any {
    const ranges: Array<{ from: number, to: number }> = [];

    decorations.between(0, docLength, (from: number, to: number) => {
      ranges.push({ from, to });
    });

    if (ranges.length === 0) {
      return RangeSet.empty;
    }

    // Sort ranges and create RangeSet
    // Preserves original sorting and creation logic
    ranges.sort((a, b) => a.from - b.from);

    return RangeSet.of(ranges.map(r => ({
      from: r.from,
      to: r.to,
      value: null
    })));
  }

  /**
   * Filter emojis by visibility map for decoration building
   * Helper method to prepare emojis for decoration creation
   *
   * @param allEmojis All emoji locations found in document
   * @param visibilityMap Map of emoji keys to visibility state
   * @returns Array of emojis that should be visible
   */
  filterVisibleEmojis(
    allEmojis: EmojiLocation[],
    visibilityMap: Map<string, boolean>
  ): EmojiLocation[] {
    return allEmojis.filter(emoji => {
      const key = `${emoji.from}-${emoji.to}`;
      return visibilityMap.get(key) === true;
    });
  }

  /**
   * Validate decoration ranges for safety
   * Ensures decorations don't exceed document bounds
   *
   * @param emojis Emoji locations to validate
   * @param docLength Current document length
   * @returns Valid emoji locations within document bounds
   */
  validateRanges(emojis: EmojiLocation[], docLength: number): EmojiLocation[] {
    return emojis.filter(emoji => {
      return emoji.from >= 0 &&
             emoji.to > emoji.from &&
             emoji.to <= docLength;
    });
  }
}