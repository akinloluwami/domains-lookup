# Domains Lookup

A simple Node.js tool to check domain availability using the GoDaddy API. Perfect for finding available short domain combinations.

## Setup

1. **Install dependencies:**

   ```bash
   npm install
   ```

2. **Configure API credentials:**

   Create a `.env` file in the project root:

   ```env
   GODADDY_API_KEY=your_api_key_here
   GODADDY_API_SECRET=your_api_secret_here
   ```

   Get your API credentials from [GoDaddy Developer Portal](https://developer.godaddy.com/keys).

## Usage

```bash
node lookup.js <number_of_letters> <tlds> [--to <max_price>] [-v]
```

### Parameters

- `<number_of_letters>` - Length of domain combinations to generate (e.g., 3 for "abc", "xyz")
- `<tlds>` - (Optional) Comma-separated list of TLDs to check (default: `.com`)
- `--to <max_price>` - (Optional) Maximum price to include in results (default: no limit)
- `-v` - (Optional) Verbose mode to show more detailed output

### Examples

**Check 3-letter .com domains:**

```bash
node lookup.js 3
```

**Check 3-letter domains across multiple TLDs:**

```bash
node lookup.js 3 .com,.io,.dev
```

**Check 4-letter .app domains:**

```bash
node lookup.js 4 .app
```

**Check 3-letter .com domains with a maximum price of $100:**

```bash
node lookup.js 3 .com --to 100
```

**Check 3-letter .com domains with verbose mode:**

```bash
node lookup.js 3 .com -v
```

## Output

- Real-time console output showing availability status
- Results saved to `available.json` grouped by TLD

```
{
  ".com": ["abcd.com", "efgh.com"],
  ".io": ["abcd.io"]
}
```

### Example Outputs

```
🧩 Config: 3-letter combos | TLDs: .com, .io
🧮 17,576 possible combinations
🔍 Checking .com domains...
🟢 Available: xyz.com
🔴 Taken: abc.com
✅ Done! Results saved to available.json
```

## Rate Limiting

The tool includes built-in delays (2 seconds) between batch requests to respect API rate limits. Each batch processes 50 domains at a time.

## Notes

- Currently configured for GoDaddy's OTE (test) environment
- For production use, change the API URL to `https://api.godaddy.com/v1/domains/available`
