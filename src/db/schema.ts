import { relations } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// 1. Master Kecamatan Kabupaten Sidoarjo
export const districts = pgTable('districts', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 16 }).notNull().unique(),
  name: varchar('name', { length: 120 }).notNull().unique(),
});

// 2. Akun & Hak Akses (RBAC)
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: varchar('email', { length: 255 }).notNull(),
  fullName: varchar('full_name', { length: 200 }),
  role: varchar('role', { length: 32 }).notNull().default('anggota'), // anggota | pengurus | operator | admin | super_admin
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const roles = pgTable('roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 32 }).notNull().unique(),
  label: varchar('label', { length: 80 }).notNull(),
  description: text('description'),
});

export const userRoles = pgTable('user_roles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  roleId: uuid('role_id')
    .references(() => roles.id, { onDelete: 'cascade' })
    .notNull(),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
});

// 3. Anggota Induk, Kontak, Domisili
export const members = pgTable('members', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  memberNumber: varchar('member_number', { length: 64 }).unique(),
  fullName: varchar('full_name', { length: 200 }).notNull(),
  birthPlace: varchar('birth_place', { length: 120 }),
  birthDate: varchar('birth_date', { length: 20 }), // YYYY-MM-DD
  gender: varchar('gender', { length: 24 }), // Laki-laki | Perempuan
  photoPath: text('photo_path'),
  homeDistrictId: uuid('home_district_id').references(() => districts.id),
  recordStatus: varchar('record_status', { length: 32 }).notNull().default('draft'), // draft | submitted | verified | needs_revision | archived
  privacyConsentGiven: boolean('privacy_consent_given').notNull().default(false),
  privacyConsentAt: timestamp('privacy_consent_at'),
  narasumberConsent: boolean('narasumber_consent').notNull().default(false),
  dataSourceType: varchar('data_source_type', { length: 32 }).notNull().default('self_service'), // self_service | assisted | archive_import
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const memberContacts = pgTable('member_contacts', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberId: uuid('member_id')
    .references(() => members.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  phone: varchar('phone', { length: 32 }),
  email: varchar('email', { length: 255 }),
  emergencyContact: varchar('emergency_contact', { length: 120 }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const memberAddresses = pgTable('member_addresses', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberId: uuid('member_id')
    .references(() => members.id, { onDelete: 'cascade' })
    .notNull()
    .unique(),
  districtId: uuid('district_id').references(() => districts.id),
  village: varchar('village', { length: 120 }),
  addressLine: text('address_line'),
  postalCode: varchar('postal_code', { length: 16 }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 4. Master Angkatan & Riwayat Penugasan Paskibraka
export const cohorts = pgTable('cohorts', {
  id: uuid('id').defaultRandom().primaryKey(),
  cohortYear: integer('cohort_year').notNull().unique(),
  cohortName: varchar('cohort_name', { length: 120 }).notNull(),
  description: text('description'),
  archiveStatus: varchar('archive_status', { length: 24 }).notNull().default('available'), // available | partial | missing
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const memberPaskibrakaHistory = pgTable('member_paskibraka_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberId: uuid('member_id')
    .references(() => members.id, { onDelete: 'cascade' })
    .notNull(),
  cohortId: uuid('cohort_id')
    .references(() => cohorts.id, { onDelete: 'restrict' })
    .notNull(),
  assignmentLevel: varchar('assignment_level', { length: 32 }).notNull().default('Kabupaten'), // Kabupaten | Provinsi | Nasional
  schoolName: varchar('school_name', { length: 200 }).notNull(),
  unitRole: varchar('unit_role', { length: 80 }),
  verificationStatus: varchar('verification_status', { length: 32 }).notNull().default('pending'), // pending | verified | needs_revision
  sourceNotes: text('source_notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 5. Riwayat Pendidikan & Pekerjaan (1:N)
export const memberEducation = pgTable('member_education', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberId: uuid('member_id')
    .references(() => members.id, { onDelete: 'cascade' })
    .notNull(),
  level: varchar('level', { length: 32 }).notNull(), // SMA/SMK | D3 | S1/D4 | S2 | S3
  institution: varchar('institution', { length: 200 }).notNull(),
  major: varchar('major', { length: 160 }),
  startYear: integer('start_year'),
  endYear: integer('end_year'),
  isCurrent: boolean('is_current').notNull().default(false),
});

export const memberEmployment = pgTable('member_employment', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberId: uuid('member_id')
    .references(() => members.id, { onDelete: 'cascade' })
    .notNull(),
  sector: varchar('sector', { length: 64 }).notNull(),
  organizationName: varchar('organization_name', { length: 200 }).notNull(),
  positionTitle: varchar('position_title', { length: 160 }).notNull(),
  startYear: integer('start_year'),
  isCurrent: boolean('is_current').notNull().default(true),
});

// 6. Kompetensi & Sertifikasi
export const skills = pgTable('skills', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 120 }).notNull().unique(),
  category: varchar('category', { length: 80 }).notNull(),
});

export const memberSkills = pgTable('member_skills', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberId: uuid('member_id')
    .references(() => members.id, { onDelete: 'cascade' })
    .notNull(),
  skillId: uuid('skill_id')
    .references(() => skills.id, { onDelete: 'cascade' })
    .notNull(),
  proficiencyLevel: varchar('proficiency_level', { length: 32 }).notNull().default('Menengah'), // Dasar | Menengah | Mahir | Instruktur
  yearsExperience: integer('years_experience').notNull().default(1),
  evidenceNotes: text('evidence_notes'),
  availableAsSpeaker: boolean('available_as_speaker').notNull().default(false),
});

export const certifications = pgTable('certifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberId: uuid('member_id')
    .references(() => members.id, { onDelete: 'cascade' })
    .notNull(),
  title: varchar('title', { length: 200 }).notNull(),
  issuer: varchar('issuer', { length: 160 }).notNull(),
  issuedYear: integer('issued_year'),
  credentialNote: text('credential_note'),
});

// 7. Organisasi, Periode, Jabatan, Keanggotaan
export const organizations = pgTable('organizations', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 200 }).notNull(),
  shortName: varchar('short_name', { length: 48 }).notNull(),
  category: varchar('category', { length: 80 }).notNull(),
  description: text('description'),
});

export const organizationPeriods = pgTable('organization_periods', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  periodLabel: varchar('period_label', { length: 64 }).notNull(),
  startYear: integer('start_year').notNull(),
  endYear: integer('end_year').notNull(),
  isCurrent: boolean('is_current').notNull().default(false),
});

export const organizationPositions = pgTable('organization_positions', {
  id: uuid('id').defaultRandom().primaryKey(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  title: varchar('title', { length: 120 }).notNull(),
  rankOrder: integer('rank_order').notNull().default(1),
});

export const organizationMemberships = pgTable('organization_memberships', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberId: uuid('member_id')
    .references(() => members.id, { onDelete: 'cascade' })
    .notNull(),
  organizationId: uuid('organization_id')
    .references(() => organizations.id, { onDelete: 'cascade' })
    .notNull(),
  periodId: uuid('period_id').references(() => organizationPeriods.id, { onDelete: 'set null' }),
  positionId: uuid('position_id').references(() => organizationPositions.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 32 }).notNull().default('aktif'),
});

// 8. Program Pembinaan & Kegiatan
export const programs = pgTable('programs', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: varchar('title', { length: 200 }).notNull(),
  targetAudience: varchar('target_audience', { length: 160 }).notNull(),
  scheduleSummary: varchar('schedule_summary', { length: 160 }),
  description: text('description'),
  status: varchar('status', { length: 32 }).notNull().default('aktif'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const programParticipants = pgTable('program_participants', {
  id: uuid('id').defaultRandom().primaryKey(),
  programId: uuid('program_id')
    .references(() => programs.id, { onDelete: 'cascade' })
    .notNull(),
  memberId: uuid('member_id')
    .references(() => members.id, { onDelete: 'cascade' })
    .notNull(),
  role: varchar('role', { length: 64 }).notNull().default('Peserta'),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
});

export const activities = pgTable('activities', {
  id: uuid('id').defaultRandom().primaryKey(),
  programId: uuid('program_id').references(() => programs.id, { onDelete: 'set null' }),
  title: varchar('title', { length: 200 }).notNull(),
  organizer: varchar('organizer', { length: 160 }).notNull(),
  location: varchar('location', { length: 160 }).notNull(),
  activityDate: varchar('activity_date', { length: 20 }).notNull(),
  description: text('description'),
  documentationNotes: text('documentation_notes'),
  status: varchar('status', { length: 32 }).notNull().default('terlaksana'), // terjadwal | terlaksana | dibatalkan
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const activityParticipants = pgTable('activity_participants', {
  id: uuid('id').defaultRandom().primaryKey(),
  activityId: uuid('activity_id')
    .references(() => activities.id, { onDelete: 'cascade' })
    .notNull(),
  memberId: uuid('member_id')
    .references(() => members.id, { onDelete: 'cascade' })
    .notNull(),
  participationRole: varchar('participation_role', { length: 64 }).notNull().default('Peserta'),
  attendanceStatus: varchar('attendance_status', { length: 32 }).notNull().default('hadir'),
});

// 9. Verifikasi, Bukti Pendukung & Undangan Registrasi
export const verificationRequests = pgTable('verification_requests', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberId: uuid('member_id')
    .references(() => members.id, { onDelete: 'cascade' })
    .notNull(),
  submittedByUserId: uuid('submitted_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  reviewerUserId: uuid('reviewer_user_id').references(() => users.id, { onDelete: 'set null' }),
  status: varchar('status', { length: 32 }).notNull().default('pending'), // pending | verified | needs_revision
  submissionNotes: text('submission_notes'),
  reviewNotes: text('review_notes'),
  submittedAt: timestamp('submitted_at').defaultNow().notNull(),
  reviewedAt: timestamp('reviewed_at'),
});

export const verificationHistory = pgTable('verification_history', {
  id: uuid('id').defaultRandom().primaryKey(),
  verificationRequestId: uuid('verification_request_id').references(() => verificationRequests.id, { onDelete: 'cascade' }),
  memberId: uuid('member_id')
    .references(() => members.id, { onDelete: 'cascade' })
    .notNull(),
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  action: varchar('action', { length: 64 }).notNull(),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const memberDocuments = pgTable('member_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberId: uuid('member_id')
    .references(() => members.id, { onDelete: 'cascade' })
    .notNull(),
  documentType: varchar('document_type', { length: 64 }).notNull(), // SK_Penugasan | Piagam_Paskibraka | Sertifikat_Kompetensi | Konfirmasi_Arsip
  title: varchar('title', { length: 200 }).notNull(),
  referenceNumber: varchar('reference_number', { length: 120 }),
  verificationMethod: varchar('verification_method', { length: 48 }).notNull().default('digital_reference'), // digital_reference | archive_confirmation | officer_validation
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const registrationInvitations = pgTable('registration_invitations', {
  id: uuid('id').defaultRandom().primaryKey(),
  memberId: uuid('member_id').references(() => members.id, { onDelete: 'set null' }),
  cohortYear: integer('cohort_year').notNull(),
  inviteeName: varchar('invitee_name', { length: 200 }).notNull(),
  contactHint: varchar('contact_hint', { length: 160 }),
  token: varchar('token', { length: 64 }).notNull().unique(),
  status: varchar('status', { length: 24 }).notNull().default('active'), // active | claimed | expired
  expiresAt: timestamp('expires_at').notNull(),
  createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 10. Sistem: Audit Log, Notifikasi, Pengaturan
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
  actorEmail: varchar('actor_email', { length: 255 }),
  actorRole: varchar('actor_role', { length: 32 }),
  action: varchar('action', { length: 80 }).notNull(),
  entityType: varchar('entity_type', { length: 64 }).notNull(),
  entityId: varchar('entity_id', { length: 80 }),
  purpose: text('purpose'),
  metadataJson: text('metadata_json'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  title: varchar('title', { length: 160 }).notNull(),
  message: text('message').notNull(),
  isRead: boolean('is_read').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const systemSettings = pgTable('system_settings', {
  id: uuid('id').defaultRandom().primaryKey(),
  key: varchar('key', { length: 80 }).notNull().unique(),
  value: text('value').notNull(),
  description: text('description'),
  updatedByUserId: uuid('updated_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const verifierAccessCodes = pgTable('verifier_access_codes', {
  id: uuid('id').defaultRandom().primaryKey(),
  code: varchar('code', { length: 64 }).notNull().unique(),
  targetRole: varchar('target_role', { length: 32 }).notNull().default('operator'), // operator | admin
  assignedEmail: varchar('assigned_email', { length: 255 }),
  label: varchar('label', { length: 160 }).notNull(),
  status: varchar('status', { length: 24 }).notNull().default('active'), // active | used | revoked
  expiresAt: timestamp('expires_at').notNull(),
  usedByUserId: uuid('used_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdByUserId: uuid('created_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Drizzle Relations
export const membersRelations = relations(members, ({ one, many }) => ({
  user: one(users, { fields: [members.userId], references: [users.id] }),
  homeDistrict: one(districts, { fields: [members.homeDistrictId], references: [districts.id] }),
  contact: one(memberContacts, { fields: [members.id], references: [memberContacts.memberId] }),
  address: one(memberAddresses, { fields: [members.id], references: [memberAddresses.memberId] }),
  paskibrakaHistory: many(memberPaskibrakaHistory),
  education: many(memberEducation),
  employment: many(memberEmployment),
  skills: many(memberSkills),
  certifications: many(certifications),
  organizationMemberships: many(organizationMemberships),
  activityParticipants: many(activityParticipants),
  programParticipants: many(programParticipants),
  verificationRequests: many(verificationRequests),
  documents: many(memberDocuments),
}));

export const memberPaskibrakaHistoryRelations = relations(memberPaskibrakaHistory, ({ one }) => ({
  member: one(members, { fields: [memberPaskibrakaHistory.memberId], references: [members.id] }),
  cohort: one(cohorts, { fields: [memberPaskibrakaHistory.cohortId], references: [cohorts.id] }),
}));

export const memberSkillsRelations = relations(memberSkills, ({ one }) => ({
  member: one(members, { fields: [memberSkills.memberId], references: [members.id] }),
  skill: one(skills, { fields: [memberSkills.skillId], references: [skills.id] }),
}));

export const organizationMembershipsRelations = relations(organizationMemberships, ({ one }) => ({
  member: one(members, { fields: [organizationMemberships.memberId], references: [members.id] }),
  organization: one(organizations, { fields: [organizationMemberships.organizationId], references: [organizations.id] }),
  period: one(organizationPeriods, { fields: [organizationMemberships.periodId], references: [organizationPeriods.id] }),
  position: one(organizationPositions, { fields: [organizationMemberships.positionId], references: [organizationPositions.id] }),
}));
