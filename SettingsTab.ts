import { App, PluginSettingTab, Setting, Notice, Plugin } from "obsidian";

export interface QueercodeSettings {
  filetypePreference: "svg" | "png" | "auto";
  emojiFolderPath: string;
}

export const DEFAULT_SETTINGS: QueercodeSettings = {
  filetypePreference: "svg",
  emojiFolderPath: ""
};

export class QueercodeSettingTab extends PluginSettingTab {
  private settings: QueercodeSettings;
  private saveSettings: () => Promise<void>;
  private generateEmojiMap: () => Promise<{added: number, total: number}>;
  private isGenerating = false;

  constructor(
    app: App,
    plugin: Plugin,
    settings: QueercodeSettings,
    saveSettings: () => Promise<void>,
    generateEmojiMap: () => Promise<{added: number, total: number}>
  ) {
    super(app, plugin); // Pass the plugin to super() as required
    this.settings = settings;
    this.saveSettings = saveSettings;
    this.generateEmojiMap = generateEmojiMap;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Queercode Settings" });

    // Filetype preference setting
    new Setting(containerEl)
      .setName("Preferred emoji filetype")
      .setDesc("Choose which file type to use when both SVG and PNG exist.")
      .addDropdown(dropdown =>
        dropdown
          .addOption("svg", "SVG (recommended)")
          .addOption("png", "PNG")
          .addOption("auto", "Auto-detect (prefer SVG)")
          .setValue(this.settings.filetypePreference)
          .onChange(async (value: string) => {
            this.settings.filetypePreference = value as "svg" | "png" | "auto";
            await this.saveSettings();
          })
      );

    // Emoji folder path setting
    new Setting(containerEl)
      .setName("Emoji folder path")
      .setDesc("Vault-relative path to your emoji library folder. Leave blank to use all subfolders in the default 'emoji/' directory.")
      .addText(text =>
        text
          .setPlaceholder("emoji/twemoji/")
          .setValue(this.settings.emojiFolderPath)
          .onChange(async (value) => {
            this.settings.emojiFolderPath = value.trim();
            await this.saveSettings();
          })
      );

    // Emoji map generation section
    containerEl.createEl("h3", { text: "Emoji Map Management" });

    const mapInfo = containerEl.createEl("p", {
      text: "Generate or update the emoji map from files in your emoji folder. This will scan for .png and .svg files and create shortcodes automatically."
    });
    mapInfo.addClass("setting-item-description");

    new Setting(containerEl)
      .setName("Emoji map generation")
      .setDesc("Regenerate the emoji map from the files in your emoji folder.")
      .addButton(button =>
        button
          .setButtonText(this.isGenerating ? "Generating..." : "Generate Emoji Map")
          .setDisabled(this.isGenerating)
          .onClick(async () => {
            await this.handleGenerateEmojiMap();
          })
      );
  }

  private async handleGenerateEmojiMap(): Promise<void> {
    if (this.isGenerating) return;

    this.isGenerating = true;
    const notice = new Notice("Generating emoji map...", 0);

    try {
      // Update button state
      this.display();

      // Use the callback function to generate the map
      const result = await this.generateEmojiMap();

      // Note: We removed this.refreshSuggester() call because the event system
      // in EmojiService will automatically notify all subscribers (including the suggester)

      notice.hide();
      new Notice(`Emoji map updated: ${result.added} new entries, ${result.total} total entries.`);

    } catch (error: unknown) {
      console.error("Error generating emoji map:", error);
      notice.hide();
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      new Notice(`Failed to generate emoji map: ${errorMessage}`);
    } finally {
      this.isGenerating = false;
      this.display(); // Refresh UI
    }
  }
}
