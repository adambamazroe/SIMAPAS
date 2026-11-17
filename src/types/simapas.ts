export type AppRole = 'anggota' | 'pengurus' | 'operator' | 'admin' | 'super_admin';

export interface RoleCapabilities {
  canViewAllMembers: boolean;
  canViewSensitivePersonalData: boolean;
  canVerifyMembers: boolean;
  canManageCohorts: boolean;
  canManageOrganizations: boolean;
  canManageActivities: boolean;
  canViewAggregateStats: boolean;
  canExportData: boolean;
  canManageUsersAndRoles: boolean;
  canManageSystemSettings: boolean;
  canViewAuditLogs: boolean;
  canAssistRegistration: boolean;
}

export interface District {
  id: string;
  code: string;
  name: string;
}

export interface Cohort {
  id: string;
  cohortYear: number;
  cohortName: string;
  description: string | null;
  archiveStatus: 'available' | 'partial' | 'missing';
  isActive: boolean;
}

export interface SkillMaster {
  id: string;
  name: string;
  category: string;
}

export interface OrganizationMaster {
  id: string;
  name: string;
  shortName: string;
  category: string;
  description: string | null;
  periods: Array<{
    id: string;
    organizationId: string;
    periodLabel: string;
    startYear: number;
    endYear: number;
    isCurrent: boolean;
  }>;
  positions: Array<{
    id: string;
    organizationId: string;
    title: string;
    rankOrder: number;
  }>;
}

export interface MemberBundle {
  id: string;
  userId: string | null;
  memberNumber: string | null;
  fullName: string;
  birthPlace: string | null;
  birthDate: string | null;
  gender: string | null;
  homeDistrictId: string | null;
  homeDistrictName: string | null;
  recordStatus: 'draft' | 'submitted' | 'verified' | 'needs_revision' | 'archived';
  privacyConsentGiven: boolean;
  privacyConsentAt: string | null;
  narasumberConsent: boolean;
  dataSourceType: string;
  createdAt: string;
  updatedAt: string;
  redactedForRole?: boolean;
  contact: {
    phone: string | null;
    email: string | null;
    emergencyContact: string | null;
  } | null;
  address: {
    districtId: string | null;
    village: string | null;
    addressLine: string | null;
    postalCode: string | null;
  } | null;
  paskibrakaHistory: Array<{
    id?: string;
    cohortId: string;
    cohortYear?: number | null;
    cohortName?: string | null;
    assignmentLevel: string;
    schoolName: string;
    unitRole: string | null;
    verificationStatus?: string;
    sourceNotes?: string | null;
  }>;
  education: Array<{
    id?: string;
    level: string;
    institution: string;
    major: string | null;
    startYear: number | null;
    endYear: number | null;
    isCurrent: boolean;
  }>;
  employment: Array<{
    id?: string;
    sector: string;
    organizationName: string;
    positionTitle: string;
    startYear: number | null;
    isCurrent: boolean;
  }>;
  skills: Array<{
    id?: string;
    skillId: string;
    skillName?: string;
    skillCategory?: string;
    proficiencyLevel: string;
    yearsExperience: number;
    evidenceNotes: string | null;
    availableAsSpeaker: boolean;
  }>;
  certifications: Array<{
    id?: string;
    title: string;
    issuer: string;
    issuedYear: number | null;
    credentialNote: string | null;
  }>;
  organizations: Array<{
    id?: string;
    organizationId: string;
    organizationName?: string;
    shortName?: string;
    periodId: string | null;
    periodLabel?: string | null;
    positionId: string | null;
    positionTitle?: string | null;
    status: string;
  }>;
  documents: Array<{
    id?: string;
    documentType: string;
    title: string;
    referenceNumber: string | null;
    verificationMethod: string;
    notes: string | null;
  }>;
  verificationRequests?: Array<{
    id: string;
    status: string;
    submissionNotes: string | null;
    reviewNotes: string | null;
    submittedAt: string;
    reviewedAt: string | null;
  }>;
  verificationHistory?: Array<{
    id: string;
    action: string;
    notes: string | null;
    createdAt: string;
  }>;
}

export interface SessionResponse {
  user: {
    id: string;
    email: string;
    fullName: string | null;
    actualRole: AppRole;
    effectiveRole: AppRole;
  };
  capabilities: RoleCapabilities;
  ownMember: MemberBundle | null;
  notifications: Array<{
    id: string;
    title: string;
    message: string;
    isRead: boolean;
    createdAt: string;
  }>;
}

export interface AnalyticsResponse {
  statusCounts: {
    total: number;
    verified: number;
    submitted: number;
    needs_revision: number;
    draft: number;
    archived: number;
  };
  pendingVerifications: number;
  totalActivities: number;
  byCohort: Array<{
    id: string;
    cohortYear: number;
    cohortName: string;
    archiveStatus: string;
    memberCount: number;
  }>;
  byDistrict: Array<{
    id: string;
    name: string;
    memberCount: number;
  }>;
  byEducation: Array<{ label: string; total: number }>;
  byEmployment: Array<{ label: string; total: number }>;
  bySkill: Array<{
    id: string;
    name: string;
    category: string;
    memberCount: number;
    speakerCount: number;
  }>;
  byOrganization: Array<{
    id: string;
    shortName: string;
    name: string;
    memberCount: number;
  }>;
}
