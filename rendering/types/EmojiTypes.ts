// Shared type definitions for emoji rendering system
// These types provide a consistent interface across all emoji-related components

/**
 * Represents a found emoji location in the document with all necessary metadata
 * Used by scanning, proximity detection, and decoration systems
 */
export interface EmojiLocation {
  /** Start position in document */
  from: number;
  /** End position in document */
  to: number;
  /** The full shortcode text (e.g., ":wave:") */
  shortcode: string;
  /** Full resource path to the emoji image file */
  imagePath: string;
  /** Human-readable label for accessibility (e.g., "wave") */
  label: string;
}

/**
 * Represents a change in emoji proximity visibility state
 * Used by ProximityState to track what changed and trigger rebuilds efficiently
 */
export interface ProximityChange {
  /** Unique identifier for the emoji (typically "from-to") */
  emojiKey: string;
  /** Previous visibility state */
  wasVisible: boolean;
  /** New visibility state */
  isVisible: boolean;
}

/**
 * Represents a range affected by cursor proximity
 * Used by CursorProximity to determine which emojis should be hidden
 */
export interface ProximityRange {
  /** Start of affected range */
  from: number;
  /** End of affected range */
  to: number;
}

/**
 * Result of a change analysis operation
 * Used by ChangeDetector to determine what kind of update is needed
 */
export interface ChangeAnalysis {
  /** Whether the change affects shortcode content (contains colons) */
  affectsShortcodes: boolean;
  /** Whether a full document rescan is needed */
  needsRescan: boolean;
  /** Whether only position mapping is needed */
  needsPositionMapping: boolean;
}