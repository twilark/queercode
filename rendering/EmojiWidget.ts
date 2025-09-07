import { WidgetType } from "@codemirror/view";

/**
 * CM6 widget that renders emoji images as replacements for shortcode text
 * Used by Live Preview decorations to display :shortcode: as actual emoji images
 */
export class EmojiWidget extends WidgetType {
  constructor(
    private shortcode: string,  // e.g., ":wave:"
    private imageSrc: string,   // Full path to emoji image file  
    private label: string       // Human-readable: "wave"
  ) {
    super();
  }

  /**
   * Create the DOM element - called by CM6 when rendering the widget
   */
  toDOM(): HTMLImageElement {
    const img = document.createElement("img");
    
    img.src = this.imageSrc;
    img.alt = this.label;
    img.title = this.shortcode; // Show shortcode on hover
    img.setAttribute("aria-label", this.label);
    img.setAttribute("role", "img");
    img.className = "queercode-emoji"; // CSS styling hook
    
    // Fallback: show shortcode text if image fails to load
    img.onerror = () => {
      const textNode = document.createTextNode(this.shortcode);
      if (img.parentNode) {
        img.parentNode.replaceChild(textNode, img);
      }
    };
    
    return img;
  }

  /**
   * Widget comparison for CM6 optimization - avoid re-rendering identical widgets
   */
  eq(other: EmojiWidget): boolean {
    return (
      other instanceof EmojiWidget &&
      this.shortcode === other.shortcode &&
      this.imageSrc === other.imageSrc &&
      this.label === other.label
    );
  }

  /**
   * Allow cursor movement and selection events, block only mouse clicks on widget
   */
  ignoreEvent(event: Event): boolean {
    // Allow keyboard navigation and selection
    if (event.type === "keydown" || event.type === "keyup" || 
        event.type === "selectionchange" || event.type === "focus") {
      return false;
    }
    
    // Block mouse clicks to prevent cursor jumping
    if (event.type === "mousedown" || event.type === "click") {
      return true;
    }
    
    // Allow other events
    return false;
  }

}