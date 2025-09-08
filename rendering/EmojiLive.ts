// SIMPLIFIED Live Preview emoji rendering - minimal CM6 approach
import { App } from "obsidian";
import { Extension, SelectionRange } from "@codemirror/state";
import { ViewPlugin, ViewUpdate, EditorView, Decoration, DecorationSet, KeyBinding } from "@codemirror/view";
import { keymap } from "@codemirror/view";
import { EmojiCooker } from "../services/EmojiCooker";
// import { EmojiWidget } from "./EmojiWidget"; // Not used in mark decoration approach
import { ShortcodeScanner } from "./ShortcodeScanner";

/**
 * MINIMAL CM6 ViewPlugin decorator - proven working approach
 */
class EmojiMarker {
  private scanner: ShortcodeScanner;
  private decorations: DecorationSet = Decoration.none;
  private mapUpdateHandler: (() => void) | null = null;
  private destroyed = false;
  private lastFullRebuild = 0; // Track last full rebuild time
  private mutationObserver: MutationObserver | null = null;

  constructor(
    private view: EditorView,
    private emojiService: EmojiCooker,
    private app: App
  ) {
    this.scanner = new ShortcodeScanner(this.emojiService, this.app);

    // Build initial decorations if service is ready
    if (this.emojiService.isInitialized()) {
      try {
        this.decorations = this.scanFullDocumentForShortcodes();
      } catch (error) {
        console.error("Error building initial decorations:", error);
        this.decorations = Decoration.none;
      }
    }

    // Set up map update handler
    this.mapUpdateHandler = () => {
      if (!this.destroyed) {
        try {
          this.decorations = this.scanFullDocumentForShortcodes();
        } catch (error) {
          console.error("Error rebuilding decorations:", error);
          this.decorations = Decoration.none;
        }
      }
    };

    this.emojiService.onMapUpdate(this.mapUpdateHandler);

    // Set up MutationObserver to detect new mark decorations
    this.setupMutationObserver();
  }

  /**
   * Handle document changes with targeted updates
   */
  update(update: ViewUpdate): void {
    if (this.destroyed || !this.emojiService.isInitialized()) return;

    if (update.docChanged) {
      // Always map existing decorations through document changes first
      this.decorations = this.decorations.map(update.changes);

      // Get changed ranges and check if they contain potential shortcodes
      const changedRanges = this.getChangedRanges(update);
      const needsRangeUpdate = changedRanges.some(range =>
        this.rangeContainsPotentialShortcodes(range, update.state.doc)
      );

      if (needsRangeUpdate) {
        try {
          // Update decorations only for changed ranges (efficient)
          this.updateDecorationsForChangedRanges(changedRanges, update.state.doc);
        } catch (error) {
          console.warn("Error in range update, falling back to full scan:", error);
          // Fallback to full scan if targeted update fails
          this.decorations = this.scanFullDocumentForShortcodes();
        }
      }

      // Safety check: full rebuild every 10 seconds to catch edge cases
      const now = Date.now();
      if (now - this.lastFullRebuild > 10000) {
        this.decorations = this.scanFullDocumentForShortcodes();
        this.lastFullRebuild = now;
      }
    }
  }

  /**
   * Set up MutationObserver to automatically apply background images
   * when new mark decorations are added to the DOM
   */
  private setupMutationObserver(): void {
    if (this.mutationObserver) return; // Already set up

    this.mutationObserver = new MutationObserver((mutations) => {
      let foundNewMarks = false;

      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          // Check for new elements with our mark class
          for (const node of mutation.addedNodes) {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;

              // Check if the element itself is a mark or contains marks
              if (element.classList?.contains('queercode-shortcode-mark')) {
                foundNewMarks = true;
                this.applyBackgroundToElement(element as HTMLElement);
              }

              // Check child elements for marks
              const childMarks = element.querySelectorAll?.('.queercode-shortcode-mark');
              if (childMarks && childMarks.length > 0) {
                foundNewMarks = true;
                childMarks.forEach(mark => {
                  this.applyBackgroundToElement(mark as HTMLElement);
                });
              }
            }
          }
        } else if (mutation.type === 'attributes' &&
                   (mutation.target as Element).classList?.contains('queercode-shortcode-mark')) {
          // Reapply background if attributes changed
          foundNewMarks = true;
          this.applyBackgroundToElement(mutation.target as HTMLElement);
        }
      }

      // Fallback: if we detected changes but didn't catch specific elements, scan all
      if (foundNewMarks) {
        setTimeout(() => this.updateAllEmojiBackgrounds(), 10);
      }
    });

    // Observe the editor DOM for changes
    this.mutationObserver.observe(this.view.dom, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-emoji-src', 'class']
    });
  }

  /**
   * Apply background image to a specific mark element
   */
  private applyBackgroundToElement(element: HTMLElement): void {
    const emojiSrc = element.getAttribute('data-emoji-src');

    if (emojiSrc && !element.style.getPropertyValue('--emoji-bg-set')) {
      element.style.setProperty('--emoji-bg-image', `url("${emojiSrc}")`);
      element.style.setProperty('--emoji-bg-set', 'true');
    }
  }

  /**
   * Update all emoji backgrounds (comprehensive fallback)
   */
  private updateAllEmojiBackgrounds(): void {
    try {
      const emojiMarks = this.view.dom.querySelectorAll('.queercode-shortcode-mark');

      for (const mark of emojiMarks) {
        this.applyBackgroundToElement(mark as HTMLElement);
      }
    } catch (error) {
      console.warn("Error updating all emoji backgrounds:", error);
    }
  }

  /**
   * Extract changed ranges from update with buffer zones
   */
  private getChangedRanges(update: ViewUpdate): Array<{from: number, to: number}> {
    const ranges: Array<{from: number, to: number}> = [];
    const doc = update.state.doc;

    update.changes.iterChanges((fromA, toA, fromB, toB) => {
      // Add buffer around changes to catch shortcodes that span the boundary
      const bufferSize = 20; // characters
      const from = Math.max(0, fromB - bufferSize);
      const to = Math.min(doc.length, toB + bufferSize);

      ranges.push({ from, to });
    });

    // Merge overlapping ranges
    return this.mergeOverlappingRanges(ranges);
  }

  /**
   * Merge overlapping ranges to avoid duplicate processing
   */
  private mergeOverlappingRanges(ranges: Array<{from: number, to: number}>): Array<{from: number, to: number}> {
    if (ranges.length <= 1) return ranges;

    ranges.sort((a, b) => a.from - b.from);
    const merged = [ranges[0]];

    for (let i = 1; i < ranges.length; i++) {
      const current = ranges[i];
      const last = merged[merged.length - 1];

      if (current.from <= last.to) {
        // Ranges overlap, merge them
        last.to = Math.max(last.to, current.to);
      } else {
        // No overlap, add as new range
        merged.push(current);
      }
    }

    return merged;
  }

  /**
   * Check if a range potentially contains shortcodes worth scanning
   */
  private rangeContainsPotentialShortcodes(range: {from: number, to: number}, doc: any): boolean {
    const text = doc.sliceString(range.from, range.to);

    // Quick check: does the range contain colons?
    if (!text.includes(':')) return false;

    // Check for obvious shortcode patterns
    return /:[a-zA-Z0-9_+-]+:/.test(text);
  }

  /**
   * Update decorations only for specified ranges (efficient targeted update)
   */
  private updateDecorationsForChangedRanges(ranges: Array<{from: number, to: number}>, doc: any): void {
    // Remove old decorations in changed ranges
    let filteredDecorations = this.decorations;
    for (const range of ranges) {
      filteredDecorations = filteredDecorations.update({
        filter: (from: number, to: number) => {
          // Keep decorations outside the changed ranges
          return !(from >= range.from && to <= range.to);
        }
      });
    }

    // Build new decorations for changed ranges only
    const newDecorations: Array<{from: number, to: number, decoration: Decoration}> = [];
    for (const range of ranges) {
      const rangeText = doc.sliceString(range.from, range.to);
      // Skip empty or obviously unsafe ranges
      if (!rangeText.trim() ||
          rangeText.trim().startsWith('```') ||
          rangeText.trim().startsWith('~~~')) {
        continue;
      }
      // Find shortcodes in this range
      const matches = this.scanner.scanShortcodes(rangeText, range.from);
      for (const match of matches) {
        if (match.imagePath && match.label) {
          // Validate positions
          if (match.from >= 0 && match.to <= doc.length && match.from < match.to) {
            try {
              const markDecoration = Decoration.mark({
                inclusive: false,
                class: "queercode-shortcode-mark",
                attributes: {
                  "data-shortcode": match.shortcode,
                  "data-emoji-src": match.imagePath,
                  "data-emoji-label": match.label
                }
              });
              newDecorations.push({
                from: match.from,
                to: match.to,
                decoration: markDecoration
              });
            } catch (error) {
              console.warn("Error creating range decoration:", error);
            }
          }
        }
      }
    }
    // Merge filtered decorations with new ones
    if (newDecorations.length > 0) {
      newDecorations.sort((a, b) => a.from - b.from);
      // Decoration.set returns a DecorationSet, but update expects an array of decorations
      // So we need to extract the decorations from the DecorationSet
      const decorationsArray: {from: number, to: number, value: Decoration}[] = [];
      Decoration.set(newDecorations.map(d => d.decoration.range(d.from, d.to))).between(0, doc.length, (from, to, value) => {
        decorationsArray.push({from, to, value});
      });
      this.decorations = filteredDecorations.update({
        add: decorationsArray.map(d => ({from: d.from, to: d.to, value: d.value}))
      });
    } else {
      this.decorations = filteredDecorations;
    }
    // Trigger background update (MutationObserver will handle most cases)
    setTimeout(() => this.updateAllEmojiBackgrounds(), 50);
  }

  /**
   * Scan the entire document for emoji shortcodes and build decorations
   * Used for initialization and full refreshes
   */
  private scanFullDocumentForShortcodes(): DecorationSet {
    try {
      if (!this.emojiService.isInitialized()) {
        return Decoration.none;
      }

      const doc = this.view.state.doc;
      const decorations: Array<{from: number, to: number, decoration: Decoration}> = [];

      // Process each line
      for (let lineNumber = 1; lineNumber <= doc.lines; lineNumber++) {
        try {
          const line = doc.line(lineNumber);
          const lineText = line.text;
          const lineFrom = line.from;

          // Skip empty lines and obvious code contexts
          if (!lineText.trim() ||
              lineText.trim().startsWith('```') ||
              lineText.trim().startsWith('~~~') ||
              lineText.startsWith('    ')) {
            continue;
          }

          // Find emoji shortcodes in this line
          const matches = this.scanner.scanShortcodes(lineText, 0);

          for (const match of matches) {
            if (match.imagePath && match.label) {
              const from = lineFrom + match.from;
              const to = lineFrom + match.to;

              // Validate positions
              if (from >= 0 && to > from && to <= doc.length) {
                try {

                  // Use mark decoration to overlay emoji while preserving original text
                  const markDecoration = Decoration.mark({
                    inclusive: false,
                    class: "queercode-shortcode-mark",
                    attributes: {
                      "data-shortcode": match.shortcode,
                      "data-emoji-src": match.imagePath,
                      "data-emoji-label": match.label
                    }
                  });

                  decorations.push({ from, to, decoration: markDecoration });
                } catch (error) {
                  console.warn("Error creating emoji decoration:", error);
                }
              }
            }
          }
        } catch (lineError) {
          console.warn("Error processing line", lineNumber, lineError);
        }
      }

      // Create decoration set
      if (decorations.length === 0) {
        return Decoration.none;
      }

      // Sort and remove overlaps
      decorations.sort((a, b) => a.from - b.from);
      const cleanDecorations = [];
      let lastEnd = 0;

      for (const dec of decorations) {
        if (dec.from >= lastEnd) {
          cleanDecorations.push(dec);
          lastEnd = dec.to;
        }
      }

      const decorationSet = Decoration.set(cleanDecorations.map(d => d.decoration.range(d.from, d.to)));

      // Trigger background update after decorations are applied
      setTimeout(() => this.updateAllEmojiBackgrounds(), 50);

      return decorationSet;

    } catch (error) {
      console.error("Error building decorations:", error);
      return Decoration.none;
    }
  }

  /**
   * Get current decorations
   */
  getDecorations(): DecorationSet {
    return this.decorations;
  }

  /**
   * Handle smart cursor navigation through emoji shortcodes
   */
  public handleCursorNavigation(view: EditorView, direction: 'left' | 'right'): boolean {
    const selection = view.state.selection.main;
    const pos = selection.head;
    // Find if cursor is within or adjacent to a shortcode decoration
    let targetShortcode: {from: number, to: number} | null = null;
    this.decorations.between(
      Math.max(0, pos - 50),
      Math.min(view.state.doc.length, pos + 50),
      (from: number, to: number, value: Decoration) => {
        // Check if cursor is within this decoration range
        if (pos >= from && pos <= to) {
          targetShortcode = {from, to};
          return false; // Stop iteration
        }
        // Check if cursor is adjacent and should jump over
        if (direction === 'right' && pos === from - 1) {
          targetShortcode = {from, to};
          return false;
        }
        if (direction === 'left' && pos === to + 1) {
          targetShortcode = {from, to};
          return false;
        }
        // Continue iteration
        return;
      }
    );
    if (targetShortcode !== null) {
      const { from, to } = targetShortcode;
      // Jump cursor to beginning or end of shortcode
      const newPos = direction === 'right' ? to : from;
      view.dispatch({
        selection: { anchor: newPos, head: newPos },
        scrollIntoView: true
      });
      return true; // Prevent default cursor movement
    }
    return false; // Allow default cursor movement
  }

  /**
   * Clean up
   */
  destroy(): void {
    this.destroyed = true;

    if (this.mapUpdateHandler) {
      this.emojiService.offMapUpdate(this.mapUpdateHandler);
      this.mapUpdateHandler = null;
    }

    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
  }
}

/**
 * Live Preview emoji renderer using simple ViewPlugin
 */
class EmojiLiveRenderer {
  constructor(
    private emojiService: EmojiCooker,
    private app: App
  ) {}

  /**
   * Create the CM6 extension - minimal, proven approach with smart cursor navigation
   */
  public getExtension(): Extension {
    const emojiService = this.emojiService;
    const app = this.app;

    // Create keymap for smart cursor navigation
    const emojiKeymap: KeyBinding[] = [
      {
        key: "ArrowLeft",
        run: (view) => {
          // Try to handle smart navigation, fall back to default if not applicable
          const plugin = view.plugin(emojiViewPlugin);
          if (plugin?.decorator?.handleCursorNavigation) {
            return plugin.decorator.handleCursorNavigation(view, 'left');
          }
          return false;
        }
      },
      {
        key: "ArrowRight",
        run: (view) => {
          const plugin = view.plugin(emojiViewPlugin);
          if (plugin?.decorator?.handleCursorNavigation) {
            return plugin.decorator.handleCursorNavigation(view, 'right');
          }
          return false;
        }
      }
    ];

    const emojiViewPlugin = ViewPlugin.fromClass(class {
      decorator: EmojiMarker;

      constructor(view: EditorView) {
        try {
          this.decorator = new EmojiMarker(view, emojiService, app);
          // Expose navigation method
          (this.decorator as any).handleCursorNavigation = this.decorator.handleCursorNavigation?.bind(this.decorator);
        } catch (error) {
          console.error("Error creating EmojiMarker:", error);
          // Create safe fallback
          this.decorator = {
            getDecorations: () => Decoration.none,
            update: () => {},
            destroy: () => {}
          } as any;
        }
      }

      update(update: ViewUpdate) {
        try {
          this.decorator.update(update);
        } catch (error) {
          console.error("Error in decorator update:", error);
        }
      }

      destroy() {
        try {
          this.decorator.destroy();
        } catch (error) {
          console.error("Error in decorator destroy:", error);
        }
      }
    }, {
      decorations: (plugin) => {
        try {
          return plugin.decorator.getDecorations();
        } catch (error) {
          console.error("Error getting decorations:", error);
          return Decoration.none;
        }
      }
    });

    return [emojiViewPlugin, keymap.of(emojiKeymap)];
  }

  /**
   * Refresh - handled by map update subscriptions
   */
  public refresh(): void {
    // Automatic refresh via map update handlers
  }
}

export function EmojiLive(emojiService: EmojiCooker, app: App): Extension {
  const renderer = new EmojiLiveRenderer(emojiService, app);
  return renderer.getExtension();
}
