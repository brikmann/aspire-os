const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 400 });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // ── Test Google Calendar ─────────────────────────────
  await page.goto("https://aspireos.co/dashboard");
  await page.waitForTimeout(3000);
  
  const calBtn = page.locator("a[href='/api/auth/google-calendar']");
  console.log("Calendar connect button found:", await calBtn.count());
  await calBtn.click();
  await page.waitForTimeout(4000);
  
  const calUrl = page.url();
  console.log("Calendar redirect URL:", calUrl);
  await page.screenshot({ path: "3-google-calendar.png" });
  
  if (calUrl.includes("accounts.google.com")) {
    console.log("✅ Google Calendar: redirected to Google OAuth - redirect URI accepted");
    const bodyText = await page.innerText("body");
    if (bodyText.toLowerCase().includes("error") || bodyText.toLowerCase().includes("redirect_uri")) {
      console.log("⚠️ Error on Google page:", bodyText.substring(0, 300));
    } else {
      console.log("✅ Google Calendar OAuth page loaded correctly");
    }
  } else {
    console.log("❌ Unexpected URL for Calendar:", calUrl);
  }

  // ── Test Google Health ───────────────────────────────
  await page.goto("https://aspireos.co/dashboard");
  await page.waitForTimeout(3000);
  
  const healthBtn = page.locator("a[href='/api/auth/google-health']");
  console.log("Health connect button found:", await healthBtn.count());
  await healthBtn.click();
  await page.waitForTimeout(4000);
  
  const healthUrl = page.url();
  console.log("Health redirect URL:", healthUrl);
  await page.screenshot({ path: "4-google-health.png" });
  
  if (healthUrl.includes("accounts.google.com")) {
    console.log("✅ Google Health: redirected to Google OAuth - redirect URI accepted");
    const bodyText = await page.innerText("body");
    if (bodyText.toLowerCase().includes("error") || bodyText.toLowerCase().includes("redirect_uri")) {
      console.log("⚠️ Error on Google page:", bodyText.substring(0, 400));
    } else {
      console.log("✅ Google Health OAuth page loaded correctly");
    }
  } else {
    console.log("❌ Unexpected URL for Health:", healthUrl);
  }

  await browser.close();
})();
