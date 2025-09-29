import { App } from "obsidian";
import { EmojiMap } from "./EmojiMapper";

type UpdateCallback = () => void;

export class EmojiCooker {
  private app: App;
  private mapHandler: EmojiMap;
  private emojiMap: Record<string, string> = {};
  private availableFiles: Set<string> = new Set();
  private initialized: boolean = false;
  private onUpdateCallbacks: Set<UpdateCallback> = new Set();


  constructor(
    app: App,
    manifestDir: string,
    emojiFolderPath: string,
    filetypePreference: string
  ) {
    this.app = app;
    // Create EmojiMap with the specific values it needs
    this.mapHandler = new EmojiMap(app, manifestDir, emojiFolderPath, filetypePreference);
  }

  // ===== CENTRALIZED VALIDATION METHODS =====

  /**
   * Validates emoji shortcode format and file extension.
   * Always applies regardless of settings.
   */
  private isValidEmojiFormat(shortcode: string, filepath: string): boolean {
    // Validate shortcode format
    if (!shortcode.startsWith(':') || !shortcode.endsWith(':')) {
      return false;
    }

    // Validate file extension
    if (!filepath.endsWith('.png') && !filepath.endsWith('.svg')) {
      return false;
    }

    return true;
  }

  /**
   * Determines if an emoji entry should be included in the runtime map.
   * Includes format validation and conditional file existence check.
   */
  shouldIncludeInMap(shortcode: string, filepath: string, availableFiles: Set<string>, preserveInvalidEntries: boolean = false): boolean {
    // Always check format first
    if (!this.isValidEmojiFormat(shortcode, filepath)) {
      return false;
    }

    // If preserving invalid entries, include it regardless of file existence
    if (preserveInvalidEntries) {
      return true;
    }

    // Otherwise, only include if file exists
    return availableFiles.has(filepath);
  }

  /**
   * Determines if an emoji should be suggested to the user.
   * Always strict for good UX - format validation + file existence required.
   */
  shouldSuggestEmoji(shortcode: string, filepath: string, availableFiles: Set<string>): boolean {
    return this.isValidEmojiFormat(shortcode, filepath) &&
           availableFiles.has(filepath);
  }

  /**
   * Determines if an emoji entry should be pruned from the map during generation.
   * Conditional on preserveInvalidEntries setting.
   */
  shouldPruneFromMap(filepath: string, availableFiles: Set<string>, preserveInvalidEntries: boolean = false): boolean {
    // If preserving invalid entries, never prune
    if (preserveInvalidEntries) {
      return false;
    }

    // Otherwise, prune if file doesn't exist
    return !availableFiles.has(filepath);
  }

  async load(preserveInvalidEntries: boolean = false): Promise<void> {
    try {
      // Load emoji map and available files
      const [emojiMap, availableFiles] = await Promise.all([
        this.mapHandler.loadEmojiMap(),
        this.mapHandler.findFiles()
      ]);

      // Validate the map - only keep entries with existing files
      const validMap: Record<string, string> = {};
      for (const [shortcode, filepath] of Object.entries(emojiMap)) {
        if (this.shouldIncludeInMap(shortcode, filepath, availableFiles, preserveInvalidEntries)) {
          validMap[shortcode] = filepath;
        } else {
          // Log warnings for debugging (maintaining current behavior)
          if (!this.isValidEmojiFormat(shortcode, filepath)) {
            if (!shortcode.startsWith(':') || !shortcode.endsWith(':')) {
              console.warn(`Invalid shortcode format: ${shortcode}`);
            } else if (!filepath.endsWith('.png') && !filepath.endsWith('.svg')) {
              console.warn(`Invalid file extension for ${shortcode}: ${filepath}`);
            }
          } else if (!availableFiles.has(filepath)) {
            console.warn(`File not found for ${shortcode}: ${filepath}`);
          }
        }
      }

      this.emojiMap = validMap;
      this.availableFiles = availableFiles;
      this.initialized = true;

      console.log(`EmojiCooker loaded: ${Object.keys(validMap).length} emojis, ${availableFiles.size} files available`);
    } catch (error) {
      console.error("Failed to initialize EmojiCooker:", error);
      // Initialize with empty data rather than failing
      this.emojiMap = {};
      this.availableFiles = new Set();
      this.initialized = true;
    }
  }

  async buildMap(preserveInvalidEntries: boolean = false): Promise<{added: number, total: number}> {
    if (!this.initialized) {
      throw new Error("EmojiCooker not initialized. Call load() first.");
    }

    // Pre-process existing map with centralized validation before generating
    const existingMap = await this.mapHandler.loadEmojiMap();
    const availableFiles = await this.mapHandler.findFiles();

    // Apply pruning logic using centralized validation
    const prunedMap: Record<string, string> = {};
    for (const [shortcode, filepath] of Object.entries(existingMap)) {
      if (!this.shouldPruneFromMap(filepath, availableFiles, preserveInvalidEntries)) {
        prunedMap[shortcode] = filepath;
      }
    }

    // Temporarily write the pruned map for the map builder to use
    const manifestDir = this.mapHandler.getManifestDir();
    const mapPath = `${manifestDir}/data/emoji-map.json`;

    // Sort and write the pruned map
    const sortedKeys = Object.keys(prunedMap).sort();
    const entries = sortedKeys.map(key => `  "${key}": "${prunedMap[key]}"`);
    const jsonContent = `{\n${entries.join(",\n")}\n}\n`;
    await this.app.vault.adapter.write(mapPath, jsonContent);

    const result = await this.mapHandler.buildMap();

    // Reload data after generation
    await this.load(preserveInvalidEntries);

    // Notify listeners that the map has been updated
    this.notifyListeners();

    return result;
  }


// Get a copy of the current emoji map
  getEmojiMap(): Record<string, string> {
    if (!this.initialized) {
      throw new Error("EmojiCooker not initialized. Call load() first.");
    }
    return { ...this.emojiMap }; // Return a copy to prevent external mutation
  }
// Get a copy of the available emoji files
  getAvailableFiles(): Set<string> {
    if (!this.initialized) {
      throw new Error("EmojiCooker not initialized. Call load() first.");
    }
    return new Set(this.availableFiles); // Return a copy
  }
// Regex to find shortcodes in text for rendering
  getRenderRegex(): RegExp {
    if (!this.initialized) {
      throw new Error("EmojiCooker not initialized. Call load() first.");
    }
// Build regex from current emoji map keys
    const keys = Object.keys(this.emojiMap);
    if (keys.length === 0) {
      // Return a regex that matches nothing if no emojis loaded
      return /(?!.*)/g;
    }

    // Build regex to match any shortcode keys (escaped)
    return new RegExp(
      keys.map(k => k.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join("|"),
      "g"
    );
  }
// Regex to trigger the suggester
  getSuggestRegex(): RegExp {
    return /(?:^|\s|[*_~`"(]|(?<!\[)\[)(:\w*)$/;
  }
// Check if service is initialized
  isInitialized(): boolean {
    return this.initialized;
  }
// Event system for map updates
    onMapUpdate(callback: UpdateCallback): void {
    this.onUpdateCallbacks.add(callback);
  }
// Unsubscribe from map updates
  offMapUpdate(callback: UpdateCallback): void {
    this.onUpdateCallbacks.delete(callback);
  }
// Notify all listeners of a map update
  private notifyListeners(): void {
    for (const callback of this.onUpdateCallbacks) {
      callback();
    }
}
}

