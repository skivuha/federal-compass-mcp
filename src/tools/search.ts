import type { AxiosInstance } from 'axios';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { searchJobs, type SearchParams, type SearchResultItem } from '../api/usajobs-client.js';
import { resolveCode } from '../cache/codelist-cache.js';

export const JOB_LOOKUP_PAGE_SIZE = 10;

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

export function formatJob(item: SearchResultItem) {
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

export function formatJobFull(item: SearchResultItem) {
  const d = item.MatchedObjectDescriptor;
  const details = d.UserArea.Details;
  return {
    ...formatJob(item),
    job_summary: details.JobSummary,
    major_duties: details.MajorDuties,
    qualification_summary: d.QualificationSummary,
  };
}

export async function lookupJobById(
  client: AxiosInstance,
  jobId: string,
): Promise<SearchResultItem | null> {
  const result = await searchJobs(client, {
    Keyword: jobId,
    ResultsPerPage: JOB_LOOKUP_PAGE_SIZE,
  });
  return result.SearchResultItems.find(
    (i) => i.MatchedObjectId === jobId,
  ) ?? null;
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
  let item;
  try {
    item = await lookupJobById(client, params.job_id);
  } catch {
    return {
      content: [{ type: 'text', text: 'Unable to search USAJobs at this time. Please try again later.' }],
      isError: true,
    };
  }

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

export async function handleCompareJobs(
  client: AxiosInstance,
  params: { job_ids: string[]; include_details?: boolean },
): Promise<CallToolResult> {
  const uniqueIds = [...new Set(params.job_ids)];

  if (uniqueIds.length < 2 || uniqueIds.length > 5) {
    return {
      content: [
        {
          type: 'text',
          text: `Please provide 2 to 5 unique job IDs to compare. Got ${uniqueIds.length}.`,
        },
      ],
      isError: true,
    };
  }

  const results = await Promise.allSettled(
    uniqueIds.map((id) => lookupJobById(client, id)),
  );

  const jobs: ReturnType<typeof formatJob>[] = [];
  const notFound: string[] = [];
  const errors: string[] = [];

  for (let i = 0; i < uniqueIds.length; i++) {
    const result = results[i];
    const id = uniqueIds[i];

    if (result.status === 'rejected') {
      errors.push(id);
    } else if (result.value === null) {
      notFound.push(id);
    } else {
      const formatted = params.include_details
        ? formatJobFull(result.value)
        : formatJob(result.value);
      jobs.push(formatted);
    }
  }

  if (jobs.length === 0) {
    const details: string[] = [];
    if (notFound.length > 0) details.push(`Not found: ${notFound.join(', ')}`);
    if (errors.length > 0) details.push(`Errors: ${errors.join(', ')}`);

    return {
      content: [
        {
          type: 'text',
          text: `None of the requested jobs could be found.${details.length > 0 ? ` ${details.join('. ')}.` : ''}`,
        },
      ],
      isError: true,
    };
  }

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify({ jobs, not_found: notFound, errors }, null, 2),
      },
    ],
  };
}
