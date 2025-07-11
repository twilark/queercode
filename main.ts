import { Plugin } from "obsidian";
import { QueercodeSettings, DEFAULT_SETTINGS, QueercodeSettingTab } from "./settings";

export default class QueercodePlugin extends Plugin {
  settings!: QueercodeSettings;

  async onload() {
    console.log("Queercode plugin loaded"); // Logs plugin load

    // Load stored settings or use defaults
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

    // Add plugin settings tab to UI
    this.addSettingTab(new QueercodeSettingTab(this.app, this));

    // Load emoji map JSON from vault directory
    const emojiMap = await this.loadEmojiMap();

    // Build regex to match any shortcode keys (escaped)
    const shortcodeRegex = new RegExp(
      Object.keys(emojiMap)
        .map(k => k.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&'))
        .join("|"),
      "g"
    );

    // Markdown post processor — runs on rendered markdown elements
    this.registerMarkdownPostProcessor(async (el, ctx) => {
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
               // Accept nodes allowed for emoji replacement
          }
      );

      // Collect all text nodes containing at least one shortcode
      const targets: Text[] = [];
      let current: Text | null = walker.nextNode() as Text;
      while (current) {
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
        const matches = (node.nodeValue || "").match(shortcodeRegex) || [];

        const frag = document.createDocumentFragment();

        for (let i = 0; i < parts.length; i++) {
          // Add normal text part
          if (parts[i]) frag.appendChild(document.createTextNode(parts[i]));

          // Add emoji image for matched shortcode
          if (matches[i]) {
            const url = emojiMap[matches[i]];

            // Skip if no URL or unsupported filetype
            if (
              !url ||
              (!url.endsWith(".png") && !url.endsWith(".svg"))
            ) {
              console.warn(`Skipping emoji: ${matches[i]} (bad or unsupported file: ${url})`);
              continue;
            }

            const img = document.createElement("img");
            img.src = this.app.vault.adapter.getResourcePath(`${this.manifest.dir}/emoji/${url}`);
            img.alt = matches[i];
            img.className = "queercode-emoji";
            frag.appendChild(img);
          }
        }

        try {
          // Replace original text node with fragment containing text + emojis
          parent.replaceChild(frag, node);
        } catch (e) {
          console.warn("Queercode DOM replace failed", e);
        }
      }
    });
  }

  // Load emoji mapping JSON file from plugin directory
  async loadEmojiMap(): Promise<Record<string, string>> {
    const file = await this.app.vault.adapter.read(`${this.manifest.dir}/emoji-map.json`);
    return JSON.parse(file);
  }

  // Save plugin settings
  async saveSettings() {
    await this.saveData(this.settings);
  }
}
