import { z } from 'zod';
import type { AxiosInstance } from 'axios';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { handleSearchJobs, handleGetJobDetails, handleCompareJobs } from './search.js';
import { handleSaveCV, handleGetCV } from './cv.js';
import { handleCalculateSalary } from './salary.js';
import { handleExtractKsa } from './ksa.js';
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
    'save_cv',
    'Save your CV text locally for automatic use in job matching and qualification checks. The CV is stored only on your machine.',
    {
      content: z.string().describe('CV text content'),
      format: z.string().optional().describe('Original format of the CV: "pdf", "txt", or "md" (default: "txt")'),
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
      concept: z.string().describe('Concept to explain, e.g. "GS-13", "TS/SCI", "Schedule A", "Direct Hire Authority"'),
    },
    async (params) => handleExplainConcept(params),
  );

  server.tool(
    'find_matching_jobs',
    'Find federal jobs that match your saved CV. Extracts skills and keywords from your CV and searches USAJobs. Requires a saved CV.',
    {
      results_per_page: z.number().optional().describe('Number of results per search query (default: 25, max: 500)'),
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

  server.tool(
    'compare_jobs',
    'Compare 2-5 federal job postings side by side. Returns salary, grade, clearance, location, and more for each job. Makes one API call per job.',
    {
      job_ids: z.array(z.string()).min(2).max(5).describe('Array of 2-5 job IDs (MatchedObjectId from search results)'),
      include_details: z.boolean().optional().describe('Include duties, qualifications, and job summary (default: false)'),
    },
    async (params) => handleCompareJobs(client, params),
  );

  server.tool(
    'calculate_salary',
    'Calculate federal GS salary with locality pay adjustment. Returns base pay plus locality-adjusted pay for a specific grade, step, and location. Covers all 15 GS grades and ~58 locality pay areas.',
    {
      grade: z.string().describe('GS grade: "13" or "GS-13"'),
      step: z.number().int().min(1).max(10).optional().describe('Step 1-10. Omit to see all 10 steps.'),
      location: z.string().optional().describe('Location for locality pay: "Raleigh", "DC", "NYC", "San Francisco". Defaults to Rest of US.'),
    },
    async (params) => handleCalculateSalary(params),
  );

  server.tool(
    'extract_ksa',
    'Extract KSA (Knowledge, Skills, Abilities) requirements from a federal job posting. Categorizes requirements by type (knowledge, skill, ability, experience, education, certification, other) and optionally matches them against your saved CV.',
    {
      job_id: z.string().describe('Job ID (MatchedObjectId from search results)'),
    },
    async (params) => handleExtractKsa(client, params),
  );
}
