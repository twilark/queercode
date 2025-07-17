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

- Define and use custom emoji with easy `:shortcode:` syntax—no special commands
- Autocomplete suggestions activate as you type shortcodes (e.g., type `:f` to see all matches with previews, and insert `:furry_pride:` at your cursor)
- Preferred filetype selection when emojis exist as both PNG and SVG
- Auto-generated emoji map from your emoji image folder
- Consistent styling everywhere
- Supports `.png` and `.svg` emoji images

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
├── main.ts           # Core plugin logic
├── suggest.ts        # Autocomplete
├── style.css         # Emoji rendering styles
├── generate-emoji-map.js # Script to auto-generate emoji-map.json
├── emoji-map.json    # Generated shortcode → filename map
└── emojis/           # Emoji PNG and SVG images

```

---

## 🛠 Adding New Emojis

1. Drop PNGs into `data/emojis/`.
2. Run:

```bash
npm run generate-emoji-map
```

3. Use shortcodes like `:file_name:` in your notes.

---

## 📌 Notes

- Your images **must** be `.png` or `.svg` format.
- Filenames become shortcodes automatically: bisexual_flag.png`→`:bisexual_flag:` Autocomplete triggers only after typing at least one character after`:`.
- These shortcodes can be safely changed, but user is responsible for ensuring unique entries.
- Existing entries in `emoji-map.json` won't be overwritten. If you've changed a mapped emoji, it should not overwrite.
- **Not all emojis are covered, and some will never be.** Please see Mutant Standard documentation.

---

## 📋 Roadmap / TODO

- [ ] Fix HTML parse edge cases (e.g. some `span` nesting gets eaten)
- [ ] Implement fuzzy search/autocomplete for easier lookup
- [ ] Add emoji hover titles for accessibility
- [ ] Support combined emoji+label syntax (e.g., `:emoji::label:`)
- [ ] Optional fallback behavior if emoji image is missing
- [ ] Drag-and-drop UI to manage emoji packs in plugin settings
- [ ] Skintone selection for human emojis during map generation

---

## Credits

- PNG emoji art by [MutantStandard](https://mutant.tech/)
- Plugin skeleton based on Obsidian plugin + esbuild boilerplate.

## License

Mutant Standard: [CC BY-NC-SA 4.0 Int'l](https://creativecommons.org/licenses/by-nc-sa/4.0/)
Plugin: [MIT](https://tlo.mit.edu/understand-ip/exploring-mit-open-source-license-comprehensive-guide)
