import WebSocket from "ws";

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
    // 1. Navigate to a known GitHub repo page
    await send("Page.enable");
    await send("Runtime.enable");
    
    // Navigate to the repo page
    await send("Page.navigate", { url: "https://github.com/RC1844/FastGithub" });
    await new Promise(r => setTimeout(r, 3000));

    // 2. Inject the script content
    const fs = await import("fs");
    const scriptContent = fs.readFileSync("/workspace/FastGithub.js", "utf8");
    
    // Strip the UserScript header for injection
    const code = scriptContent.replace(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==/, "");
    
    const result = await send("Runtime.evaluate", {
      expression: code,
      returnByValue: true
    });
    if (result.exceptionDetails) {
      console.log("Injection exception:", JSON.stringify(result.exceptionDetails, null, 2));
    } else {
      console.log("Script injected OK");
    }

    // Wait a moment for scan() to run
    await new Promise(r => setTimeout(r, 1000));

    // 3. Check menu li count
    const liCount = await send("Runtime.evaluate", {
      expression: "document.querySelectorAll('li#fg-menu-li').length",
      returnByValue: true
    });
    console.log("fg-menu-li count:", liCount.result.value);

    // 4. Check if menu is visible
    const menuVisible = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const li = document.querySelector('li#fg-menu-li');
          if (!li) return 'not found';
          const details = li.querySelector('details#fg-details');
          if (!details) return 'details not found';
          const summary = details.querySelector('summary');
          return JSON.stringify({
            detailsOpen: details.open,
            summaryText: summary ? summary.textContent.trim().slice(0, 30) : null,
            summaryClasses: summary ? summary.className : null,
            liParent: li.parentElement ? li.parentElement.tagName + '.' + li.parentElement.className.slice(0, 50) : null
          });
        })()
      `,
      returnByValue: true
    });
    console.log("Menu state:", menuVisible.result.value);

    // 5. Open the menu and check panel structure
    const openResult = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const details = document.querySelector('details#fg-details');
          if (!details) return 'no details';
          details.open = true;
          return 'opened';
        })()
      `,
      returnByValue: true
    });
    console.log("Open menu:", openResult.result.value);
    await new Promise(r => setTimeout(r, 500));

    // Check panel elements
    const panelInfo = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const panel = document.querySelector('details#fg-details .Box');
          if (!panel) return 'no panel';
          const cloneRows = panel.querySelectorAll('.Box-row');
          const formSelects = panel.querySelectorAll('select.form-select');
          const tabs = panel.querySelectorAll('.UnderlineNav-octicon-btn');
          return JSON.stringify({
            cloneRowCount: cloneRows.length,
            formSelectCount: formSelects.length,
            tabCount: tabs.length,
            firstCloneRowHTML: cloneRows[0] ? cloneRows[0].outerHTML.slice(0, 200) : null,
            formSelectHTML: formSelects[0] ? formSelects[0].outerHTML.slice(0, 200) : null
          });
        })()
      `,
      returnByValue: true
    });
    console.log("Panel info:", panelInfo.result.value);

    // 6. Check if GitHub native CSS classes are applied (getComputedStyle)
    const styleCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const btn = document.querySelector('details#fg-details .btn');
          if (!btn) return 'no .btn found';
          const cs = getComputedStyle(btn);
          const select = document.querySelector('details#fg-details select.form-select');
          const selCs = select ? getComputedStyle(select) : null;
          const cloneInput = document.querySelector('details#fg-details .Box-row input');
          const inputCs = cloneInput ? getComputedStyle(cloneInput) : null;
          return JSON.stringify({
            btn: {
              background: cs.backgroundColor,
              border: cs.border,
              borderRadius: cs.borderRadius,
              padding: cs.padding
            },
            select: selCs ? {
              background: selCs.backgroundColor,
              border: selCs.border,
              borderRadius: selCs.borderRadius,
              height: selCs.height
            } : null,
            input: inputCs ? {
              border: inputCs.border,
              borderRadius: inputCs.borderRadius,
              fontSize: inputCs.fontSize,
              fontFamily: inputCs.fontFamily
            } : null
          });
        })()
      `,
      returnByValue: true
    });
    console.log("Style check:", styleCheck.result.value);

    // 7. Screenshot
    const screenshot = await send("Page.captureScreenshot", {
      format: "png",
      clip: { x: 0, y: 0, width: 1200, height: 600, scale: 1 }
    });
    const { writeFileSync } = await import("fs");
    writeFileSync("/workspace/cdp_screenshot_v3.png", Buffer.from(screenshot.data, "base64"));
    console.log("Screenshot saved to /workspace/cdp_screenshot_v3.png");

    // 8. Check augmentCodePanel / injectRawButtons results
    const augCheck = await send("Runtime.evaluate", {
      expression: `
        (() => {
          const rawSel = document.querySelectorAll('a[data-testid="raw-button"] ~ select, a[data-testid="raw-button"] + div select');
          const zipLinks = document.querySelectorAll('a[href*="/archive/refs/"][href$=".zip"]');
          const zipSels = document.querySelectorAll('details .form-select, .Box .form-select');
          return JSON.stringify({
            rawSels: rawSel.length,
            zipLinks: zipLinks.length,
            zipSels: zipSels.length
          });
        })()
      `,
      returnByValue: true
    });
    console.log("Augment check:", augCheck.result.value);

    ws.close();
    process.exit(0);
  } catch (e) {
    console.error("Error:", e.message);
    ws.close();
    process.exit(1);
  }
});
