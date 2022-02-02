import { test, expect } from "../pageTest";

const firmwarePage = "#/flash";

test.beforeEach(async ({ page }) => {
  await page.goto(firmwarePage);
});

test("Flash v2.5.0 firmware", async ({ queries }) => {
  // First page
  await (await queries.findByLabelText("Firmware version")).click();
  await (await queries.findByText('EdgeTX "Dauntless" 2.5.0')).click();

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
      await queries.findByText("Downloaded", undefined, { timeout: 60000 })
    ).isVisible()
  ).toBeTruthy();
  expect(await (await queries.findByText("Erasing")).isVisible()).toBeTruthy();
  expect(
    await (
      await queries.findByText("Erased", undefined, { timeout: 60000 })
    ).isVisible()
  ).toBeTruthy();
  expect(await (await queries.findByText("Flashing")).isVisible()).toBeTruthy();
  expect(
    await (
      await queries.findByText("Flashed", undefined, { timeout: 60000 })
    ).isVisible()
  ).toBeTruthy();
  expect(
    await (
      await queries.findByText("Your radio has been flashed with EdgeTX")
    ).isVisible()
  ).toBeTruthy();
});
