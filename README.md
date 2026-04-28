[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/skivuha-federal-compass-mcp-badge.png)](https://mseep.ai/app/skivuha-federal-compass-mcp)

# federal-compass-mcp

> Your AI compass from private sector to federal career

[![npm version](https://img.shields.io/npm/v/federal-compass-mcp.svg)](https://npmjs.org/package/federal-compass-mcp)
[![CI](https://github.com/skivuha/federal-compass-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/skivuha/federal-compass-mcp/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![MCP](https://img.shields.io/badge/MCP-compatible-blue.svg)](https://modelcontextprotocol.io)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/skivuha/federal-compass-mcp/badge)](https://scorecard.dev/viewer/?uri=github.com/skivuha/federal-compass-mcp)

Federal job descriptions are 5 pages of legal language. GS grades, clearance levels, hiring paths — none of this is explained anywhere. `federal-compass-mcp` connects Claude to the official [USAJobs API](https://developer.usajobs.gov) and turns it into an AI advisor that speaks plain English.

Built for tech professionals transitioning from private sector to federal/government careers.

---

## What it does

- **Searches** federal job openings with optional filters — keyword, location, salary, clearance level
- **Translates** federal job descriptions into plain language — what they actually want, without the jargon
- **Analyzes** your CV against specific job postings and tells you if you qualify
- **Explains** federal concepts — GS grades, pay plans, security clearances, hiring paths
- **Saves** your CV locally so Claude can reference it automatically

---

## Getting started

### 1. Get your free USAJobs API key

Register at [developer.usajobs.gov](https://developer.usajobs.gov/apirequest/index) — takes about 3 minutes. Verify your email and you'll receive an API token.

### 2. Add to your MCP client

**Claude Desktop** (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "federal-compass": {
      "command": "npx",
      "args": ["-y", "federal-compass-mcp@latest"],
      "env": {
        "USAJOBS_API_KEY": "your_api_key",
        "USAJOBS_EMAIL": "your@email.com"
      }
    }
  }
}
```

**VS Code / Cursor / Windsurf** — same config, different config file path. See your client's MCP documentation.

### 3. Try it

```
Find me senior software developer jobs in Raleigh, NC
```

```
What is a GS-13 and how much does it pay?
```

```
Save my CV [attach file]
```

```
Look at this job posting — am I qualified?
```

---

## Tools

| Tool | Description |
|------|-------------|
| `search_jobs` | Search federal job openings. All filters optional — keyword, location, salary, grade, agency, remote |
| `get_job_details` | Get full details for a specific job posting |
| `compare_jobs` | Compare 2-5 job postings side by side |
| `save_cv` | Save your CV locally for automatic use in analysis |
| `get_cv` | Read your saved CV |
| `explain_federal_concept` | Explain GS grades, clearances, hiring paths, pay plans |
| `calculate_salary` | Calculate GS salary with locality pay for any grade, step, and location |
| `find_matching_jobs` | Find jobs matching your CV — extracts skills and searches USAJobs |
| `check_qualification` | Compare your CV against a specific job posting |
| `extract_ksa` | Extract KSA requirements from a job posting, optionally match against your CV |

---

## CV storage

Your CV is stored locally on your machine — never sent to any server:

```
~/.federal-compass/
  cv.json
  config.json
  codelists/     <- cached USAJobs reference data
```

---

## Why federal jobs are confusing (and how this helps)

Coming from private sector, federal job postings feel like a different language:

- **GS-13 Step 1-10** — what grade am I? what does step mean?
- **TS/SCI with polygraph** — do I need this? how long does it take?
- **Competitive vs Excepted Service** — which one can I apply to?
- **HiringPath: fed-transition** — what is this and why does it matter?

`federal-compass-mcp` answers all of these through natural conversation with Claude.

---

## Requirements

- Node.js v20+
- Free [USAJobs API key](https://developer.usajobs.gov/apirequest/index)
- Any MCP-compatible client (Claude Desktop, VS Code, Cursor, etc.)

---

## Contributing

Issues and PRs welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

MIT — see [LICENSE](LICENSE)

---

*Built by [@skivuha](https://github.com/skivuha) — a Senior Frontend Engineer navigating the private-to-federal transition firsthand.*
