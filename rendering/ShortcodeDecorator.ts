// Centralized rendering utility for emoji shortcodes
export function renderShortcodesInElement(el: HTMLElement, emojiMap: Record<string, string>, shortcodeRegex: RegExp, getResourcePath: (path: string) => string) {
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
        img.src = getResourcePath(url);
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
