import { App } from "obsidian";
import { MapHandler } from "../MapHandler";


export class EmojiService {
  private app: App;
  private mapHandler: MapHandler;
  private emojiMap: Record<string, string> = {};
  private availableFiles: Set<string> = new Set();
  private initialized: boolean = false;


  constructor(
    app: App,
    manifestDir: string,
    emojiFolderPath: string,
    filetypePreference: string
  ) {
    this.app = app;
    // Create MapHandler with the specific values it needs
    this.mapHandler = new MapHandler(app, manifestDir, emojiFolderPath, filetypePreference);
  }

  async load(): Promise<void> {
    try {
      // Load emoji map and available files
      const [emojiMap, availableFiles] = await Promise.all([
        this.mapHandler.loadEmojiMap(),
        this.mapHandler.loadAvailableFiles()
      ]);

      // Validate the map - only keep entries with existing files
      const validMap: Record<string, string> = {};
      for (const [shortcode, filepath] of Object.entries(emojiMap)) {
        // Validate shortcode format
        if (!shortcode.startsWith(':') || !shortcode.endsWith(':')) {
          console.warn(`Invalid shortcode format: ${shortcode}`);
          continue;
        }

        // Validate file extension
        if (!filepath.endsWith('.png') && !filepath.endsWith('.svg')) {
          console.warn(`Invalid file extension for ${shortcode}: ${filepath}`);
          continue;
        }

        // Check if file exists
        if (availableFiles.has(filepath)) {
          validMap[shortcode] = filepath;
        } else {
          console.warn(`File not found for ${shortcode}: ${filepath}`);
        }
      }

      this.emojiMap = validMap;
      this.availableFiles = availableFiles;
      this.initialized = true;

      console.log(`EmojiService loaded: ${Object.keys(validMap).length} emojis, ${availableFiles.size} files available`);
    } catch (error) {
      console.error("Failed to initialize EmojiService:", error);
      // Initialize with empty data rather than failing
      this.emojiMap = {};
      this.availableFiles = new Set();
      this.initialized = true;
    }
  }

  async generateMap(): Promise<{added: number, total: number}> {
    if (!this.initialized) {
      throw new Error("EmojiService not initialized. Call load() first.");
    }

    const result = await this.mapHandler.generateEmojiMap();

    // Reload data after generation
    await this.load();

    return result;
  }

  // Method to refresh suggester data after map regeneration
  // Note: This method doesn't need the plugin object, just the suggester instance
  refreshSuggester(suggester: any) {
    if (suggester && suggester.updateData) {
      suggester.updateData(this.emojiMap, this.availableFiles);
    }
  }

  getEmojiMap(): Record<string, string> {
    if (!this.initialized) {
      throw new Error("EmojiService not initialized. Call load() first.");
    }
    return { ...this.emojiMap }; // Return a copy to prevent external mutation
  }

  getAvailableFiles(): Set<string> {
    if (!this.initialized) {
      throw new Error("EmojiService not initialized. Call load() first.");
    }
    return new Set(this.availableFiles); // Return a copy
  }

  getRenderRegex(): RegExp {
    if (!this.initialized) {
      throw new Error("EmojiService not initialized. Call load() first.");
    }

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

  getSuggestRegex(): RegExp {
    // This regex triggers the suggester when user types :word
    // It handles markdown formatting and prevents triggering inside links
    return /(?:^|\s|[*_~`"(]|(?<!\[)\[)(:\w*)$/;
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}
