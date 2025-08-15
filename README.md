# queercode 🌈

**Custom emoji shortcodes for Obsidian**, styled for visibility, fun, and flair.

This plugin lets you use shortcodes like `:blue_potion:` or `:furry_pride:` directly in Obsidian notes. These render as inline emoji PNGs or SVGs, styled to look good in normal text, headers, callouts, and tables.

> [!NOTE]
> **Who is this for?**
>
> - Obsidian users who value colorful emoji in their visual hierarchy and notetaking,
> - Who are constrained by their device's ability to display specific Unicode characters cleanly within Obsidian (i.e. stubborn Win10 users 💜)
> - And/or who are unsatisfied with Twemoji-as-default, or the shortcodes imposed by e.g. Iconic

---

## ✨ Features

- Define and use custom emoji with easy `:shortcode:` syntax, auto-generated emoji map from your emoji image folder
- Autocomplete suggestions activate as you type shortcodes
- Consistent styling across various contexts, including tables, headers, callouts, and footnotes
- Emojis render with ARIA labels and other attributes
- Supports `.png` and `.svg` emoji images; set your preferred default in settings

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
├── suggest.ts        # Autocomplete suggester implementation
├── settings.ts       # UI and logic for the plugin's settings tab
├── generate-emoji-map.js # Node.js script to auto-generate the emoji map
├── emoji-map.json    # The generated map of shortcodes to image filenames
├── styles.css        # CSS for styling the rendered emojis
├── package.json      # Project metadata and build scripts
├── manifest.json     # Plugin metadata for Obsidian
└── ... other files (LICENSE, README, etc.)
```

---

## 🛠 Adding New Emojis

1. Drop PNGs into `queercode/emojis/`.
2. Run:

```bash
npm run generate-emoji-map
```

3. Use shortcodes like `:file_name:` in your notes.

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

- [ ] Generate and control `emoji-map.json` from plugin settings GUI in Obsidian
- [ ] Significantly improve stability of rendering in Live Preview
- [ ] Refactor for maintainability + testing
- [ ] Toggle plugin context (e.x.: restrict within codeblocks) for suggester and renderers
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
