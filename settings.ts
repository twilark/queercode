import { App, PluginSettingTab, Setting } from "obsidian";

// 1. Define interface for your settings object
export interface QueercodeSettings {
	filetypePreference: "svg" | "png" | "auto";
}

// 2. Provide default values
export const DEFAULT_SETTINGS: QueercodeSettings = {
	filetypePreference: "svg"
};

// 3. Create the actual settings tab UI
export class QueercodeSettingTab extends PluginSettingTab {
	plugin: any;

	constructor(app: App, plugin: any) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();
		containerEl.createEl("h2", { text: "Queercode Settings" });

		new Setting(containerEl)
			.setName("Preferred emoji filetype")
			.setDesc("Choose which file type to use when both SVG and PNG exist.")
			.addDropdown(dropdown =>
				dropdown
					.addOption("svg", "SVG (recommended)")
					.addOption("png", "PNG")
					.addOption("auto", "Auto-detect (prefer SVG, fallback to PNG)")
					.setValue(this.plugin.settings.filetypePreference)
					.onChange(async (value: string) => {
						this.plugin.settings.filetypePreference = value as "svg" | "png" | "auto";
						await this.plugin.saveSettings();
					})
			);
	}
}
