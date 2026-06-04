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
  
  // Check integration statuses
  const bodyText = await page.innerText("body");
  console.log("Page has Notion card:", bodyText.includes("Notion"));
  console.log("Page has Google Health card:", bodyText.includes("Google Health"));
  console.log("Page has Google Calendar card:", bodyText.includes("Google Calendar"));
  
  // Find and click Notion Connect button
  const notionConnect = await page.locator("text=Connect").nth(1); // second Connect is Notion (after Google Health and Calendar)
  const connectButtons = await page.locator("a:has-text('Connect'), button:has-text('Connect')").all();
  console.log("Number of Connect buttons found:", connectButtons.length);
  
  for (let i = 0; i < connectButtons.length; i++) {
    const text = await connectButtons[i].evaluate(el => el.closest("[class]")?.textContent?.trim().substring(0, 80));
    console.log(`Connect button ${i}:`, text);
  }
  
  await browser.close();
})();
