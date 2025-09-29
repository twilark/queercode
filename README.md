# queercode 🌈

**Add your own custom emojis to Obsidian with simple `:shortcode:` syntax.**

Drop your emoji images (PNG/SVG) into a folder, and instantly use them in your Obsidian notes like `:blue_potion:` or `:furry_pride:`. Perfect for adding personality to your notes with custom graphics, pride flags, gaming icons, or any images you want to use as emojis.

**Quick example**: Save `ace_heart.png` in your emoji folder → type `:ace_heart:` in any note → see your custom heart emoji! 🖤🩶🤍💜

> [!NOTE]
> ### **Why use this?**
>
> - **Your own emojis**: Use any PNG/SVG images as emojis, not just standard Unicode ones
> - **Better emoji support**: Great for Windows 10 users or anyone who wants consistent emoji rendering
> - **Visual note-taking**: Add custom graphics, symbols, or icons that match your workflow
> - **Community assets**: Easily share emoji packs with friends or import ones others have made

---

## ✨ Features

- **Simple Setup**: Drop images in a folder, click "Generate Emoji Map" in settings, and you're done
- **Smart Autocomplete**: Type `:cat` and see all your cat-related emojis pop up as suggestions
- **Works Everywhere**: Your emojis look great in tables, headers, lists, and callouts across editing and preview modes
- **Flexible**: Supports PNG and SVG files, choose your preferred format in settings

---

## 📦 Installation

**Note**: This plugin is currently distributed via GitHub only

1. **Download**: Clone or download this repo to your vault's `.obsidian/plugins/queercode/` folder
2. **Build**: Open a terminal in the plugin folder and run:
   ```bash
   npm install
   npm run build
   ```
3. **Enable**: Go to Settings → Community Plugins → Enable "Queercode"
   - You may need to enable "Community plugins" in Obsidian settings first.

---

### Key Files
- **`emoji/`** - Put your emoji images (SVG/PNG) here
- **`data/emoji-map.json`** - Maps shortcodes to your image filenames (auto-generated)

---

## 🛠️ Adding New Emojis

1. **Add images**: Drop `.png` or `.svg` files into your emoji folder (default: `emoji/` in your vault)
2. **Update the list**: Go to Settings → Community Plugins → Queercode → Click "Generate Emoji Map"
3. **Start using them**: Type `:filename:` (without the file extension) in your notes

**Example**: Save `cool_cat.png` → use `:cool_cat:` in your notes

The plugin automatically converts filenames to shortcodes and cleans up deleted files.

---

## 📌 Good to Know

- **File formats**: Use `.png` or `.svg` images for best results
- **Shortcode naming**: Filenames become shortcodes automatically (`cool_cat.png` → `:cool_cat:`); these can be safely customized and will not be overwritten if a new emoji map is generated (example: if you edit `:nonbinary_flag:` → `:nb_flag:`)
- **Autocomplete**: Start typing after `:` to see suggestions
- **Custom edits**: You can manually edit `data/emoji-map.json` if needed
- **Included assets**: This plugin comes with [Mutant Standard](https://mutant.tech/) emojis as examples. Please note that not every emoji will be covered by Mutant Standard

**Current limitations**: Performance issues in Live Preview rendering - expect a slight delay after completing an emoji

---

## 📋 Roadmap
### Coming Soon
- [ ] Enhanced emoji variants (skin tones, etc.) with smart defaults
- [ ] Support for `.gif` and `.webp` animated emojis
- [ ] Drag-and-drop emoji pack management
- [ ] Better integration with other Obsidian plugins
- [ ] Emoji modifier syntax (`:emoji::modifier:`) for dynamic styling


---

## Credits

- Assets: [MutantStandard](https://mutant.tech/) is the phenomenal work of Caius Nocturne
- Suggester utilizes [fuzzysort](https://github.com/farzher/fuzzysort)

## License

Mutant Standard: [CC BY-NC-SA 4.0 Int'l](https://creativecommons.org/licenses/by-nc-sa/4.0/)
Plugin: [MIT](https://tlo.mit.edu/understand-ip/exploring-mit-open-source-license-comprehensive-guide)
