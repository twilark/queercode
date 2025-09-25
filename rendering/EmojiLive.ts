// Live Preview emoji rendering with conditional decoration visibility
import { App } from "obsidian";
import { Extension } from "@codemirror/state";
import { ViewPlugin, ViewUpdate, EditorView, Decoration, DecorationSet } from "@codemirror/view";
// Access RangeSet for atomic ranges
// @ts-ignore - External dependency available at runtime
const { RangeSet } = require('@codemirror/state');
// Access syntaxTree through global require at runtime since it's externalized
// @ts-ignore - External dependency available at runtime
const { syntaxTree } = require('@codemirror/language');
import { EmojiCooker } from "../services/EmojiCooker";
import { QueercodeSettingsData } from "../ui/QueercodeSettings";
import { EmojiWidget } from "./EmojiWidget";
import { ShortcodeScanner } from "./ShortcodeScanner";

/**
 * Proximity-based emoji renderer - shows emoji unless cursor is nearby
 */
class EmojiMarker {
  private scanner: ShortcodeScanner;
  private decorations: DecorationSet = Decoration.none;
  private mapUpdateHandler: (() => void) | null = null;
  private destroyed = false;

  // PERFORMANCE OPTIMIZATION: Cache emoji locations to avoid rescanning document
  private cachedEmojiRanges: Array<{
    from: number,
    to: number,
    shortcode: string,
    imagePath: string,
    label: string
  }> = [];
  private lastProximityState = new Map<string, boolean>(); // Track show/hide state per emoji

  // Proximity buffer - cursor within 1 character hides emoji
  private static readonly PROXIMITY_BUFFER = 1;

  constructor(
    private view: EditorView,
    private emojiService: EmojiCooker,
    private app: App,
    private settings: QueercodeSettingsData
  ) {
    this.scanner = new ShortcodeScanner(this.emojiService, this.app);

    // Log context filtering status for verification
    console.log("Queercode: Context filtering enabled -",
      "Codeblocks:", this.settings.renderInCodeblocks,
      "Inline code:", this.settings.renderInInlineCode);

    // Build initial decorations if service is ready
    if (this.emojiService.isInitialized()) {
      try {
        this.rescanDocument();
        this.decorations = this.buildDecorationsFromCache();
      } catch (error) {
        console.error("Error building initial decorations:", error);
        this.decorations = Decoration.none;
      }
    }

    // Set up map update handler
    this.mapUpdateHandler = () => {
      if (!this.destroyed) {
        try {
          this.rescanDocument();
          this.decorations = this.buildDecorationsFromCache();
        } catch (error) {
          console.error("Error rebuilding decorations:", error);
          this.decorations = Decoration.none;
        }
      }
    };

    this.emojiService.onMapUpdate(this.mapUpdateHandler);
  }

  /**
   * OPTIMIZED: Scan document only when content changes - cache results
   */
  private rescanDocument(): void {
    this.cachedEmojiRanges = [];
    const doc = this.view.state.doc;

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
              // Check syntax tree context to see if this position should be filtered
              if (!this.shouldFilterPosition(from)) {
                this.cachedEmojiRanges.push({
                  from,
                  to,
                  shortcode: match.shortcode,
                  imagePath: match.imagePath,
                  label: match.label
                });
              }
            }
          }
        }
      } catch (lineError) {
        console.warn("Error processing line", lineNumber, lineError);
      }
    }
  }

  /**
   * OPTIMIZED: Efficient proximity-based decoration builder - only uses cached data
   */
  private buildDecorationsFromCache(): DecorationSet {
    const decorations: Array<{from: number, to: number, decoration: Decoration}> = [];
    const currentProximityState = new Map<string, boolean>();

    for (const emoji of this.cachedEmojiRanges) {
      const key = `${emoji.from}-${emoji.to}`;
      const shouldShow = !this.shouldHideEmoji(emoji.from, emoji.to);
      currentProximityState.set(key, shouldShow);

      if (shouldShow) {
        try {
          const widgetDecoration = Decoration.replace({
            widget: new EmojiWidget(emoji.shortcode, emoji.imagePath, emoji.label)
          });

          decorations.push({ from: emoji.from, to: emoji.to, decoration: widgetDecoration });
        } catch (error) {
          console.warn("Error creating emoji decoration:", error);
        }
      }
    }

    this.lastProximityState = currentProximityState;

    // Create decoration set
    if (decorations.length === 0) {
      return Decoration.none;
    }

    // Sort and remove overlaps (shouldn't happen with our scanning, but safety first)
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
  }

  /**
   * OPTIMIZED: Check if proximity state actually changed - avoids unnecessary rebuilds
   */
  private proximityStateChanged(): boolean {
    for (const emoji of this.cachedEmojiRanges) {
      const key = `${emoji.from}-${emoji.to}`;
      const currentShouldShow = !this.shouldHideEmoji(emoji.from, emoji.to);
      const lastShouldShow = this.lastProximityState.get(key);

      if (currentShouldShow !== lastShouldShow) {
        return true;
      }
    }
    return false;
  }

  /**
   * Get affected ranges based on current selection/cursor position
   */
  private getAffectedRanges(): Array<{from: number, to: number}> {
    const selection = this.view.state.selection.main;
    const buffer = EmojiMarker.PROXIMITY_BUFFER;

    if (selection.empty) {
      // Single cursor position
      return [{
        from: selection.head - buffer,
        to: selection.head + buffer
      }];
    } else {
      // Selection range
      return [{
        from: selection.from - buffer,
        to: selection.to + buffer
      }];
    }
  }

  /**
   * Check if an emoji range should be hidden due to cursor proximity
   */
  private shouldHideEmoji(emojiFrom: number, emojiTo: number): boolean {
    const affectedRanges = this.getAffectedRanges();

    return affectedRanges.some(range => {
      // Hide emoji if it overlaps with affected range
      return !(emojiTo < range.from || emojiFrom > range.to);
    });
  }

  /**
   * OPTIMIZED: Handle document changes and selection changes with cached data
   */
  update(update: ViewUpdate): void {
  if (this.destroyed || !this.emojiService.isInitialized()) return;

  if (update.docChanged) {
    // Only rebuild if the change could actually affect shortcodes
    if (this.changeAffectsShortcodes(update)) {
      this.rescanDocument();
      this.decorations = this.buildDecorationsFromCache();
    }
    // If no shortcode-affecting changes, keep existing decorations unchanged
  } else if (update.selectionSet) {
    if (this.proximityStateChanged()) {
      this.decorations = this.buildDecorationsFromCache();
    }
  }
}

private changeAffectsShortcodes(update: ViewUpdate): boolean {
  let hasShortcodeChanges = false;

  update.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
    // Check deleted text
    const deletedText = update.startState.doc.sliceString(fromA, toA);
    // Check inserted text
    const insertedText = inserted.toString();

    // Rebuild if colons are involved (shortcode boundaries)
    if (deletedText.includes(':') || insertedText.includes(':')) {
      hasShortcodeChanges = true;
    }
  });

  return hasShortcodeChanges;
}

  /**
   * Check if a position should be filtered based on syntax tree context
   */
  private shouldFilterPosition(position: number): boolean {
    try {
      const tree = syntaxTree(this.view.state);
      const cursor = tree.cursorAt(position);

      // Debug: Occasionally log syntax tree structure (minimal)
      if (Math.random() < 0.005) {
        console.log("Queercode: Checking position", position, "in node:", cursor.type.name);
      }

      // Walk up the syntax tree to check all parent contexts
      do {
        const nodeType = cursor.type.name; // Keep original case for exact matching

        // Check for fenced code blocks - HyperMD style
        if (nodeType === 'HyperMD-codeblock' || nodeType.includes('CodeBlock') ||
            nodeType.includes('FencedCode') || nodeType.includes('codeblock')) {
          return !this.settings.renderInCodeblocks;
        }

        // Check for inline code - CM6 style
        if (nodeType === 'cm-inline-code' || nodeType.includes('InlineCode') ||
            nodeType.includes('inline-code')) {
          return !this.settings.renderInInlineCode;
        }

        // Check for URL/link contexts - HyperMD and CM6 variations
        if (nodeType.includes('Link') || nodeType.includes('URL') ||
            nodeType.includes('hmd-link') || nodeType.includes('autolink') ||
            nodeType.startsWith('link_') || nodeType.endsWith('_link')) {
          return !this.settings.renderInUrls;
        }

        // Check for frontmatter contexts - HyperMD style
        if (nodeType.includes('frontmatter') || nodeType.includes('yaml') ||
            nodeType === 'HyperMD-frontmatter' || nodeType.includes('Frontmatter')) {
          return !this.settings.renderInFrontmatter;
        }

        // Check for comment contexts - various formats
        if (nodeType.includes('comment') || nodeType.includes('Comment') ||
            nodeType === 'HyperMD-comment') {
          return !this.settings.renderInComments;
        }

      } while (cursor.parent());

      return false; // Allow by default if no forbidden context found
    } catch (error) {
      console.warn("Queercode: Error checking syntax tree context:", error);
      return false; // Allow by default on error
    }
  }

  /**
   * Get current decorations
   */
  getDecorations(): DecorationSet {
    return this.decorations;
  }

  /**
   * Get atomic ranges for visible emoji widgets
   * Since proximity-based hiding works at decoration level,
   * all visible widgets should be atomic
   */
  getAtomicRanges(): any {
    const ranges: Array<{ from: number, to: number }> = [];

    this.decorations.between(0, this.view.state.doc.length, (from: number, to: number) => {
      ranges.push({ from, to });
    });

    if (ranges.length === 0) {
      return RangeSet.empty;
    }

    // Sort ranges and create RangeSet
    ranges.sort((a, b) => a.from - b.from);

    return RangeSet.of(ranges.map(r => ({
      from: r.from,
      to: r.to,
      value: null
    })));
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
class EmojiLiveRenderer {
  constructor(
    private emojiService: EmojiCooker,
    private app: App,
    private settings: QueercodeSettingsData
  ) {}

  /**
   * Create the CM6 extension with conditional decoration visibility
   * - Shows emoji widgets when cursor is far away (1+ character buffer)
   * - Shows raw shortcode text when cursor is nearby for editing
   * - Atomic ranges ensure visible emojis behave as single units
   * - Perfect copy/paste (always preserves underlying shortcode text)
   */
  public getExtension(): Extension {
    const emojiService = this.emojiService;
    const app = this.app;
    const settings = this.settings;

    const emojiViewPlugin = ViewPlugin.fromClass(class {
      decorator: EmojiMarker;

      constructor(view: EditorView) {
        try {
          this.decorator = new EmojiMarker(view, emojiService, app, settings);
        } catch (error) {
          console.error("Error creating EmojiMarker:", error);
          // Create safe fallback
          this.decorator = {
            getDecorations: () => Decoration.none,
            getAtomicRanges: () => RangeSet.empty,
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

    // Create atomic ranges facet for clean backspace/delete behavior
    const atomicRanges = EditorView.atomicRanges.of((view) => {
      try {
        const plugin = view.plugin(emojiViewPlugin);
        if (plugin?.decorator?.getAtomicRanges) {
          return plugin.decorator.getAtomicRanges();
        }
        return RangeSet.empty;
      } catch (error) {
        console.error("Error getting atomic ranges:", error);
        return RangeSet.empty;
      }
    });

    return [emojiViewPlugin, atomicRanges];
  }

  /**
   * Refresh - handled by map update subscriptions
   */
  public refresh(): void {
    // Automatic refresh via map update handlers
  }
}

export function EmojiLive(emojiService: EmojiCooker, app: App, settings: QueercodeSettingsData): Extension {
  const renderer = new EmojiLiveRenderer(emojiService, app, settings);
  return renderer.getExtension();
}
