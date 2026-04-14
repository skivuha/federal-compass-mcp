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
  if (params.salary_min !== undefined) apiParams.RemunerationMinimumAmount = params.salary_min;
  if (params.remote) apiParams.RemoteIndicator = 'True';
  if (params.grade) apiParams.PayGrade = params.grade;
  if (params.hiring_path) apiParams.HiringPath = params.hiring_path;
  if (params.results_per_page !== undefined) apiParams.ResultsPerPage = params.results_per_page;

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

  let searchResult;
  try {
    searchResult = await searchJobs(client, apiParams);
  } catch {
    return {
      content: [{ type: 'text', text: 'Unable to search USAJobs at this time. Please try again later.' }],
      isError: true,
    };
  }

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
  let searchResult;
  try {
    searchResult = await searchJobs(client, {
      Keyword: params.job_id,
      ResultsPerPage: 1,
    });
  } catch {
    return {
      content: [{ type: 'text', text: 'Unable to search USAJobs at this time. Please try again later.' }],
      isError: true,
    };
  }

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
