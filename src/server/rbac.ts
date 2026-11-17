export type AppRole = 'anggota' | 'pengurus' | 'operator' | 'admin' | 'super_admin';

export const ALL_ROLES: AppRole[] = ['anggota', 'pengurus', 'operator', 'admin', 'super_admin'];

export const ROLE_LABELS: Record<AppRole, string> = {
  anggota: 'Anggota Purna Paskibraka',
  pengurus: 'Pengurus Organisasi',
  operator: 'Operator Bakesbangpol',
  admin: 'Administrator',
  super_admin: 'Super Administrator',
};

export interface RoleCapabilities {
  canViewAllMembers: boolean;
  canViewSensitivePersonalData: boolean; // birthDate, phone, address, documents of OTHER members
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

export const RBAC_MATRIX: Record<AppRole, RoleCapabilities> = {
  anggota: {
    canViewAllMembers: false,
    canViewSensitivePersonalData: false,
    canVerifyMembers: false,
    canManageCohorts: false,
    canManageOrganizations: false,
    canManageActivities: false,
    canViewAggregateStats: false,
    canExportData: false,
    canManageUsersAndRoles: false,
    canManageSystemSettings: false,
    canViewAuditLogs: false,
    canAssistRegistration: false,
  },
  pengurus: {
    canViewAllMembers: true,
    canViewSensitivePersonalData: false, // PRD Sec 5 & 9: Tidak menampilkan Tgl Lahir, Telp, Alamat, Dokumen ke Pengurus
    canVerifyMembers: false,
    canManageCohorts: false,
    canManageOrganizations: true,
    canManageActivities: true,
    canViewAggregateStats: true,
    canExportData: false,
    canManageUsersAndRoles: false,
    canManageSystemSettings: false,
    canViewAuditLogs: false,
    canAssistRegistration: false,
  },
  operator: {
    canViewAllMembers: true,
    canViewSensitivePersonalData: true,
    canVerifyMembers: true,
    canManageCohorts: true,
    canManageOrganizations: true,
    canManageActivities: true,
    canViewAggregateStats: true,
    canExportData: true,
    canManageUsersAndRoles: false,
    canManageSystemSettings: false,
    canViewAuditLogs: true,
    canAssistRegistration: true,
  },
  admin: {
    canViewAllMembers: true,
    canViewSensitivePersonalData: true,
    canVerifyMembers: true,
    canManageCohorts: true,
    canManageOrganizations: true,
    canManageActivities: true,
    canViewAggregateStats: true,
    canExportData: true,
    canManageUsersAndRoles: true,
    canManageSystemSettings: false,
    canViewAuditLogs: true,
    canAssistRegistration: true,
  },
  super_admin: {
    canViewAllMembers: true,
    canViewSensitivePersonalData: true,
    canVerifyMembers: true,
    canManageCohorts: true,
    canManageOrganizations: true,
    canManageActivities: true,
    canViewAggregateStats: true,
    canExportData: true,
    canManageUsersAndRoles: true,
    canManageSystemSettings: true,
    canViewAuditLogs: true,
    canAssistRegistration: true,
  },
};

export function getCapabilities(role: AppRole): RoleCapabilities {
  return RBAC_MATRIX[role] || RBAC_MATRIX.anggota;
}

export function isValidRole(value: string): value is AppRole {
  return ALL_ROLES.includes(value as AppRole);
}
