import { App, EditorPosition, TFile, Plugin, Editor, EditorSuggest, EditorSuggestContext, EditorSuggestTriggerInfo } from "obsidian";
import fuzzysort from "fuzzysort";

export interface EmojiEntry {
  shortcode: string;
  file: string;
}

export class EmojiSuggest extends EditorSuggest<EmojiEntry> {
  plugin: Plugin;
  emojiMap: Record<string, string>;
  availableEmojiFiles: Set<string>;

  constructor(app: App, plugin: Plugin, emojiMap: Record<string, string>, availableEmojiFiles: Set<string>) {
    super(app);
    this.plugin = plugin;
    this.emojiMap = emojiMap;
    this.availableEmojiFiles = availableEmojiFiles;
  }



  onTrigger(cursor: EditorPosition, editor: Editor, file: TFile): EditorSuggestTriggerInfo | null {
    const line = editor.getLine(cursor.line);
    const match = /(?:^|\s):([\w\-_]+)$/.exec(line.substring(0, cursor.ch));
    if (match) {
      return {
        start: {
          line: cursor.line,
          ch: match.index + (match[0].startsWith(":") ? 0 : 1)
        },
        end: cursor,
        query: match[1]
      };
    }
    return null;
  }

  getSuggestions(context: EditorSuggestContext): EmojiEntry[] {
    const query = context.query.toLowerCase();
    const emojiShortcodes = Object.keys(this.emojiMap); // [":bee:", ":rainbow:", ...]

    // Only include shortcodes whose file exists in the emoji folder
    const filteredShortcodes = emojiShortcodes.filter(
      shortcode => this.availableEmojiFiles.has(this.emojiMap[shortcode])
    );

    // Fuzzy search with a limit of 20
    const results = fuzzysort.go(query, filteredShortcodes, { limit: 20 });

    return results.map(res => ({
      shortcode: res.target,
      file: this.emojiMap[res.target]
    }));
  }


  renderSuggestion(entry: EmojiEntry, el: HTMLElement): void {
    el.addClass("emoji-suggest-item");
    const img = document.createElement("img");
    img.src = this.plugin.app.vault.adapter.getResourcePath(`${this.plugin.manifest.dir}/emoji/${entry.file}`);
    img.className = "queercode-emoji";
    el.appendChild(img);

    const span = document.createElement("span");
    span.textContent = ` ${entry.shortcode}`;
    el.appendChild(span);
  }

  selectSuggestion(entry: EmojiEntry, evt: MouseEvent | KeyboardEvent): void {
    const editor = this.app.workspace.activeEditor?.editor;
    if (!editor) return;
    editor.replaceRange(entry.shortcode, this.context!.start, this.context!.end);
  }
}
