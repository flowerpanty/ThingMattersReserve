import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const projectRoot = process.cwd();
const publicRoot = path.join(projectRoot, "client", "public");
const assetRoot = path.join(publicRoot, "public");
const htmlFiles = ["brookie.html", "cookies.html", "lucky.html"].map((name) =>
  path.join(publicRoot, name),
);

const imageExtPattern = /\.(png|jpe?g)$/i;
const removableNames = new Set([".DS_Store", "Thumbs.db"]);

function toPosix(filePath) {
  return filePath.split(path.sep).join("/");
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.name === "__MACOSX" || entry.name.startsWith("._")) {
      await fs.rm(fullPath, { recursive: true, force: true });
      continue;
    }

    if (removableNames.has(entry.name)) {
      await fs.rm(fullPath, { force: true });
      continue;
    }

    if (entry.isDirectory()) {
      files.push(...(await walk(fullPath)));
    } else {
      files.push(fullPath);
    }
  }

  return files;
}

function conversionProfile(relativePath) {
  if (relativePath.startsWith("renders/")) return null;
  if (relativePath.startsWith("images/characters/")) return { max: 720, quality: 88 };
  if (relativePath.startsWith("images/papers/")) return { max: 900, quality: 88 };
  if (relativePath.includes("/hero/")) return { max: 1600, quality: 84 };
  if (relativePath.includes("/gallery/")) return { max: 1600, quality: 78 };
  if (relativePath.includes("/examples/")) return { max: 1200, quality: 78 };
  if (relativePath.includes("/custom-cases/")) return { max: 1400, quality: 80 };
  return { max: 1400, quality: 82 };
}

async function convertImage(filePath) {
  const relativePath = toPosix(path.relative(assetRoot, filePath));
  const profile = conversionProfile(relativePath);
  if (!profile || !imageExtPattern.test(filePath)) return null;

  const parsed = path.parse(filePath);
  const outputPath = path.join(parsed.dir, `${parsed.name}.webp`);
  const pipeline = sharp(filePath, { failOn: "none" }).rotate();
  const metadata = await pipeline.metadata();
  const width = metadata.width || profile.max;
  const height = metadata.height || profile.max;
  const maxSide = Math.max(width, height);

  let transformer = pipeline;
  if (maxSide > profile.max) {
    transformer = transformer.resize({
      width: width >= height ? profile.max : undefined,
      height: height > width ? profile.max : undefined,
      fit: "inside",
      withoutEnlargement: true,
    });
  }

  await transformer.webp({ quality: profile.quality, effort: 5 }).toFile(outputPath);

  const outputRelativePath = toPosix(path.relative(assetRoot, outputPath));
  await fs.rm(filePath, { force: true });

  return {
    from: relativePath,
    to: outputRelativePath,
    fromName: path.basename(relativePath),
    toName: path.basename(outputRelativePath),
  };
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function updateHtmlReferences(conversions, webpFileNames) {
  const byPath = conversions.sort((a, b) => b.from.length - a.from.length);
  const byName = conversions
    .filter((item) => item.fromName !== item.toName)
    .sort((a, b) => b.fromName.length - a.fromName.length);

  for (const htmlFile of htmlFiles) {
    if (!(await pathExists(htmlFile))) continue;

    let html = await fs.readFile(htmlFile, "utf8");
    for (const item of byPath) {
      html = html.replaceAll(`public/${item.from}`, `public/${item.to}`);
    }

    for (const item of byName) {
      const quotedFileNamePattern = new RegExp(
        `(["'\`])${escapeRegExp(item.fromName)}\\1`,
        "g",
      );
      html = html.replace(quotedFileNamePattern, `$1${item.toName}$1`);
    }

    html = html.replace(/(public\/[^"'\`)\s]+?)\.(png|jpe?g)/gi, "$1.webp");
    html = html.replace(/(["'\`])([^"'\`/]+?)\.(png|jpe?g)\1/gi, (match, quote, baseName) => {
      const webpName = `${baseName}.webp`;
      return webpFileNames.has(webpName) ? `${quote}${webpName}${quote}` : match;
    });

    await fs.writeFile(htmlFile, html);
  }
}

async function main() {
  if (!(await pathExists(assetRoot))) {
    throw new Error(`Asset directory not found: ${assetRoot}`);
  }

  const before = await walk(assetRoot);
  const conversions = [];

  for (const file of before) {
    const result = await convertImage(file);
    if (result) conversions.push(result);
  }

  const after = await walk(assetRoot);
  const webpFileNames = new Set(
    after.filter((file) => file.toLowerCase().endsWith(".webp")).map((file) => path.basename(file)),
  );

  await updateHtmlReferences(conversions, webpFileNames);

  const remainingOriginals = after.filter((file) => imageExtPattern.test(file));

  console.log(`Converted ${conversions.length} image(s) to WebP.`);
  console.log(`Remaining JPG/PNG files: ${remainingOriginals.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
