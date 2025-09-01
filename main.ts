import { Plugin, Notice } from "obsidian";
import { QueercodeSettings, DEFAULT_SETTINGS, QueercodeSettingTab } from "./SettingsTab";
import { EmojiSuggest } from "./EmojiSuggest";
import { EmojiService } from "./services/EmojiService";
import { ReadingModeRenderer } from "./rendering/ReadingMode";
import { LivePreviewRenderer } from "./rendering/LivePreview";

export default class QueercodePlugin extends Plugin {
  settings!: QueercodeSettings;
  emojiService!: EmojiService;
  emojiSuggest!: EmojiSuggest;

  async onload() {
    console.log("Queercode plugin loaded");

    // Load stored settings or use defaults
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

    // Initialize EmojiService with specific values
    this.emojiService = new EmojiService(
      this.app,
      this.manifest.dir || "",                  // Use the manifest directory from the plugin
      this.settings.emojiFolderPath || "",      // Use the emoji folder path from settings
      this.settings.filetypePreference || "svg" // Provide default if undefined
    );
    await this.emojiService.load();

    // Check if we have any emojis to work with
    if (!this.emojiService.isInitialized()) {
      new Notice("Failed to initialize emoji service.");
      return;
    }

    const emojiMap = this.emojiService.getEmojiMap();
    const availableEmojiFiles = this.emojiService.getAvailableFiles();

    // Create the renderers
    const readingModeRenderer = new ReadingModeRenderer(this.emojiService, this.app);
    const livePreviewRenderer = new LivePreviewRenderer(this.emojiService, this.app);

    // Register the reading mode renderer
    this.registerMarkdownPostProcessor(readingModeRenderer.getProcessor());

    // Register the live preview renderer (currently does nothing)
    this.registerEditorExtension(livePreviewRenderer.getExtension());

    // Initialize and register the suggester
    if (Object.keys(emojiMap).length === 0) {
      new Notice("No emoji map found. Please generate the emoji map in settings.");
      // Don't return - allow the plugin to load so user can generate the map
    }

    if (availableEmojiFiles.size === 0) {
      new Notice("No emoji files found in the plugin's emoji directory.");
      // Don't return - allow the plugin to load
    }

    this.emojiSuggest = new EmojiSuggest(this.app, emojiMap, availableEmojiFiles);
    this.registerEditorSuggest(this.emojiSuggest);

    // Set up emoji suggester to refresh when map updates
    this.emojiService.onMapUpdate(() => {
      if (this.emojiSuggest && this.emojiSuggest.updateData) {
        const emojiMap = this.emojiService.getEmojiMap();
        const availableFiles = this.emojiService.getAvailableFiles();
        this.emojiSuggest.updateData(emojiMap, availableFiles);
      }

      // The live preview renderer will need refresh in Phase 3
      livePreviewRenderer.refresh();
    });

    // Add plugin settings tab to UI (updated to remove refreshSuggester callback)
    this.addSettingTab(new QueercodeSettingTab(
      this.app,
      this,  // Pass the plugin instance as required by PluginSettingTab
      this.settings,
      () => this.saveSettings(),
      () => this.emojiService.generateMap()  // Removed refreshSuggester callback
    ));
  }

  // Save plugin settings
  async saveSettings() {
    await this.saveData(this.settings);
  }
}
