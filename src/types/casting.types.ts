/**
 * Casting/Job Model Type Definitions
 * Define all casting-related types and interfaces
 */

export interface IRequirement {
  gender: 'Male' | 'Female' | 'Any';
  minAge?: number;
  maxAge?: number;
}

export interface IRecruiter {
  name: string;
  productionHouse?: string;
  url?: string;
}

export interface IApplication {
  userId: string;
  appId: string;
  avatarUrl?: string;
  status?: 0 | 1 | 2; // 0 = Not Applied, 1 = Applied, 2 = Shortlisted
}

export interface IDocument {
  id: string;
  url: string;
  type: 'pdf' | 'image' | 'video' | 'script';
}

export interface ICastingJob {
  jobId: string;
  userId: string; // Casting director/recruiter ID
  jobTitle: string;
  jobDescription: string;
  jobCategory: 'Acting' | 'Singing' | 'Dancing' | 'Modeling' | 'Writing' | 'Editing' | 'Photography' | 'Makeup' | 'Voice Acting' | 'Comedy' | 'Production' | 'Design';
  jobType: 'Online' | 'Offline';
  jobLocation: string[];
  tags: string[];
  view: number;
  verified: boolean;
  isExpired: boolean;
  isCollab: boolean;
  isWishlisted: boolean;
  imageUrl?: string;
  expiryDate?: Date | string;
  applicationStatus: 0 | 1 | 2;
  appliedBy: IApplication[];
  recruiter: IRecruiter[];
  requirements: IRequirement[];
  documents: IDocument[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Request/Response Types
 */
export interface ICreateJobRequest {
  userId: string;
  jobTitle: string;
  jobDescription: string;
  jobCategory: string;
  jobType: string;
  jobLocation?: string[];
  tags?: string[];
  imageUrl?: string;
  expiryDate?: string;
  isCollab?: boolean;
  recruiter?: IRecruiter[];
  requirements?: IRequirement[];
  documents?: IDocument[];
}

export interface IUpdateJobRequest extends Partial<ICreateJobRequest> {}

export interface IApplyForJobRequest {
  userId: string;
  avatarUrl?: string;
}

export interface IUpdateApplicationStatusRequest {
  status: 1 | 2;
}

export interface IAddDocumentRequest {
  url: string;
  type: 'pdf' | 'image' | 'video' | 'script';
}

export interface ICastingSearchRequest {
  q: string;
  type?: 'category' | 'title' | 'location' | 'tags';
  limit?: number;
}

export interface IApiResponse<T = any> {
  statusCode: number;
  headers: {
    'Content-Type': string;
    'Access-Control-Allow-Origin': string;
    'Access-Control-Allow-Credentials': boolean;
  };
  body: string;
}

export interface ISuccessResponse<T = any> {
  success: true;
  message: string;
  data?: T;
  [key: string]: any;
}

export interface IErrorResponse {
  success: false;
  message: string;
  details?: string | object;
}
