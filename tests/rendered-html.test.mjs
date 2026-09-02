import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${path}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the LifeLens product experience", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>LifeLens — Life, understood in motion<\/title>/i);
  assert.match(html, /Run the interactive day/);
  assert.match(html, /Analyze with live AI/);
  assert.match(html, /Vuzix M400/);
  assert.match(html, /raw media 0 B/i);
  assert.match(html, /Every action is yours/);
  assert.match(html, /LIVE JUDGE DEMO/);
  assert.match(html, /Strands \+ Bedrock/);
  assert.match(html, /Choose Lunch/);
  assert.match(html, /og-v2\.png/);
  assert.match(html, /role="status"/);
  assert.doesNotMatch(html, /Your site is taking shape|Building your site/);
});

test("keeps model calls behind the server-side minimized-event proxy", async () => {
  const [page, analyzeRoute, actionRoute, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/api/analyze/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/action/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /fetch\("\/api\/analyze"/);
  assert.doesNotMatch(page, /AWS_ACCESS_KEY|AWS_SECRET|bedrock-runtime/);
  assert.match(analyzeRoute, /LIFELENS_AGENT_API_URL/);
  assert.match(analyzeRoute, /raw_media_retained:\s*false/);
  assert.match(actionRoute, /confirmed/);
  assert.match(layout, /summary_large_image/);
});
