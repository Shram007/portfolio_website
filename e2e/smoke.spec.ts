import { expect, test, type ConsoleMessage } from "@playwright/test";

function trackConsoleErrors(page: import("@playwright/test").Page) {
  const errors: string[] = [];
  page.on("console", (m: ConsoleMessage) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(e.message));
  return errors;
}

test("home loads with no console errors and core sections", async ({ page }) => {
  const errors = trackConsoleErrors(page);
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Shram Kadia");
  for (const id of ["projects", "experience", "about", "skills", "contact"]) {
    await expect(page.locator(`#${id}`)).toBeAttached();
  }
  await page.waitForTimeout(1000);
  expect(errors).toEqual([]);
});

test("old section routes redirect to anchors", async ({ page }) => {
  await page.goto("/projects");
  await expect(page).toHaveURL(/\/#projects$/);
  await page.goto("/education");
  await expect(page).toHaveURL(/\/#about$/);
});

test("robots, sitemap and OG image are served", async ({ request }) => {
  for (const path of ["/robots.txt", "/sitemap.xml", "/opengraph-image"]) {
    expect((await request.get(path)).status(), path).toBe(200);
  }
});

test("security headers are present", async ({ request }) => {
  const headers = (await request.get("/")).headers();
  expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
  expect(headers["x-content-type-options"]).toBe("nosniff");
});

test("unknown routes show the 404 page", async ({ page }) => {
  const res = await page.goto("/definitely-not-a-page");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Lost in space" })).toBeVisible();
});

test("theme toggle switches to dark and back", async ({ page }) => {
  await page.goto("/");
  const toggle = page.getByRole("button", { name: /switch to (dark|light) theme/i }).first();
  const html = page.locator("html");
  const wasDark = (await html.getAttribute("class"))?.includes("dark") ?? false;
  await toggle.click();
  await expect(html).toHaveClass(wasDark ? /^(?!.*dark).*$/ : /dark/);
});

test("command palette opens with Ctrl+K, filters and closes", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("Control+k");
  const dialog = page.getByRole("dialog", { name: "Command palette" });
  await expect(dialog).toBeVisible();
  await page.keyboard.type("clinic");
  await expect(dialog.getByRole("option").first()).toContainText("ClinicFlow");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("projects grid expands and the 3D view loads on demand", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const list = page.locator("#project-list > li");
  await expect(list).toHaveCount(3);
  await page.getByRole("button", { name: /show all projects/i }).click();
  await expect(list).toHaveCount(10);

  await page.getByRole("group", { name: "Projects view" }).getByRole("button", { name: "3D" }).click();
  await expect(page.getByRole("button", { name: /open details/i }).first()).toBeAttached();
  await page.getByRole("button", { name: /open details/i }).first().click({ force: true });
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
});

test("project card text expands on click and collapses again", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const card = page.locator("#project-list > li").nth(2);
  const toggle = card.getByRole("button", { name: /^Travel-planning/ });
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(card.getByText("DeepSeek-R1", { exact: true })).toBeVisible();
  await card.getByRole("button", { name: /show fewer/i }).click();
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
});

test("experience: hover, keyboard and click focus a role", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const tabs = page.getByRole("tab");
  const panel = page.getByRole("tabpanel");
  await expect(tabs).toHaveCount(4);
  await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
  await expect(panel).toContainText("Orris Care");

  await tabs.nth(2).hover();
  await expect(tabs.nth(2)).toHaveAttribute("aria-selected", "true");
  await expect(panel).toContainText("North Carolina State University");
  await expect(panel.getByRole("list", { name: "Highlights" })).toContainText("60%");

  await tabs.nth(2).focus();
  await page.keyboard.press("ArrowDown");
  await expect(tabs.nth(3)).toHaveAttribute("aria-selected", "true");
  await expect(panel).toContainText("Resilient Tech");

  await tabs.nth(1).click();
  await expect(panel).toContainText("OpenPRA");
});

test("contact form shows success and error states (API mocked)", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const fill = async () => {
    await page.getByLabel("Name").fill("Ada");
    await page.getByLabel("Email").fill("ada@example.com");
    await page.getByLabel("Message").fill("Hello");
  };

  await page.route("**/api/contact", (route) => route.fulfill({ status: 500, json: { ok: false } }));
  await fill();
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText(/something went wrong/i)).toBeVisible();

  await page.unroute("**/api/contact");
  await page.route("**/api/contact", (route) => route.fulfill({ status: 200, json: { ok: true } }));
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText(/your message was sent/i)).toBeVisible();
});

test.describe("mobile", () => {
  test.use({ viewport: { width: 375, height: 812 }, hasTouch: true });

  test("no horizontal overflow and menu works", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);

    await page.getByRole("button", { name: "Open menu" }).click();
    const menu = page.locator("#mobile-menu");
    await expect(menu).toBeVisible();
    await menu.getByRole("link", { name: "Projects" }).click();
    await expect(menu).toBeHidden();
  });
});
