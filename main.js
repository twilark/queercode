"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// main.ts
var main_exports = {};
__export(main_exports, {
  default: () => QueercodePlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

// settings.ts
var import_obsidian = require("obsidian");
var DEFAULT_SETTINGS = {
  filetypePreference: "svg"
};
var QueercodeSettingTab = class extends import_obsidian.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Queercode Settings" });
    new import_obsidian.Setting(containerEl).setName("Preferred emoji filetype").setDesc("Choose which file type to use when both SVG and PNG exist.").addDropdown(
      (dropdown) => dropdown.addOption("svg", "SVG (recommended)").addOption("png", "PNG").addOption("auto", "Auto-detect (prefer SVG, fallback to PNG)").setValue(this.plugin.settings.filetypePreference).onChange(async (value) => {
        this.plugin.settings.filetypePreference = value;
        await this.plugin.saveSettings();
      })
    );
  }
};

// main.ts
var QueercodePlugin = class extends import_obsidian2.Plugin {
  async onload() {
    console.log("Queercode plugin loaded");
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.addSettingTab(new QueercodeSettingTab(this.app, this));
    const emojiMap = await this.loadEmojiMap();
    const shortcodeRegex = new RegExp(
      Object.keys(emojiMap).map((k) => k.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")).join("|"),
      "g"
    );
    this.registerMarkdownPostProcessor(async (el, ctx) => {
      const walker = document.createTreeWalker(
        el,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode(node) {
            if (!node.parentElement) return NodeFilter.FILTER_REJECT;
            const forbidden = ["CODE", "PRE", "A", "STYLE"];
            let current2 = node.parentElement;
            while (current2 !== null) {
              if (forbidden.includes(current2.tagName)) {
                return NodeFilter.FILTER_REJECT;
              }
              current2 = current2.parentElement;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
          // Accept nodes allowed for emoji replacement
        }
      );
      const targets = [];
      let current = walker.nextNode();
      while (current) {
        if (shortcodeRegex.test(current.nodeValue || "")) {
          targets.push(current);
        }
        current = walker.nextNode();
      }
      for (const node of targets) {
        const parent = node.parentNode;
        if (!parent) continue;
        const parts = (node.nodeValue || "").split(shortcodeRegex);
        const matches = (node.nodeValue || "").match(shortcodeRegex) || [];
        const frag = document.createDocumentFragment();
        for (let i = 0; i < parts.length; i++) {
          if (parts[i]) frag.appendChild(document.createTextNode(parts[i]));
          if (matches[i]) {
            const url = emojiMap[matches[i]];
            if (!url || !url.endsWith(".png") && !url.endsWith(".svg")) {
              console.warn(`Skipping emoji: ${matches[i]} (bad or unsupported file: ${url})`);
              continue;
            }
            const img = document.createElement("img");
            img.src = this.app.vault.adapter.getResourcePath(`${this.manifest.dir}/emoji/${url}`);
            img.alt = matches[i];
            img.className = "queercode-emoji";
            frag.appendChild(img);
          }
        }
        try {
          parent.replaceChild(frag, node);
        } catch (e) {
          console.warn("Queercode DOM replace failed", e);
        }
      }
    });
  }
  // Load emoji mapping JSON file from plugin directory
  async loadEmojiMap() {
    const file = await this.app.vault.adapter.read(`${this.manifest.dir}/emoji-map.json`);
    return JSON.parse(file);
  }
  // Save plugin settings
  async saveSettings() {
    await this.saveData(this.settings);
  }
};
