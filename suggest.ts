import { App, EditorPosition, TFile, Plugin, Editor, EditorSuggest, EditorSuggestContext, EditorSuggestTriggerInfo } from "obsidian";


export interface EmojiEntry {
  shortcode: string;
  file: string;
}

export class EmojiSuggest extends EditorSuggest<EmojiEntry> {
  plugin: Plugin;
  emojiMap: Record<string, string>;

  constructor(app: App, plugin: Plugin, emojiMap: Record<string, string>) {
    super(app);
    this.plugin = plugin;
    this.emojiMap = emojiMap;
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
    return Object.entries(this.emojiMap)
      .filter(([key]) => key.toLowerCase().includes(query))
      .slice(0, 20) // limit suggestions
      .map(([shortcode, file]) => ({ shortcode, file }));
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
