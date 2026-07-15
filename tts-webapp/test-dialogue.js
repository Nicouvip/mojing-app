const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:8000/');
  await page.waitForTimeout(1000);
  
  // Click on 黑莲花 project
  await page.locator('.project-card').filter({ hasText: '黑莲花' }).click();
  await page.waitForTimeout(1000);
  
  // Click on 对话模式 tab
  await page.locator('.tab').filter({ hasText: '对话模式' }).click();
  await page.waitForTimeout(500);
  
  // Check tab content visibility
  const isVisible = await page.locator('#tabDialogue').isVisible();
  const className = await page.locator('#tabDialogue').getAttribute('class');
  const display = await page.locator('#tabDialogue').evaluate(el => window.getComputedStyle(el).display);
  
  console.log('tabDialogue visible:', isVisible);
  console.log('tabDialogue class:', className);
  console.log('tabDialogue computed display:', display);
  
  // Check segmentList content
  const segHTML = await page.locator('#segmentList').innerHTML();
  const charHTML = await page.locator('#characterList').innerHTML();
  
  console.log('segmentList HTML length:', segHTML.length);
  console.log('segmentList first 500 chars:', segHTML.substring(0, 500));
  console.log('characterList HTML length:', charHTML.length);
  console.log('characterList first 500 chars:', charHTML.substring(0, 500));
  
  // Take screenshot
  await page.screenshot({ path: '/d/codexvip/tts-webapp/test-dialogue.png', fullPage: true });
  console.log('Screenshot saved');
  
  await browser.close();
})();
