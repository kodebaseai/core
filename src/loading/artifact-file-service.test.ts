import { describe, expect, it, vi } from "vitest";

import { readArtifact, writeArtifact } from "./artifact-file-service.js";

vi.mock("node:fs/promises", () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
  },
}));

const fs = await import("node:fs/promises");

describe("artifact file service", () => {
  it("reads and parses YAML", async () => {
    (fs.default.readFile as ReturnType<typeof vi.fn>).mockResolvedValue(
      "metadata:\n  title: Test\n",
    );

    const result = await readArtifact("/root/A.yml");
    expect(result).toEqual({ metadata: { title: "Test" } });
  });

  it("wraps read errors with path", async () => {
    (fs.default.readFile as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("boom"),
    );

    await expect(readArtifact("/root/A.yml")).rejects.toThrow(
      /Failed to read artifact at \/root\/A.yml: boom/,
    );
  });

  it("stringifies YAML with stable formatting", async () => {
    (fs.default.writeFile as ReturnType<typeof vi.fn>).mockResolvedValue(
      undefined,
    );

    await writeArtifact("/root/A.yml", { metadata: { title: "Hello" } });

    expect(fs.default.writeFile).toHaveBeenCalledWith(
      "/root/A.yml",
      "metadata:\n  title: Hello\n",
      "utf8",
    );
  });

  it("wraps write errors with path", async () => {
    (fs.default.writeFile as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("disk full"),
    );

    await expect(
      writeArtifact("/root/A.yml", { metadata: { title: "Boom" } }),
    ).rejects.toThrow(/Failed to write artifact at \/root\/A.yml: disk full/);
  });
});
