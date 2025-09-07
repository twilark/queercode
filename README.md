# queercode 🌈

**Custom emoji shortcodes for Obsidian**, styled for visibility, fun, and flair.

This plugin lets you use shortcodes like `:blue_potion:` or `:furry_pride:` directly in Obsidian notes. These render as inline emoji PNGs or SVGs, styled to look good in normal text, headers, callouts, and tables.

> [!NOTE]
> ### **Who is this for?**
>
> - Obsidian users who:
> - Value colorful emoji in their visual hierarchy and notetaking,
> - Who are constrained by their device's ability to display specific Unicode characters cleanly within Obsidian (i.e. stubborn Win10 users 💜),
> - And/or who are unsatisfied with other Emoji-based plugins

---

## ✨ Features

- **Custom Emoji and Shortcodes:** Define and use custom emoji with easy `:shortcode:` syntax, auto-generated emoji map from your emoji image folder. Specify a custom folder for your emoji assets anywhere in your vault.
- **Autocomplete Suggestions:** An intelligent suggester activates as you type shortcodes, providing a fuzzy-searched list of options.
- **Consistent, Accessible Rendering:** Emojis render with ARIA labels and consistent styling across various contexts, including tables, headers, and callouts.
- **Filetype Support:** Supports `.png` and `.svg` emoji images; set your preferred file type in settings.

---

## 📦 Installation

### From source

1. Clone the repo into your `.obsidian/plugins/` folder.
2. Run:
   ```bash
   npm install
   npm run build
   ```
3. Enable the plugin in Obsidian. If you don't see it, ensure Community Plugins are enabled.

---

### Directory layout

```
queercode/
├── main.ts           # Core plugin logic and entry point
├── EmojiService.ts   # Manages emoji data, validation, and regex generation
├── MapHandler.ts     # Handles file system operations (loading/generating the map)
├── EmojiSuggest.ts   # Autocomplete suggester implementation
├── SettingsTab.ts    # UI and logic for the plugin's settings tab
├── emoji-map.json    # The generated map of shortcodes to image filenames
└── ... other files
```

---

## 🛠️ Adding New Emojis

The primary way to update your emoji list is now through the Obsidian settings GUI.

1.  Add new `.png` or `.svg` files to your designated emoji folder.
2.  In Obsidian, go to `Settings` -> `Community Plugins` -> `Queercode`.
3.  Click the **"Generate Emoji Map"** button. The plugin will scan for new files, update the map, and prune any entries for deleted files.

The old command-line method (`npm run generate-emoji-map`) is still available for developers.

---

## 📌 Notes

- Your images **must** be `.png` or `.svg` format
- Filenames become shortcodes automatically: `bisexual_flag.png` → `:bisexual_flag:` Autocomplete triggers only after typing at least one character after `:`
- These shortcodes can be safely changed, but user is responsible for ensuring unique entries
- Emoji rendering in Live Preview modes is not always predictable
- Custom entries in `emoji-map.json` should not be overwritten even if the map must be regenerated
- **Not all emojis are covered, and some will never be.** Please see Mutant Standard documentation for more information

---

## 📋 Roadmap / TODO

- [x] Generate and control `emoji-map.json` from plugin settings GUI in Obsidian
- [x] Significantly improve stability of rendering in Live Preview
- [x] Refactor for maintainability + testing
- [ ] Toggle plugin context (e.g.: restrict within codeblocks) for suggester and renderers
- [ ] Skintone & hand part default/fallback selection for humanoid emojis during map generation
- [ ] Drag-and-drop UI for managing multiple asset packs
- [ ] Combined emoji+modifier syntax (e.g., `:emoji::modifier:`) to apply dynamic, inline styling/behaviors
- [ ] Support `.gif` and `.webp` files

---

## Credits

- Assets: [MutantStandard](https://mutant.tech/) is the phenomenal work of Caius Nocturne
- EditorSuggest utilizes [fuzzysort](https://github.com/farzher/fuzzysort)

## License

Mutant Standard: [CC BY-NC-SA 4.0 Int'l](https://creativecommons.org/licenses/by-nc-sa/4.0/)
Plugin: [MIT](https://tlo.mit.edu/understand-ip/exploring-mit-open-source-license-comprehensive-guide)
