import { Extension } from "@codemirror/state";
import { EmojiService } from "../services/EmojiService";
import { App } from "obsidian";

export class LivePreviewRenderer {
  constructor(
    private emojiService: EmojiService,
    private app: App
  ) {}

  public getExtension(): Extension {
    // Placeholder that does nothing - we'll implement this in Phase 3
    return [];
  }

  public refresh(): void {
    // Placeholder for when emoji map updates - we'll implement this in Phase 3
    console.log("LivePreview renderer refresh called (not yet implemented)");
  }
}
