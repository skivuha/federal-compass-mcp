# federal-compass-mcp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an MCP server that connects any AI client to the USAJobs API, enabling federal job search, CV analysis, and federal career guidance for private-sector tech professionals.

**Architecture:** Stdio-based MCP server with 7 tools. USAJobs API client with axios + debug logging. Codelist cache with 30-day TTL stored in `~/.federal-compass/`. Built-in federal glossary for concept explanations. CV stored as JSON locally.

**Tech Stack:** TypeScript, Node.js v20+, @modelcontextprotocol/sdk, axios, debug, zod, vitest, rollup

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/index.ts` | MCP server init, env validation, stdio transport, tool registration |
| `src/logger.ts` | Debug logger factory |
| `src/api/usajobs-client.ts` | Axios HTTP client for USAJobs API |
| `src/cache/codelist-cache.ts` | Fetch, cache, read 6 codelists with 30-day TTL |
| `src/data/federal-glossary.ts` | Static glossary: GS tables, clearances, hiring paths |
| `src/tools/search.ts` | `search_jobs` and `get_job_details` tool handlers |
| `src/tools/cv.ts` | `save_cv` and `get_cv` tool handlers |
| `src/tools/advisor.ts` | `explain_federal_concept`, `find_matching_jobs`, `check_qualification` tool handlers |
| `src/tools/tools.ts` | Collects and exports all tool definitions |
| `tests/api/usajobs-client.test.ts` | API client tests |
| `tests/cache/codelist-cache.test.ts` | Codelist cache tests |
| `tests/data/federal-glossary.test.ts` | Glossary lookup tests |
| `tests/tools/search.test.ts` | Search tool tests |
| `tests/tools/cv.test.ts` | CV tool tests |
| `tests/tools/advisor.test.ts` | Advisor tool tests |
| `rollup.config.mjs` | Bundle config for single-file output |
| `server.json` | MCP Registry metadata |
| `.mcp.json` | Quick install config |

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vitest.config.ts`
- Create: `.npmrc`
- Create: `.nvmrc`

- [ ] **Step 1: Create package.json**

```json
{
  "name": "federal-compass-mcp",
  "version": "0.1.0",
  "description": "Your AI compass from private sector to federal career — MCP server for USAJobs API",
  "type": "module",
  "bin": {
    "federal-compass-mcp": "./build/src/index.js"
  },
  "main": "./build/src/index.js",
  "scripts": {
    "build": "tsc",
    "start": "npm run build && node build/src/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "typecheck": "tsc --noEmit",
    "bundle": "npm run build && rollup -c rollup.config.mjs",
    "clean": "rm -rf build"
  },
  "files": [
    "build/src",
    "LICENSE"
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/skivuha/federal-compass-mcp"
  },
  "author": "Igor Danylov",
  "license": "MIT",
  "engines": {
    "node": ">=20"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.12.0",
    "axios": "^1.7.0",
    "debug": "^4.4.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@rollup/plugin-commonjs": "^28.0.0",
    "@rollup/plugin-json": "^6.1.0",
    "@rollup/plugin-node-resolve": "^16.0.0",
    "@types/debug": "^4.1.0",
    "@types/node": "^22.0.0",
    "rollup": "^4.30.0",
    "typescript": "^5.7.0",
    "vitest": "^3.0.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "./build",
    "rootDir": ".",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*.ts"],
  "exclude": ["node_modules", "build", "tests"]
}
```

- [ ] **Step 3: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      include: ['src/**/*.ts'],
      exclude: ['src/index.ts'],
    },
  },
});
```

- [ ] **Step 4: Create .nvmrc and .npmrc**

`.nvmrc`:
```
20
```

`.npmrc`:
```
engine-strict=true
```

- [ ] **Step 5: Install dependencies**

Run: `npm install`
Expected: `node_modules/` created, `package-lock.json` generated, no errors.

---

### Task 2: Logger

**Files:**
- Create: `src/logger.ts`

- [ ] **Step 1: Create logger module**

```typescript
import createDebug from 'debug';

const NAMESPACE = 'federal-compass';

export function createLogger(scope: string): createDebug.Debugger {
  return createDebug(`${NAMESPACE}:${scope}`);
}
```

No tests needed — thin wrapper over `debug` package.

---

### Task 3: USAJobs API Client

**Files:**
- Create: `src/api/usajobs-client.ts`
- Create: `tests/api/usajobs-client.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';

vi.mock('axios', () => {
  const mockAxiosInstance = {
    get: vi.fn(),
    interceptors: {
      response: { use: vi.fn() },
    },
  };
  return {
    default: {
      create: vi.fn(() => mockAxiosInstance),
      get: vi.fn(),
    },
  };
});

describe('usajobs-client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createApiClient', () => {
    it('creates axios instance with correct headers', async () => {
      const { createApiClient } = await import('../src/api/usajobs-client.js');
      createApiClient('test-key', 'test@email.com');

      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: 'https://data.usajobs.gov/api',
          headers: {
            Host: 'data.usajobs.gov',
            'User-Agent': 'test@email.com',
            'Authorization-Key': 'test-key',
          },
        }),
      );
    });
  });

  describe('searchJobs', () => {
    it('calls /search with params and returns SearchResult', async () => {
      const { createApiClient, searchJobs } = await import(
        '../src/api/usajobs-client.js'
      );
      const client = createApiClient('key', 'email');

      const mockResponse = {
        data: {
          SearchResult: {
            SearchResultCount: 2,
            SearchResultCountAll: 50,
            SearchResultItems: [{ MatchedObjectId: '123' }],
          },
        },
      };
      vi.mocked(client.get).mockResolvedValueOnce(mockResponse);

      const result = await searchJobs(client, { Keyword: 'react' });

      expect(client.get).toHaveBeenCalledWith('/search', {
        params: { Keyword: 'react' },
      });
      expect(result.SearchResultCountAll).toBe(50);
    });
  });

  describe('fetchCodelist', () => {
    it('calls codelist endpoint without auth', async () => {
      const { fetchCodelist } = await import(
        '../src/api/usajobs-client.js'
      );

      const mockResponse = {
        data: {
          CodeList: [
            {
              ValidValue: [
                { Code: '2210', Value: 'IT Management', IsDisabled: 'No' },
              ],
            },
          ],
        },
      };
      vi.mocked(axios.get).mockResolvedValueOnce(mockResponse);

      const result = await fetchCodelist('occupationalseries');

      expect(axios.get).toHaveBeenCalledWith(
        'https://data.usajobs.gov/api/codelist/occupationalseries',
      );
      expect(result.CodeList[0].ValidValue[0].Code).toBe('2210');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/api/usajobs-client.test.ts`
Expected: FAIL — module `../src/api/usajobs-client.js` not found.

- [ ] **Step 3: Implement API client**

```typescript
import axios, { type AxiosInstance } from 'axios';
import { createLogger } from '../logger.js';

const log = createLogger('api');

const BASE_URL = 'https://data.usajobs.gov/api';

export interface SearchParams {
  Keyword?: string;
  LocationName?: string;
  RemunerationMinimumAmount?: number;
  RemoteIndicator?: string;
  PayGrade?: string;
  Organization?: string;
  HiringPath?: string;
  WhoMayApply?: string;
  SecurityClearance?: string;
  ResultsPerPage?: number;
  Page?: number;
}

export interface SearchResultItem {
  MatchedObjectId: string;
  MatchedObjectDescriptor: {
    PositionTitle: string;
    OrganizationName: string;
    DepartmentName: string;
    PositionLocationDisplay: string;
    PositionRemuneration: Array<{
      MinimumRange: string;
      MaximumRange: string;
      RateIntervalCode: string;
    }>;
    ApplicationCloseDate: string;
    PositionURI: string;
    ApplyURI: string[];
    JobGrade: Array<{ Code: string }>;
    QualificationSummary: string;
    UserArea: {
      Details: {
        LowGrade: string;
        HighGrade: string;
        JobSummary: string;
        MajorDuties: string[];
        HiringPath: string[];
        TeleworkEligible: boolean;
        RemoteIndicator: boolean;
        SecurityClearance: string;
      };
    };
  };
}

export interface SearchResult {
  SearchResultCount: number;
  SearchResultCountAll: number;
  SearchResultItems: SearchResultItem[];
}

export interface CodelistItem {
  Code: string;
  Value: string;
  LastModified: string;
  IsDisabled: string;
}

export interface CodelistResult {
  CodeList: Array<{
    ValidValue: CodelistItem[];
    id: string;
  }>;
  DateGenerated: string;
}

export function createApiClient(
  apiKey: string,
  email: string,
): AxiosInstance {
  const client = axios.create({
    baseURL: BASE_URL,
    headers: {
      Host: 'data.usajobs.gov',
      'User-Agent': email,
      'Authorization-Key': apiKey,
    },
  });

  client.interceptors.response.use(
    (response) => {
      log(
        '%s %s → %d',
        response.config.method?.toUpperCase(),
        response.config.url,
        response.status,
      );
      return response;
    },
    (error) => {
      log(
        'ERROR %s %s → %s',
        error.config?.method?.toUpperCase(),
        error.config?.url,
        error.message,
      );
      return Promise.reject(error);
    },
  );

  return client;
}

export async function searchJobs(
  client: AxiosInstance,
  params: SearchParams,
): Promise<SearchResult> {
  const response = await client.get('/search', { params });
  return response.data.SearchResult;
}

export async function fetchCodelist(
  name: string,
): Promise<CodelistResult> {
  const response = await axios.get(`${BASE_URL}/codelist/${name}`);
  return response.data;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/api/usajobs-client.test.ts`
Expected: All 3 tests PASS.

---

### Task 4: Codelist Cache

**Files:**
- Create: `src/cache/codelist-cache.ts`
- Create: `tests/cache/codelist-cache.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

vi.mock('node:fs/promises');
vi.mock('../src/api/usajobs-client.js', () => ({
  fetchCodelist: vi.fn(),
}));

const CACHE_DIR = path.join(os.homedir(), '.federal-compass', 'codelists');
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

describe('codelist-cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('fetches from API and caches when no local file exists', async () => {
    const { fetchCodelist } = await import('../src/api/usajobs-client.js');
    const { getCodelist } = await import('../src/cache/codelist-cache.js');

    vi.mocked(fs.readFile).mockRejectedValueOnce(
      new Error('ENOENT'),
    );
    vi.mocked(fs.mkdir).mockResolvedValueOnce(undefined);
    vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined);
    vi.mocked(fetchCodelist).mockResolvedValueOnce({
      CodeList: [
        {
          ValidValue: [
            { Code: '2210', Value: 'IT Management', LastModified: '', IsDisabled: 'No' },
            { Code: '9999', Value: 'Disabled', LastModified: '', IsDisabled: 'Yes' },
          ],
          id: 'OccupationalSeries',
        },
      ],
      DateGenerated: '',
    });

    const result = await getCodelist('occupationalseries');

    expect(fetchCodelist).toHaveBeenCalledWith('occupationalseries');
    expect(result).toHaveLength(1);
    expect(result[0].Code).toBe('2210');
  });

  it('reads from cache when file exists and TTL not expired', async () => {
    const { fetchCodelist } = await import('../src/api/usajobs-client.js');
    const { getCodelist } = await import('../src/cache/codelist-cache.js');

    const cached = {
      data: [{ Code: '2210', Value: 'IT Management', LastModified: '', IsDisabled: 'No' }],
      lastFetched: new Date().toISOString(),
    };
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(cached));

    const result = await getCodelist('occupationalseries');

    expect(fetchCodelist).not.toHaveBeenCalled();
    expect(result[0].Code).toBe('2210');
  });

  it('refetches when TTL is expired', async () => {
    const { fetchCodelist } = await import('../src/api/usajobs-client.js');
    const { getCodelist } = await import('../src/cache/codelist-cache.js');

    const expired = {
      data: [{ Code: 'OLD', Value: 'Old', LastModified: '', IsDisabled: 'No' }],
      lastFetched: new Date(Date.now() - TTL_MS - 1000).toISOString(),
    };
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(expired));
    vi.mocked(fs.mkdir).mockResolvedValueOnce(undefined);
    vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined);
    vi.mocked(fetchCodelist).mockResolvedValueOnce({
      CodeList: [
        {
          ValidValue: [
            { Code: 'NEW', Value: 'New', LastModified: '', IsDisabled: 'No' },
          ],
          id: 'Test',
        },
      ],
      DateGenerated: '',
    });

    const result = await getCodelist('occupationalseries');

    expect(fetchCodelist).toHaveBeenCalled();
    expect(result[0].Code).toBe('NEW');
  });

  it('resolves code from human-readable name', async () => {
    const { getCodelist, resolveCode } = await import(
      '../src/cache/codelist-cache.js'
    );

    const cached = {
      data: [
        { Code: 'LP00', Value: 'Government Publishing Office', LastModified: '', IsDisabled: 'No' },
        { Code: 'DD00', Value: 'Department of Defense', LastModified: '', IsDisabled: 'No' },
      ],
      lastFetched: new Date().toISOString(),
    };
    vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(cached));

    const code = await resolveCode('agencysubelements', 'Department of Defense');

    expect(code).toBe('DD00');
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/cache/codelist-cache.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement codelist cache**

```typescript
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { fetchCodelist, type CodelistItem } from '../api/usajobs-client.js';
import { createLogger } from '../logger.js';

const log = createLogger('cache');

const CACHE_DIR = path.join(os.homedir(), '.federal-compass', 'codelists');
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CachedCodelist {
  data: CodelistItem[];
  lastFetched: string;
}

export async function getCodelist(name: string): Promise<CodelistItem[]> {
  const filePath = path.join(CACHE_DIR, `${name}.json`);

  // Try reading cache
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const cached: CachedCodelist = JSON.parse(raw);
    const age = Date.now() - new Date(cached.lastFetched).getTime();

    if (age < TTL_MS) {
      log('cache hit for %s (age: %dd)', name, Math.floor(age / 86400000));
      return cached.data;
    }
    log('cache expired for %s', name);
  } catch {
    log('no cache for %s, fetching', name);
  }

  // Fetch from API
  const response = await fetchCodelist(name);
  const items = response.CodeList[0]?.ValidValue ?? [];
  const filtered = items.filter((item) => item.IsDisabled !== 'Yes');

  // Save to cache
  const cached: CachedCodelist = {
    data: filtered,
    lastFetched: new Date().toISOString(),
  };

  await fs.mkdir(CACHE_DIR, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(cached, null, 2));
  log('cached %d items for %s', filtered.length, name);

  return filtered;
}

export async function resolveCode(
  codelistName: string,
  searchValue: string,
): Promise<string | undefined> {
  const items = await getCodelist(codelistName);
  const lower = searchValue.toLowerCase();
  const match = items.find((item) =>
    item.Value.toLowerCase().includes(lower),
  );
  return match?.Code;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/cache/codelist-cache.test.ts`
Expected: All 4 tests PASS.

---

### Task 5: Federal Glossary

**Files:**
- Create: `src/data/federal-glossary.ts`
- Create: `tests/data/federal-glossary.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect } from 'vitest';

describe('federal-glossary', () => {
  it('finds concept by exact key', async () => {
    const { lookupConcept } = await import('../src/data/federal-glossary.js');
    const result = lookupConcept('GS');
    expect(result).toBeDefined();
    expect(result!.title).toBe('General Schedule');
  });

  it('finds GS grade by "GS-13" query', async () => {
    const { lookupConcept } = await import('../src/data/federal-glossary.js');
    const result = lookupConcept('GS-13');
    expect(result).toBeDefined();
    expect(result!.title).toContain('General Schedule');
    expect(result!.gradeDetail).toBeDefined();
    expect(result!.gradeDetail!.grade).toBe('13');
  });

  it('finds security clearance by keyword', async () => {
    const { lookupConcept } = await import('../src/data/federal-glossary.js');
    const result = lookupConcept('TS/SCI');
    expect(result).toBeDefined();
    expect(result!.title).toContain('Top Secret');
  });

  it('returns undefined for unknown concept', async () => {
    const { lookupConcept } = await import('../src/data/federal-glossary.js');
    const result = lookupConcept('xyzzy');
    expect(result).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/data/federal-glossary.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement glossary**

```typescript
export interface GradeDetail {
  grade: string;
  min: number;
  max: number;
}

export interface GlossaryEntry {
  title: string;
  description: string;
  gradeDetail?: GradeDetail;
  timeline?: string;
  related?: string[];
  details?: Record<string, string | number>;
}

// GS pay table 2026 — source: OPM General Schedule pay tables
// Using Step 1 (min) and Step 10 (max) for base pay
// TODO: Update with actual 2026 OPM data at implementation time
const GS_PAY_TABLE: Record<string, { min: number; max: number }> = {
  '1': { min: 21986, max: 27487 },
  '2': { min: 24722, max: 31177 },
  '3': { min: 26974, max: 35065 },
  '4': { min: 30280, max: 39361 },
  '5': { min: 33878, max: 44042 },
  '6': { min: 37774, max: 49107 },
  '7': { min: 41925, max: 54504 },
  '8': { min: 46340, max: 60243 },
  '9': { min: 51054, max: 66370 },
  '10': { min: 56233, max: 73101 },
  '11': { min: 61727, max: 80244 },
  '12': { min: 73969, max: 96161 },
  '13': { min: 87971, max: 114358 },
  '14': { min: 103945, max: 135125 },
  '15': { min: 122290, max: 156755 },
};

interface RawGlossaryEntry {
  title: string;
  description: string;
  timeline?: string;
  related?: string[];
  details?: Record<string, string | number>;
}

const GLOSSARY: Record<string, RawGlossaryEntry> = {
  GS: {
    title: 'General Schedule',
    description:
      'The General Schedule (GS) is the predominant pay scale for federal employees. It has 15 grades (GS-1 through GS-15), each with 10 steps. Steps represent periodic pay increases within a grade — Step 1 is entry, Step 10 is maximum. Step increases: Steps 1-3 every 1 year, Steps 4-6 every 2 years, Steps 7-10 every 3 years. Locality pay adjustments add 15-45% on top of base pay depending on location.',
    related: ['GG', 'SES', 'WG'],
  },
  SES: {
    title: 'Senior Executive Service',
    description:
      'The Senior Executive Service (SES) is the corps of executives selected for their leadership qualifications. SES positions are above GS-15 and serve as the link between political appointees and the federal workforce. SES members can be reassigned across agencies.',
    related: ['GS', 'ES'],
  },
  'TS/SCI': {
    title: 'Top Secret / Sensitive Compartmented Information',
    description:
      'The highest commonly referenced security clearance level. TS (Top Secret) grants access to information that could cause exceptionally grave damage to national security. SCI adds compartmented access to intelligence information. Requires a Single Scope Background Investigation (SSBI).',
    timeline: '6-18 months to obtain. Requires extensive background check including interviews with references, neighbors, and colleagues. Polygraph may be required for certain agencies (CIA, NSA).',
    related: ['Secret', 'Confidential', 'Public Trust'],
  },
  Secret: {
    title: 'Secret Security Clearance',
    description:
      'Mid-level security clearance. Grants access to information that could cause serious damage to national security if disclosed. Most common clearance for DoD contractors and many federal positions.',
    timeline: '2-6 months to obtain. Requires background investigation covering 10 years.',
    related: ['TS/SCI', 'Confidential', 'Public Trust'],
  },
  Confidential: {
    title: 'Confidential Security Clearance',
    description:
      'Lowest level of security clearance. Grants access to information that could cause damage to national security. Investigation covers 7 years of history.',
    timeline: '1-3 months to obtain.',
    related: ['Secret', 'TS/SCI'],
  },
  'Public Trust': {
    title: 'Public Trust Position',
    description:
      'Not a security clearance, but a background investigation for positions with access to sensitive information (financial data, medical records, PII). Common in agencies like SSA, IRS, VA. Does not grant access to classified information.',
    timeline: '2-8 weeks to complete.',
    related: ['Confidential', 'Secret'],
  },
  'Schedule A': {
    title: 'Schedule A Hiring Authority',
    description:
      'A hiring authority that allows agencies to hire people with disabilities without going through the competitive hiring process. Applicants need documentation of their disability from a licensed medical professional, vocational rehabilitation counselor, or disability agency. Extremely valuable path for qualifying individuals — bypasses USAJOBS competitive process.',
    related: ['Direct Hire Authority', 'Competitive Service', 'Excepted Service'],
  },
  'Direct Hire Authority': {
    title: 'Direct Hire Authority (DHA)',
    description:
      'Allows agencies to hire candidates directly without the competitive rating and ranking process when there is a critical hiring need or severe shortage of candidates. Common in IT, cybersecurity, and STEM fields. Significantly faster hiring — weeks instead of months.',
    related: ['Schedule A', 'Competitive Service'],
  },
  'Competitive Service': {
    title: 'Competitive Service',
    description:
      'The standard federal hiring process. Positions are filled through a competitive examination of applicants. Most federal jobs are in the competitive service. Requires announcement on USAJOBS, rating and ranking of applicants, and following merit system principles. Typically the slowest hiring path.',
    related: ['Excepted Service', 'Direct Hire Authority'],
  },
  'Excepted Service': {
    title: 'Excepted Service',
    description:
      'Positions not subject to the competitive hiring rules. Agencies can set their own qualification requirements and are not required to post on USAJOBS (though many do). Includes Schedule A, B, C, and D appointments. Intelligence agencies (CIA, NSA) are entirely excepted service.',
    related: ['Competitive Service', 'Schedule A'],
  },
  'Pathways Program': {
    title: 'Pathways Program',
    description:
      'Federal program offering internships and entry-level positions to current students and recent graduates. Three tracks: Internship Program (current students), Recent Graduates Program (within 2 years of graduation), Presidential Management Fellows (advanced degree holders). Great entry point for new graduates.',
    related: ['Competitive Service'],
  },
  GG: {
    title: 'GG Pay Plan',
    description:
      'Pay plan equivalent to the General Schedule (GS) used by certain defense and intelligence agencies (e.g., DIA, NGA). Same grade structure as GS (GG-1 through GG-15) with equivalent pay rates. If you see a GG position, treat the grade the same as GS.',
    related: ['GS'],
  },
};

export function lookupConcept(query: string): GlossaryEntry | undefined {
  const normalized = query.trim().toUpperCase();

  // Check for GS-N pattern (e.g. "GS-13")
  const gsMatch = normalized.match(/^GS[- ]?(\d{1,2})$/);
  if (gsMatch) {
    const grade = gsMatch[1];
    const payRange = GS_PAY_TABLE[grade];
    const gsEntry = GLOSSARY['GS'];
    if (gsEntry && payRange) {
      return {
        title: `${gsEntry.title} — Grade ${grade}`,
        description: gsEntry.description,
        gradeDetail: { grade, min: payRange.min, max: payRange.max },
        related: gsEntry.related,
      };
    }
  }

  // Direct key match
  const directMatch = Object.entries(GLOSSARY).find(
    ([key]) => key.toUpperCase() === normalized,
  );
  if (directMatch) {
    const [, entry] = directMatch;
    // For bare "GS" query, include full pay table summary
    if (normalized === 'GS') {
      return {
        ...entry,
        details: {
          lowestGrade1Min: GS_PAY_TABLE['1'].min,
          highestGrade15Max: GS_PAY_TABLE['15'].max,
          totalGrades: 15,
          stepsPerGrade: 10,
        },
      };
    }
    return { ...entry };
  }

  // Partial match — search titles and descriptions
  const partialMatch = Object.entries(GLOSSARY).find(
    ([key, entry]) =>
      key.toUpperCase().includes(normalized) ||
      entry.title.toUpperCase().includes(normalized),
  );
  if (partialMatch) {
    return { ...partialMatch[1] };
  }

  return undefined;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/data/federal-glossary.test.ts`
Expected: All 4 tests PASS.

---

### Task 6: CV Tools

**Files:**
- Create: `src/tools/cv.ts`
- Create: `tests/tools/cv.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs/promises';

vi.mock('node:fs/promises');

describe('cv tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('handleSaveCV', () => {
    it('saves CV as JSON with metadata', async () => {
      const { handleSaveCV } = await import('../src/tools/cv.js');

      vi.mocked(fs.mkdir).mockResolvedValueOnce(undefined);
      vi.mocked(fs.writeFile).mockResolvedValueOnce(undefined);

      const result = await handleSaveCV({
        content: 'Senior Engineer with 8 years experience',
        format: 'txt',
      });

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('cv.json'),
        expect.stringContaining('Senior Engineer'),
      );
      expect(result.content[0].text).toContain('saved');
    });
  });

  describe('handleGetCV', () => {
    it('returns CV content and metadata', async () => {
      const { handleGetCV } = await import('../src/tools/cv.js');

      const stored = {
        content: 'My CV text',
        savedAt: '2026-04-13T00:00:00.000Z',
        format: 'txt',
      };
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(stored));

      const result = await handleGetCV();

      expect(result.content[0].text).toContain('My CV text');
    });

    it('returns informational message when no CV exists', async () => {
      const { handleGetCV } = await import('../src/tools/cv.js');

      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('ENOENT'));

      const result = await handleGetCV();

      expect(result.content[0].text).toContain('No CV saved yet');
    });
  });

  describe('requireCV', () => {
    it('returns CV content when file exists', async () => {
      const { requireCV } = await import('../src/tools/cv.js');

      const stored = {
        content: 'CV text',
        savedAt: '2026-04-13T00:00:00.000Z',
        format: 'txt',
      };
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(stored));

      const result = await requireCV();

      expect(result.content).toBe('CV text');
    });

    it('throws when no CV exists', async () => {
      const { requireCV } = await import('../src/tools/cv.js');

      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('ENOENT'));

      await expect(requireCV()).rejects.toThrow('No CV found');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/tools/cv.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement CV tools**

```typescript
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

const CV_DIR = path.join(os.homedir(), '.federal-compass');
const CV_PATH = path.join(CV_DIR, 'cv.json');

interface StoredCV {
  content: string;
  savedAt: string;
  format: string;
}

export async function handleSaveCV(params: {
  content: string;
  format?: string;
}): Promise<CallToolResult> {
  const cv: StoredCV = {
    content: params.content,
    savedAt: new Date().toISOString(),
    format: params.format ?? 'txt',
  };

  await fs.mkdir(CV_DIR, { recursive: true });
  await fs.writeFile(CV_PATH, JSON.stringify(cv, null, 2));

  return {
    content: [
      {
        type: 'text',
        text: `CV saved successfully (${params.content.length} characters, format: ${cv.format}). It will be used automatically for job matching and qualification checks.`,
      },
    ],
  };
}

export async function handleGetCV(): Promise<CallToolResult> {
  try {
    const raw = await fs.readFile(CV_PATH, 'utf-8');
    const cv: StoredCV = JSON.parse(raw);
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              content: cv.content,
              savedAt: cv.savedAt,
              format: cv.format,
            },
            null,
            2,
          ),
        },
      ],
    };
  } catch {
    return {
      content: [
        {
          type: 'text',
          text: 'No CV saved yet. Use the save_cv tool to save your CV for automatic use in job matching and qualification checks.',
        },
      ],
    };
  }
}

export async function requireCV(): Promise<StoredCV> {
  try {
    const raw = await fs.readFile(CV_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    throw new Error(
      'No CV found. Please save your CV first using the save_cv tool, then try again.',
    );
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/tools/cv.test.ts`
Expected: All 5 tests PASS.

---

### Task 7: Search Tools

**Files:**
- Create: `src/tools/search.ts`
- Create: `tests/tools/search.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../src/api/usajobs-client.js', () => ({
  searchJobs: vi.fn(),
}));

vi.mock('../src/cache/codelist-cache.js', () => ({
  resolveCode: vi.fn(),
}));

describe('search tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('handleSearchJobs', () => {
    it('maps human-readable params to API params and returns formatted results', async () => {
      const { searchJobs } = await import('../src/api/usajobs-client.js');
      const { resolveCode } = await import('../src/cache/codelist-cache.js');
      const { handleSearchJobs } = await import('../src/tools/search.js');

      vi.mocked(resolveCode).mockResolvedValue(undefined);
      vi.mocked(searchJobs).mockResolvedValueOnce({
        SearchResultCount: 1,
        SearchResultCountAll: 42,
        SearchResultItems: [
          {
            MatchedObjectId: '12345',
            MatchedObjectDescriptor: {
              PositionTitle: 'Software Developer',
              OrganizationName: 'SSA',
              DepartmentName: 'Social Security Administration',
              PositionLocationDisplay: 'Raleigh, NC',
              PositionRemuneration: [
                { MinimumRange: '100000', MaximumRange: '150000', RateIntervalCode: 'PA' },
              ],
              ApplicationCloseDate: '2026-06-01',
              PositionURI: 'https://usajobs.gov/job/12345',
              ApplyURI: ['https://usajobs.gov/apply/12345'],
              JobGrade: [{ Code: 'GS' }],
              QualificationSummary: 'Must have experience...',
              UserArea: {
                Details: {
                  LowGrade: '13',
                  HighGrade: '14',
                  JobSummary: 'Build things',
                  MajorDuties: ['Code stuff'],
                  HiringPath: ['public'],
                  TeleworkEligible: true,
                  RemoteIndicator: false,
                  SecurityClearance: 'Not Required',
                },
              },
            },
          },
        ],
      });

      const client = {} as any;
      const result = await handleSearchJobs(client, {
        keyword: 'software developer',
        location: 'Raleigh, NC',
      });

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed.total_count).toBe(42);
      expect(parsed.results).toHaveLength(1);
      expect(parsed.results[0].title).toBe('Software Developer');
      expect(parsed.agencies_in_results).toContain('SSA');
    });

    it('resolves agency name to code via codelist', async () => {
      const { searchJobs } = await import('../src/api/usajobs-client.js');
      const { resolveCode } = await import('../src/cache/codelist-cache.js');
      const { handleSearchJobs } = await import('../src/tools/search.js');

      vi.mocked(resolveCode).mockResolvedValueOnce('DD00');
      vi.mocked(searchJobs).mockResolvedValueOnce({
        SearchResultCount: 0,
        SearchResultCountAll: 0,
        SearchResultItems: [],
      });

      const client = {} as any;
      await handleSearchJobs(client, { agency: 'Department of Defense' });

      expect(resolveCode).toHaveBeenCalledWith(
        'agencysubelements',
        'Department of Defense',
      );
      expect(searchJobs).toHaveBeenCalledWith(
        client,
        expect.objectContaining({ Organization: 'DD00' }),
      );
    });
  });

  describe('handleGetJobDetails', () => {
    it('searches by control number and returns full details', async () => {
      const { searchJobs } = await import('../src/api/usajobs-client.js');
      const { handleGetJobDetails } = await import('../src/tools/search.js');

      vi.mocked(searchJobs).mockResolvedValueOnce({
        SearchResultCount: 1,
        SearchResultCountAll: 1,
        SearchResultItems: [
          {
            MatchedObjectId: '12345',
            MatchedObjectDescriptor: {
              PositionTitle: 'Developer',
              OrganizationName: 'SSA',
              DepartmentName: 'SSA',
              PositionLocationDisplay: 'Remote',
              PositionRemuneration: [
                { MinimumRange: '100000', MaximumRange: '150000', RateIntervalCode: 'PA' },
              ],
              ApplicationCloseDate: '2026-06-01',
              PositionURI: 'https://usajobs.gov/job/12345',
              ApplyURI: ['https://usajobs.gov/apply/12345'],
              JobGrade: [{ Code: 'GS' }],
              QualificationSummary: 'Qualifications here',
              UserArea: {
                Details: {
                  LowGrade: '13',
                  HighGrade: '15',
                  JobSummary: 'Summary',
                  MajorDuties: ['Duty 1', 'Duty 2'],
                  HiringPath: ['public'],
                  TeleworkEligible: true,
                  RemoteIndicator: true,
                  SecurityClearance: 'Not Required',
                },
              },
            },
          },
        ],
      });

      const client = {} as any;
      const result = await handleGetJobDetails(client, { job_id: '12345' });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.title).toBe('Developer');
      expect(parsed.major_duties).toHaveLength(2);
      expect(parsed.qualification_summary).toBe('Qualifications here');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/tools/search.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement search tools**

```typescript
import type { AxiosInstance } from 'axios';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { searchJobs, type SearchParams, type SearchResultItem } from '../api/usajobs-client.js';
import { resolveCode } from '../cache/codelist-cache.js';

interface SearchJobsParams {
  keyword?: string;
  location?: string;
  salary_min?: number;
  remote?: boolean;
  grade?: string;
  agency?: string;
  hiring_path?: string;
  who_may_apply?: string;
  security_clearance?: string;
  results_per_page?: number;
}

function formatJob(item: SearchResultItem) {
  const d = item.MatchedObjectDescriptor;
  const details = d.UserArea.Details;
  const pay = d.PositionRemuneration[0];

  return {
    job_id: item.MatchedObjectId,
    title: d.PositionTitle,
    agency: d.OrganizationName,
    department: d.DepartmentName,
    location: d.PositionLocationDisplay,
    salary_min: pay ? Number(pay.MinimumRange) : null,
    salary_max: pay ? Number(pay.MaximumRange) : null,
    grade_low: details.LowGrade,
    grade_high: details.HighGrade,
    pay_plan: d.JobGrade[0]?.Code ?? null,
    security_clearance: details.SecurityClearance,
    hiring_paths: details.HiringPath,
    telework: details.TeleworkEligible,
    remote: details.RemoteIndicator,
    close_date: d.ApplicationCloseDate,
    apply_url: d.ApplyURI[0] ?? d.PositionURI,
  };
}

function formatJobFull(item: SearchResultItem) {
  const d = item.MatchedObjectDescriptor;
  const details = d.UserArea.Details;
  return {
    ...formatJob(item),
    job_summary: details.JobSummary,
    major_duties: details.MajorDuties,
    qualification_summary: d.QualificationSummary,
  };
}

export async function handleSearchJobs(
  client: AxiosInstance,
  params: SearchJobsParams,
): Promise<CallToolResult> {
  const apiParams: SearchParams = {};

  if (params.keyword) apiParams.Keyword = params.keyword;
  if (params.location) apiParams.LocationName = params.location;
  if (params.salary_min) apiParams.RemunerationMinimumAmount = params.salary_min;
  if (params.remote) apiParams.RemoteIndicator = 'True';
  if (params.grade) apiParams.PayGrade = params.grade;
  if (params.hiring_path) apiParams.HiringPath = params.hiring_path;
  if (params.results_per_page) apiParams.ResultsPerPage = params.results_per_page;

  // Resolve human-readable names to API codes
  if (params.agency) {
    const code = await resolveCode('agencysubelements', params.agency);
    if (code) apiParams.Organization = code;
  }
  if (params.who_may_apply) {
    const code = await resolveCode('whomayapply', params.who_may_apply);
    if (code) apiParams.WhoMayApply = code;
  }
  if (params.security_clearance) {
    const code = await resolveCode('securityclearances', params.security_clearance);
    if (code) apiParams.SecurityClearance = code;
  }

  const searchResult = await searchJobs(client, apiParams);

  const results = searchResult.SearchResultItems.map(formatJob);

  const agencies = [...new Set(results.map((r) => r.agency))];

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            total_count: searchResult.SearchResultCountAll,
            showing: searchResult.SearchResultCount,
            results,
            agencies_in_results: agencies,
          },
          null,
          2,
        ),
      },
    ],
  };
}

export async function handleGetJobDetails(
  client: AxiosInstance,
  params: { job_id: string },
): Promise<CallToolResult> {
  // Search by ControlNumber — the exact API parameter needs testing.
  // Fallback: search by Keyword with the job ID.
  const searchResult = await searchJobs(client, {
    Keyword: params.job_id,
    ResultsPerPage: 1,
  });

  const item = searchResult.SearchResultItems.find(
    (i) => i.MatchedObjectId === params.job_id,
  );

  if (!item) {
    return {
      content: [
        {
          type: 'text',
          text: `Job not found with ID: ${params.job_id}. The posting may have been removed or the ID may be incorrect.`,
        },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(formatJobFull(item), null, 2),
      },
    ],
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/tools/search.test.ts`
Expected: All 3 tests PASS.

---

### Task 8: Advisor Tools

**Files:**
- Create: `src/tools/advisor.ts`
- Create: `tests/tools/advisor.test.ts`

- [ ] **Step 1: Write failing tests**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs/promises';

vi.mock('node:fs/promises');
vi.mock('../src/api/usajobs-client.js', () => ({
  searchJobs: vi.fn(),
}));
vi.mock('../src/cache/codelist-cache.js', () => ({
  getCodelist: vi.fn(),
  resolveCode: vi.fn(),
}));

describe('advisor tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('handleExplainConcept', () => {
    it('returns glossary entry for known concept', async () => {
      const { handleExplainConcept } = await import('../src/tools/advisor.js');
      const { getCodelist } = await import('../src/cache/codelist-cache.js');

      vi.mocked(getCodelist).mockResolvedValue([]);

      const result = await handleExplainConcept({ concept: 'GS-13' });
      const text = result.content[0].text;

      expect(text).toContain('General Schedule');
      expect(text).toContain('13');
    });

    it('falls back to codelist for unknown glossary entry', async () => {
      const { handleExplainConcept } = await import('../src/tools/advisor.js');
      const { getCodelist } = await import('../src/cache/codelist-cache.js');

      vi.mocked(getCodelist).mockResolvedValueOnce([
        { Code: '2210', Value: 'Information Technology Management', LastModified: '', IsDisabled: 'No' },
      ]);

      const result = await handleExplainConcept({ concept: '2210' });
      const text = result.content[0].text;

      expect(text).toContain('Information Technology Management');
    });
  });

  describe('handleFindMatchingJobs', () => {
    it('extracts keywords from CV and searches', async () => {
      const { handleFindMatchingJobs } = await import('../src/tools/advisor.js');
      const { searchJobs } = await import('../src/api/usajobs-client.js');

      const stored = {
        content:
          'Skills: React, Node.js, TypeScript\nExperience: 8 years software development',
        savedAt: '2026-04-13T00:00:00.000Z',
        format: 'txt',
      };
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(stored));
      vi.mocked(searchJobs).mockResolvedValue({
        SearchResultCount: 0,
        SearchResultCountAll: 0,
        SearchResultItems: [],
      });

      const client = {} as any;
      const result = await handleFindMatchingJobs(client, {});
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.keywords_used).toBeDefined();
      expect(parsed.keywords_used.length).toBeGreaterThan(0);
      expect(searchJobs).toHaveBeenCalled();
    });

    it('returns error when no CV saved', async () => {
      const { handleFindMatchingJobs } = await import('../src/tools/advisor.js');

      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('ENOENT'));

      const client = {} as any;
      const result = await handleFindMatchingJobs(client, {});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('No CV found');
    });
  });

  describe('handleCheckQualification', () => {
    it('returns CV and job data side by side', async () => {
      const { handleCheckQualification } = await import('../src/tools/advisor.js');
      const { searchJobs } = await import('../src/api/usajobs-client.js');

      const stored = {
        content: 'Senior Developer with 8 years React experience',
        savedAt: '2026-04-13T00:00:00.000Z',
        format: 'txt',
      };
      vi.mocked(fs.readFile).mockResolvedValueOnce(JSON.stringify(stored));
      vi.mocked(searchJobs).mockResolvedValueOnce({
        SearchResultCount: 1,
        SearchResultCountAll: 1,
        SearchResultItems: [
          {
            MatchedObjectId: '12345',
            MatchedObjectDescriptor: {
              PositionTitle: 'Software Developer',
              OrganizationName: 'SSA',
              DepartmentName: 'SSA',
              PositionLocationDisplay: 'Remote',
              PositionRemuneration: [
                { MinimumRange: '100000', MaximumRange: '150000', RateIntervalCode: 'PA' },
              ],
              ApplicationCloseDate: '2026-06-01',
              PositionURI: '',
              ApplyURI: [''],
              JobGrade: [{ Code: 'GS' }],
              QualificationSummary: 'Must have 5 years experience in software development',
              UserArea: {
                Details: {
                  LowGrade: '13',
                  HighGrade: '14',
                  JobSummary: '',
                  MajorDuties: ['Build web apps', 'Lead team'],
                  HiringPath: ['public'],
                  TeleworkEligible: true,
                  RemoteIndicator: true,
                  SecurityClearance: 'Not Required',
                },
              },
            },
          },
        ],
      });

      const client = {} as any;
      const result = await handleCheckQualification(client, { job_id: '12345' });
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed.cv).toContain('Senior Developer');
      expect(parsed.job.title).toBe('Software Developer');
      expect(parsed.job.key_requirements).toBeDefined();
    });

    it('returns error when no CV saved', async () => {
      const { handleCheckQualification } = await import('../src/tools/advisor.js');

      vi.mocked(fs.readFile).mockRejectedValueOnce(new Error('ENOENT'));

      const client = {} as any;
      const result = await handleCheckQualification(client, { job_id: '123' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('No CV found');
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run tests/tools/advisor.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement advisor tools**

```typescript
import type { AxiosInstance } from 'axios';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { searchJobs, type SearchResultItem } from '../api/usajobs-client.js';
import { getCodelist } from '../cache/codelist-cache.js';
import { lookupConcept } from '../data/federal-glossary.js';
import { requireCV } from './cv.js';

export async function handleExplainConcept(params: {
  concept: string;
}): Promise<CallToolResult> {
  const entry = lookupConcept(params.concept);

  if (entry) {
    const parts: string[] = [`## ${entry.title}\n`, entry.description];

    if (entry.gradeDetail) {
      parts.push(
        `\n**Grade ${entry.gradeDetail.grade} Pay Range:** $${entry.gradeDetail.min.toLocaleString()} — $${entry.gradeDetail.max.toLocaleString()} (base pay, before locality adjustment)`,
      );
    }

    if (entry.timeline) {
      parts.push(`\n**Timeline:** ${entry.timeline}`);
    }

    if (entry.details) {
      parts.push(`\n**Details:** ${JSON.stringify(entry.details)}`);
    }

    if (entry.related?.length) {
      parts.push(`\n**Related concepts:** ${entry.related.join(', ')}`);
    }

    return { content: [{ type: 'text', text: parts.join('\n') }] };
  }

  // Fallback: search codelists
  const codelistNames = [
    'occupationalseries',
    'securityclearances',
    'hiringpaths',
    'payplans',
    'agencysubelements',
    'whomayapply',
  ];

  for (const name of codelistNames) {
    try {
      const items = await getCodelist(name);
      const match = items.find(
        (item) =>
          item.Code === params.concept ||
          item.Value.toLowerCase().includes(params.concept.toLowerCase()),
      );
      if (match) {
        return {
          content: [
            {
              type: 'text',
              text: `**${match.Value}** (Code: ${match.Code})\n\nFound in: ${name}\n\nThis is basic reference data. The AI assistant may be able to provide additional context and explanation.`,
            },
          ],
        };
      }
    } catch {
      // Skip failed codelist lookups
    }
  }

  return {
    content: [
      {
        type: 'text',
        text: `Concept not found in glossary: "${params.concept}". The AI assistant may be able to help based on general knowledge.`,
      },
    ],
  };
}

// Known tech keywords for CV extraction
const TECH_KEYWORDS = new Set([
  'javascript', 'typescript', 'python', 'java', 'go', 'rust', 'c++', 'c#',
  'react', 'vue', 'angular', 'node.js', 'nodejs', 'express', 'django',
  'flask', 'spring', 'aws', 'azure', 'gcp', 'docker', 'kubernetes',
  'terraform', 'sql', 'postgresql', 'mongodb', 'redis', 'graphql',
  'rest', 'api', 'microservices', 'ci/cd', 'devops', 'agile', 'scrum',
  'machine learning', 'ai', 'data science', 'cybersecurity', 'cloud',
  'linux', 'networking', 'full stack', 'frontend', 'backend',
  'software developer', 'software engineer', 'project manager',
  'system administrator', 'data analyst', 'security analyst',
]);

function extractKeywords(cvText: string): string[] {
  const lower = cvText.toLowerCase();
  const found: string[] = [];

  for (const keyword of TECH_KEYWORDS) {
    if (lower.includes(keyword)) {
      found.push(keyword);
    }
  }

  // Also extract from "Skills:" or "Technologies:" sections
  const skillsMatch = lower.match(
    /(?:skills|technologies|technical skills|tech stack)[:\s]*([^\n]+(?:\n(?![\n\r]|[a-z]+:)[^\n]+)*)/,
  );
  if (skillsMatch) {
    const skills = skillsMatch[1]
      .split(/[,;|•\n]+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 1 && s.length < 30);
    found.push(...skills);
  }

  // Deduplicate
  return [...new Set(found)].slice(0, 10);
}

export async function handleFindMatchingJobs(
  client: AxiosInstance,
  params: { results_per_page?: number },
): Promise<CallToolResult> {
  let cv;
  try {
    cv = await requireCV();
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: (error as Error).message,
        },
      ],
      isError: true,
    };
  }

  const keywords = extractKeywords(cv.content);
  const resultsPerPage = params.results_per_page ?? 25;

  if (keywords.length === 0) {
    // Fallback: use generic IT search
    keywords.push('information technology');
  }

  // Make 1-3 searches with different keyword combinations
  const searches: Array<{ keywords: string; items: SearchResultItem[] }> = [];
  const keywordGroups = [
    keywords.slice(0, 3).join(' '),
    keywords.slice(3, 6).join(' '),
    keywords.slice(6, 10).join(' '),
  ].filter((g) => g.length > 0);

  for (const group of keywordGroups) {
    try {
      const result = await searchJobs(client, {
        Keyword: group,
        ResultsPerPage: resultsPerPage,
      });
      searches.push({ keywords: group, items: result.SearchResultItems });
    } catch {
      // Skip failed searches
    }
  }

  // Deduplicate by job ID
  const seen = new Set<string>();
  const allResults: SearchResultItem[] = [];
  for (const search of searches) {
    for (const item of search.items) {
      if (!seen.has(item.MatchedObjectId)) {
        seen.add(item.MatchedObjectId);
        allResults.push(item);
      }
    }
  }

  const formatted = allResults.map((item) => {
    const d = item.MatchedObjectDescriptor;
    const details = d.UserArea.Details;
    const pay = d.PositionRemuneration[0];
    return {
      job_id: item.MatchedObjectId,
      title: d.PositionTitle,
      agency: d.OrganizationName,
      location: d.PositionLocationDisplay,
      salary_min: pay ? Number(pay.MinimumRange) : null,
      salary_max: pay ? Number(pay.MaximumRange) : null,
      grade_range: `${details.LowGrade}-${details.HighGrade}`,
      security_clearance: details.SecurityClearance,
      close_date: d.ApplicationCloseDate,
      apply_url: d.ApplyURI[0] ?? d.PositionURI,
    };
  });

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            keywords_used: keywordGroups,
            total_results: formatted.length,
            results: formatted,
          },
          null,
          2,
        ),
      },
    ],
  };
}

export async function handleCheckQualification(
  client: AxiosInstance,
  params: { job_id: string },
): Promise<CallToolResult> {
  let cv;
  try {
    cv = await requireCV();
  } catch (error) {
    return {
      content: [
        {
          type: 'text',
          text: (error as Error).message,
        },
      ],
      isError: true,
    };
  }

  // Fetch job details
  const searchResult = await searchJobs(client, {
    Keyword: params.job_id,
    ResultsPerPage: 1,
  });

  const item = searchResult.SearchResultItems.find(
    (i) => i.MatchedObjectId === params.job_id,
  );

  if (!item) {
    return {
      content: [
        {
          type: 'text',
          text: `Job not found with ID: ${params.job_id}. The posting may have been removed or the ID may be incorrect.`,
        },
      ],
      isError: true,
    };
  }

  const d = item.MatchedObjectDescriptor;
  const details = d.UserArea.Details;
  const pay = d.PositionRemuneration[0];

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(
          {
            cv: cv.content,
            job: {
              title: d.PositionTitle,
              agency: d.OrganizationName,
              location: d.PositionLocationDisplay,
              salary_range: pay
                ? `$${Number(pay.MinimumRange).toLocaleString()} — $${Number(pay.MaximumRange).toLocaleString()}`
                : 'Not specified',
              grade_range: `${details.LowGrade}-${details.HighGrade}`,
              security_clearance: details.SecurityClearance,
              qualification_summary: d.QualificationSummary,
              major_duties: details.MajorDuties,
              hiring_paths: details.HiringPath,
              key_requirements: {
                clearance: details.SecurityClearance,
                grade: `GS-${details.LowGrade} to GS-${details.HighGrade}`,
                qualifications: d.QualificationSummary,
                duties: details.MajorDuties,
              },
            },
          },
          null,
          2,
        ),
      },
    ],
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run tests/tools/advisor.test.ts`
Expected: All 5 tests PASS.

---

### Task 9: Tool Collection

**Files:**
- Create: `src/tools/tools.ts`

- [ ] **Step 1: Create tool definitions and collection**

```typescript
import { z } from 'zod';
import type { AxiosInstance } from 'axios';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { handleSearchJobs, handleGetJobDetails } from './search.js';
import { handleSaveCV, handleGetCV } from './cv.js';
import {
  handleExplainConcept,
  handleFindMatchingJobs,
  handleCheckQualification,
} from './advisor.js';

export function registerTools(server: McpServer, client: AxiosInstance): void {
  server.tool(
    'search_jobs',
    'Search federal job openings on USAJobs. All parameters are optional. Returns job listings with title, agency, salary, location, and apply URL.',
    {
      keyword: z.string().optional().describe('Search keyword, e.g. "software developer"'),
      location: z.string().optional().describe('Job location, e.g. "Raleigh, NC"'),
      salary_min: z.number().optional().describe('Minimum salary, e.g. 80000'),
      remote: z.boolean().optional().describe('Only show remote positions'),
      grade: z.string().optional().describe('GS grade, e.g. "13" or "13:14" for range'),
      agency: z.string().optional().describe('Agency name, e.g. "Department of Defense"'),
      hiring_path: z.string().optional().describe('Hiring path: "public", "fed-transition", etc.'),
      who_may_apply: z.string().optional().describe('Who may apply: "All", "Public", etc.'),
      security_clearance: z
        .string()
        .optional()
        .describe('Security clearance: "Not Required", "Secret", "Top Secret", "TS/SCI"'),
      results_per_page: z
        .number()
        .optional()
        .describe('Number of results (default: 25, max: 500)'),
    },
    async (params) => handleSearchJobs(client, params),
  );

  server.tool(
    'get_job_details',
    'Get full details for a specific federal job posting including duties, qualifications, and how to apply.',
    {
      job_id: z.string().describe('Job ID (MatchedObjectId from search results)'),
    },
    async (params) => handleGetJobDetails(client, params),
  );

  server.tool(
    'save_cv',
    'Save your CV text locally for automatic use in job matching and qualification checks. The CV is stored only on your machine.',
    {
      content: z.string().describe('CV text content'),
      format: z
        .string()
        .optional()
        .describe('Original format of the CV: "pdf", "txt", or "md" (default: "txt")'),
    },
    async (params) => handleSaveCV(params),
  );

  server.tool(
    'get_cv',
    'Read your saved CV. Returns the CV text and metadata (when it was saved, original format).',
    {},
    async () => handleGetCV(),
  );

  server.tool(
    'explain_federal_concept',
    'Explain federal career concepts in plain language: GS grades, security clearances, hiring paths, pay plans, and more.',
    {
      concept: z
        .string()
        .describe(
          'Concept to explain, e.g. "GS-13", "TS/SCI", "Schedule A", "Direct Hire Authority"',
        ),
    },
    async (params) => handleExplainConcept(params),
  );

  server.tool(
    'find_matching_jobs',
    'Find federal jobs that match your saved CV. Extracts skills and keywords from your CV and searches USAJobs. Requires a saved CV.',
    {
      results_per_page: z
        .number()
        .optional()
        .describe('Number of results per search query (default: 25, max: 500)'),
    },
    async (params) => handleFindMatchingJobs(client, params),
  );

  server.tool(
    'check_qualification',
    'Compare your saved CV against a specific job posting. Returns your CV and the job requirements side by side for analysis. Requires a saved CV.',
    {
      job_id: z.string().describe('Job ID (MatchedObjectId from search results)'),
    },
    async (params) => handleCheckQualification(client, params),
  );
}
```

No tests needed — this is pure wiring that connects handlers to the MCP server.

---

### Task 10: MCP Server Entry Point

**Files:**
- Create: `src/index.ts`

- [ ] **Step 1: Implement entry point**

```typescript
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createApiClient } from './api/usajobs-client.js';
import { registerTools } from './tools/tools.js';
import { createLogger } from './logger.js';

const log = createLogger('server');

function validateEnv(): { apiKey: string; email: string } {
  const apiKey = process.env.USAJOBS_API_KEY;
  const email = process.env.USAJOBS_EMAIL;

  if (!apiKey) {
    console.error(
      'ERROR: USAJOBS_API_KEY environment variable is required.\n' +
        'Get your free API key at: https://developer.usajobs.gov/apirequest/index',
    );
    process.exit(1);
  }

  if (!email) {
    console.error(
      'ERROR: USAJOBS_EMAIL environment variable is required.\n' +
        'Use the email address you registered with at developer.usajobs.gov',
    );
    process.exit(1);
  }

  return { apiKey, email };
}

async function main(): Promise<void> {
  const { apiKey, email } = validateEnv();

  log('starting federal-compass-mcp server');

  const client = createApiClient(apiKey, email);

  const server = new McpServer({
    name: 'federal-compass',
    version: '0.1.0',
  });

  registerTools(server, client);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  log('server connected via stdio');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
```

- [ ] **Step 2: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: No errors. If there are type errors, fix them.

---

### Task 11: Build Config & Metadata

**Files:**
- Create: `rollup.config.mjs`
- Create: `server.json`
- Create: `.mcp.json`

- [ ] **Step 1: Create rollup config**

```javascript
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

export default {
  input: 'build/src/index.js',
  output: {
    file: 'build/bundle.js',
    format: 'es',
    banner: '#!/usr/bin/env node',
  },
  plugins: [
    resolve({ preferBuiltins: true }),
    commonjs(),
    json(),
  ],
  external: [
    /^node:/,
  ],
};
```

- [ ] **Step 2: Create server.json for MCP Registry**

```json
{
  "$schema": "https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json",
  "name": "io.github.skivuha/federal-compass-mcp",
  "title": "Federal Compass MCP",
  "description": "Your AI compass from private sector to federal career — search USAJobs, explain federal concepts, analyze CVs",
  "repository": {
    "url": "https://github.com/skivuha/federal-compass-mcp",
    "source": "github"
  },
  "version": "0.1.0",
  "packages": [
    {
      "registryType": "npm",
      "registryBaseUrl": "https://registry.npmjs.org",
      "identifier": "federal-compass-mcp",
      "version": "0.1.0",
      "transport": {
        "type": "stdio"
      },
      "environmentVariables": [
        {
          "name": "USAJOBS_API_KEY",
          "description": "API key from developer.usajobs.gov",
          "required": true
        },
        {
          "name": "USAJOBS_EMAIL",
          "description": "Email used when requesting the API key",
          "required": true
        }
      ]
    }
  ]
}
```

- [ ] **Step 3: Create .mcp.json for quick install**

```json
{
  "mcpServers": {
    "federal-compass": {
      "command": "npx",
      "args": ["-y", "federal-compass-mcp@latest"],
      "env": {
        "USAJOBS_API_KEY": "",
        "USAJOBS_EMAIL": ""
      }
    }
  }
}
```

---

### Task 12: Build & Manual Test

- [ ] **Step 1: Run all tests**

Run: `npx vitest run`
Expected: All tests PASS.

- [ ] **Step 2: Run typecheck**

Run: `npx tsc --noEmit`
Expected: No errors.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: `build/` directory created with compiled JS files.

- [ ] **Step 4: Test server starts with env vars**

Run: `USAJOBS_API_KEY=test USAJOBS_EMAIL=test@test.com node build/src/index.js`
Expected: Server starts and waits for MCP messages on stdin. No errors on stderr (unless DEBUG is set). Ctrl+C to exit.

- [ ] **Step 5: Test server fails without env vars**

Run: `node build/src/index.js`
Expected: Error message about missing USAJOBS_API_KEY, process exits with code 1.

---

## Summary

| Task | What it builds | Tests |
|------|---------------|-------|
| 1 | Project scaffolding | — |
| 2 | Logger | — |
| 3 | USAJobs API client | 3 tests |
| 4 | Codelist cache | 4 tests |
| 5 | Federal glossary | 4 tests |
| 6 | Resume tools | 5 tests |
| 7 | Search tools | 3 tests |
| 8 | Advisor tools | 5 tests |
| 9 | Tool collection (wiring) | — |
| 10 | MCP server entry point | — |
| 11 | Build config & metadata | — |
| 12 | Build & manual test | — |

**Total: 12 tasks, 24 tests**
