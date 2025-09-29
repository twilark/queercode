import { Plugin, Notice } from "obsidian";
import { QueercodeSettingsData, DEFAULT_SETTINGS, QueercodeSettings } from "./ui/QueercodeSettings";
import { EmojiPicker } from "./ui/EmojiPicker";
import { EmojiCooker } from "./services/EmojiCooker";
import { EmojiStatic } from "./rendering/static/EmojiStatic";
import { EmojiLive } from "./rendering/live/EmojiLive";

export default class QueercodePlugin extends Plugin {
  settings!: QueercodeSettingsData;
  emojiService!: EmojiCooker;
  emojiCompleter!: EmojiPicker;

  async onload() {
    console.log("Queercode plugin loaded");

    // Load stored settings or use defaults
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

    // Initialize EmojiCooker with specific values
    this.emojiService = new EmojiCooker(
      this.app,
      this.manifest.dir || "",                  // Use the manifest directory from the plugin
      this.settings.emojiFolderPath || "",      // Use the emoji folder path from settings
      this.settings.filetypePreference || "svg" // Provide default if undefined
    );
    await this.emojiService.load(this.settings.preserveInvalidEntries);

    // Check if we have any emojis to work with
    if (!this.emojiService.isInitialized()) {
      new Notice("Failed to initialize emoji service.");
      return;
    }

    const emojiMap = this.emojiService.getEmojiMap();
    const emojiFiles = this.emojiService.getAvailableFiles();

    // Register the renderers
    this.registerMarkdownPostProcessor(EmojiStatic(this.emojiService, this.app, this.settings));
    this.registerEditorExtension(EmojiLive(this.emojiService, this.app, this.settings));

    // Initialize and register the suggester
    if (Object.keys(emojiMap).length === 0) {
      new Notice("No emoji map found. Please generate the emoji map in settings.");
      // Don't return - allow the plugin to load so user can generate the map
    }

    if (emojiFiles.size === 0) {
      new Notice("No emoji files found in the plugin's emoji directory.");
      // Don't return - allow the plugin to load
    }

    this.emojiCompleter = new EmojiPicker(this.app, this.emojiService);
    this.registerEditorSuggest(this.emojiCompleter);

    // Set up emoji suggester to refresh when map updates
    this.emojiService.onMapUpdate(() => {
      if (this.emojiCompleter && this.emojiCompleter.refresh) {
        this.emojiCompleter.refresh();
      }

      // Live preview refreshes automatically via map update handlers
    });

    // Add plugin settings tab to UI (updated to remove refreshSuggester callback)
    this.addSettingTab(new QueercodeSettings(
      this.app,
      this,  // Pass the plugin instance as required by PluginSettingTab
      this.settings,
      () => this.saveSettings(),
      () => this.emojiService.buildMap(this.settings.preserveInvalidEntries)  // Emoji map builder callback
    ));
  }

  // Save plugin settings
  async saveSettings() {
    await this.saveData(this.settings);
  }
}
