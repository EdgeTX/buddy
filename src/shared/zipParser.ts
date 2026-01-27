import yaml from "yaml";
import * as unzipit from "unzipit";
import * as base64ArrayBuffer from "base64-arraybuffer";

export type ParsedYamlFile = {
  fileName: string;
  content: Record<string, unknown>;
};

export async function extractYamlFromZip(
  base64Data: string
): Promise<Record<string, Record<string, unknown>>> {
  const arrayBuffer = base64ArrayBuffer.decode(base64Data);
  const buffer = Buffer.from(arrayBuffer);
  const parsedData: Record<string, Record<string, unknown>> = {};

  try {
    const { entries } = await unzipit.unzip(buffer);

    await Promise.all(
      Object.entries(entries)
        .filter(([name]) => name.startsWith("MODELS/") && name.endsWith(".yml"))
        .map(async ([name, entry]) => {
          const content = await entry.text();
          const modelName = name.split("/").pop()?.replace(".yml", "") ?? "";
          parsedData[modelName] = yaml.parse(content) as Record<
            string,
            unknown
          >;
        })
    );
  } catch (error) {
    // Error reading ZIP
  }

  return parsedData;
}

export function parseYamlFile(
  base64Data: string,
  fileName: string
): ParsedYamlFile {
  try {
    const arrayBuffer = base64ArrayBuffer.decode(base64Data);
    const buffer = Buffer.from(arrayBuffer);
    const text = buffer.toString("utf-8");
    const content = yaml.parse(text) as Record<string, unknown>;

    // Extract model name from file (remove .yml extension)
    const modelName = fileName.replace(".yml", "");

    return {
      fileName: modelName,
      content,
    };
  } catch (error) {
    throw new Error(`Failed to parse YAML file: ${fileName}`);
  }
}
