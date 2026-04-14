# federal-compass-mcp — Design Spec

> Your AI compass from private sector to federal career

## Overview

MCP server that helps tech professionals transition from private sector to federal/government careers. Connects any MCP-compatible AI client to the official USAJobs API, translates federal jargon into plain language, and analyzes CVs against job postings.

**Not a wrapper** — an advisor. The server provides structured data that enables any LLM to explain GS grades, compare qualifications, and recommend matching jobs.

---

## Target Audience

Tech professionals from private sector wanting to transition to federal/government:
- Don't understand GS grades (what is GS-13?)
- Don't know which clearance is needed or how long to obtain
- Don't understand hiring paths (Veterans, Schedule A, Direct Hire...)
- See 5 pages of legal text in JDs and give up
- Don't know if they should even apply — qualified or not

---

## USAJobs API

**Base URL:** `https://data.usajobs.gov/api`

### Authentication

Three headers required for search endpoints:
```
Host: data.usajobs.gov
User-Agent: <USAJOBS_EMAIL>
Authorization-Key: <USAJOBS_API_KEY>
```

Codelist endpoints require **no authentication**.

### Key Endpoints

| Endpoint | Auth Required | Description |
|----------|:---:|-------------|
| `GET /api/search` | Yes | Search open job announcements |
| `GET /codelist/occupationalseries` | No | Job categories (2210 = IT) |
| `GET /codelist/securityclearances` | No | Clearance levels |
| `GET /codelist/hiringpaths` | No | Hiring paths |
| `GET /codelist/payplans` | No | Pay plans (GS, SES, GG) |
| `GET /codelist/agencysubelements` | No | Agency list with codes |
| `GET /codelist/whomayapply` | No | Who may apply codes |

Full list of all codelist endpoints (40+) exists but only the 6 above are used.

### Search API Details

- Default: 25 results per request, configurable up to 500
- Max 10,000 results per query
- Multiple values separated by colon: `PayGrade=13:14`
- Response includes `SearchResultCountAll` for total matches

### Codelist Response Format

```json
{
  "CodeList": [{
    "ValidValue": [
      {
        "Code": "2210",
        "Value": "Information Technology Management",
        "LastModified": "2015-04-24T00:00:00",
        "IsDisabled": "No"
      }
    ],
    "id": "OccupationalSeries"
  }],
  "DateGenerated": "2015-04-05T18:55:44"
}
```

### API Key Setup

1. Go to `developer.usajobs.gov/apirequest/index`
2. Fill out form (~3 minutes)
3. Verify email
4. Receive API token by email

---

## Environment Variables

| Variable | Required | Description |
|----------|:---:|-------------|
| `USAJOBS_API_KEY` | Yes | API key from developer.usajobs.gov |
| `USAJOBS_EMAIL` | Yes | Email used when requesting API key |

Validated at server startup. If missing → error message to stderr + exit(1).

---

## Installation

No `npm install`. Users configure their MCP client:

```json
{
  "mcpServers": {
    "federal-compass": {
      "command": "npx",
      "args": ["-y", "federal-compass-mcp@latest"],
      "env": {
        "USAJOBS_API_KEY": "your_key",
        "USAJOBS_EMAIL": "your@email.com"
      }
    }
  }
}
```

Client runs `npx` → downloads package → starts process → communicates via stdio transport.

---

## Tools

### 1. `search_jobs`

Search federal job openings. All parameters optional.

```typescript
search_jobs({
  keyword?: string,            // "software developer", "react"
  location?: string,           // "Raleigh, NC"
  salary_min?: number,         // 80000
  remote?: boolean,            // true
  grade?: string,              // "13" or "13:14" (range)
  agency?: string,             // "Department of Defense" → mapped to code via codelist
  hiring_path?: string,        // "public" | "fed-transition"
  who_may_apply?: string,      // "All" | "Public" → mapped via codelist
  security_clearance?: string, // "Not Required" | "Secret" | "Top Secret" | "TS/SCI"
  results_per_page?: number    // default: 25, max: 500
})
```

**Behavior:**
- Maps human-readable names to API codes via cached codelists
- Multiple values via colon separator
- Returns: list of jobs with title, agency, salary range, location, grade, close date, apply URL
- Includes `total_count` (SearchResultCountAll) and `agencies_in_results` (unique agencies from results)

### 2. `get_job_details`

Get full details for a specific job posting.

```typescript
get_job_details({
  job_id: string  // ControlNumber from search results
})
```

**Behavior:**
- Queries `/api/search` filtering by ControlNumber (exact parameter TBD — needs testing)
- Returns full object: MajorDuties, QualificationSummary, SecurityClearance, HiringPath, TeleworkEligible, RemoteIndicator, ApplyURI, salary range, grade range

### 3. `save_cv`

Save CV text locally.

```typescript
save_cv({
  content: string,    // CV text (client extracts from PDF/DOCX)
  format?: string     // "pdf" | "txt" | "md" — metadata only, default "txt"
})
```

**Behavior:**
- Writes `~/.federal-compass/cv.json`
- Creates directory if not exists
- Overwrites previous CV without confirmation
- File format:
  ```json
  {
    "content": "Senior Frontend Engineer with 8 years...",
    "savedAt": "2026-04-13T14:30:00.000Z",
    "format": "txt"
  }
  ```

### 4. `get_cv`

Read saved CV.

```typescript
get_cv({})  // no parameters
```

**Behavior:**
- Reads `~/.federal-compass/cv.json`
- Returns content + metadata
- If no CV saved → `"No CV saved yet."` (informational, not error)

**Backlog:** Add MCP resource `cv://local` as alternative access method.

### 5. `explain_federal_concept`

Explain federal terms and concepts.

```typescript
explain_federal_concept({
  concept: string  // "GS-13", "TS/SCI", "Schedule A", "Direct Hire Authority"
})
```

**Behavior:**
- Searches built-in glossary (`federal-glossary.ts`) by keyword
- Enriches with codelist data when relevant
- Returns structured explanation
- If not found in glossary → tries codelist data → if nothing, returns `"Concept not found in glossary. The AI assistant may be able to help based on general knowledge."`

### 6. `find_matching_jobs`

Find jobs matching the saved CV.

```typescript
find_matching_jobs({
  results_per_page?: number  // default: 25
})
```

**Behavior:**
- Reads CV from `~/.federal-compass/cv.json`
- If no CV → error: `"No CV found. Please save your CV first using the save_cv tool, then try again."`
- Extracts keywords/skills from CV (rule-based, not AI — regex on sections like "Skills:", "Technologies:")
- Makes 1-3 search queries to USAJobs API with different keyword combinations
- Returns combined list of jobs + which keywords were used for search

### 7. `check_qualification`

Compare CV against a specific job posting.

```typescript
check_qualification({
  job_id: string  // ControlNumber
})
```

**Behavior:**
- Reads CV from `~/.federal-compass/cv.json`
- If no CV → error: `"No CV found. Please save your CV first using the save_cv tool, then try again."`
- Fetches job details via `get_job_details`
- Returns both texts side by side: CV + job requirements (QualificationSummary, MajorDuties, SecurityClearance, grade range)
- Structured as `{ cv, job, key_requirements: [...] }` so any LLM can easily compare
- Does NOT analyze — prepares data for client-side LLM analysis

---

## Project Structure

```
federal-compass-mcp/
  src/
    tools/
      search.ts              ← search_jobs, get_job_details
      cv.ts                  ← save_cv, get_cv
      advisor.ts             ← explain_federal_concept, find_matching_jobs, check_qualification
      tools.ts               ← collects all tools, exports array
    api/
      usajobs-client.ts      ← HTTP client (axios, headers, base URL)
    cache/
      codelist-cache.ts      ← fetch & cache 6 codelists, TTL 30 days
    data/
      federal-glossary.ts    ← built-in glossary (GS tables, clearances, hiring paths)
    index.ts                 ← entry point: MCP server init, stdio transport, tool registration
  tests/
  server.json                ← MCP Registry metadata
  .mcp.json                  ← quick install config
  package.json
  tsconfig.json
  rollup.config.mjs
  README.md
  LICENSE
  CONTRIBUTING.md
  CHANGELOG.md
  .github/
    workflows/
      release-please.yml
```

### Principles
- `src/tools/` — one file per domain, collected in `tools.ts`
- `src/api/` — single HTTP client, all requests go through it
- `src/cache/` — codelist cache with TTL
- `src/data/` — static data (glossary)
- ESM (`"type": "module"`), TypeScript, Zod for schema validation
- Rollup bundling for fast `npx` startup

---

## API Client

**File:** `src/api/usajobs-client.ts`

- Uses **axios** with interceptors for logging
- Logging via **debug** package (`debug("federal-compass:api")`)
  - Silent by default
  - Enable with `DEBUG=federal-compass:*`
  - Writes to stderr (stdout reserved for MCP stdio transport)
- User-facing errors returned as tool response text (visible in any client)
- Debug logs only visible when explicitly enabled
- No retries — if API fails, return clear error message

---

## Codelist Cache

**Location:** `~/.federal-compass/codelists/`

**Cached codelists (6):**
- `occupationalseries.json` — job category name → code mapping
- `securityclearances.json` — clearance level codes
- `hiringpaths.json` — hiring path codes
- `payplans.json` — pay plan codes (GS, SES)
- `agencysubelements.json` — agency name → Organization code
- `whomayapply.json` — who may apply codes

**Cache logic:**
- Lazy loading — fetched on first tool call that needs them, not at startup
- Each file stores: `{ data: [...], lastFetched: "2026-04-13T..." }`
- TTL: **30 days**
- If file exists and `lastFetched` < 30 days → read from cache
- If missing or expired → fetch from API (no auth needed), save
- Filter out `IsDisabled: "Yes"` entries when saving

---

## Federal Glossary

**File:** `src/data/federal-glossary.ts`

Hardcoded reference data, updated manually at release time.

**Contents:**
- GS pay table (2026 OPM data, source TBD at implementation)
- GS grade descriptions and step explanation
- Security clearance levels with descriptions and timelines
- Hiring paths with explanations
- Pay plan types
- Common federal terms (Competitive Service, Excepted Service, Direct Hire Authority, Schedule A, etc.)

**Structure per entry:**
```typescript
{
  title: string,
  description: string,
  // type-specific fields:
  grades?: Record<string, { min: number, max: number }>,
  timeline?: string,
  related?: string[]
}
```

**Search:** keyword-based. `"GS-13"` → finds `"GS"` entry + specific grade 13 data.

---

## CV Storage

**Location:** `~/.federal-compass/cv.json`

- `save_cv` creates directory if not exists, writes JSON file
- `get_cv` reads file, returns content + metadata
- `find_matching_jobs` and `check_qualification` require CV — return clear error if not found: `"No CV found. Please save your CV first using the save_cv tool, then try again."`
- `search_jobs`, `get_job_details`, `explain_federal_concept` work without CV

---

## Error Handling

**Minimal approach — no retries.**

- Missing env variables → stderr error + exit(1) at startup
- API errors (4xx, 5xx, timeout) → clear text message returned as tool response
- Missing CV (for tools that require it) → clear text message with instructions
- Concept not found in glossary → fallback to codelist data, then informational message
- Codelist fetch failure → clear message, tool still tries to work without the codelist if possible

---

## Tech Stack

| Component | Choice | Why |
|-----------|--------|-----|
| Language | TypeScript | Type safety, MCP SDK is TS-first |
| Runtime | Node.js v20+ | LTS, native fetch, ESM |
| MCP SDK | @modelcontextprotocol/sdk | Official SDK |
| HTTP | axios | Interceptors for logging, clear errors |
| Validation | zod | Schema validation for tool params, MCP SDK uses it |
| Logging | debug | Lightweight, silent by default, stderr |
| Build | rollup | Single bundle for fast npx |
| Releases | release-please | Automated releases via GitHub Actions |

---

## Publishing

1. `npm publish` → package on npmjs.com
2. PR to `modelcontextprotocol/registry` → official MCP Registry
3. `server.json` in repo root for registry metadata
4. `.mcp.json` in repo root for quick install

---

## Example Prompts That Should Work

```
Find me senior software developer jobs in Raleigh, NC
What is a GS-13 and how much does it pay?
Save my CV [attach file]
Look at this job posting — am I qualified?
Find jobs where no clearance is needed
Which agencies hire Vue/React developers?
Look at my CV — what federal jobs am I a good fit for?
Explain what TS/SCI means and whether I need it
```

---

## Decisions Log

| Decision | Choice | Reason |
|----------|--------|--------|
| API key storage | env variables only | Standard for MCP servers, simpler and safer |
| `get_job_details` | Separate tool, search by ControlNumber | User may return to a job in new conversation |
| `save_cv` format | JSON with content + metadata | Richer than plain text, no PDF parsing needed |
| `get_cv` | Tool only, not MCP resource | Not all clients support resources. Resource in backlog |
| `explain_federal_concept` | Tool + built-in glossary | Core value prop. Claude alone may have stale data |
| Glossary GS pay data | Hardcoded, updated at release | Changes once/year by 2-4%, OPM source |
| `translate_job_posting` | Removed | Any LLM can do this with data from get_job_details |
| `am_i_qualified` | Replaced by `check_qualification` | Prepares data for any LLM, not just Claude |
| PDF parsing | Removed | Client (Claude Desktop etc.) extracts text |
| Codelists as MCP resources | Removed | Used internally by tools, not exposed |
| Codelists cached | 6 of 40+ | Only ones used by tools |
| Codelist TTL | 30 days | Reference data changes very rarely |
| Error handling | Minimal, no retries | USAJobs API is stable, retries are overkill for MVP |
| HTTP client | axios | Interceptors for debug logging |
| Logging | debug package on stderr | Silent by default, stdout reserved for MCP |
| Transport | stdio | Standard for npx-based MCP servers |
| Build | Rollup | Fast npx startup with single bundle |
