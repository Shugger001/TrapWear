import { expect, test } from "@playwright/test";

test("home loads", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Jerseys engineered/i })).toBeVisible();
});

test("shop lists products", async ({ page }) => {
  await page.goto("/products");
  await expect(page.getByRole("heading", { name: "Shop" })).toBeVisible();
});
