import { describe, it, expect } from "vitest";
import { ManifestManager } from "../../src/core/manifest-manager.js";

describe("ManifestManager", () => {
  it("creates empty manifests", () => {
    const manager = new ManifestManager(null as any);
    const manifest = manager.createEmptyManifest("test", "did:key:space");

    expect(manifest.domain).toBe("test");
    expect(manifest.space_did).toBe("did:key:space");
    expect(manifest.fragments).toEqual([]);
    expect(manifest.updated_at).toBeDefined();
  });
});
