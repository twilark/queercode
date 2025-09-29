// Syntax tree analysis for context filtering
// Extracts ALL syntax tree logic from EmojiMarker.shouldFilterPosition()

import { EditorView } from "@codemirror/view";
import { QueercodeSettingsData } from "../../ui/QueercodeSettings";

// Access syntaxTree through global require at runtime since it's externalized
// @ts-ignore - External dependency available at runtime
const { syntaxTree } = require('@codemirror/language');

/**
 * Analyzes syntax tree context to determine if emojis should be filtered
 *
 * This class extracts ALL the complex syntax tree analysis logic from the original
 * EmojiMarker.shouldFilterPosition() method. It preserves every node type pattern
 * and fallback detection mechanism to ensure identical behavior.
 */
export class SyntaxChecker {
  constructor(
    private view: EditorView,
    private settings: QueercodeSettingsData
  ) {}

  /**
   * Determine if emojis are allowed at the given position
   * Main entry point - extracted from EmojiMarker.shouldFilterPosition()
   *
   * @param position Document position to check
   * @param lineText Optional line text for fallback detection
   * @param lineOffset Optional offset within line for fallback detection
   * @returns true if emojis should be allowed, false if filtered out
   */
  allowsEmojis(position: number, lineText?: string, lineOffset?: number): boolean {
    try {
      const tree = syntaxTree(this.view.state);
      const cursor = tree.cursorAt(position);

      // Walk up the syntax tree to check all parent contexts
      do {
        const nodeType = cursor.type.name;

        // Enhanced code block detection
        if (this.isInCodeBlock(nodeType)) {
          // Optional debug logging for development (controlled by random sampling)
          if (Math.random() < 0.01) {
            console.log("Queercode: Filtering code block context - node:", nodeType);
          }
          return this.settings.renderInCodeblocks;
        }

        // Enhanced inline code detection
        if (this.isInInlineCode(nodeType)) {
          if (Math.random() < 0.01) {
            console.log("Queercode: Filtering inline code context - node:", nodeType);
          }
          return this.settings.renderInInlineCode;
        }

        // Enhanced link/URL detection
        if (this.isInUrl(nodeType)) {
          if (Math.random() < 0.01) {
            console.log("Queercode: Filtering link context - node:", nodeType);
          }
          return this.settings.renderInUrls;
        }

        // Enhanced frontmatter detection
        if (this.isInFrontmatter(nodeType)) {
          if (Math.random() < 0.01) {
            console.log("Queercode: Filtering frontmatter context - node:", nodeType);
          }
          return this.settings.renderInFrontmatter;
        }

        // Enhanced comment detection
        if (this.isInComment(nodeType)) {
          if (Math.random() < 0.01) {
            console.log("Queercode: Filtering comment context - node:", nodeType);
          }
          return this.settings.renderInComments;
        }

      } while (cursor.parent());

      // Try fallback content-based detection if syntax tree didn't find anything
      const fallbackResult = this.shouldFilterPositionFallback(position, lineText, lineOffset);
      if (fallbackResult !== null) {
        // Occasional debug logging for fallback usage
        if (Math.random() < 0.05) {
          console.log("Queercode: Using fallback detection -", !fallbackResult ? "allowed" : "filtered");
        }
        return !fallbackResult; // fallback returns true to filter, we return true to allow
      }

      return true; // Allow by default if no forbidden context found
    } catch (error) {
      console.warn("Queercode: Error checking syntax tree context:", error);

      // Try fallback detection on syntax tree error
      const fallbackResult = this.shouldFilterPositionFallback(position, lineText, lineOffset);
      if (fallbackResult !== null) {
        console.log("Queercode: Using fallback detection due to syntax tree error -", !fallbackResult ? "allowed" : "filtered");
        return !fallbackResult; // fallback returns true to filter, we return true to allow
      }

      return true; // Allow by default on error
    }
  }

  /**
   * Enhanced code block detection - check multiple possible node type patterns
   * Extracted from EmojiMarker.isCodeBlockNode() with ALL patterns preserved
   */
  isInCodeBlock(nodeType: string): boolean {
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
   * Extracted from EmojiMarker.isInlineCodeNode() with ALL patterns preserved
   */
  isInInlineCode(nodeType: string): boolean {
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
   * Extracted from EmojiMarker.isLinkNode() with ALL patterns preserved
   */
  isInUrl(nodeType: string): boolean {
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
   * Extracted from EmojiMarker.isFrontmatterNode() with ALL patterns preserved
   */
  isInFrontmatter(nodeType: string): boolean {
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
   * Extracted from EmojiMarker.isCommentNode() with ALL patterns preserved
   */
  isInComment(nodeType: string): boolean {
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
   * Fallback content-based detection when syntax tree fails or doesn't match
   * Extracted from EmojiMarker.shouldFilterPositionFallback() with ALL logic preserved
   *
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
   * Extracted from EmojiMarker.isInsideFencedCodeBlock() with ALL logic preserved
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
   * Extracted from EmojiMarker.isInsideInlineCode() with ALL logic preserved
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
}