const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 300 });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  console.log("Navigating to dashboard...");
  await page.goto("https://aspireos.co/dashboard");
  await page.waitForTimeout(3000);
  
  const title = await page.title();
  console.log("Page title:", title);
  
  await page.screenshot({ path: "test-dashboard.png" });
  console.log("Screenshot saved: test-dashboard.png");
  
  const bodyText = await page.innerText("body");
  console.log("Has Notion:", bodyText.includes("Notion"));
  console.log("Has Google Health:", bodyText.includes("Google Health"));
  console.log("Has Google Calendar:", bodyText.includes("Google Calendar"));
  
  const connectButtons = await page.locator("a:has-text('Connect'), button:has-text('Connect')").all();
  console.log("Connect buttons found:", connectButtons.length);
  
  await browser.close();
})();
