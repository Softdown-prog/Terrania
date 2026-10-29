import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
const output = resolve("dist");
const pages = [
  "index.html",
  "404.html",
  ...[
    "mundo",
    "guia",
    "novidades",
    "comunidade",
    "privacidade",
    "termos",
    "jogar",
  ].map((page) => page + "/index.html"),
];
for (const page of pages) {
  const path = resolve(output, page);
  assert.ok(existsSync(path), "Missing built page: " + page);
  const html = readFileSync(path, "utf8");
  assert.ok(!html.includes('src="/src/'), "Uncompiled source entry in " + page);
  for (const match of html.matchAll(/\b(?:href|src|action)="([^\"]+)"/g)) {
    const link = match[1];
    if (/^(?:https?:|mailto:|data:)/.test(link)) continue;
    const [route, fragment] = link.split("#");
    const pathname = route.split("?")[0];
    let target = !pathname
      ? path
      : pathname.startsWith("/")
        ? resolve(output, "." + pathname)
        : resolve(dirname(path), pathname);
    if (pathname.endsWith("/")) target = resolve(target, "index.html");
    assert.ok(existsSync(target), "Broken local link in " + page + ": " + link);
    if (fragment && target.endsWith(".html")) {
      const markup = readFileSync(target, "utf8");
      assert.ok(
        markup.includes('id="' + fragment + '"'),
        "Missing anchor in " + page + ": " + link,
      );
    }
  }
}
assert.ok(
  !readFileSync(resolve(output, "index.html"), "utf8").includes('id="game"'),
);
assert.ok(
  readFileSync(resolve(output, "jogar/index.html"), "utf8").includes(
    'id="game"',
  ),
);
console.log(
  "Verified 9 built pages, internal links, assets and separate game entry.",
);
