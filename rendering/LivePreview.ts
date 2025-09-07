// SIMPLIFIED Live Preview emoji rendering - minimal CM6 approach
import { App } from "obsidian";
import { Extension } from "@codemirror/state";
import { ViewPlugin, ViewUpdate, EditorView, Decoration, DecorationSet } from "@codemirror/view";
import { EmojiService } from "../services/EmojiService";
import { EmojiWidget } from "./EmojiWidget";
import { ShortcodeScanner } from "./ShortcodeScanner";

/**
 * MINIMAL CM6 ViewPlugin decorator - proven working approach
 */
class SimpleEmojiDecorator {
  private scanner: ShortcodeScanner;
  private decorations: DecorationSet = Decoration.none;
  private mapUpdateHandler: (() => void) | null = null;
  private destroyed = false;

  constructor(
    private view: EditorView,
    private emojiService: EmojiService,
    private app: App
  ) {
    this.scanner = new ShortcodeScanner(this.emojiService, this.app);

    // Build initial decorations if service is ready
    if (this.emojiService.isInitialized()) {
      try {
        this.decorations = this.buildDecorations();
      } catch (error) {
        console.error("Error building initial decorations:", error);
        this.decorations = Decoration.none;
      }
    }

    // Set up map update handler
    this.mapUpdateHandler = () => {
      if (!this.destroyed) {
        try {
          this.decorations = this.buildDecorations();
        } catch (error) {
          console.error("Error rebuilding decorations:", error);
          this.decorations = Decoration.none;
        }
      }
    };

    this.emojiService.onMapUpdate(this.mapUpdateHandler);
  }

  /**
   * Handle document changes
   */
  update(update: ViewUpdate): void {
    if (this.destroyed || !this.emojiService.isInitialized()) return;

    // Map existing decorations through document changes
    if (update.docChanged) {
      this.decorations = this.decorations.map(update.changes);

      // Only rebuild if significant changes
      if (this.shouldRebuildDecorations(update)) {
        try {
          this.decorations = this.buildDecorations();
        } catch (error) {
          console.error("Error rebuilding decorations:", error);
          this.decorations = Decoration.none;
        }
      }
    }
  }

  /**
   * Simple rebuild logic - only on shortcode completion
   */
  private shouldRebuildDecorations(update: ViewUpdate): boolean {
    let shouldRebuild = false;

    update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
      const insertedText = inserted.toString();
      // Only rebuild when shortcode is completed with ':'
      if (insertedText.endsWith(':') && insertedText.length > 1) {
        shouldRebuild = true;
        return false; // Stop iteration
      }
    });

    return shouldRebuild;
  }

  /**
   * Build decorations using simple line-by-line approach
   */
  private buildDecorations(): DecorationSet {
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
          const matches = this.scanner.scanText(lineText, 0);

          for (const match of matches) {
            if (match.imagePath && match.label) {
              const from = lineFrom + match.from;
              const to = lineFrom + match.to;

              // Validate positions
              if (from >= 0 && to > from && to <= doc.length) {
                try {
                  const widget = new EmojiWidget(
                    match.shortcode,
                    match.imagePath,
                    match.label
                  );

                  const decoration = Decoration.replace({
                    widget: widget,
                    inclusive: false,
                    block: false
                  });

                  decorations.push({ from, to, decoration });
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

      return Decoration.set(cleanDecorations.map(d => d.decoration.range(d.from, d.to)));

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
   * Clean up
   */
  destroy(): void {
    this.destroyed = true;

    if (this.mapUpdateHandler) {
      this.emojiService.offMapUpdate(this.mapUpdateHandler);
      this.mapUpdateHandler = null;
    }
  }
}

/**
 * Live Preview emoji renderer using simple ViewPlugin
 */
export class LivePreviewRenderer {
  constructor(
    private emojiService: EmojiService,
    private app: App
  ) {}

  /**
   * Create the CM6 extension - minimal, proven approach
   */
  public getExtension(): Extension {
    const emojiService = this.emojiService;
    const app = this.app;

    return ViewPlugin.fromClass(class {
      decorator: SimpleEmojiDecorator;

      constructor(view: EditorView) {
        try {
          this.decorator = new SimpleEmojiDecorator(view, emojiService, app);
        } catch (error) {
          console.error("Error creating SimpleEmojiDecorator:", error);
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
  }

  /**
   * Refresh - handled by map update subscriptions
   */
  public refresh(): void {
    // Automatic refresh via map update handlers
  }
}
