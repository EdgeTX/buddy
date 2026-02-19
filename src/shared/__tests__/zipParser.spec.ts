/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import { execSync } from "child_process";
import { extractYamlFromZip, parseYamlFile } from "shared/zipParser";

/**
 * Helper to create a ZIP buffer with model files
 * Uses a subprocess to avoid jsdom's broken fflate behavior
 */
const createZipWithModels = (
  models: { name: string; content: string }[]
): Buffer => {
  const modelsJson = JSON.stringify(models);
  const script = `
    const fflate = require('fflate');
    const models = JSON.parse(process.argv[1]);
    const files = {};
    for (const model of models) {
      files['MODELS/' + model.name + '.yml'] = new TextEncoder().encode(model.content);
    }
    const zipped = fflate.zipSync(files, { level: 6 });
    process.stdout.write(Buffer.from(zipped).toString('base64'));
  `;

  const result = execSync(
    `node -e "${script
      .replace(/"/g, '\\"')
      .replace(/\n/g, " ")}" '${modelsJson}'`,
    {
      encoding: "utf-8",
    }
  );

  return Buffer.from(result, "base64");
};

/**
 * Helper to create a ZIP with arbitrary files
 */
const createZipWithFiles = (
  files: { path: string; content: string }[]
): Buffer => {
  const filesJson = JSON.stringify(files);
  const script = `
    const fflate = require('fflate');
    const files = JSON.parse(process.argv[1]);
    const zipFiles = {};
    for (const file of files) {
      zipFiles[file.path] = new TextEncoder().encode(file.content);
    }
    const zipped = fflate.zipSync(zipFiles, { level: 6 });
    process.stdout.write(Buffer.from(zipped).toString('base64'));
  `;

  const result = execSync(
    `node -e "${script
      .replace(/"/g, '\\"')
      .replace(/\n/g, " ")}" '${filesJson}'`,
    {
      encoding: "utf-8",
    }
  );

  return Buffer.from(result, "base64");
};

const createModelYaml = (name: string, modelId = 1) =>
  `header:
  name: ${name}
  labels: ""
  bitmap: ""
  modelId: ${modelId}
timers:
  - mode: 0
    start: 0
`;

describe("zipParser", () => {
  describe("extractYamlFromZip", () => {
    it("should extract YAML files from MODELS folder in ZIP", async () => {
      const zipBuffer = createZipWithModels([
        { name: "model00", content: createModelYaml("Quad Racing") },
        { name: "model01", content: createModelYaml("Trainer") },
      ]);
      const base64Data = zipBuffer.toString("base64");

      const result = await extractYamlFromZip(base64Data);

      expect(Object.keys(result)).toHaveLength(2);
      expect(result.model00).toBeDefined();
      expect(result.model01).toBeDefined();
      expect((result as any).model00.header).toEqual({
        name: "Quad Racing",
        labels: "",
        bitmap: "",
        modelId: 1,
      });
      expect((result as any).model01.header).toEqual({
        name: "Trainer",
        labels: "",
        bitmap: "",
        modelId: 1,
      });
    });

    it("should return empty object for ZIP without MODELS folder", async () => {
      const zipBuffer = createZipWithFiles([
        { path: "README.txt", content: "Hello" },
        { path: "config.yml", content: "key: value" },
      ]);
      const base64Data = zipBuffer.toString("base64");

      const result = await extractYamlFromZip(base64Data);

      expect(Object.keys(result)).toHaveLength(0);
    });

    it("should only extract .yml files from MODELS folder", async () => {
      const zipBuffer = createZipWithFiles([
        { path: "MODELS/model00.yml", content: createModelYaml("Model1") },
        { path: "MODELS/model01.bin", content: "Not a YAML" },
        { path: "MODELS/readme.md", content: "Documentation" },
        { path: "OTHER/model02.yml", content: createModelYaml("Model3") },
      ]);
      const base64Data = zipBuffer.toString("base64");

      const result = await extractYamlFromZip(base64Data);

      expect(Object.keys(result)).toHaveLength(1);
      expect(result.model00).toBeDefined();
      expect(result.model01).toBeUndefined();
      expect(result.model02).toBeUndefined();
    });

    it("should handle empty ZIP file", async () => {
      const zipBuffer = createZipWithFiles([]);
      const base64Data = zipBuffer.toString("base64");

      const result = await extractYamlFromZip(base64Data);

      expect(Object.keys(result)).toHaveLength(0);
    });

    it("should handle ZIP with single model", async () => {
      const zipBuffer = createZipWithModels([
        { name: "model05", content: createModelYaml("Solo Model", 5) },
      ]);
      const base64Data = zipBuffer.toString("base64");

      const result = await extractYamlFromZip(base64Data);

      expect(Object.keys(result)).toHaveLength(1);
      expect((result as any).model05.header).toEqual({
        name: "Solo Model",
        labels: "",
        bitmap: "",
        modelId: 5,
      });
    });

    it("should return empty object for invalid ZIP data", async () => {
      const invalidBase64 = Buffer.from("not a zip file").toString("base64");

      const result = await extractYamlFromZip(invalidBase64);

      expect(Object.keys(result)).toHaveLength(0);
    });

    it("should handle models with complex YAML structure", async () => {
      const complexYaml = `header:
  name: Complex Model
  labels: "label1,label2"
  bitmap: "model.bmp"
  modelId: 10
timers:
  - mode: 1
    start: 300
    value: 300
    countdownBeep: 2
    name: "Flight Timer"
  - mode: 0
    start: 0
    value: 0
    countdownBeep: 0
    name: ""
mixData:
  - destCh: 0
    srcRaw: 1
    weight: 100
`;
      const zipBuffer = createZipWithModels([
        { name: "complex", content: complexYaml },
      ]);
      const base64Data = zipBuffer.toString("base64");

      const result = await extractYamlFromZip(base64Data);

      expect(result.complex).toBeDefined();
      expect((result as any).complex.header).toEqual({
        name: "Complex Model",
        labels: "label1,label2",
        bitmap: "model.bmp",
        modelId: 10,
      });
      expect((result as any).complex.timers).toHaveLength(2);
      expect((result as any).complex.mixData).toHaveLength(1);
    });
  });

  describe("parseYamlFile", () => {
    it("should parse a YAML file from base64 data", () => {
      const yamlContent = createModelYaml("Test Model");
      const base64Data = Buffer.from(yamlContent).toString("base64");

      const result = parseYamlFile(base64Data, "model00.yml");

      expect(result.fileName).toBe("model00");
      expect(result.content.header).toEqual({
        name: "Test Model",
        labels: "",
        bitmap: "",
        modelId: 1,
      });
    });

    it("should remove .yml extension from fileName", () => {
      const yamlContent = createModelYaml("My Model");
      const base64Data = Buffer.from(yamlContent).toString("base64");

      const result = parseYamlFile(base64Data, "my-custom-model.yml");

      expect(result.fileName).toBe("my-custom-model");
    });

    it("should handle fileName without .yml extension", () => {
      const yamlContent = createModelYaml("Plain Name");
      const base64Data = Buffer.from(yamlContent).toString("base64");

      const result = parseYamlFile(base64Data, "model-without-ext");

      expect(result.fileName).toBe("model-without-ext");
    });

    it("should parse complex YAML content", () => {
      const complexYaml = `header:
  name: Complex
  modelId: 5
switches:
  - type: toggle
    name: SA
  - type: momentary
    name: SB
customData:
  nested:
    deep:
      value: 42
`;
      const base64Data = Buffer.from(complexYaml).toString("base64");

      const result = parseYamlFile(base64Data, "complex.yml");

      expect(result.fileName).toBe("complex");
      expect(result.content.switches).toHaveLength(2);
      expect(
        (result.content.customData as Record<string, unknown>).nested
      ).toBeDefined();
    });

    it("should throw error for invalid YAML", () => {
      const invalidYaml = "{ invalid: yaml: content: }}}";
      const base64Data = Buffer.from(invalidYaml).toString("base64");

      expect(() => parseYamlFile(base64Data, "invalid.yml")).toThrow(
        "Failed to parse YAML file: invalid.yml"
      );
    });

    it("should handle malformed base64 data gracefully", () => {
      // base64-arraybuffer doesn't throw on invalid base64, it just returns garbage
      // which then fails to parse as valid YAML in most cases
      // This test verifies the behavior is at least defined
      const malformedBase64 = "!!!";

      // The library decodes it to garbage bytes, which become invalid UTF-8
      // and the yaml parser may or may not throw depending on the garbage
      const result = parseYamlFile(malformedBase64, "garbage.yml");
      expect(result.fileName).toBe("garbage");
    });

    it("should handle empty YAML file", () => {
      const emptyYaml = "";
      const base64Data = Buffer.from(emptyYaml).toString("base64");

      const result = parseYamlFile(base64Data, "empty.yml");

      expect(result.fileName).toBe("empty");
      expect(result.content).toBeNull();
    });

    it("should handle YAML with only comments", () => {
      const commentOnlyYaml = `# This is a comment
# Another comment
`;
      const base64Data = Buffer.from(commentOnlyYaml).toString("base64");

      const result = parseYamlFile(base64Data, "comments.yml");

      expect(result.fileName).toBe("comments");
      expect(result.content).toBeNull();
    });

    it("should handle YAML with special characters in values", () => {
      const yamlWithSpecialChars = `header:
  name: "Special Model"
  description: "Contains quotes"
  path: "/path/to/file"
`;
      const base64Data = Buffer.from(yamlWithSpecialChars).toString("base64");

      const result = parseYamlFile(base64Data, "special.yml");

      expect(result.content.header).toEqual({
        name: "Special Model",
        description: "Contains quotes",
        path: "/path/to/file",
      });
    });
  });
});
