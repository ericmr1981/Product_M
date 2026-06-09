#!/usr/bin/env node
/**
 * upload-images.js
 *
 * Copies images into the Product M assets directory, optionally batch-renaming
 * them to the <slug>-NN.jpg naming convention.
 *
 * Usage:
 *   # Single file
 *   node scripts/upload-images.js --source shot1.jpg --target assets/images/<slug>/<slug>-01.jpg
 *
 *   # Batch rename + upload
 *   node scripts/upload-images.js --batch ~/Desktop/shots/ --target assets/images/<slug>/ --slug <slug>
 *
 * Output (stdout): JSON { uploaded, skipped, errors }
 * Exit 0 on success, 1 if any file was skipped/errored.
 *
 * No external dependencies. Uses only Node built-ins.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const VALID_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];

function isImageFile(name) {
  const ext = path.extname(name).toLowerCase();
  return VALID_EXTS.includes(ext);
}

function slugToName(slug, index, ext) {
  const num = String(index).padStart(2, '0');
  return `${slug}-${num}${ext}`;
}

function resolveTarget(targetRel) {
  // Target must be relative to ROOT and inside assets/images/
  const abs = path.resolve(ROOT, targetRel);
  const imagesDir = path.resolve(ROOT, 'assets', 'images');
  if (!abs.startsWith(imagesDir + path.sep) && abs !== imagesDir) {
    return { abs, ok: false, reason: `target must be under assets/images/ (got ${targetRel})` };
  }
  return { abs, ok: true };
}

function singleUpload(source, targetRel) {
  const { abs: targetAbs, ok, reason } = resolveTarget(targetRel);
  if (!ok) return { uploaded: [], skipped: [], errors: [reason] };

  const ext = path.extname(source).toLowerCase();
  if (!isImageFile(source)) {
    return { uploaded: [], skipped: [source], errors: [`not an image: ${source}`] };
  }
  if (!fs.existsSync(source)) {
    return { uploaded: [], skipped: [], errors: [`source not found: ${source}`] };
  }

  fs.mkdirSync(path.dirname(targetAbs), { recursive: true });
  fs.copyFileSync(source, targetAbs);
  return { uploaded: [{ source, target: targetRel }], skipped: [], errors: [] };
}

function batchUpload(sourceDir, targetRel, slug) {
  const { abs: targetAbs, ok, reason } = resolveTarget(targetRel);
  if (!ok) return { uploaded: [], skipped: [], errors: [reason] };

  if (!fs.existsSync(sourceDir) || !fs.statSync(sourceDir).isDirectory()) {
    return { uploaded: [], skipped: [], errors: [`source directory not found: ${sourceDir}`] };
  }

  // Read all files, sort by name, filter to images only
  const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
  const imageFiles = entries
    .filter((e) => e.isFile() && isImageFile(e.name))
    .map((e) => e.name)
    .sort();

  if (imageFiles.length === 0) {
    return { uploaded: [], skipped: [], errors: [`no image files found in ${sourceDir}`] };
  }

  fs.mkdirSync(targetAbs, { recursive: true });

  const uploaded = [];
  const skipped = [];
  const errors = [];

  imageFiles.forEach((fname, i) => {
    const src = path.join(sourceDir, fname);
    const ext = path.extname(fname).toLowerCase();
    const newName = slugToName(slug, i + 1, ext);
    const dest = path.join(targetAbs, newName);
    const destRel = path.posix.join(targetRel, newName);

    try {
      fs.copyFileSync(src, dest);
      uploaded.push({ source: src, target: destRel });
    } catch (err) {
      errors.push(`failed to copy ${src}: ${err.message}`);
    }
  });

  // List non-image files as skipped
  entries
    .filter((e) => e.isFile() && !isImageFile(e.name))
    .forEach((e) => skipped.push(path.join(sourceDir, e.name)));

  return { uploaded, skipped, errors };
}

function main() {
  const args = process.argv.slice(2);
  const sourceIdx = args.indexOf('--source');
  const batchIdx = args.indexOf('--batch');
  const targetIdx = args.indexOf('--target');
  const slugIdx = args.indexOf('--slug');

  if (targetIdx === -1) {
    process.stderr.write('Usage: upload-images.js (--source <file> | --batch <dir>) --target <path> [--slug <slug>]\n');
    process.exit(2);
  }

  const targetRel = args[targetIdx + 1];
  let result;

  if (sourceIdx !== -1) {
    const source = args[sourceIdx + 1];
    result = singleUpload(source, targetRel);
  } else if (batchIdx !== -1) {
    const sourceDir = args[batchIdx + 1];
    const slug = slugIdx !== -1 ? args[slugIdx + 1] : '';
    if (!slug) {
      process.stderr.write('--batch mode requires --slug <slug>\n');
      process.exit(2);
    }
    result = batchUpload(sourceDir, targetRel, slug);
  } else {
    process.stderr.write('Specify --source <file> or --batch <dir>\n');
    process.exit(2);
  }

  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
  process.exit(result.errors.length > 0 ? 1 : 0);
}

main();
