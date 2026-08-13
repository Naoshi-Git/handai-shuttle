const SNAPDOM_URL = "https://unpkg.com/@zumer/snapdom@2.8.0/dist/snapdom.mjs";

let snapdomModulePromise = null;

async function loadSnapdom() {
  if (!snapdomModulePromise) {
    snapdomModulePromise = import(SNAPDOM_URL).catch((error) => {
      snapdomModulePromise = null;
      throw error;
    });
  }
  return snapdomModulePromise;
}

async function waitForFonts() {
  if (!document.fonts?.ready) return;
  try {
    await document.fonts.ready;
  } catch {
    // The live DOM is already rendered; a font readiness failure should not
    // prevent sharing the visible card with the browser's current fallback.
  }
}

export async function snapshotElementToPng(target, { scale = 3 } = {}) {
  if (!(target instanceof Element)) throw new TypeError("共有対象のUIが見つかりませんでした");
  if (!target.isConnected) throw new Error("共有対象のUIが画面から外れています");

  await waitForFonts();
  const { snapdom } = await loadSnapdom();
  if (typeof snapdom !== "function") throw new Error("共有画像エンジンを読み込めませんでした");

  const result = await snapdom(target, {
    scale,
    dpr: 1,
    embedFonts: false,
    cache: "disabled",
    outerTransforms: false,
    outerShadows: true,
    safariWarmupAttempts: 4
  });
  const blob = await result.toBlob({ type: "png" });
  if (!(blob instanceof Blob) || blob.size === 0) throw new Error("共有画像を生成できませんでした");
  return blob;
}

export { SNAPDOM_URL };
