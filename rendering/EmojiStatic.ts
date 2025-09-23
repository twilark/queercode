import { App, MarkdownPostProcessor } from "obsidian";
import { EmojiCooker } from "../services/EmojiCooker";
import { QueercodeSettingsData } from "../ui/QueercodeSettings";

class EmojiStaticRenderer {
  constructor(
    private emojiService: EmojiCooker,
    private app: App,
    private settings: QueercodeSettingsData
  ) {}

  public getProcessor(): MarkdownPostProcessor {
    return (el) => {
      this.convertElement(el);
    };
  }

  /**
   * Check if a text node should be filtered based on its DOM context and user settings
   */
  private shouldFilterNode(node: Node): boolean {
    if (!node.parentElement) return true;

    let current: HTMLElement | null = node.parentElement;
    while (current !== null) {
      const tagName = current.tagName;
      const className = current.className || "";

      // Check for code contexts
      if (tagName === "CODE" && !this.settings.renderInInlineCode) {
        return true;
      }
      if (tagName === "PRE" && !this.settings.renderInCodeblocks) {
        return true;
      }

      // Check for link/URL contexts
      if (tagName === "A" && !this.settings.renderInUrls) {
        return true;
      }

      // Check for frontmatter (typically has specific classes or data attributes)
      if (className.includes("frontmatter") || className.includes("yaml") ||
          current.hasAttribute("data-frontmatter")) {
        if (!this.settings.renderInFrontmatter) {
          return true;
        }
      }

      // Check for comment contexts (HTML comments are not visible in DOM tree,
      // but markdown comments might be rendered as spans with specific classes)
      if (className.includes("comment") && !this.settings.renderInComments) {
        return true;
      }

      current = current.parentElement;
    }

    return false; // Allow by default
  }

  private convertElement(el: HTMLElement) {
    // Get data from EmojiCooker instead of parameters
    const emojiMap = this.emojiService.getEmojiMap();
    const shortcodeRegex = this.emojiService.getRenderRegex();

    // Early return if no emoji data
    if (Object.keys(emojiMap).length === 0) return;

    // Create TreeWalker to iterate text nodes excluding certain tags
    const walker = document.createTreeWalker(
      el,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          if (!node.parentElement) return NodeFilter.FILTER_REJECT;

          // Always reject STYLE tags
          let current: HTMLElement | null = node.parentElement;
          while (current !== null) {
            if (current.tagName === "STYLE") {
              return NodeFilter.FILTER_REJECT;
            }
            current = current.parentElement;
          }

          // Use settings-based filtering for other contexts
          return this.shouldFilterNode(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT;
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
  }
}

export function EmojiStatic(emojiService: EmojiCooker, app: App, settings: QueercodeSettingsData): MarkdownPostProcessor {
  const renderer = new EmojiStaticRenderer(emojiService, app, settings);
  return renderer.getProcessor();
}
