import axios, { type AxiosInstance } from 'axios';
import { createLogger } from '../logger.js';

const log = createLogger('api');

const BASE_URL = 'https://data.usajobs.gov/api';

export interface SearchParams {
  Keyword?: string;
  ControlNumber?: string;
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

export function createApiClient(apiKey: string, email: string): AxiosInstance {
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
      log('%s %s → %d', response.config.method?.toUpperCase(), response.config.url, response.status);
      return response;
    },
    (error) => {
      log('ERROR %s %s → %s', error.config?.method?.toUpperCase(), error.config?.url, error.message);
      return Promise.reject(error);
    },
  );

  return client;
}

export async function searchJobs(client: AxiosInstance, params: SearchParams): Promise<SearchResult> {
  const response = await client.get('/search', { params });
  return response.data.SearchResult;
}

export async function fetchCodelist(name: string): Promise<CodelistResult> {
  const response = await axios.get(`${BASE_URL}/codelist/${name}`);
  return response.data;
}
