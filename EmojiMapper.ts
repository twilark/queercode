import { App } from "obsidian";

export class EmojiMap {
  private app: App;
  private manifestDir: string;
  private emojiFolderPath: string;
  private filetypePreference: string;

  constructor(
    app: App,
    manifestDir: string,
    emojiFolderPath: string,
    filetypePreference: string
  ) {
    this.app = app;
    this.manifestDir = manifestDir;
    this.emojiFolderPath = emojiFolderPath;
    this.filetypePreference = filetypePreference;
  }

  // Recursive helper to scan all files in a directory and its subdirectories
  private async findAllFiles(folderPath: string): Promise<string[]> {
    const allFiles: string[] = [];

    try {
      const listing = await this.app.vault.adapter.list(folderPath);

      // Add all files from this directory
      allFiles.push(...listing.files);

      // Recursively scan all subdirectories
      for (const subfolder of listing.folders) {
        const subFiles = await this.findAllFiles(subfolder);
        allFiles.push(...subFiles);
      }
    } catch (error) {
      // Ignore missing or inaccessible folders
    }

    return allFiles;
  }

  async loadEmojiMap(): Promise<Record<string, string>> {
    try {
      // Use our stored manifestDir instead of this.plugin.manifest.dir
      const file = await this.app.vault.adapter.read(`${this.manifestDir}/emoji-map.json`);
      return JSON.parse(file);
    } catch (e: any) {
      if (e instanceof SyntaxError) {
        console.warn("emoji-map.json contains invalid JSON. Please fix or regenerate the file.", e);
      } else {
        console.warn("Could not load emoji-map.json (file missing or unreadable).", e);
      }
      return {};
    }
  }

  async findFiles(): Promise<Set<string>> {
    let allFiles = new Set<string>();
    let targetFolder: string;

    // Use our stored emojiFolderPath instead of this.plugin.settings.emojiFolderPath
    if (this.emojiFolderPath && this.emojiFolderPath.length > 0) {
      targetFolder = this.emojiFolderPath.replace(/\/$/, "");
    } else {
      // Use our stored manifestDir instead of this.plugin.manifest.dir
      targetFolder = `${this.manifestDir}/emoji`;
    }

    try {
      const files = await this.findAllFiles(targetFolder);
      files.forEach(f => {
        if (f.endsWith('.png') || f.endsWith('.svg')) {
          allFiles.add(f);
        }
      });
    } catch (error) {
      // Ignore missing folders
    }
    return allFiles;
  }

  async buildMap(): Promise<{added: number, total: number}> {
    let emojiFolders: string[] = [];

    // Use our stored emojiFolderPath instead of this.plugin.settings.emojiFolderPath
    if (this.emojiFolderPath && this.emojiFolderPath.length > 0) {
      emojiFolders = [this.emojiFolderPath.replace(/\/$/, "")];
    } else {
      // Use our stored manifestDir instead of this.plugin.manifest.dir
      emojiFolders = [`${this.manifestDir}/emoji`];
    }

    // Load existing map - use our stored manifestDir
    const mapPath = `${this.manifestDir}/emoji-map.json`;
    let existingMap: Record<string, string> = {};
    try {
      const mapContent = await this.app.vault.adapter.read(mapPath);
      existingMap = JSON.parse(mapContent);
    } catch (error: unknown) {
      existingMap = {};
    }

    // Collect all .png/.svg files from all folders (including subdirectories recursively)
    const allFiles: string[] = [];
    for (const folder of emojiFolders) {
      try {
        const files = await this.findAllFiles(folder);
        files.forEach(f => {
          const fname = f.split("/").pop();
          if (fname && (fname.endsWith('.png') || fname.endsWith('.svg'))) {
            allFiles.push(f);
          }
        });
      } catch (error) {
        // Ignore missing folders
      }
    }

    if (allFiles.length === 0) {
      throw new Error("No .png or .svg files found in the emoji directory.");
    }

    // Prune deleted entries from existing map
    const availableFilesSet = new Set(allFiles);
    for (const shortcode in existingMap) {
      if (!availableFilesSet.has(existingMap[shortcode])) {
        delete existingMap[shortcode];
      }
    }

    // Group files by base name (handle both .png and .svg versions, across folders)
    const filesByBase = new Map<string, {svg?: string, png?: string}>();
    for (const file of allFiles) {
      const fname = file.split("/").pop()!;
      const lastDotIndex = fname.lastIndexOf('.');
      const ext = lastDotIndex !== -1 ? fname.slice(lastDotIndex).toLowerCase() : '';
      const base = lastDotIndex !== -1 ? fname.slice(0, lastDotIndex) : fname;
      if (!filesByBase.has(base)) {
        filesByBase.set(base, {});
      }
      if (ext === '.svg') {
        filesByBase.get(base)!.svg = file;
      } else if (ext === '.png') {
        filesByBase.get(base)!.png = file;
      }
    }

    let addedCount = 0;
    // Use our stored filetypePreference instead of this.plugin.settings.filetypePreference
    const preferredExtension = this.filetypePreference === "png" ? "png" : "svg";
    const fallbackExtension = preferredExtension === "svg" ? "png" : "svg";

    // Process each base name
    for (const [base, versions] of filesByBase.entries()) {
      const shortcode = `:${base}:`;
      if (shortcode in existingMap) continue;
      // Choose preferred file
      let chosenFile = versions[preferredExtension as keyof typeof versions] ||
                      versions[fallbackExtension as keyof typeof versions];
      if (!chosenFile) continue;
      // Store the full vault-relative path directly
      existingMap[shortcode] = chosenFile;
      addedCount++;
    }

    // Sort and write the map
    const sortedKeys = Object.keys(existingMap).sort();
    const entries = sortedKeys.map(key => `  "${key}": "${existingMap[key]}"`);
    const jsonContent = `{\n${entries.join(",\n")}\n}\n`;

    await this.app.vault.adapter.write(mapPath, jsonContent);

    return { added: addedCount, total: sortedKeys.length };
  }

  // Useful regex patterns for future category detection
  private getCategoryPatterns() {
    return [
      {regex: /_flag$/, category: "flags"},
      {regex: /_heart$/, category: "hearts"},
      {regex: /^cat_/, category: "cats"},
      {regex: /^[0-9]+_[0-9]+$/, category: "time"},
      {regex: /(arrow|point)/, category: "arrows"},
      {regex: /(face|smile|grin|cry)/, category: "faces"},
      {regex: /(hand|finger|fist|clw)/, category: "hands"}, // clw = claw
      {regex: /(paw|paws)/, category: "paws"},
    ];
  }
}
