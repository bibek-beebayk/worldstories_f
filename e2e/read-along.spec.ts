import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  // Media playback in CI/headless mode is nondeterministic. Keep the real
  // audio element/events while replacing only the browser policy boundary.
  await page.addInitScript(() => {
    const playing = new WeakSet<HTMLMediaElement>();
    Object.defineProperty(HTMLMediaElement.prototype, "paused", {
      configurable: true,
      get() {
        return !playing.has(this);
      },
    });
    Object.defineProperty(HTMLMediaElement.prototype, "duration", {
      configurable: true,
      get() {
        return 120;
      },
    });
    HTMLMediaElement.prototype.play = function play() {
      playing.add(this);
      this.dispatchEvent(new Event("play"));
      this.dispatchEvent(new Event("canplay"));
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function pause() {
      playing.delete(this);
      this.dispatchEvent(new Event("pause"));
    };
  });
});

test("Read Along happy path plays, seeks, and navigates tracks", async ({ page }) => {
  await page.goto("/read-along/test-story/track-1", { waitUntil: "domcontentloaded" });

  await expect(page.getByRole("heading", { name: "Browser Test Story" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Transcript" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Across the quiet valley." })).toHaveAttribute(
    "aria-current",
    "true"
  );
  await expect(page.getByRole("slider", { name: "Playback position" })).toBeVisible();

  await page.getByRole("button", { name: "The journey continued." }).click();

  await page.getByRole("button", { name: "Contents" }).click();
  await expect(page.getByRole("dialog", { name: "Contents" })).toBeVisible();
  await page.getByRole("button", { name: /Track 2.*Closing Track/i }).click();

  await expect(page).toHaveURL(/\/read-along\/test-story\/track-2$/);
  await expect(page.getByText("Closing Track", { exact: true }).first()).toBeVisible();
  await expect(
    page.getByText("This is the editable unsynchronized transcript for the closing track.")
  ).toBeVisible();
  await expect(page.getByRole("status")).toContainText("Now playing track 2: Closing Track");
});

test("keyboard shortcuts and reduced motion remain usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/read-along/test-story/track-1", { waitUntil: "domcontentloaded" });

  const playPause = page.getByRole("button", { name: /^(Play|Pause)$/ });
  await expect(playPause).toBeVisible();
  await page.locator("body").press("Space");
  await expect(page.getByRole("button", { name: /^(Play|Pause)$/ })).toBeVisible();

  await page.locator("body").press("ArrowRight");
  await expect(page.getByRole("slider", { name: "Playback position" })).toBeVisible();

  const topBar = page.locator(".fixed.inset-x-0.top-0");
  await expect(topBar).toHaveCSS("transition-property", "none");
});
