# queercode 🌈

**Custom emoji shortcodes for Obsidian**, styled for visibility, fun, and flair.

This plugin lets you use shortcodes like `:blue_potion:` or `:furry_pride:` directly in Obsidian notes. These render as inline emoji PNGs, styled to look good in both normal and header text.

> [!NOTE] > **Who is this for?**
>
> - Obsidian users who value colorful emoji in their visual hierarchy and notetaking,
> - Who are constrained by their device's ability to display specific Unicode characters cleanly within Obsidian (i.e. stubborn Win10 users 💜)
> - And/or who are unsatisfied with Twemoji-as-default, or the shortcodes imposed by e.g. Iconic

---

## ✨ Features

- Define custom emoji with PNGs and shortcodes.
- Autogenerate emoji map from folder of images.
- Consistent styling across headers, text, and tables.
- No special syntax — just `:your_emoji:`.

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
├── main.ts # Core plugin logic
├── style.css # Emoji rendering styles
├── generate-emoji-map.js # Script to auto-generate emoji-map
├── emoji-map.json # Generated emoji shortcode map
└── emojis/ # PNG emoji images
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

- Your images **must** be `.png` or `.svg` format
- Filenames become shortcodes automatically: bisexual_flag.png`→`:bisexual_flag:`
- These shortcodes can be safely changed, but user is responsible for ensuring unique entries.
- Existing entries in `emoji-map.json` won't be overwritten. If you've changed a mapped emoji, it should not overwrite.
- **Not all emojis are covered, and some will never be.** Please see Mutant Standard documentation for emoji coverage.

---

## 📋 Roadmap / TODO

- [ ] Fix HTML parse edge cases (e.g. some `span` nesting gets eaten)
- [ ] Fuzzy leading text / search for shortcodes; autocomplete
- [ ] Add support for emoji hover titles / screen readers
- [ ] Add support for `:emoji::label:` dual-mode?
- [ ] Optional fallback if image file not found
- [ ] Drag-and-drop UI for managing emoji settings in panel
- [ ] Enable default skintone selection for body/human emoji (during or after map generation) -- e.g. green instead of yellow

---

## Credits

- PNG emoji art by [MutantStandard](https://mutant.tech/)
- Plugin skeleton based on Obsidian plugin + esbuild boilerplate.

## License

Mutant Standard: [CC BY-NC-SA 4.0 Int'l](https://creativecommons.org/licenses/by-nc-sa/4.0/)
Plugin: [MIT](https://tlo.mit.edu/understand-ip/exploring-mit-open-source-license-comprehensive-guide)
