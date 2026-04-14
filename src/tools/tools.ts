import { z } from 'zod';
import type { AxiosInstance } from 'axios';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { handleSearchJobs, handleGetJobDetails } from './search.js';
import { handleSaveResume, handleGetResume } from './resume.js';
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
      security_clearance: z.string().optional().describe('Security clearance: "Not Required", "Secret", "Top Secret", "TS/SCI"'),
      results_per_page: z.number().optional().describe('Number of results (default: 25, max: 500)'),
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
    'save_resume',
    'Save your resume text locally for automatic use in job matching and qualification checks. The resume is stored only on your machine.',
    {
      content: z.string().describe('Resume text content'),
      format: z.string().optional().describe('Original format of the resume: "pdf", "txt", or "md" (default: "txt")'),
    },
    async (params) => handleSaveResume(params),
  );

  server.tool(
    'get_resume',
    'Read your saved resume. Returns the resume text and metadata (when it was saved, original format).',
    {},
    async () => handleGetResume(),
  );

  server.tool(
    'explain_federal_concept',
    'Explain federal career concepts in plain language: GS grades, security clearances, hiring paths, pay plans, and more.',
    {
      concept: z.string().describe('Concept to explain, e.g. "GS-13", "TS/SCI", "Schedule A", "Direct Hire Authority"'),
    },
    async (params) => handleExplainConcept(params),
  );

  server.tool(
    'find_matching_jobs',
    'Find federal jobs that match your saved resume. Extracts skills and keywords from your resume and searches USAJobs. Requires a saved resume.',
    {
      results_per_page: z.number().optional().describe('Number of results per search query (default: 25, max: 500)'),
    },
    async (params) => handleFindMatchingJobs(client, params),
  );

  server.tool(
    'check_qualification',
    'Compare your saved resume against a specific job posting. Returns your resume and the job requirements side by side for analysis. Requires a saved resume.',
    {
      job_id: z.string().describe('Job ID (MatchedObjectId from search results)'),
    },
    async (params) => handleCheckQualification(client, params),
  );
}
