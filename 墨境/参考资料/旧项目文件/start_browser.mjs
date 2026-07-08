// start_browser.mjs — Quick setup for In-App Browser in right panel
// Run this to open browser, set visibility, and open a default page.

const pluginRoot = "C:\\Users\\nicou\\.codex\\plugins\\cache\\openai-bundled\\browser\\26.623.101652";

if (globalThis.agent?.browsers == null) {
  const { setupBrowserRuntime } = await import(pluginRoot + "/scripts/browser-client.mjs");
  await setupBrowserRuntime({ globals: globalThis });
}

const browser = await agent.browsers.get("iab");
await (await browser.capabilities.get("visibility")).set(true);

const tab = await browser.tabs.new("https://www.baidu.com");
await tab.goto("https://www.baidu.com");

const tabs = await browser.tabs.list();
await browser.tabs.finalize({
  keep: tabs.map(t => ({ tab: t, status: "deliverable" }))
});

console.log("✅ 右侧栏浏览器已打开并可见！");
