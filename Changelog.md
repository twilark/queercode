## 0.5.8-alpha (Latest)

- **🚀 Major Architectural Refactor:** The plugin has been completely reorganized for stability and future development.
  - Core logic is now split into modular services, e.g. `EmojiService` for data management/validation and `MapHandler` for all file system operations.
  - This change eliminates circular dependencies and creates a single source of truth for all emoji data.
- **Improved Data Handling:** The `EmojiService` now validates the `emoji-map.json` on load, ensuring that only emojis with existing image files are used by the renderer and suggester.
- **New: GUI-Based Map Generation!** You can now generate and update your `emoji-map.json` directly from the plugin's settings tab—no command line needed.
- **New: Custom Emoji Folder!** Added a setting to specify a custom, vault-relative path for your emoji assets folder.

---

0.5.5-alpha: - generate `emoji-map` from GUI is now much improved; - map generation is recursive and accounts for subdirectories; - filepath handling is now (should be) consistent across modules
0.5.3-alpha: un-broke images in suggester (inconsistent filepaths in `EmojiSuggest.ts` and `main.ts` constructor)
0.5.2-alpha: - circular dependencies squashed. - map generation now appropriately falls back to plugin asset folder if custom path is not provided.
0.5.1-alpha: user may define asset library path - (this introduced circular dependencies and known filepath handling issues across multiple components resulting in negative behavioral impact).
0.5.0-alpha: plugin is now more modular, with logic split into 5 main files (`main.ts`, `SettingsTab.ts`, `MapHandler.ts`, `EmojiService.ts`, and `EmojiSuggest.ts`) plus `emoji-map.json`.
0.4.6-alpha: in `suggest.ts`, replacement now detects closing `:` and correctly replaces existing shortcode.
0.4.5-alpha: suggester and callouts now work as expected. - suggestions should now appear when `:` is preceeded by markdown formatting characters (regex tweaks in `main.ts` and `suggest.ts`); - fixed logic that caused rendering emoji on alternate lines within callouts to fail (Treewalker now appropriately handles node siblings disrupted by `<br>`).
0.4.0-alpha: - fixed nested span rendering which caused in-callout rendering to fail; - autocomplete within tables now functions as expected instead of duplicating and appending partial shortcodes.
0.3.0-alpha: added suggestion + autocomplete (EditorSuggest class, fuzzysort)
0.2.5-alpha: added .svg support
0.2.0-alpha: cleanup file structure and plugin logic, smarter and less destructive emoji-map generation
0.1.0-alpha: initial commit; DOM injection + mutation for basic nodes (body, headers)
