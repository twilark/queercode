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
    this.registerMarkdownPostProcessor(async (el) => {
      // Get current emoji map (in case it was regenerated)
      const currentEmojiMap = this.emojiService.getEmojiMap();

      // Only process if we have emojis
      if (Object.keys(currentEmojiMap).length === 0) return;

      // Get current render regex
      const shortcodeRegex = this.emojiService.getRenderRegex();

      // Create TreeWalker to iterate text nodes excluding certain tags
      const walker = document.createTreeWalker(
        el,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            if (!node.parentElement) return NodeFilter.FILTER_REJECT;

            const forbidden = ["CODE", "PRE", "A", "STYLE"];

            let current: HTMLElement | null = node.parentElement;
            while (current !== null) {
              if (forbidden.includes(current.tagName)) {
                return NodeFilter.FILTER_REJECT;
              }
              current = current.parentElement;
            }

            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      // Collect all text nodes containing at least one shortcode
      const targets: Text[] = [];
      let current: Text | null = walker.nextNode() as Text;
      while (current) {
        shortcodeRegex.lastIndex = 0;
        if (shortcodeRegex.test(current.nodeValue || "")) {
          targets.push(current);
        }
        current = walker.nextNode() as Text;
      }

      // For each target text node, replace shortcodes with emoji images
      for (const node of targets) {
        const parent = node.parentNode;
        if (!parent) continue;

        // Get current emoji map for lookups
        const emojiMap = currentEmojiMap;

        // Split text on shortcode boundaries and find all matches
        const parts = (node.nodeValue || "").split(shortcodeRegex);
        shortcodeRegex.lastIndex = 0;
        const matches = (node.nodeValue || "").match(shortcodeRegex) || [];

        const frag = document.createDocumentFragment();

        for (let i = 0; i < parts.length; i++) {
          // Add normal text part
          if (parts[i]) frag.appendChild(document.createTextNode(parts[i]));

          // Add emoji image for matched shortcode
          if (matches[i]) {
            const url = emojiMap[matches[i]];
            if (!url || (!url.endsWith(".png") && !url.endsWith(".svg"))) {
              frag.appendChild(document.createTextNode(matches[i]));
              continue;
            }

            const label = matches[i].replace(/^:/, "").replace(/_+/g, " ").replace(/:$/, "");
            const img = document.createElement("img");
            img.src = this.app.vault.adapter.getResourcePath(url);
            img.alt = label;
            img.title = matches[i];
            img.setAttribute("aria-label", label);
            img.setAttribute("role", "img");
            img.className = "queercode-emoji";
            img.onerror = () => img.replaceWith(document.createTextNode(matches[i]));
            frag.appendChild(img);
          }
        }

        // Replace the original text node with the fragment
        parent.replaceChild(frag, node);
      }
    });
  }

  // Save plugin settings
  async saveSettings() {
    await this.saveData(this.settings);
  }
}
