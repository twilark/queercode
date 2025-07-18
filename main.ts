import { Plugin } from "obsidian";
import { QueercodeSettings, DEFAULT_SETTINGS, QueercodeSettingTab } from "./settings";
import { EmojiSuggest } from "./suggest";

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

    // After loading emojiMap:
    const emojiFolder = `${this.manifest.dir}/emoji`;
    const files = await this.app.vault.adapter.list(emojiFolder);
    const availableEmojiFiles = new Set(files.files.map(f => f.split("/").pop()));

    // Register emoji suggestion provider
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
// Function to convert shortcode to readable label for SRs
function readableLabel(shortcode: string): string {
  return shortcode
    .replace(/^:/, "")
    .replace(/_+/g, " ")
    .replace(/:$/, "")
    .replace(/\b\w/g, c => c.toUpperCase());
}

const label = readableLabel(matches[i]);

// Create image element for emoji, based on readable label
const img = document.createElement("img");
img.src = this.app.vault.adapter.getResourcePath(`${this.manifest.dir}/emoji/${url}`);
img.alt = label;
img.title = matches[i];
img.setAttribute("aria-label", label); // ARIA label for screen readers
img.setAttribute("role", "img"); // ARIA role for image
img.className = "queercode-emoji";

// Optional: only if fallback is always-on, or check a setting here
img.onerror = () => {
  img.replaceWith(document.createTextNode(matches[i]));
};

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
