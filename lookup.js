import fs from "fs";
import dotenv from "dotenv";
dotenv.config();

const GODADDY_API_KEY = process.env.GODADDY_API_KEY;
const GODADDY_API_SECRET = process.env.GODADDY_API_SECRET;

if (!GODADDY_API_KEY || !GODADDY_API_SECRET) {
  console.error("❌ Missing GoDaddy API credentials in .env file");
  process.exit(1);
}

const numberOfLetters = parseInt(process.argv[2]);
const tldArg = process.argv[3] || ".com";
const tlds = tldArg
  .split(",")
  .map((t) => t.trim())
  .filter(Boolean);
const BATCH_SIZE = 50;
const DELAY = 2000;

if (!numberOfLetters || numberOfLetters < 1) {
  console.error(
    "❌ Invalid number of letters. Example: node lookup.js 3 .com,.io",
  );
  process.exit(1);
}

console.log(
  `🧩 Config: ${numberOfLetters}-letter combos | TLDs: ${tlds.join(", ")}`,
);

function generateCombos(length) {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const results = [];
  const recurse = (prefix, depth) => {
    if (depth === length) {
      results.push(prefix);
      return;
    }
    for (const char of letters) recurse(prefix + char, depth + 1);
  };
  recurse("", 0);
  return results;
}

const combos = generateCombos(numberOfLetters);
console.log(`🧮 ${combos.length.toLocaleString()} possible combinations`);

const available = {};
tlds.forEach((tld) => (available[tld] = []));

async function checkDomainsBatch(domains) {
  const url = `https://api.ote-godaddy.com/v1/domains/available?checkType=FAST`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `sso-key ${GODADDY_API_KEY}:${GODADDY_API_SECRET}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(domains),
  });

  if (!response.ok) {
    console.error("⚠️ API Error:", await response.text());
    return [];
  }

  const data = await response.json();
  return data.domains || [];
}

for (const tld of tlds) {
  console.log(`\n🔍 Checking ${tld} domains...`);
  for (let i = 0; i < combos.length; i += BATCH_SIZE) {
    const batch = combos
      .slice(i, i + BATCH_SIZE)
      .map((combo) => `${combo}${tld}`);

    const results = await checkDomainsBatch(batch);

    for (const res of results) {
      if (res.available) {
        available[tld].push(res.domain);
        console.log(`🟢 Available: ${res.domain}`);
      } else {
        console.log(`🔴 Taken: ${res.domain}`);
      }
    }

    console.log(`⏳ Processed ${i + batch.length}/${combos.length} for ${tld}`);
    await new Promise((r) => setTimeout(r, DELAY));
  }
}

fs.writeFileSync("available.json", JSON.stringify(available, null, 2));
console.log("✅ Done! Results saved to available.json");
