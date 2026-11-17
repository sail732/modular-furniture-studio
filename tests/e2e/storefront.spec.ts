import { expect, test } from "@playwright/test";

const keyPages = [
  "/",
  "/shop",
  "/shop/bookshelves",
  "/products/ledger-media-console",
  "/products/hold-wardrobe",
  "/how-it-works",
  "/materials",
  "/delivery-assembly",
  "/about",
  "/contact",
  "/legal/returns",
];

test("a visitor can browse from the homepage to a category and open a product", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("note").first()).toContainText("sample content");

  await page.locator("#categories").getByRole("link", { name: /Bookshelves/ }).click();
  await expect(page).toHaveURL(/\/shop\/bookshelves$/);
  await expect(page.getByRole("heading", { level: 1, name: "Bookshelves and wall shelving" })).toBeVisible();
  await expect(page.getByText("2 products")).toBeVisible();

  await page.getByRole("link", { name: "Tally bookshelf" }).click();
  await expect(page).toHaveURL(/\/products\/tally-bookshelf$/);
  await expect(page.getByRole("heading", { level: 1, name: "Tally bookshelf" })).toBeVisible();
  await expect(page.getByText("Sample product")).toBeVisible();
  await expect(page.getByRole("img", { name: /Tally bookshelf.*Front-view illustration/ }).first()).toBeVisible();
});

test("search with no matches shows an empty state that leads back to the catalog", async ({ page }) => {
  await page.goto("/shop?q=hammock");
  await expect(page.getByRole("heading", { name: "No furniture matches these filters" })).toBeVisible();
  await page.getByRole("link", { name: "Clear filters" }).first().click();
  await expect(page).toHaveURL(/\/shop$/);
  await expect(page.getByText("8 products")).toBeVisible();
});

test("filters narrow the listing and are reflected in the URL", async ({ page, viewport }) => {
  await page.goto("/shop");
  if ((viewport?.width ?? 1280) < 1024) {
    await page.getByRole("button", { name: /Filter and sort/ }).click();
  }
  await page.getByLabel("Under $500").check();
  await page.getByLabel("Birch plywood").check();
  await page.getByLabel("Sort by").selectOption("price-asc");
  await page.getByRole("button", { name: "Apply filters" }).click();

  await expect(page).toHaveURL(/price=0-500/);
  await expect(page).toHaveURL(/material=MAT-BIRCH-PLY/);
  await expect(page.getByText("3 products match your filters")).toBeVisible();
  const names = await page.locator("article h3").allTextContents();
  expect(names).toEqual(["Rung low shelf", "Tally bookshelf", "Parcel cabinet"]);
});

test("choosing a design and finish on a product page updates price and illustration", async ({ page }) => {
  await page.goto("/products/ledger-media-console");
  await expect(page.getByText("From $649")).toBeVisible();

  await page.getByRole("link", { name: /Model C/ }).click();
  await expect(page).toHaveURL(/design=TPL-LEDGER-C/);
  await expect(page.getByText("From $1,129")).toBeVisible();

  await page.getByRole("link", { name: "Slate", exact: true }).click();
  await expect(page).toHaveURL(/finish=FIN-PAINT-SLATE/);
  await expect(page.getByRole("img", { name: /Model C.*in Slate/ })).toBeVisible();
  // No purchase path exists yet, and the page says so.
  await expect(page.getByText(/configurator.*still being built/i)).toBeVisible();
  await expect(page.getByRole("button", { name: /add to cart|buy/i })).toHaveCount(0);
});

test("unknown products and categories return 404", async ({ page }) => {
  for (const path of ["/products/does-not-exist", "/shop/does-not-exist", "/legal/does-not-exist"]) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  }
});

test("the navigation works at this viewport, including the menu on small screens", async ({ page, viewport }) => {
  await page.goto("/");
  if ((viewport?.width ?? 1280) < 1024) {
    const toggle = page.getByRole("button", { name: "Menu" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await toggle.click();
    await expect(page.getByRole("button", { name: "Close" })).toHaveAttribute("aria-expanded", "true");
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Materials & finishes" }).click();
  } else {
    await page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Materials & finishes" }).click();
  }
  await expect(page).toHaveURL(/\/materials$/);
  await expect(page.getByRole("heading", { level: 1, name: "Materials and finishes" })).toBeVisible();
});

test("key pages have one h1, a title, and no horizontal overflow", async ({ page }) => {
  for (const path of keyPages) {
    const response = await page.goto(path);
    expect(response?.status(), path).toBe(200);
    await expect(page.locator("h1"), path).toHaveCount(1);
    expect((await page.title()).length, path).toBeGreaterThan(5);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow, `${path} horizontal overflow`).toBeLessThanOrEqual(0);
  }
});

test("sample catalogs are kept out of search engines", async ({ page, request }) => {
  const robots = await request.get("/robots.txt");
  expect(await robots.text()).toContain("Disallow: /");
  await page.goto("/");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
});
