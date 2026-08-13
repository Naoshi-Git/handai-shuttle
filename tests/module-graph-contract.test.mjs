import test from "node:test";
import assert from "node:assert/strict";
import { access, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_DIRS = ["src", "data"];

async function walkMjs(relativeDir) {
  const absoluteDir = path.join(ROOT, relativeDir);
  const entries = await readdir(absoluteDir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = path.join(relativeDir, entry.name);
    if (entry.isDirectory()) files.push(...await walkMjs(relative));
    else if (entry.isFile() && entry.name.endsWith(".mjs")) files.push(relative);
  }
  return files;
}

function localSpecifiers(source) {
  const found = new Set();
  const patterns = [
    /(?:import|export)\s+(?:[^"'`]*?\s+from\s+)?["']([^"']+)["']/g,
    /import\s*\(\s*["']([^"']+)["']\s*\)/g
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      if (match[1]?.startsWith(".")) found.add(match[1]);
    }
  }
  return [...found];
}

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

test("every relative module import resolves to an existing file", async () => {
  const modules = (await Promise.all(SOURCE_DIRS.map(walkMjs))).flat();
  const missing = [];

  for (const relativeFile of modules) {
    const absoluteFile = path.join(ROOT, relativeFile);
    const source = await readFile(absoluteFile, "utf8");
    for (const specifier of localSpecifiers(source)) {
      // Runtime cache-busting query strings do not change the local module file that must resolve.
      const modulePath = specifier.split(/[?#]/, 1)[0];
      const target = path.resolve(path.dirname(absoluteFile), modulePath);
      if (!await exists(target)) {
        missing.push(`${relativeFile} -> ${specifier}`);
      }
    }
  }

  assert.deepEqual(
    missing,
    [],
    `Local module graph contains missing imports:\n${missing.join("\n")}`
  );
});
