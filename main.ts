import { Plugin, Notice } from "obsidian";
import { QueercodeSettings, DEFAULT_SETTINGS, QueercodeSettingTab } from "./settings";
import { EmojiSuggest } from "./suggest";

export default class QueercodePlugin extends Plugin {
  settings!: QueercodeSettings;

  async onload() {
    console.log("Queercode plugin loaded"); // Log plugin on load

    // Load stored settings or use defaults
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

    // Add plugin settings tab to UI
    this.addSettingTab(new QueercodeSettingTab(this.app, this));

    // Load emoji map JSON from vault directory
    const emojiMap = await this.loadEmojiMap();

    // Check if emoji folder exists and gather available files
    if (!emojiMap || Object.keys(emojiMap).length === 0) {
      new Notice("No emoji map found. Please ensure emoji-map.json exists in the plugin directory.");
      return;
    }
    const emojiFolder = `${this.manifest.dir}/emoji`;
    const files = await this.app.vault.adapter.list(emojiFolder);
    const availableEmojiFiles = new Set(
      files.files
        .map(f => f.split("/").pop())
        .filter((f): f is string => f !== undefined)
    );

    // Register the emoji suggestion system
    if (!availableEmojiFiles.size) {
      new Notice("No emoji files found in the plugin's emoji directory.");
      return;
    }
    const emojiSuggest = new EmojiSuggest(this.app, this, emojiMap, availableEmojiFiles);
    this.registerEditorSuggest(emojiSuggest);



    // Build regex to match any shortcode keys (escaped)
    const shortcodeRegex = new RegExp(
      Object.keys(emojiMap)
        .map(k => k.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'))
        .join("|"),
      "g"
    );

    // Markdown post processor — runs on rendered markdown elements
    this.registerMarkdownPostProcessor(async (el) => {
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
            img.src = this.app.vault.adapter.getResourcePath(`${this.manifest.dir}/emoji/${url}`);
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

  // Load emoji mapping JSON file from plugin directory
  async loadEmojiMap(): Promise<Record<string, string>> {
    try {
      const file = await this.app.vault.adapter.read(`${this.manifest.dir}/emoji-map.json`);
      return JSON.parse(file);
    } catch (e: any) {
      if (e instanceof SyntaxError) {
        console.warn("emoji-map.json contains invalid JSON. Please fix or regenerate the file.", e);
      } else {
        console.warn("Could not load emoji-map.json (file missing or unreadable).", e);
      }
      return {};
    }
  }

  // Save plugin settings
  async saveSettings() {
    await this.saveData(this.settings);
  }
}
