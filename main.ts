import { Plugin } from "obsidian";

export default class QueercodePlugin extends Plugin {
  async onload() {
    console.log("Queercode plugin loaded");

    const emojiMap = await this.loadEmojiMap();
    const shortcodeRegex = new RegExp(
      Object.keys(emojiMap).map(k => k.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')).join("|"),
      "g"
    );

    this.registerMarkdownPostProcessor(async (el, ctx) => {
      const walker = document.createTreeWalker(
        el,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            if (!node.parentElement) return NodeFilter.FILTER_REJECT;
            const forbidden = ["CODE", "PRE", "A", "STYLE"];
            let current = node.parentElement;
            while (current) {
              if (forbidden.includes(current.tagName)) return NodeFilter.FILTER_REJECT;
              current = current.parentElement;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      );

      const targets: Text[] = [];
      let current: Text | null = walker.nextNode() as Text;
      while (current) {
        if (shortcodeRegex.test(current.nodeValue || "")) {
          targets.push(current);
        }
        current = walker.nextNode() as Text;
      }

      for (const node of targets) {
        const parent = node.parentNode;
        if (!parent) continue;

        const parts = (node.nodeValue || "").split(shortcodeRegex);
        const matches = (node.nodeValue || "").match(shortcodeRegex) || [];

        const frag = document.createDocumentFragment();
        for (let i = 0; i < parts.length; i++) {
          if (parts[i]) frag.appendChild(document.createTextNode(parts[i]));
          if (matches[i]) {
            const url = emojiMap[matches[i]];
            if (!url) continue;
            const img = document.createElement("img");
            img.src = this.app.vault.adapter.getResourcePath(`${this.manifest.dir}/emoji/${url}`);
            img.alt = matches[i];
            img.className = "queercode-emoji";
            frag.appendChild(img);
          }
        }

        try {
          parent.replaceChild(frag, node);
        } catch (e) {
          console.warn("Queercode DOM replace failed", e);
        }
      }
    });
  }

  async loadEmojiMap(): Promise<Record<string, string>> {
    const file = await this.app.vault.adapter.read(`${this.manifest.dir}/emoji-map.json`);
    return JSON.parse(file);
  }
}
