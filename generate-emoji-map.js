const { readdir, writeFile, readFile } = require("fs").promises;
const path = require("path");

async function generateEmojiMap() {
  const emojiDir = path.resolve(__dirname, "emoji");
  const mapPath = path.resolve(__dirname, "data", "emoji-map.json");

  let existingMap = {};

  try {
    const jsonText = await readFile(mapPath, "utf-8");
    existingMap = JSON.parse(jsonText);
  } catch {
    existingMap = {};
  }

  const files = await readdir(emojiDir);
  const pngFiles = files.filter(f => f.toLowerCase().endsWith(".png"));

  const mappedFiles = new Set(Object.values(existingMap).map(f => f.toLowerCase()));

  let addedCount = 0;

  for (const file of pngFiles) {
    if (!mappedFiles.has(file.toLowerCase())) {
      const baseName = path.basename(file, ".png");
      const shortcode = `:${baseName}:`;
      existingMap[shortcode] = file;
      addedCount++;
    }
  }

  const sortedKeys = Object.keys(existingMap).sort();
  const entries = sortedKeys.map(key => `  "${key}": "${existingMap[key]}"`);
  const jsonContent = `{\n${entries.join(",\n")}\n}\n`;

  await writeFile(mapPath, jsonContent, "utf-8");

  console.log(`emoji-map.json updated: ${addedCount} new entr${addedCount === 1 ? "y" : "ies"} added, total ${sortedKeys.length} entries.`);
}

generateEmojiMap().catch(err => {
  console.error("Error in generateEmojiMap:", err);
});
