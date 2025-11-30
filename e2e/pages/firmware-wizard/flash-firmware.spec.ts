import { test, expect } from "../pageTest";

test.beforeEach(async ({ queries }) => {
  await (
    await queries.findByText("Radio firmware", undefined, { timeout: 10000 })
  ).click();
});

test.describe.parallel("Flashing", () => {
  test("Flash v2.10.6 firmware", async ({ queries, browserName, page }) => {
    test.skip(browserName !== "chromium");
    // First page
    await (await queries.findByLabelText("Firmware version")).press("Enter");
    await page
      .locator(".ant-select-item-option[title='EdgeTX \"Centurion\" v2.10.6']")
      .click();

    const radioSelector = await queries.findByLabelText("Radio model");
    await radioSelector.waitForElementState("enabled");
    await radioSelector.click();
    await (await queries.findByText("Flysky NV14")).click();

    const flashButton = await queries.findByText("Flash via USB");
    await flashButton.click();

    // Second page
    await (await queries.findByText("Good device")).click();

    const nextButton = await queries.findByText("Next");
    expect(await nextButton.isEnabled()).toBeTruthy();

    await nextButton.click();

    // Confirmation page
    expect(
      await (await queries.findByText("Flysky NV14")).isVisible()
    ).toBeTruthy();
    expect(
      await (await queries.findByText("Good device")).isVisible()
    ).toBeTruthy();

    await (await queries.findByText("Start flashing")).click();

    // Flashing
    expect(
      await (await queries.findByText("Flashing EdgeTX")).isVisible()
    ).toBeTruthy();

    expect(
      await (
        await queries.findByText("Downloaded", undefined, { timeout: 20000 })
      ).isVisible()
    ).toBeTruthy();
    expect(
      await (
        await queries.findByText("Erased", undefined, { timeout: 10000 })
      ).isVisible()
    ).toBeTruthy();
    expect(
      await (
        await queries.findByText("Flashed", undefined, { timeout: 10000 })
      ).isVisible()
    ).toBeTruthy();
    expect(
      await (
        await queries.findByText("Your radio has been flashed with EdgeTX")
      ).isVisible()
    ).toBeTruthy();
  });

  test("Flash firmware on disconnect bug device", async ({
    queries,
    browserName,
    page,
  }) => {
    test.skip(browserName !== "chromium");
    await (await queries.findByLabelText("Firmware version")).press("Enter");
    await page
      .locator(".ant-select-item-option[title='EdgeTX \"Centurion\" v2.10.6']")
      .click();

    const radioSelector = await queries.findByLabelText("Radio model");
    await radioSelector.waitForElementState("enabled");
    await radioSelector.click();
    await (await queries.findByText("Flysky NV14")).click();

    const flashButton = await queries.findByText("Flash via USB");
    await flashButton.click();

    await (await queries.findByText("Disconnect bug device")).click();
    await (await queries.findByText("Next")).click();
    await (await queries.findByText("Start flashing")).click();

    // Flashing
    expect(
      await (
        await queries.findByText("Downloaded", undefined, { timeout: 20000 })
      ).isVisible()
    ).toBeTruthy();
    expect(
      await (
        await queries.findByText("Erased", undefined, { timeout: 10000 })
      ).isVisible()
    ).toBeTruthy();
    expect(
      await (
        await queries.findByText("Flashed", undefined, { timeout: 10000 })
      ).isVisible()
    ).toBeTruthy();
    expect(
      await (
        await queries.findByText("Your radio has been flashed with EdgeTX")
      ).isVisible()
    ).toBeTruthy();
  });

  test("Flash firmware on locked device gives option to enable firmware upgrading", async ({
    queries,
    browserName,
    page,
  }) => {
    test.skip(browserName !== "chromium");
    await (await queries.findByLabelText("Firmware version")).press("Enter");
    await page
      .locator(".ant-select-item-option[title='EdgeTX \"Centurion\" v2.10.6']")
      .click();

    const radioSelector = await queries.findByLabelText("Radio model");
    await radioSelector.waitForElementState("enabled");
    await radioSelector.click();
    await (await queries.findByText("Flysky NV14")).click();

    const flashButton = await queries.findByText("Flash via USB");
    await flashButton.click();

    await (await queries.findByText("Locked device")).click();
    await (await queries.findByText("Next")).click();
    await (await queries.findByText("Start flashing")).click();

    // Flashing
    expect(
      await (
        await queries.findByText("Downloaded", undefined, { timeout: 20000 })
      ).isVisible()
    ).toBeTruthy();
    expect(
      await (
        await queries.findByText(
          "Device firmware may be read protected, preventing updates",
          undefined,
          { timeout: 10000 }
        )
      ).isVisible()
    ).toBeTruthy();
  });
});
