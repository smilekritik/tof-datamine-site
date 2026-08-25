const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATAMINE_ROOT = path.join(ROOT, "datamine");

const DATAMINE_SOCIAL_IMAGE = Object.freeze({
  fileName: "datamine-social.png",
  url: "https://tof.smilekritik.beer/datamine/social/datamine-social.png",
  type: "image/png",
  width: 1731,
  height: 909,
  twitterCard: "summary_large_image"
});

const DATAMINE_PUBLIC_PAGES = Object.freeze([
  "index.html",
  "oow/index.html",
  "fce/index.html",
  "seq/index.html",
  "items/index.html",
  "multype/index.html",
  "about/index.html",
  "projects/index.html",
  "contribute/index.html",
  "changelog/index.html",
  "privacy/index.html"
]);

function replaceMetaContent(html, key, value) {
  let matchCount = 0;
  const next = html.replace(/<meta\b[^>]*>/gi, (tag) => {
    const selector = new RegExp(`\\b(?:property|name)=["']${key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`, "i");
    if (!selector.test(tag)) return tag;
    matchCount += 1;
    return tag.replace(/\bcontent=(["'])[^"']*\1/i, `content="${value}"`);
  });

  if (matchCount !== 1) {
    throw new Error(`Expected one ${key} meta tag; found ${matchCount}.`);
  }
  return next;
}

function applySharedSocialMeta(html) {
  const replacements = {
    "og:image": DATAMINE_SOCIAL_IMAGE.url,
    "og:image:secure_url": DATAMINE_SOCIAL_IMAGE.url,
    "og:image:type": DATAMINE_SOCIAL_IMAGE.type,
    "og:image:width": String(DATAMINE_SOCIAL_IMAGE.width),
    "og:image:height": String(DATAMINE_SOCIAL_IMAGE.height),
    "twitter:card": DATAMINE_SOCIAL_IMAGE.twitterCard,
    "twitter:image": DATAMINE_SOCIAL_IMAGE.url
  };

  return Object.entries(replacements).reduce(
    (next, [key, value]) => replaceMetaContent(next, key, value),
    html
  );
}

function syncDatamineSocialMeta() {
  let changed = 0;
  for (const relativePath of DATAMINE_PUBLIC_PAGES) {
    const pagePath = path.join(DATAMINE_ROOT, relativePath);
    const current = fs.readFileSync(pagePath, "utf8");
    const next = applySharedSocialMeta(current);
    if (next === current) continue;
    fs.writeFileSync(pagePath, next, "utf8");
    changed += 1;
  }
  return changed;
}

if (require.main === module) {
  const changed = syncDatamineSocialMeta();
  console.log(`[datamine-social] synchronized ${DATAMINE_PUBLIC_PAGES.length} pages (${changed} changed).`);
}

module.exports = {
  DATAMINE_PUBLIC_PAGES,
  DATAMINE_SOCIAL_IMAGE,
  applySharedSocialMeta,
  syncDatamineSocialMeta
};
