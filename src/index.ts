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
