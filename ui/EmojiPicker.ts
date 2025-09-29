import { App, Notice, EditorPosition, TFile, Editor, EditorSuggest, EditorSuggestContext, EditorSuggestTriggerInfo } from "obsidian";
import fuzzysort from "fuzzysort";
import { EmojiCooker } from "../services/EmojiCooker";

export interface EmojiOption {
  shortcode: string;
  file: string;
}

export class EmojiPicker extends EditorSuggest<EmojiOption> {
  private emojiService: EmojiCooker;

  private emojiContext: {
    editor: Editor;
    start: EditorPosition;
    end: EditorPosition;
  } | null = null;

  constructor(app: App, emojiService: EmojiCooker) {
    super(app);
    this.emojiService = emojiService;
  }

  onTrigger(cursor: EditorPosition, editor: Editor) {
    const line = editor.getLine(cursor.line);
    const match = line.substring(0, cursor.ch).match(/(?:^|\s|[*_~`"(]|(?<!\[)\[)(:\w*)$/);

    if (!match) return null;

    const triggerStart = cursor.ch - match[1].length;

    this.emojiContext = {
      editor,
      start: { line: cursor.line, ch: triggerStart },
      end: cursor,
    };

    return {
      start: this.emojiContext.start,
      end: this.emojiContext.end,
      query: match[1],
    };
  }

  getSuggestions(context: EditorSuggestContext): EmojiOption[] {
    const query = context.query.toLowerCase();
    const emojiMap = this.emojiService.getEmojiMap();
    const availableFiles = this.emojiService.getAvailableFiles();
    const emojiShortcodes = Object.keys(emojiMap);

    // Use centralized validation to filter suggestions
    const filteredShortcodes = emojiShortcodes.filter(
      shortcode => this.emojiService.shouldSuggestEmoji(shortcode, emojiMap[shortcode], availableFiles)
    );

    const results = fuzzysort.go(query, filteredShortcodes, { limit: 20 });

    return results.map(res => ({
      shortcode: res.target,
      file: emojiMap[res.target]
    }));
  }

  renderSuggestion(entry: EmojiOption, el: HTMLElement): void {
    el.addClass("emoji-suggest-item");
    const img = document.createElement("img");

    // Use the full vault-relative path directly from the emoji map
    img.src = this.app.vault.adapter.getResourcePath(entry.file);
    img.className = "queercode-emoji";
    el.appendChild(img);

    const span = document.createElement("span");
    span.textContent = ` ${entry.shortcode}`;
    el.appendChild(span);
  }

  selectSuggestion(entry: EmojiOption) {
    if (!this.emojiContext) return;

    const { editor, start, end } = this.emojiContext;
    editor.replaceRange(entry.shortcode, start, end);
    this.emojiContext = null;
  }

  refresh() {
    // The emoji service will have updated data, so no need to pass parameters
    // This method exists for compatibility with the existing callback system
  }
}
