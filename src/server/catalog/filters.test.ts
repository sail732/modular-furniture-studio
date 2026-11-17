import { describe, expect, it } from "vitest";
import { hasActiveFilters, parseListingParams } from "./filters";

describe("parseListingParams", () => {
  it("returns defaults for empty input", () => {
    const f = parseListingParams({});
    expect(f).toMatchObject({ q: "", categorySlug: null, sort: "featured", price: null, width: null });
    expect(hasActiveFilters(f)).toBe(false);
  });

  it("parses valid filters into canonical units", () => {
    const f = parseListingParams({
      q: "  console ",
      material: ["MAT-OAK-VENEER", "MAT-PAINTED"],
      finish: "FIN-OAK-CLEAR",
      price: "500-1000",
      width: "48-72",
      sort: "price-asc",
    });
    expect(f.q).toBe("console");
    expect(f.materialCodes).toEqual(["MAT-OAK-VENEER", "MAT-PAINTED"]);
    expect(f.finishCodes).toEqual(["FIN-OAK-CLEAR"]);
    expect(f.price).toEqual({ minCents: 50_000, maxCents: 100_000, raw: "500-1000" });
    expect(f.width).toEqual({ minUm: 1_219_200, maxUm: 1_828_800, raw: "48-72" });
    expect(f.sort).toBe("price-asc");
    expect(hasActiveFilters(f)).toBe(true);
  });

  it("supports open-ended ranges", () => {
    expect(parseListingParams({ price: "1500-" }).price).toMatchObject({ minCents: 150_000, maxCents: null });
    expect(parseListingParams({ width: "-48" }).width).toMatchObject({ minUm: null, maxUm: 1_219_200 });
  });

  it("drops malformed or hostile values", () => {
    const f = parseListingParams({
      material: ["'; drop table products;--", "MAT-PAINTED"],
      finish: "<script>",
      price: "abc",
      width: "72-48",
      sort: "random",
      category: "../admin",
    });
    expect(f.materialCodes).toEqual(["MAT-PAINTED"]);
    expect(f.finishCodes).toEqual([]);
    expect(f.price).toBeNull();
    expect(f.width).toBeNull();
    expect(f.sort).toBe("featured");
    expect(f.categorySlug).toBeNull();
  });

  it("prefers the route category over a query parameter and truncates long searches", () => {
    const f = parseListingParams({ category: "wardrobes", q: "x".repeat(200) }, "bookshelves");
    expect(f.categorySlug).toBe("bookshelves");
    expect(f.q).toHaveLength(80);
  });
});
