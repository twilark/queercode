import { Plugin, Notice } from "obsidian";
import { QueercodeSettings, DEFAULT_SETTINGS, QueercodeSettingTab } from "./SettingsTab";
import { EmojiSuggest } from "./EmojiSuggest";
import { EmojiService } from "./services/EmojiService";

export default class QueercodePlugin extends Plugin {
  settings!: QueercodeSettings;
  emojiService!: EmojiService;
  emojiSuggest!: EmojiSuggest;

  async onload() {
    console.log("Queercode plugin loaded");

    // Load stored settings or use defaults
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

    // Add plugin settings tab to UI (keeping old interface for now)
this.addSettingTab(new QueercodeSettingTab(
  this.app,
  this,  // Pass the plugin instance as required by PluginSettingTab
  this.settings,
  () => this.saveSettings(),
  () => this.emojiService.generateMap(),
  () => this.emojiService.refreshSuggester(this.emojiSuggest)
));

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

    // Register the emoji suggestion system
    if (Object.keys(emojiMap).length === 0) {
      new Notice("No emoji map found. Please generate the emoji map in settings.");
      // Don't return - allow the plugin to load so user can generate the map
    }

    if (availableEmojiFiles.size === 0) {
      new Notice("No emoji files found in the plugin's emoji directory.");
      // Don't return - allow the plugin to load
    }

    // Initialize and register the suggester (updated constructor)
    this.emojiSuggest = new EmojiSuggest(this.app, emojiMap, availableEmojiFiles);
    this.registerEditorSuggest(this.emojiSuggest);

    // Markdown post processor – runs on rendered markdown elements
    // Centralized rendering via ShortcodeDecorator
    const { renderShortcodesInElement } = await import("./rendering/ShortcodeDecorator");
    this.registerMarkdownPostProcessor((el) => {
      const emojiMap = this.emojiService.getEmojiMap();
      if (Object.keys(emojiMap).length === 0) return;
      const shortcodeRegex = this.emojiService.getRenderRegex();
      renderShortcodesInElement(
        el,
        emojiMap,
        shortcodeRegex,
        (path: string) => this.app.vault.adapter.getResourcePath(path)
      );
    });
  }

  // Save plugin settings
  async saveSettings() {
    await this.saveData(this.settings);
  }
}
