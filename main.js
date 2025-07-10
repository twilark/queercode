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
var import_obsidian = require("obsidian");
var QueercodePlugin = class extends import_obsidian.Plugin {
  async onload() {
    console.log("Queercode plugin loaded");
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
            while (current2) {
              if (forbidden.includes(current2.tagName)) return NodeFilter.FILTER_REJECT;
              current2 = current2.parentElement;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
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
            if (!url) continue;
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
  async loadEmojiMap() {
    const file = await this.app.vault.adapter.read(`${this.manifest.dir}/emoji-map.json`);
    return JSON.parse(file);
  }
};
