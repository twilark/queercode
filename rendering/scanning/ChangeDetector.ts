// Document change analysis for efficient emoji update decisions
// Determines what type of update is needed when document changes

import { ViewUpdate } from "@codemirror/view";
import { ChangeAnalysis } from "../types/EmojiTypes";

/**
 * Analyzes document changes to determine optimal update strategy
 *
 * This class extracts the change detection logic from EmojiMarker.changeAffectsShortcodes()
 * and related methods to provide focused, testable change analysis.
 */
export class ChangeDetector {

  /**
   * Analyze document changes to determine update strategy
   * Extracted from original EmojiMarker.changeAffectsShortcodes() method
   *
   * @param update ViewUpdate containing change information
   * @returns Analysis indicating what type of update is needed
   */
  affectsEmojis(update: ViewUpdate): ChangeAnalysis {
    let hasShortcodeChanges = false;

    // Simple, fast detection - only check for colons
    update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
      const deletedText = update.startState.doc.sliceString(fromA, toA);
      const insertedText = inserted.toString();

      // Only rescan if we're completing a shortcode (closing colon)
      if (insertedText === ':' && deletedText === '') {
        // Check if this could be a closing colon by looking for recent opening colon
        const beforePos = Math.max(0, fromA - 50); // Look back max 50 chars
        const beforeText = update.startState.doc.sliceString(beforePos, fromA);
        const lastColonIndex = beforeText.lastIndexOf(':');

        if (lastColonIndex >= 0) {
          // Check if the text between colons looks like a shortcode (no spaces/newlines)
          const betweenText = beforeText.slice(lastColonIndex + 1);
          if (betweenText.length > 0 && !/[\s\n]/.test(betweenText)) {
            hasShortcodeChanges = true;
          }
        }
      } else if (deletedText.includes(':')) {
        // Deleting colons always needs rescan
        hasShortcodeChanges = true;
      }
    });

    return {
      affectsShortcodes: hasShortcodeChanges,
      needsRescan: hasShortcodeChanges,
      needsPositionMapping: !hasShortcodeChanges
    };
  }

  /**
   * Determine if a ViewUpdate requires emoji processing
   * Higher-level analysis method for common update decision making
   *
   * @param update ViewUpdate to analyze
   * @returns true if any emoji processing is needed
   */
  needsUpdate(update: ViewUpdate): boolean {
    // Document changes always need some form of processing
    if (update.docChanged) {
      return true;
    }

    // Selection changes need proximity checking
    if (update.selectionSet) {
      return true;
    }

    // No processing needed for other update types
    return false;
  }

  /**
   * Check if changes involve only whitespace or non-shortcode content
   * Optimization to skip processing for trivial changes
   *
   * @param update ViewUpdate to analyze
   * @returns true if changes are trivial and can be skipped
   */
  isTrivialChange(update: ViewUpdate): boolean {
    if (!update.docChanged) {
      return true; // Non-document changes are trivial for emoji processing
    }

    let onlyWhitespace = true;

    update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
      const deletedText = update.startState.doc.sliceString(fromA, toA);
      const insertedText = inserted.toString();

      // Check if changes involve only whitespace
      if (deletedText.trim() !== '' || insertedText.trim() !== '') {
        onlyWhitespace = false;
      }
    });

    return onlyWhitespace;
  }

  /**
   * Detect when complete emoji shortcodes are inserted (e.g., from suggester)
   * Moved from EmojiLive.ts for better separation of concerns
   *
   * @param update ViewUpdate to analyze
   * @param emojiMap Current emoji map from service
   * @returns true if complete emoji shortcodes were inserted
   */
  detectsEmojiInsertion(update: ViewUpdate, emojiMap: Record<string, string>): boolean {
    const emojiShortcodes = Object.keys(emojiMap);
    if (emojiShortcodes.length === 0) return false;

    let hasEmojiInsertion = false;

    update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
      const insertedText = inserted.toString();

      // Check if any complete emoji shortcode was inserted
      for (const shortcode of emojiShortcodes) {
        if (insertedText.includes(shortcode)) {
          hasEmojiInsertion = true;
          break;
        }
      }
    });

    return hasEmojiInsertion;
  }

  /**
   * Analyze specific change for shortcode boundary detection
   * Detailed analysis for debugging and fine-grained optimization
   *
   * @param deletedText Text that was removed
   * @param insertedText Text that was added
   * @returns Analysis of this specific change
   */
  analyzeChange(deletedText: string, insertedText: string): ChangeAnalysis {
    const affectsShortcodes = deletedText.includes(':') || insertedText.includes(':');

    return {
      affectsShortcodes,
      needsRescan: affectsShortcodes,
      needsPositionMapping: !affectsShortcodes
    };
  }

  /**
   * Check if change affects emoji at specific position
   * Useful for position-specific update optimizations
   *
   * @param changeFrom Start position of change
   * @param changeTo End position of change
   * @param emojiFrom Start position of emoji
   * @param emojiTo End position of emoji
   * @returns true if change affects this emoji's position or content
   */
  changeAffectsEmoji(
    changeFrom: number,
    changeTo: number,
    emojiFrom: number,
    emojiTo: number
  ): boolean {
    // Change affects emoji if ranges overlap or change is before emoji
    // (changes before emoji affect position mapping)
    return changeFrom <= emojiTo;
  }
}