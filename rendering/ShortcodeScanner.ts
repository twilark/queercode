import { EmojiCooker } from "../services/EmojiCooker";
import { App } from "obsidian";

/**
 * Information about a found shortcode in text
 */
export interface ShortcodeMatch {
  from: number;           // Start position in text
  to: number;             // End position in text
  shortcode: string;      // Full shortcode: ":wave:"
  imagePath?: string;     // Full path to image file
  label?: string;         // Human readable: "wave"
}

/**
 * Finds and validates emoji shortcodes in text strings
 * Coordinates with EmojiCooker to check if shortcodes are valid and get image paths
 */
export class ShortcodeScanner {
  constructor(
    private emojiService: EmojiCooker,
    private app: App
  ) {}

  /**
   * Find all valid emoji shortcodes in a text string
   * Returns position info and image paths for valid shortcodes only
   */
  scanShortcodes(text: string, offset: number = 0): ShortcodeMatch[] {
    if (!this.emojiService.isInitialized() || !text) {
      return [];
    }

    const matches: ShortcodeMatch[] = [];
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

      const imagePath = emojiMap[shortcode];
      if (imagePath) {
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
      }

      // Prevent infinite loops
      if (match.index === regex.lastIndex) {
        regex.lastIndex++;
      }
    }

    return matches;
  }

  /**
   * Check if a shortcode exists in the current emoji map
   */
  isValidShortcode(shortcode: string): boolean {
    if (!this.emojiService.isInitialized()) {
      return false;
    }

    const emojiMap = this.emojiService.getEmojiMap();
    return shortcode in emojiMap;
  }

  /**
   * Get current emoji map - used by other components
   */
  getEmojiMap(): Record<string, string> {
    return this.emojiService.getEmojiMap();
  }

  /**
   * Refresh scanner data - called when emoji map updates
   * Scanner automatically uses fresh EmojiCooker data, so this is a no-op
   */
  refresh(): void {
    // Scanner uses EmojiCooker directly, so always has fresh data
  }

  /**
   * Convert ":wave_hello:" to "wave hello" for accessibility labels
   */
  extractLabel(shortcode: string): string {
    return shortcode
      .replace(/^:/, "")
      .replace(/_+/g, " ")
      .replace(/:$/, "");
  }
}
