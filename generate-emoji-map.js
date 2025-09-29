const { readdir, writeFile, readFile } = require("fs").promises;
const path = require("path");

async function generateEmojiMap() {
  const emojiDir = path.resolve(__dirname, "emoji");
  const mapPath = path.resolve(__dirname, "data/emoji-map.json");

  let existingMap = {};

  try {
    const jsonText = await readFile(mapPath, "utf-8");
    existingMap = JSON.parse(jsonText);
  } catch {
    existingMap = {};
  }

  const allowedExtensions = [".png", ".svg"];
  const files = await readdir(emojiDir);
  const validFiles = files.filter((f) =>
    allowedExtensions.includes(path.extname(f).toLowerCase())
  );
  if (validFiles.length === 0) {
    console.log(
      "No valid emoji files found. Currently supported extensions are: " +
        allowedExtensions.join(", ")
    );
    return;
  }

  const mappedFiles = new Set(
    Object.values(existingMap).map((f) => f.toLowerCase())
  );

  let addedCount = 0;

  const preferredExtension = "svg"; // this will later come from settings
  const fallbackExtension = preferredExtension === "svg" ? "png" : "svg";

  const filesByBase = new Map();

  // Step 1: Bucket each file by base name
  for (const file of validFiles) {
    const ext = path.extname(file).toLowerCase();
    const base = path.basename(file, ext);
    if (!filesByBase.has(base)) filesByBase.set(base, {});
    filesByBase.get(base)[ext] = file;
  }

  // Step 2: Build new entries with preference
  for (const [base, versions] of filesByBase.entries()) {
    const shortcode = `:${base}:`;

    if (shortcode in existingMap) continue;

    let chosen =
      versions[`.${preferredExtension}`] || versions[`.${fallbackExtension}`];
    if (!chosen) continue;

    existingMap[shortcode] = chosen;
    addedCount++;
  }

  const sortedKeys = Object.keys(existingMap).sort();
  const entries = sortedKeys.map((key) => `  "${key}": "${existingMap[key]}"`);
  const jsonContent = `{\n${entries.join(",\n")}\n}\n`;

  await writeFile(mapPath, jsonContent, "utf-8");

  console.log(
    `data/emoji-map.json updated: ${addedCount} new entr${
      addedCount === 1 ? "y" : "ies"
    } added, total ${sortedKeys.length} entries.`
  );
}

generateEmojiMap().catch((err) => {
  console.error("Error in generateEmojiMap:", err);
});
