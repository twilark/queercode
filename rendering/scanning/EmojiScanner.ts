// Unified emoji scanning and document analysis
// Merges functionality from ShortcodeScanner and EmojiMarker scanning logic

import { App } from "obsidian";
import { EmojiCooker } from "../../services/EmojiCooker";
import { EmojiLocation } from "../types/EmojiTypes";

/**
 * Finds and validates emoji shortcodes in text with caching for performance
 *
 * This class merges the functionality from:
 * - ShortcodeScanner.ts: shortcode finding and validation
 * - EmojiMarker.rescanDocument(): document iteration and caching
 *
 * Provides a unified, efficient scanning interface with performance optimizations
 */
export class EmojiScanner {
  /** Cache of emoji locations to avoid rescanning on every update */
  private cachedEmojiLocations: EmojiLocation[] = [];

  constructor(
    private emojiService: EmojiCooker,
    private app: App
  ) {}

  /**
   * Scan entire document for emoji shortcodes
   * Extracted and optimized from EmojiMarker.rescanDocument()
   *
   * @param doc CodeMirror document object
   * @returns Array of validated emoji locations
   */
  scanDocument(doc: any): EmojiLocation[] {
    const emojiLocations: EmojiLocation[] = [];

    if (!this.emojiService.isInitialized()) {
      return emojiLocations;
    }

    // Process each line - preserves original optimization patterns
    for (let lineNumber = 1; lineNumber <= doc.lines; lineNumber++) {
      try {
        const line = doc.line(lineNumber);
        const lineText = line.text;
        const lineFrom = line.from;

        // Skip empty lines and obvious code contexts
        // Preserves original quick filtering before expensive regex scanning
        if (!lineText.trim() ||
            lineText.trim().startsWith('```') ||
            lineText.trim().startsWith('~~~') ||
            lineText.startsWith('    ')) {
          continue;
        }

        // Find emoji shortcodes in this line using merged scanning logic
        const lineMatches = this.scanLine(lineText, lineFrom);
        emojiLocations.push(...lineMatches);

      } catch (lineError) {
        console.warn("EmojiScanner: Error processing line", lineNumber, lineError);
      }
    }

    // Cache results for future reference
    this.cachedEmojiLocations = emojiLocations;
    return emojiLocations;
  }

  /**
   * Scan a single line for emoji shortcodes
   * Merges logic from ShortcodeScanner.scanShortcodes() and line processing
   *
   * @param text Line text to scan
   * @param offset Position offset to add to found positions
   * @returns Array of emoji locations found in this line
   */
  scanLine(text: string, offset: number = 0): EmojiLocation[] {
    if (!this.emojiService.isInitialized() || !text) {
      return [];
    }

    const matches: EmojiLocation[] = [];
    const emojiMap = this.emojiService.getEmojiMap();
    const regex = this.emojiService.getRenderRegex(); // Matches only valid shortcodes

    if (Object.keys(emojiMap).length === 0) {
      return [];
    }

    regex.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const shortcode = match[0];
      const from = match.index + offset;
      const to = from + shortcode.length;

      // Skip escaped shortcodes (preceded by backslash)
      if (match.index > 0 && text[match.index - 1] === '\\') {
        continue;
      }

      const imagePath = emojiMap[shortcode];
      if (imagePath) {
        try {
          // Convert to full resource path for Obsidian
          const fullImagePath = this.app.vault.adapter.getResourcePath(imagePath);
          const label = this.extractLabel(shortcode);

          matches.push({
            from,
            to,
            shortcode,
            imagePath: fullImagePath,
            label
          });
        } catch (pathError) {
          console.warn("EmojiScanner: Error processing image path", imagePath, pathError);
        }
      }

      // Prevent infinite loops - preserves original safety mechanism
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }

    return matches;
  }

  /**
   * Get cached emoji locations from last scan
   * Provides efficient access to previously scanned results
   *
   * @returns Cached emoji locations array
   */
  getCachedEmojis(): EmojiLocation[] {
    return this.cachedEmojiLocations;
  }

  /**
   * Clear cached results to force fresh scan
   * Should be called when document structure changes significantly
   */
  refreshCache(): void {
    this.cachedEmojiLocations = [];
  }

  /**
   * Check if a shortcode is valid in the current emoji map
   * Preserves ShortcodeScanner.isValidShortcode() functionality
   *
   * @param shortcode Shortcode to validate (e.g., ":wave:")
   * @returns true if shortcode exists in emoji map
   */
  isValidShortcode(shortcode: string): boolean {
    if (!this.emojiService.isInitialized()) {
      return false;
    }

    const emojiMap = this.emojiService.getEmojiMap();
    return shortcode in emojiMap;
  }

  /**
   * Get current emoji map for external use
   * Preserves ShortcodeScanner.getEmojiMap() functionality
   *
   * @returns Current emoji map from service
   */
  getEmojiMap(): Record<string, string> {
    return this.emojiService.getEmojiMap();
  }

  /**
   * Convert shortcode to accessibility label
   * Preserves ShortcodeScanner.extractLabel() functionality
   *
   * @param shortcode Full shortcode (e.g., ":wave_hello:")
   * @returns Human-readable label (e.g., "wave hello")
   */
  extractLabel(shortcode: string): string {
    return shortcode
      .replace(/^:/, "")
      .replace(/_+/g, " ")
      .replace(/:$/, "");
  }

  /**
   * Update cached emoji positions using CodeMirror's change mapping
   * Moved from EmojiLive.ts for better separation of concerns
   * Prevents "scooting emoji" issue when text is added/removed before widgets
   *
   * @param update ViewUpdate containing change mapping information
   * @returns true if any positions changed, false if cache is still valid
   */
  updateCachedPositions(update: any): boolean {
    const updatedEmojis: EmojiLocation[] = [];
    let positionsChanged = false;

    for (const emoji of this.cachedEmojiLocations) {
      try {
        // Map the emoji's positions through the document changes
        const newFrom = update.changes.mapPos(emoji.from, -1); // Map backward for start
        const newTo = update.changes.mapPos(emoji.to, 1);       // Map forward for end

        // Only keep emoji if mapping was successful and positions are still valid
        if (newFrom >= 0 && newTo > newFrom && newTo <= update.state.doc.length) {
          updatedEmojis.push({
            ...emoji,
            from: newFrom,
            to: newTo
          });

          // Track if any positions actually changed
          if (newFrom !== emoji.from || newTo !== emoji.to) {
            positionsChanged = true;
          }
        } else {
          positionsChanged = true; // Emoji was removed
        }
        // If position mapping failed, emoji was likely deleted or corrupted - omit it
      } catch (error) {
        console.warn("EmojiScanner: Error mapping emoji position:", error);
        positionsChanged = true; // Error means change
      }
    }

    // Update cache with mapped positions
    this.cachedEmojiLocations = updatedEmojis;
    return positionsChanged;
  }

  /**
   * Validate cached emoji positions for corruption
   * Used to detect when CodeMirror's mapPos has corrupted the cache
   *
   * @param doc Current document for validation
   * @returns true if cache is valid, false if positions are corrupted
   */
  validateCachedPositions(doc: any): boolean {
    for (const emoji of this.cachedEmojiLocations) {
      // Quick validation - check length and bounds only
      const expectedLength = emoji.shortcode.length;
      const actualLength = emoji.to - emoji.from;

      if (actualLength !== expectedLength || emoji.from < 0 || emoji.to > doc.length) {
        return false; // Cache is corrupted
      }
    }
    return true; // Cache is valid
  }

  /**
   * Refresh scanner state when emoji service updates
   * Maintains compatibility with original component refresh patterns
   */
  refresh(): void {
    // Clear cache to ensure fresh scan with updated emoji data
    this.refreshCache();
  }
}