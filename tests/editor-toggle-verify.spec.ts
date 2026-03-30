/**
 * Verification test for phase-5-editor-toggle-shortcuts.
 * Tests EditorToggle, top bar, dirty indicator, and keyboard shortcuts.
 *
 * Requires both the Next.js (port 3000) and FastAPI (port 8000) servers running.
 * Run: docker compose up --build -d  OR  start servers manually before running.
 */

import { test, expect } from "@playwright/test";

const TEST_FILE = "test-toggle-verify.md";

test.describe("Editor toggle and keyboard shortcuts", () => {
  test.beforeAll(async ({ request }) => {
    // Create a test file via the API
    const res = await request.post(
      `http://localhost:8000/files/${encodeURIComponent(TEST_FILE)}`,
      { data: { type: "file" } }
    );
    // Accept 201 or 409 (already exists)
    expect([201, 409]).toContain(res.status());
  });

  test.afterAll(async ({ request }) => {
    await request.delete(
      `http://localhost:8000/files/${encodeURIComponent(TEST_FILE)}`
    );
  });

  test("top bar shows file name and Edit/Preview toggle", async ({ page }) => {
    await page.goto(`/editor/${TEST_FILE}`);
    await page.waitForSelector("text=Edit", { timeout: 10000 });

    // File name visible in top bar
    await expect(page.getByText(TEST_FILE)).toBeVisible();

    // Both toggle buttons present
    await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Preview" })).toBeVisible();
  });

  test("clicking Preview switches to preview mode", async ({ page }) => {
    await page.goto(`/editor/${TEST_FILE}`);
    await page.waitForSelector("textarea", { timeout: 10000 });

    // Textarea visible in edit mode
    await expect(page.locator("textarea")).toBeVisible();

    // Switch to preview
    await page.getByRole("button", { name: "Preview" }).click();

    // Textarea should be gone; prose container should appear
    await expect(page.locator("textarea")).not.toBeVisible();
    await expect(page.locator(".prose")).toBeVisible();
  });

  test("switching back to Edit mode shows textarea again", async ({ page }) => {
    await page.goto(`/editor/${TEST_FILE}`);
    await page.waitForSelector("textarea", { timeout: 10000 });

    await page.getByRole("button", { name: "Preview" }).click();
    await expect(page.locator("textarea")).not.toBeVisible();

    await page.getByRole("button", { name: "Edit" }).click();
    await expect(page.locator("textarea")).toBeVisible();
  });

  test("dirty indicator appears after editing content", async ({ page }) => {
    await page.goto(`/editor/${TEST_FILE}`);
    await page.waitForSelector("textarea", { timeout: 10000 });

    // Initially no dirty indicator
    await expect(page.locator('[aria-label="Unsaved changes"]')).not.toBeVisible();

    // Type something
    await page.locator("textarea").fill("# Hello world");

    // Dirty indicator should appear
    await expect(page.locator('[aria-label="Unsaved changes"]')).toBeVisible();
  });

  test("Save button disabled when not dirty, enabled when dirty", async ({ page }) => {
    await page.goto(`/editor/${TEST_FILE}`);
    await page.waitForSelector("textarea", { timeout: 10000 });

    const saveBtn = page.getByRole("button", { name: "Save" }).first();
    await expect(saveBtn).toBeDisabled();

    await page.locator("textarea").fill("Some content");
    await expect(saveBtn).toBeEnabled();
  });

  test("Ctrl+S / Cmd+S triggers save", async ({ page }) => {
    await page.goto(`/editor/${TEST_FILE}`);
    await page.waitForSelector("textarea", { timeout: 10000 });

    await page.locator("textarea").fill("Saved via keyboard " + Date.now());

    // Save button should be enabled (dirty)
    const saveBtn = page.getByRole("button", { name: "Save" }).first();
    await expect(saveBtn).toBeEnabled();

    // Press Ctrl+S
    await page.keyboard.press("Control+s");

    // After save, button should be disabled (not dirty)
    await expect(saveBtn).toBeDisabled({ timeout: 5000 });
  });

  test("preview shows current unsaved content", async ({ page }) => {
    await page.goto(`/editor/${TEST_FILE}`);
    await page.waitForSelector("textarea", { timeout: 10000 });

    const uniqueText = "Unique preview text " + Date.now();
    await page.locator("textarea").fill(`# ${uniqueText}`);

    // Switch to preview WITHOUT saving
    await page.getByRole("button", { name: "Preview" }).click();

    // The rendered heading should contain our unsaved text
    await expect(page.locator(".prose")).toContainText(uniqueText);
  });
});
