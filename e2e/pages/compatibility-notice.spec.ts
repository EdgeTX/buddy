import { expect, test, waitFor } from "./pageTest";

test("shows a compatibility notice for unsupported browsers", async ({
  page,
  queries,
  browserName,
}) => {
  test.skip(browserName === "chromium");
  await page.reload();
  expect(
    await (
      await queries.findByText("Your browser doesn't support EdgeTX Buddy")
    ).isVisible()
  ).toBeTruthy();
  await (
    await queries.findByLabelText("Close", { selector: "button" })
  ).click();

  const modal = await queries.findByText(
    "Your browser doesn't support EdgeTX Buddy"
  );
  await waitFor(async () => {
    expect(await modal.isVisible()).toBeFalsy();
  });
});

test("compatibility dialog in unsupported browsers can be set to never show again", async ({
  page,
  queries,
  browserName,
}) => {
  test.skip(browserName === "chromium");
  await page.reload();
  await (await queries.getByLabelText("Don't show again")).click();

  await page.reload();
  await queries.findByText("Radio firmware");
  expect(
    await queries.queryByText("Your browser doesn't support EdgeTX Buddy")
  ).toBeFalsy();
});
