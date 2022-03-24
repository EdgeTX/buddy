import md5 from "md5";
import { Readable } from "stream";
import clipboardy from "clipboardy";
import fs from "fs/promises";
import path from "path";
import { test, expect, waitFor } from "../pageTest";

test.beforeEach(async ({ queries }) => {
  await (
    await queries.findByText("Radio firmware", undefined, { timeout: 10000 })
  ).click();
});

test("Latest firmware is pre selected by default", async ({
  queries,
  page,
}) => {
  await (await queries.findByLabelText("Firmware version")).press("Enter");

  await page
    .locator('[role=option][aria-selected="true"]')
    .waitFor({ state: "attached" });
  expect(await (await queries.findByText("Copy URL")).isEnabled()).toBeTruthy();
});

test("Flash via USB is disabled if model is not selected", async ({
  queries,
  browserName,
}) => {
  test.skip(browserName !== "chromium");
  const expectFlashButtonIsDisabled = async () => {
    expect(
      await (await queries.getByText("Flash via USB")).isDisabled()
    ).toBeTruthy();
  };

  await expectFlashButtonIsDisabled();
  await (await queries.findByLabelText("Firmware version")).press("Enter");
  await (
    await queries.findByText('EdgeTX "Dauntless" 2.5.0', undefined, {
      timeout: 20000,
    })
  ).click();

  await expectFlashButtonIsDisabled();
  const radioSelector = await queries.findByLabelText("Radio model");
  await radioSelector.waitForElementState("enabled");

  await expectFlashButtonIsDisabled();

  await radioSelector.click();
  await (await queries.findByText("Flysky NV14")).click();

  expect(
    await (await queries.getByText("Flash via USB")).isEnabled()
  ).toBeTruthy();
});

const streamToString = (stream: Readable): Promise<string> => {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk as Buffer)));
    stream.on("error", (err) => reject(err));
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
  });
};

[
  {
    testCase: "Can download the selected firmware target",
    radioName: "Frsky X-Lite S",
    expected: {
      fileName: "xlites-v2.5.0.bin",
      fileHash: "496807b5624fab15c4c2d11130d651c2",
    },
  },
  {
    testCase: "Downloads correct firmware for devices with similar code names",
    radioName: "Frsky QX7",
    expected: {
      // In this case `x7` could match `x7-access` due to the way the code names
      // were previously matched
      fileName: "x7-v2.5.0.bin",
      fileHash: "37c3ea0d8c455eef0a9c26ee5a08c8b4",
    },
  },
].forEach(({ testCase, radioName, expected }) => {
  test(testCase, async ({ queries, page, isElectron, tempDownloadDir }) => {
    await (await queries.findByLabelText("Firmware version")).press("Enter");
    await (
      await queries.findByText('EdgeTX "Dauntless" 2.5.0', undefined, {
        timeout: 20000,
      })
    ).click();

    const radioSelector = await queries.findByLabelText("Radio model");
    await radioSelector.waitForElementState("enabled");

    await radioSelector.click();
    await (await queries.findByText(radioName)).click();

    const [download] = await Promise.all([
      // Start waiting for the download
      !isElectron ? page.waitForEvent("download") : undefined,
      // Perform the action that initiates download
      (await queries.getByText("Download .bin")).click(),
    ]);

    // In browser we can use the download event
    if (download) {
      expect(download.suggestedFilename()).toBe(expected.fileName);
      expect(
        md5(await streamToString((await download.createReadStream())!))
      ).toBe(expected.fileHash);
    } else {
      // In electron we have to read the download path
      const expectedFilePath = path.join(tempDownloadDir, expected.fileName);
      await waitFor(async () => {
        expect(md5((await fs.readFile(expectedFilePath)).toString())).toBe(
          expected.fileHash
        );
      });
    }
  });
});

test("Copy URL button copies a link to the selected firmware", async ({
  queries,
  page,
  isLinux,
  isElectron,
  browserName,
}) => {
  test.skip(browserName !== "chromium");
  await (await queries.findByLabelText("Firmware version")).press("Enter");
  await page
    .locator(".ant-select-item-option[title='EdgeTX \"Santa\" v2.6.0']")
    .click();

  const radioSelector = await queries.findByLabelText("Radio model");
  await radioSelector.waitForElementState("enabled");

  await radioSelector.click();
  await (await queries.findByText("FrSky Horus X10")).click();

  await (await queries.getByText("Copy URL")).click();

  if (isLinux && !isElectron) {
    await page.context().grantPermissions(["clipboard-read"]);
  }

  const copiedUrl = isLinux
    ? await page.evaluate(() => navigator.clipboard.readText())
    : await clipboardy.read();

  if (isElectron) {
    expect(copiedUrl).toBe(
      "buddy.edgetx.org/#/flash?version=v2.6.0&target=x10"
    );
  } else {
    expect(copiedUrl).toBe("localhost:8081/#/flash?version=v2.6.0&target=x10");
  }
});
