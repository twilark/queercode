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

    // Context filtering initialized based on user settings

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
              if (!this.shouldFilterPosition(from, lineText, match.from)) {
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
    if (this.changeAffectsShortcodes(update)) {
      // Shortcode content changed - full rescan needed
      this.rescanDocument();
      this.decorations = this.buildDecorationsFromCache();
    } else {
      // No shortcode changes - just update cached positions using change mapping
      this.updateCachedPositions(update);
      // Rebuild decorations with updated positions
      this.decorations = this.buildDecorationsFromCache();
    }
  } else if (update.selectionSet) {
    if (this.proximityStateChanged()) {
      this.decorations = this.buildDecorationsFromCache();
    }
  }
}

  /**
   * PERFORMANCE: Update cached emoji positions using CodeMirror's change mapping
   * This prevents the "scooting emoji" issue when text is added/removed before widgets
   */
  private updateCachedPositions(update: ViewUpdate): void {
    const newCachedRanges = [];

    for (const emoji of this.cachedEmojiRanges) {
      try {
        // Map the emoji's positions through the document changes
        const newFrom = update.changes.mapPos(emoji.from, -1); // Map backward for start
        const newTo = update.changes.mapPos(emoji.to, 1);       // Map forward for end

        // Only keep emoji if mapping was successful and positions are still valid
        if (newFrom >= 0 && newTo > newFrom && newTo <= update.state.doc.length) {
          newCachedRanges.push({
            ...emoji,
            from: newFrom,
            to: newTo
          });
        }
        // If position mapping failed, emoji was likely deleted or corrupted - omit it
      } catch (error) {
        console.warn("Error mapping emoji position:", error);
        // Skip this emoji on error
      }
    }

    this.cachedEmojiRanges = newCachedRanges;

    // Clear proximity state since positions changed
    this.lastProximityState.clear();
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
   * Also includes fallback content-based detection for reliability
   */
  private shouldFilterPosition(position: number, lineText?: string, lineOffset?: number): boolean {
    try {
      const tree = syntaxTree(this.view.state);
      const cursor = tree.cursorAt(position);

      // Walk up the syntax tree to check all parent contexts
      do {
        const nodeType = cursor.type.name;

        // Enhanced code block detection
        if (this.isCodeBlockNode(nodeType)) {
          // Optional debug logging for development (controlled by random sampling)
          if (Math.random() < 0.01) {
            console.log("Queercode: Filtering code block context - node:", nodeType);
          }
          return !this.settings.renderInCodeblocks;
        }

        // Enhanced inline code detection
        if (this.isInlineCodeNode(nodeType)) {
          if (Math.random() < 0.01) {
            console.log("Queercode: Filtering inline code context - node:", nodeType);
          }
          return !this.settings.renderInInlineCode;
        }

        // Enhanced link/URL detection
        if (this.isLinkNode(nodeType)) {
          if (Math.random() < 0.01) {
            console.log("Queercode: Filtering link context - node:", nodeType);
          }
          return !this.settings.renderInUrls;
        }

        // Enhanced frontmatter detection
        if (this.isFrontmatterNode(nodeType)) {
          if (Math.random() < 0.01) {
            console.log("Queercode: Filtering frontmatter context - node:", nodeType);
          }
          return !this.settings.renderInFrontmatter;
        }

        // Enhanced comment detection
        if (this.isCommentNode(nodeType)) {
          if (Math.random() < 0.01) {
            console.log("Queercode: Filtering comment context - node:", nodeType);
          }
          return !this.settings.renderInComments;
        }

      } while (cursor.parent());

      // Try fallback content-based detection if syntax tree didn't find anything
      const fallbackResult = this.shouldFilterPositionFallback(position, lineText, lineOffset);
      if (fallbackResult !== null) {
        // Occasional debug logging for fallback usage
        if (Math.random() < 0.05) {
          console.log("Queercode: Using fallback detection -", fallbackResult ? "filtered" : "allowed");
        }
        return fallbackResult;
      }

      return false; // Allow by default if no forbidden context found
    } catch (error) {
      console.warn("Queercode: Error checking syntax tree context:", error);

      // Try fallback detection on syntax tree error
      const fallbackResult = this.shouldFilterPositionFallback(position, lineText, lineOffset);
      if (fallbackResult !== null) {
        console.log("Queercode: Using fallback detection due to syntax tree error -", fallbackResult ? "filtered" : "allowed");
        return fallbackResult;
      }

      return false; // Allow by default on error
    }
  }

  /**
   * Fallback content-based detection when syntax tree fails or doesn't match
   * Returns null if no pattern matched, boolean if pattern matched
   */
  private shouldFilterPositionFallback(position: number, lineText?: string, lineOffset?: number): boolean | null {
    if (!lineText || lineOffset === undefined) {
      return null; // Can't do content-based detection without line context
    }

    // Get surrounding context for better detection
    const doc = this.view.state.doc;
    const lineNumber = doc.lineAt(position).number;
    const currentLine = doc.line(lineNumber);
    const previousLine = lineNumber > 1 ? doc.line(lineNumber - 1) : null;
    const nextLine = lineNumber < doc.lines ? doc.line(lineNumber + 1) : null;

    // Check for fenced code blocks
    if (!this.settings.renderInCodeblocks) {
      // Check if we're inside a fenced code block
      if (this.isInsideFencedCodeBlock(lineNumber, doc)) {
        return true; // Filter out
      }
    }

    // Check for inline code
    if (!this.settings.renderInInlineCode) {
      // Simple pattern: look for backticks around the shortcode position on the same line
      if (this.isInsideInlineCode(lineText, lineOffset)) {
        return true; // Filter out
      }
    }

    // Check for indented code blocks (4+ spaces)
    if (!this.settings.renderInCodeblocks) {
      if (lineText.match(/^    /) || lineText.match(/^\t/)) {
        return true; // Filter out
      }
    }

    return null; // No pattern matched
  }

  /**
   * Check if a line number is inside a fenced code block
   */
  private isInsideFencedCodeBlock(lineNumber: number, doc: any): boolean {
    let inCodeBlock = false;
    let codeBlockStart = -1;

    // Scan from the beginning of the document to the current line
    for (let i = 1; i <= lineNumber; i++) {
      const line = doc.line(i);
      const lineText = line.text.trim();

      // Check for code fence start/end (``` or ~~~)
      if (lineText.match(/^```|^~~~/)) {
        if (!inCodeBlock) {
          inCodeBlock = true;
          codeBlockStart = i;
        } else {
          inCodeBlock = false;
          codeBlockStart = -1;
        }
      }
    }

    return inCodeBlock;
  }

  /**
   * Check if a position within a line is inside inline code (backticks)
   */
  private isInsideInlineCode(lineText: string, position: number): boolean {
    // Count backticks before and after the position
    let ticksBeforeCount = 0;
    let ticksAfterCount = 0;

    // Count backticks before position
    for (let i = 0; i < position; i++) {
      if (lineText[i] === '`') {
        ticksBeforeCount++;
      }
    }

    // Count backticks after position
    for (let i = position; i < lineText.length; i++) {
      if (lineText[i] === '`') {
        ticksAfterCount++;
      }
    }

    // Simple heuristic: if we have backticks both before and after,
    // and the counts suggest we're inside a code span
    return ticksBeforeCount > 0 && ticksAfterCount > 0 && (ticksBeforeCount % 2 === 1);
  }

  /**
   * Enhanced code block detection - check multiple possible node type patterns
   */
  private isCodeBlockNode(nodeType: string): boolean {
    const patterns = [
      // Known patterns to test
      'HyperMD-codeblock', 'CodeBlock', 'FencedCode', 'codeblock',
      'fenced-code', 'fenced_code', 'code-block', 'code_block',
      // Common Obsidian/CodeMirror patterns
      'markup-code-block', 'markup.code.block', 'code-fence',
      'hmd-codeblock', 'cm-codeblock', 'obsidian-codeblock',
      // Lezer grammar patterns (most likely candidates)
      'FencedCodeBlock', 'CodeFence', 'CodeText', 'CodeInfo',
      'IndentedCodeBlock', 'CodeBlock', 'ATXHeading1', // exclude headings
      // Markdown-specific patterns
      'markdown_fenced_code_block', 'markdown_code_block',
      'md-code-block', 'md-fenced-code', 'mdx-code-block',
      // Generic patterns that might be used
      'pre', 'code-content', 'syntax-code', 'lang-',
      // Try lowercase variations
      'fencedcodeblock', 'codefence', 'indentedcodeblock'
    ];

    return patterns.some(pattern =>
      nodeType === pattern ||
      nodeType.includes(pattern) ||
      nodeType.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Enhanced inline code detection
   */
  private isInlineCodeNode(nodeType: string): boolean {
    const patterns = [
      // Known patterns to test
      'cm-inline-code', 'InlineCode', 'inline-code', 'inline_code',
      // Common patterns
      'markup-code-inline', 'markup.code.inline', 'code-inline',
      'hmd-inline-code', 'cm-inlinecode', 'obsidian-inline-code',
      // Lezer patterns (most likely candidates)
      'InlineCode', 'CodeMark', 'CodeSpan', 'InlineCodeElement',
      'BacktickCode', 'Code', 'CodeText', 'MonospacedText',
      // Markdown-specific patterns
      'markdown_inline_code', 'markdown_code_span',
      'md-inline-code', 'md-code-span', 'mdx-inline-code',
      // Generic patterns
      'backtick', 'code-span', 'monospace',
      // Try variations
      'inlinecode', 'code_span', 'backtickcoded'
    ];

    return patterns.some(pattern =>
      nodeType === pattern ||
      nodeType.includes(pattern) ||
      nodeType.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Enhanced link/URL detection
   */
  private isLinkNode(nodeType: string): boolean {
    const patterns = [
      'Link', 'URL', 'hmd-link', 'autolink', 'link_', '_link',
      'markup-link', 'markup.link', 'markdown-link',
      'hmd-autolink', 'cm-link', 'obsidian-link',
      // Lezer patterns (most likely candidates)
      'Link', 'AutoLink', 'WikiLink', 'LinkMark', 'LinkReference',
      'LinkTitle', 'LinkLabel', 'InlineLink', 'ReferenceLink',
      // Obsidian-specific patterns
      'internal-link', 'external-link', 'wikilink', 'markdown-link',
      // URL patterns
      'URL', 'uri', 'href', 'hyperlink',
      // Generic patterns
      'anchor', 'link-text', 'link-url'
    ];

    return patterns.some(pattern =>
      nodeType === pattern ||
      nodeType.includes(pattern) ||
      nodeType.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Enhanced frontmatter detection
   */
  private isFrontmatterNode(nodeType: string): boolean {
    const patterns = [
      'frontmatter', 'yaml', 'HyperMD-frontmatter', 'Frontmatter',
      'markup-frontmatter', 'markup.frontmatter', 'yaml-frontmatter',
      'hmd-frontmatter', 'cm-frontmatter', 'obsidian-frontmatter',
      'YamlFrontmatter', 'FrontMatter', 'YAMLFrontMatter'
    ];

    return patterns.some(pattern =>
      nodeType === pattern ||
      nodeType.includes(pattern) ||
      nodeType.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  /**
   * Enhanced comment detection
   */
  private isCommentNode(nodeType: string): boolean {
    const patterns = [
      'comment', 'Comment', 'HyperMD-comment',
      'markup-comment', 'markup.comment', 'html-comment',
      'hmd-comment', 'cm-comment', 'obsidian-comment',
      'CommentElement', 'CommentBlock', 'HTMLComment'
    ];

    return patterns.some(pattern =>
      nodeType === pattern ||
      nodeType.includes(pattern) ||
      nodeType.toLowerCase().includes(pattern.toLowerCase())
    );
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
