const { test, expect } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  await page.goto("/preview/");
  await expect(page.locator('#past-events .event-card[data-event-id="halloween-2026"]')).toHaveCount(1);
});

async function openHalloweenEvent(page) {
  await page.locator('#past-events .event-card[data-event-id="halloween-2026"]').click();
  await expect(page.locator("#results-page")).toBeVisible();
  await expect(page.locator("#event-title")).toHaveText("HYROX Halloween Special 2026");
}

async function openLeaderboard(page) {
  await page.locator('.results-nav-link[data-page-target="leaderboard-page"]').click();
  await expect(page.locator("#leaderboard-page")).toBeVisible();
}

test("event overview loads and opens the event", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "WETTKÄMPFE" })).toBeVisible();
  await expect(page.locator("#past-events")).toContainText("HYROX Halloween Special 2026");
  await openHalloweenEvent(page);
  await expect(page.locator(".team-row")).toHaveCount(4);
});

test("division filters show only teams from the selected division", async ({ page }) => {
  await openHalloweenEvent(page);
  await openLeaderboard(page);

  await page.locator('.tab[data-division="Frauen"]').click();
  await expect(page.locator('.tab[data-division="Frauen"]')).toHaveClass(/active/);
  await expect(page.locator("#leaderboard")).toContainText("Spooky Squats");
  await expect(page.locator("#leaderboard")).not.toContainText("Halloween Party");

  await page.locator('.tab[data-division="Mixed"]').click();
  await expect(page.locator("#leaderboard")).toContainText("Pumpkin Spice");
  await expect(page.locator("#leaderboard")).not.toContainText("Spooky Squats");
});

test("closing a team profile restores the event URL in the preview base path", async ({ page }) => {
  await openHalloweenEvent(page);
  await openLeaderboard(page);
  await expect(page).toHaveURL(/\/preview\/#halloween-2026$/);

  await page.locator("#leaderboard .team-row").first().click();
  await expect(page.locator("#team-dialog")).toBeVisible();
  await expect(page).toHaveURL(/\/preview\/share\/halloween-2026\/team-[^/]+\/$/);

  await page.locator("#dialog-close").click();
  await expect(page.locator("#team-dialog")).not.toBeVisible();
  await expect(page).toHaveURL(/\/preview\/#halloween-2026$/);
});

test("release page hides the division selector", async ({ page }) => {
  await openHalloweenEvent(page);
  await page.locator('.results-nav-link[data-page-target="release-page"]').click();

  await expect(page.locator("#release-page")).toBeVisible();
  await expect(page.locator(".division-filter-bar")).toBeHidden();
  await expect(page.locator("#release-title")).toHaveText("Versionshistorie");
});
