import WebSocket from "ws";
import { readFileSync, writeFileSync } from "fs";

const wsUrl = "ws://127.0.0.1:9222/devtools/page/A637191386F65F1006A37455A08F5434";
const ws = new WebSocket(wsUrl);
let id = 0;
function send(method, params = {}) {
  return new Promise((resolve, reject) => {
    const _id = ++id;
    ws.send(JSON.stringify({ id: _id, method, params }));
    const timer = setTimeout(() => reject(new Error("Timeout: " + method)), 10000);
    const onMsg = (raw) => {
      const msg = JSON.parse(raw);
      if (msg.id === _id) {
        clearTimeout(timer);
        ws.removeListener("message", onMsg);
        if (msg.error) reject(new Error(method + ": " + JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    };
    ws.on("message", onMsg);
  });
}
ws.on("open", async () => {
  try {
    await send("Page.enable");
    await send("Runtime.enable");
    // Open the menu
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const d = document.querySelector('details#fg-details');
          if (d) d.open = true;
        })()
      `,
      returnByValue: true
    });
    await new Promise(r => setTimeout(r, 800));
    // Screenshot the area around the menu
    const shot = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 200, width: 600, height: 500, scale: 1 } });
    writeFileSync("/workspace/cdp_menu_expanded.png", Buffer.from(shot.data, "base64"));
    console.log("Screenshot saved");
    ws.close();
    process.exit(0);
  } catch (e) { console.error(e.message); process.exit(1); }
});
