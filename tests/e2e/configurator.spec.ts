import { expect, test, type Page } from "@playwright/test";

const stepButton = (page: Page, name: string) =>
  page.getByRole("navigation", { name: "Configuration steps" }).getByRole("button", { name: new RegExp(name) });
const status = (page: Page) => page.getByTestId("config-status");
const preview = (page: Page) => page.getByRole("region", { name: "Preview" }).getByRole("img");

const ledgerB = {
  productSlug: "ledger-media-console",
  templateCode: "TPL-LEDGER-B",
  bays: [
    { moduleCode: "LED-DOOR", widthUm: 457200, count: 1 },
    { moduleCode: "LED-DOOR", widthUm: 457200, count: 1 },
    { moduleCode: "LED-DOOR", widthUm: 457200, count: 1 },
    { moduleCode: "LED-DRAWERS", widthUm: 609600, count: 2 },
  ],
  materialCode: "MAT-OAK-VENEER",
  finishCode: "FIN-OAK-CLEAR",
  base: "legs",
  handleSku: "HDL-BAR",
  accessories: [],
};

test("a customer configures a TV console, saves it, reloads it and shares it", async ({ page, browser }) => {
  // From the product page into the configurator with the chosen design.
  await page.goto("/products/ledger-media-console?design=TPL-LEDGER-B");
  await page.getByRole("link", { name: "Configure this design" }).click();
  await expect(page).toHaveURL(/\/configure\/ledger-media-console\?design=TPL-LEDGER-B/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Configure your Ledger media console");
  await expect(status(page)).toHaveText("This configuration can be built.");
  await expect(preview(page)).toHaveAttribute("aria-label", /4 bays, 78″ wide, in Clear oak/);
  await expect(page.getByText(/2D front view/)).toBeVisible();

  // Size: pick a wider allowed width; the server resizes the bays.
  await stepButton(page, "Size").click();
  await expect(page.getByText("Height (fixed)")).toBeVisible();
  await page.getByText("84″", { exact: true }).click();
  await expect(preview(page)).toHaveAttribute("aria-label", /84″ wide/);
  await expect(status(page)).toHaveText("This configuration can be built.");

  // Layout: changing a module updates the preview at once.
  await stepButton(page, "Layout").click();
  await expect(page.getByText("Bays add up to 84″")).toBeVisible();
  await page.getByLabel("Type").nth(1).selectOption({ label: "Open bay" });
  await expect(preview(page)).toHaveAttribute("aria-label", /2 doors, 2 open compartments, 2 drawers/);
  await expect(status(page)).toHaveText("This configuration can be built.");

  // Going back and forward keeps the selections.
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await expect(page.getByRole("radio", { name: "84″" })).toBeChecked();
  await page.getByRole("button", { name: /Next: Layout/ }).click();
  await expect(page.getByLabel("Type").nth(1)).toHaveValue("LED-OPEN");

  // Finish and details.
  await stepButton(page, "Finish").click();
  await page.getByText("Slate", { exact: true }).click();
  await expect(preview(page)).toHaveAttribute("aria-label", /in Slate/);
  await stepButton(page, "Details").click();
  await page.getByText("Plinth", { exact: true }).click();
  await page.getByText("Round knob", { exact: true }).click();
  await page.getByLabel(/Cable grommet/).selectOption("2");

  // Review and save.
  await stepButton(page, "Review").click();
  await expect(page.getByText("84″ W × 20″ H × 16″ D").last()).toBeVisible();
  await expect(page.getByText("Slate, painted panel")).toBeVisible();
  await expect(page.getByText("Cable grommet × 2")).toBeVisible();
  await expect(page.getByText(/Pricing for configured designs and ordering are not available yet/)).toBeVisible();
  await page.getByLabel(/Name this design/).fill("Living room console");
  await page.getByRole("button", { name: "Save design" }).click();
  await expect(page).toHaveURL(/\/configurations\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Saved.")).toBeVisible();
  const savedUrl = page.url();
  const shareUrl = await page.getByLabel(/Share link/).inputValue();
  expect(shareUrl).toMatch(/\/shared\/[A-Za-z0-9_-]{32}$/);

  // Reload: the same design comes back from the server.
  await page.reload();
  await expect(status(page)).toHaveText("This configuration can be built.");
  await expect(preview(page)).toHaveAttribute("aria-label", /4 bays, 84″ wide, in Slate/);
  await stepButton(page, "Layout").click();
  await expect(page.getByLabel("Type").nth(1)).toHaveValue("LED-OPEN");
  await stepButton(page, "Review").click();
  await expect(page.getByLabel(/Name this design/)).toHaveValue("Living room console");

  // It is listed under saved designs.
  await page.goto("/configurations");
  await expect(page.getByRole("link", { name: "Living room console" })).toBeVisible();

  // Someone else: cannot open the owner's page, can open the share link read-only.
  const other = await browser.newContext();
  const visitor = await other.newPage();
  expect((await visitor.goto(savedUrl))?.status()).toBe(404);
  await visitor.goto(new URL(shareUrl).pathname);
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText("Living room console");
  await expect(visitor.getByText("Shared design, view only")).toBeVisible();
  await expect(visitor.getByText("84″ W × 20″ H × 16″ D")).toBeVisible();
  await expect(visitor.getByRole("button", { name: /save/i })).toHaveCount(0);
  await visitor.getByRole("link", { name: "Start from this design" }).click();
  await expect(visitor.getByRole("heading", { level: 1 })).toHaveText("Configure your Ledger media console");
  await expect(preview(visitor)).toHaveAttribute("aria-label", /84″ wide, in Slate/);
  await other.close();
});

test("an invalid combination is explained next to the bay and cannot be saved", async ({ page }) => {
  await page.goto("/configure/ledger-media-console?design=TPL-LEDGER-B");
  await stepButton(page, "Layout").click();

  // Three drawer bays break a Ledger rule; a fourth change breaks the width too.
  await page.getByLabel("Type").nth(0).selectOption({ label: "Drawer bay" });
  await page.getByLabel("Type").nth(1).selectOption({ label: "Drawer bay" });
  await expect(page.getByText("A Ledger console can have at most two drawer bays.")).toBeVisible();
  await expect(status(page)).toContainText("attention");
  await expect(stepButton(page, "Layout")).toContainText("needs attention");

  // Remove bays until the piece is too narrow: the range and nearest width are stated, nothing is clamped.
  await page.getByLabel("Type").nth(0).selectOption({ label: "Cabinet with one door" });
  await page.getByLabel("Type").nth(1).selectOption({ label: "Cabinet with one door" });
  await page.getByRole("button", { name: "Remove bay 1" }).click();
  await expect(page.getByText("Bays add up to 60″")).toBeVisible();
  await expect(page.getByText(/this design is made from 66″ to 90″ wide\. The closest available width is 66″/)).toBeVisible();

  await stepButton(page, "Review").click();
  await expect(page.getByRole("heading", { name: "Needs attention before this can be built" })).toBeVisible();
  await page.getByRole("button", { name: "Save design" }).click();
  await expect(page.getByText(/was not saved because it cannot be built/)).toBeVisible();
  await expect(page).toHaveURL(/\/configure\//);

  // The review links back to the step that fixes it.
  await page.getByRole("button", { name: "Go to Size" }).click();
  await page.getByText("66″", { exact: true }).click();
  await expect(status(page)).toHaveText("This configuration can be built.");
});

test("the configuration API is authoritative and rejects bad input", async ({ request }) => {
  const post = (path: string, data: unknown, headers: Record<string, string> = {}) =>
    request.post(path, { data, headers });

  const ok = await post("/api/configurations/validate", { selection: ledgerB });
  expect(ok.status()).toBe(200);
  expect(await ok.json()).toMatchObject({ valid: true, overallWidthUm: 1981200, ruleSetVersion: 1 });

  // A dimension the browser UI never offers is still refused by the server.
  const tall = await post("/api/configurations/validate", { selection: { ...ledgerB, heightUm: 762000 } });
  expect((await tall.json()).issues[0]).toMatchObject({ code: "DIMENSION_FIXED", path: "dimensions.height" });

  const resize = await post("/api/configurations/resize", { selection: ledgerB, targetWidthUm: 2032000 });
  expect(await resize.json()).toMatchObject({ ok: false, issues: [{ code: "WIDTH_NOT_ALLOWED", nearest: [1981200, 2133600] }] });

  const invalid = { ...ledgerB, finishCode: "FIN-PAINT-SLATE" };
  const refused = await post("/api/configurations", { selection: invalid });
  expect(refused.status()).toBe(422);
  expect((await refused.json()).validation.issues[0].code).toBe("FINISH_MATERIAL_MISMATCH");

  expect((await post("/api/configurations/validate", { selection: { productSlug: "x" } })).status()).toBe(400);
  expect((await post("/api/configurations/validate", { selection: { ...ledgerB, productSlug: "nope" } })).status()).toBe(404);
  expect(
    (await post("/api/configurations/validate", { selection: ledgerB }, { Origin: "https://evil.example" })).status(),
  ).toBe(403);
  expect(
    (await request.put("/api/configurations/00000000-0000-4000-8000-000000000000", { data: { selection: ledgerB } })).status(),
  ).toBe(404);
});

test("every sample product opens in the configurator in a buildable state", async ({ page }) => {
  for (const slug of ["span-wall-console", "tally-bookshelf", "hold-wardrobe", "brief-desk", "parcel-cabinet"]) {
    await page.goto(`/configure/${slug}`);
    await expect(status(page), slug).toHaveText("This configuration can be built.");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow, `${slug} horizontal overflow`).toBeLessThanOrEqual(0);
  }
});
