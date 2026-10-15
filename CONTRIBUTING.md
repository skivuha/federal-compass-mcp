# Contributing

Thanks for your interest in federal-compass-mcp!

## Setup

```bash
git clone https://github.com/skivuha/federal-compass-mcp.git
cd federal-compass-mcp
npm install
```

## Development

```bash
npm run build      # compile TypeScript (required before CLI tests; rebuild after source changes)
npm test           # run unit tests and built CLI smoke tests
npm run typecheck  # check types
```

## USAJobs API Key

Get a free key at [developer.usajobs.gov](https://developer.usajobs.gov/apirequest/index) to test tools that call the API.

## Pull Requests

1. Create a branch from `main`
2. Write tests for new features
3. Make sure `npm run build`, `npm test`, and `npm run typecheck` pass
4. Use [conventional commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`)
5. Open a PR against `main`

## Reporting Issues

Use [GitHub Issues](https://github.com/skivuha/federal-compass-mcp/issues) with the provided templates.
