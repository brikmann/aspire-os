const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Follow the Notion auth URL and capture any error on Notion's side
  const notionAuthUrl = "https://api.notion.com/v1/oauth/authorize?client_id=372d872b-594c-8105-938d-00377d8b9021&response_type=code&owner=user&redirect_uri=https%3A%2F%2Faspireos.co%2Fapi%2Fauth%2Fnotion%2Fcallback&state=test-state-123";
  
  await page.goto(notionAuthUrl);
  await page.waitForTimeout(3000);
  
  const url = page.url();
  const title = await page.title();
  const body = await page.innerText("body").catch(() => "");
  
  console.log("Final URL:", url);
  console.log("Title:", title);
  console.log("Body (first 500):", body.substring(0, 500));
  
  // Check for error indicators
  if (body.toLowerCase().includes("invalid") || body.toLowerCase().includes("error") || url.includes("error")) {
    console.log("ERROR DETECTED");
    console.log("Full body (first 1000):", body.substring(0, 1000));
  }

  await browser.close();
})();
