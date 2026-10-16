import WebSocket from "ws";
import { writeFileSync } from "fs";

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
    // Open menu and scroll to show ZIP/raw
    await send("Runtime.evaluate", {
      expression: `
        (() => {
          const d = document.querySelector('details#fg-details');
          if (d) { d.open = true; }
          // Scroll to the form-select area
          const sel = document.querySelector('details#fg-details select.form-select');
          if (sel) sel.scrollIntoView({ block: 'center' });
        })()
      `,
      returnByValue: true
    });
    await new Promise(r => setTimeout(r, 600));
    const shot = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 350, width: 500, height: 450, scale: 1 } });
    writeFileSync("/workspace/cdp_menu_bottom.png", Buffer.from(shot.data, "base64"));
    console.log("Screenshot saved");
    ws.close();
    process.exit(0);
  } catch (e) { console.error(e.message); process.exit(1); }
});
