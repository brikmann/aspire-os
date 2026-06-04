const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 500 });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto("https://aspireos.co/dashboard");
  await page.waitForTimeout(3000);
  await page.screenshot({ path: "1-dashboard-initial.png" });
  console.log("Step 1: Dashboard loaded, capturing initial state");

  // Find all Connect buttons and log their context
  const connectBtns = await page.locator("a:has-text('Connect')").all();
  console.log("Connect links found:", connectBtns.length);
  for (let i = 0; i < connectBtns.length; i++) {
    const href = await connectBtns[i].getAttribute("href");
    console.log("  Connect[" + i + "] href:", href);
  }

  // Click the Notion Connect (href=/api/auth/notion)
  const notionBtn = page.locator("a[href='/api/auth/notion']");
  const count = await notionBtn.count();
  console.log("Notion connect button count:", count);
  
  if (count === 0) {
    console.log("No Notion connect button found — may already be connected or button is different type");
    const bodyText = await page.innerText("body");
    // Check status badges
    console.log("Body snippet around Notion:", bodyText.substring(bodyText.indexOf("Notion") - 20, bodyText.indexOf("Notion") + 100));
    await browser.close();
    return;
  }

  console.log("Step 2: Clicking Notion Connect...");
  const [newPage] = await Promise.all([
    context.waitForEvent("page").catch(() => null),
    notionBtn.click()
  ]);
  
  // Wait a bit for navigation
  await page.waitForTimeout(4000);
  const currentUrl = page.url();
  console.log("After click, URL:", currentUrl);
  await page.screenshot({ path: "2-after-notion-click.png" });

  if (currentUrl.includes("notion.com")) {
    console.log("SUCCESS: Redirected to Notion OAuth page — redirect URI accepted by Notion");
    const pageContent = await page.innerText("body");
    if (pageContent.includes("redirect_uri") || pageContent.includes("Invalid")) {
      console.log("ERROR on Notion page:", pageContent.substring(0, 300));
    } else {
      console.log("Notion OAuth page content (first 200 chars):", pageContent.substring(0, 200));
    }
  } else if (currentUrl.includes("aspireos.co/dashboard")) {
    console.log("Redirected back to dashboard (may have errored):", currentUrl);
  } else {
    console.log("Unexpected URL:", currentUrl);
  }

  await browser.close();
})();
