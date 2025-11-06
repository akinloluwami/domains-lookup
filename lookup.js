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

let maxPrice = null;
const toIndex = process.argv.indexOf("--to");
if (toIndex !== -1 && process.argv[toIndex + 1]) {
  maxPrice = parseFloat(process.argv[toIndex + 1]);
  if (isNaN(maxPrice) || maxPrice < 0) {
    console.error("❌ Invalid --to value. Must be a positive number.");
    process.exit(1);
  }
}

const verbose = process.argv.includes("-v") || process.argv.includes("--verbose");

const BATCH_SIZE = 50;
const DELAY = 2000;

if (!numberOfLetters || numberOfLetters < 1) {
  console.error(
    "❌ Invalid number of letters. Example: node lookup.js 3 .com,.io [--to 400] [-v]",
  );
  process.exit(1);
}

console.log(
  `🧩 Config: ${numberOfLetters}-letter combos | TLDs: ${tlds.join(", ")}${maxPrice !== null ? ` | Max price: $${maxPrice}` : ""}${verbose ? " | Verbose mode: ON" : ""}`,
);

function* generateCombos(length) {
  const letters = "abcdefghijklmnopqrstuvwxyz";
  const recurse = function* (prefix, depth) {
    if (depth === length) {
      yield prefix;
      return;
    }
    for (const char of letters) {
      yield* recurse(prefix + char, depth + 1);
    }
  };
  yield* recurse("", 0);
}

const totalCombinations = Math.pow(26, numberOfLetters);
console.log(`🧮 ${totalCombinations.toLocaleString()} possible combinations`);

const available = {};
tlds.forEach((tld) => (available[tld] = []));

function saveResults() {
  fs.writeFileSync("available.json", JSON.stringify(available, null, 2));
  console.log("\n💾 Results saved to available.json");
}

process.on("SIGINT", () => {
  console.log("\n\n⚠️  Interrupted! Saving current results...");
  saveResults();
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n\n⚠️  Terminated! Saving current results...");
  saveResults();
  process.exit(0);
});

async function checkDomainsBatch(domains) {
  const url = `https://api.ote-godaddy.com/v1/domains/available?checkType=FULL`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `sso-key ${GODADDY_API_KEY}:${GODADDY_API_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(domains),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("⚠️ API Error:", errorText);
    if (verbose) {
      console.log("📋 Full API Error Response:", JSON.stringify({ status: response.status, body: errorText }, null, 2));
    }
    return [];
  }

  const data = await response.json();
  
  if (verbose) {
    console.log("📋 Full API Response:", JSON.stringify(data, null, 2));
  }
  
  return data.domains || [];
}

function processDomainResult(res, tld) {
  if (verbose) {
    console.log("📋 Domain Response:", JSON.stringify(res, null, 2));
  }

  const isAvailable = res.available === true || res.available === "true" || res.available === "available";

  if (isAvailable) {
    let price = null;

    if (res.price) {
      price = res.price > 1000 ? res.price / 100 : res.price;
    } else if (res.priceInfo && res.priceInfo.price) {
      price = res.priceInfo.price > 1000 ? res.priceInfo.price / 100 : res.priceInfo.price;
    } else if (res.period && res.period.price) {
      price = res.period.price > 1000 ? res.period.price / 100 : res.period.price;
    } else if (res.pricing && res.pricing.price) {
      price = res.pricing.price > 1000 ? res.pricing.price / 100 : res.pricing.price;
    }

    const priceDisplay = price !== null ? ` $${price.toFixed(2)}` : "";
    const shouldInclude = maxPrice === null || price === null || price <= maxPrice;

    if (shouldInclude) {
      const domainInfo = { domain: res.domain };
      if (price !== null) {
        domainInfo.price = price;
      }
      available[tld].push(domainInfo);
      if (!verbose) {
        console.log(`🟢 Available: ${res.domain}${priceDisplay}`);
      }
    } else {
      if (!verbose) {
        console.log(`🟡 Available but too expensive: ${res.domain}${priceDisplay} (max: $${maxPrice})`);
      }
    }
  } else {
    if (!verbose) {
      console.log(`🔴 Taken: ${res.domain}`);
    }
  }
}

for (const tld of tlds) {
  console.log(`\n🔍 Checking ${tld} domains...`);
  const comboGenerator = generateCombos(numberOfLetters);
  let processedCount = 0;
  let batch = [];

  for (const combo of comboGenerator) {
    batch.push(`${combo}${tld}`);
    
    if (batch.length === BATCH_SIZE) {
      const results = await checkDomainsBatch(batch);

      if (verbose && results.length > 0) {
        console.log(`📊 Received ${results.length} results for this batch`);
      }

      for (const res of results) {
        processDomainResult(res, tld);
      }

      processedCount += batch.length;
      console.log(`⏳ Processed ${processedCount.toLocaleString()}/${totalCombinations.toLocaleString()} for ${tld}`);
      batch = [];
      await new Promise((r) => setTimeout(r, DELAY));
    }
  }

  if (batch.length > 0) {
    const results = await checkDomainsBatch(batch);

    if (verbose && results.length > 0) {
      console.log(`📊 Received ${results.length} results for this batch`);
    }

    for (const res of results) {
      processDomainResult(res, tld);
    }

    processedCount += batch.length;
    console.log(`⏳ Processed ${processedCount.toLocaleString()}/${totalCombinations.toLocaleString()} for ${tld}`);
  }
}

saveResults();
console.log("✅ Done!");
