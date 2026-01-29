/**
 * User Model Type Definitions
 * Define all user-related types and interfaces
 */

export interface IPhysicalStats {
  height: string;
  weight: string;
  bust?: string;
  waist?: string;
  hips?: string;
  chest?: string;
  biceps?: string;
  hairType?: string;
  hairLength?: string;
}

export interface ISkills {
  languages: string[];
  expertise: string[];
  hobbies: string[];
}

export interface IBasicDetails {
  firstName: string;
  lastName: string;
  fullName: string;
  avatarUrl?: string;
  gender?: 'Male' | 'Female' | 'Other' | 'Prefer not to say';
  category: string[];
  birthDate?: Date | string;
  age?: number;
  city?: string;
}

export interface IContactDetails {
  email: string;
  phone?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  youtube?: string;
}

export interface IWorkExperience {
  id: string;
  workType: 'Exhibition' | 'Commission' | 'Performance' | 'Project';
  brand: string;
  verified: boolean;
  workLink?: string;
  createdAt: Date | string;
}

export interface IPortfolioItem {
  id: string;
  url: string;
  type: 'image' | 'video';
  selected: boolean;
  uploadedAt: Date | string;
}

export interface IAppliedJob {
  appId: string;
  jobId: string;
  avatarUrl?: string;
}

export interface IConnection {
  connectionId: string;
  senderId: string;
  receiverId: string;
  chatId: string;
  connectionStatus: 'pending' | 'connected' | 'rejected';
  connectedAt: Date | string;
}

export interface IRequest {
  connectionId: string;
  userId: string;
  chatId: string;
}

export interface ISubscription {
  activePlan: 'free' | 'premium' | 'professional';
  startDate: Date | string;
  renewalDate?: Date | string;
  status: 'active' | 'inactive' | 'cancelled';
}

export interface ITokens {
  AccessToken: string;
  RefreshToken: string;
  IdToken: string;
}

export interface IUser {
  userId: string;
  username: string;
  email: string;
  privacy: 'public' | 'private' | 'semi-private';
  currentPlan: 'free' | 'premium' | 'professional';
  view: number;
  aboutMe?: string;
  device_tokens: string[];
  subscription: ISubscription;
  tokens: ITokens;
  basicDetails: IBasicDetails;
  contactDetails: IContactDetails;
  physicalStats: IPhysicalStats;
  skills: ISkills;
  workExperience: IWorkExperience[];
  portfolio: IPortfolioItem[];
  appliedJobs: IAppliedJob[];
  requestSent: IRequest[];
  requestReceived: IRequest[];
  connections: IConnection[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

/**
 * Request/Response Types
 */
export interface ICreateUserRequest {
  username: string;
  email: string;
  privacy?: string;
  currentPlan?: string;
  aboutMe?: string;
  basicDetails?: Partial<IBasicDetails>;
  contactDetails?: Partial<IContactDetails>;
  physicalStats?: Partial<IPhysicalStats>;
  skills?: Partial<ISkills>;
  subscription?: Partial<ISubscription>;
  tokens?: Partial<ITokens>;
}

export interface IUpdateUserRequest extends Partial<ICreateUserRequest> {}

export interface IAddWorkExperienceRequest {
  workType: string;
  brand: string;
  workLink?: string;
  verified?: boolean;
}

export interface IAddPortfolioRequest {
  url: string;
  type: 'image' | 'video';
  selected?: boolean;
}

export interface IAddConnectionRequest {
  senderId: string;
  receiverId: string;
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
