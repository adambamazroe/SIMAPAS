import crypto from 'node:crypto';
import { Router, type Response } from 'express';
import { and, desc, eq, ilike, sql } from 'drizzle-orm';
import { db } from '../db/index.ts';
import {
  activities,
  activityParticipants,
  auditLogs,
  certifications,
  cohorts,
  districts,
  memberAddresses,
  memberContacts,
  memberDocuments,
  memberEducation,
  memberEmployment,
  memberPaskibrakaHistory,
  memberSkills,
  members,
  notifications,
  organizationMemberships,
  organizationPeriods,
  organizationPositions,
  organizations,
  programParticipants,
  programs,
  registrationInvitations,
  roles,
  skills,
  systemSettings,
  userRoles,
  users,
  verificationHistory,
  verificationRequests,
  verifierAccessCodes,
} from '../db/schema.ts';
import { ensureSeeded } from '../db/seed.ts';
import type { AuthRequest } from '../middleware/auth.ts';
import { requireAuth } from '../middleware/auth.ts';
import { type AppRole, getCapabilities, isValidRole } from './rbac.ts';

export const apiRouter = Router();

async function logAudit(params: {
  actorUserId?: string | null;
  actorEmail?: string | null;
  actorRole?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  purpose?: string | null;
  metadata?: Record<string, unknown>;
}) {
  try {
    await db.insert(auditLogs).values({
      actorUserId: params.actorUserId ?? null,
      actorEmail: params.actorEmail ?? null,
      actorRole: params.actorRole ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId ?? null,
      purpose: params.purpose ?? null,
      metadataJson: params.metadata ? JSON.stringify(params.metadata) : null,
    });
  } catch (err) {
    console.error('Audit log insert failed:', err);
  }
}

async function fetchFullMemberBundle(memberId: string, includeSensitive: boolean) {
  const memberRows = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
  if (memberRows.length === 0) return null;
  const m = memberRows[0];

  const [
    districtRows,
    contactRows,
    addressRows,
    historyRows,
    eduRows,
    empRows,
    skillRows,
    certRows,
    orgRows,
    docRows,
    vrRows,
    vhRows,
  ] = await Promise.all([
    m.homeDistrictId ? db.select().from(districts).where(eq(districts.id, m.homeDistrictId)).limit(1) : Promise.resolve([]),
    includeSensitive ? db.select().from(memberContacts).where(eq(memberContacts.memberId, m.id)).limit(1) : Promise.resolve([]),
    includeSensitive ? db.select().from(memberAddresses).where(eq(memberAddresses.memberId, m.id)).limit(1) : Promise.resolve([]),
    db
      .select({
        id: memberPaskibrakaHistory.id,
        cohortId: memberPaskibrakaHistory.cohortId,
        cohortYear: cohorts.cohortYear,
        cohortName: cohorts.cohortName,
        assignmentLevel: memberPaskibrakaHistory.assignmentLevel,
        schoolName: memberPaskibrakaHistory.schoolName,
        unitRole: memberPaskibrakaHistory.unitRole,
        verificationStatus: memberPaskibrakaHistory.verificationStatus,
        sourceNotes: memberPaskibrakaHistory.sourceNotes,
      })
      .from(memberPaskibrakaHistory)
      .innerJoin(cohorts, eq(memberPaskibrakaHistory.cohortId, cohorts.id))
      .where(eq(memberPaskibrakaHistory.memberId, m.id)),
    db.select().from(memberEducation).where(eq(memberEducation.memberId, m.id)),
    db.select().from(memberEmployment).where(eq(memberEmployment.memberId, m.id)),
    db
      .select({
        id: memberSkills.id,
        skillId: memberSkills.skillId,
        skillName: skills.name,
        skillCategory: skills.category,
        proficiencyLevel: memberSkills.proficiencyLevel,
        yearsExperience: memberSkills.yearsExperience,
        evidenceNotes: memberSkills.evidenceNotes,
        availableAsSpeaker: memberSkills.availableAsSpeaker,
      })
      .from(memberSkills)
      .innerJoin(skills, eq(memberSkills.skillId, skills.id))
      .where(eq(memberSkills.memberId, m.id)),
    db.select().from(certifications).where(eq(certifications.memberId, m.id)),
    db
      .select({
        id: organizationMemberships.id,
        organizationId: organizationMemberships.organizationId,
        organizationName: organizations.name,
        shortName: organizations.shortName,
        periodId: organizationMemberships.periodId,
        periodLabel: organizationPeriods.periodLabel,
        positionId: organizationMemberships.positionId,
        positionTitle: organizationPositions.title,
        status: organizationMemberships.status,
      })
      .from(organizationMemberships)
      .innerJoin(organizations, eq(organizationMemberships.organizationId, organizations.id))
      .leftJoin(organizationPeriods, eq(organizationMemberships.periodId, organizationPeriods.id))
      .leftJoin(organizationPositions, eq(organizationMemberships.positionId, organizationPositions.id))
      .where(eq(organizationMemberships.memberId, m.id)),
    includeSensitive ? db.select().from(memberDocuments).where(eq(memberDocuments.memberId, m.id)) : Promise.resolve([]),
    includeSensitive
      ? db.select().from(verificationRequests).where(eq(verificationRequests.memberId, m.id)).orderBy(desc(verificationRequests.submittedAt))
      : Promise.resolve([]),
    includeSensitive
      ? db.select().from(verificationHistory).where(eq(verificationHistory.memberId, m.id)).orderBy(desc(verificationHistory.createdAt))
      : Promise.resolve([]),
  ]);

  // Row-level minimization: redact sensitive fields when includeSensitive is false (e.g. Pengurus viewing other members)
  return {
    id: m.id,
    userId: m.userId,
    memberNumber: m.memberNumber,
    fullName: m.fullName,
    birthPlace: includeSensitive ? m.birthPlace : null,
    birthDate: includeSensitive ? m.birthDate : null,
    gender: m.gender,
    homeDistrictId: m.homeDistrictId,
    homeDistrictName: districtRows[0]?.name ?? null,
    recordStatus: m.recordStatus,
    privacyConsentGiven: m.privacyConsentGiven,
    privacyConsentAt: m.privacyConsentAt,
    narasumberConsent: m.narasumberConsent,
    dataSourceType: m.dataSourceType,
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
    redactedForRole: !includeSensitive,
    contact: includeSensitive ? (contactRows[0] ?? null) : null,
    address: includeSensitive ? (addressRows[0] ?? null) : null,
    paskibrakaHistory: historyRows,
    education: eduRows,
    employment: empRows,
    skills: skillRows,
    certifications: certRows,
    organizations: orgRows,
    documents: includeSensitive ? docRows : [],
    verificationRequests: includeSensitive ? vrRows : [],
    verificationHistory: includeSensitive ? vhRows : [],
  };
}

function sendError(res: Response, status: number, message: string, err?: unknown) {
  if (err) {
    console.error(message, err);
  }
  res.status(status).json({ error: message });
}

// 1. PUBLIC AGGREGATE SUMMARY (No personal data, PRD Sec 9 & 13)
apiRouter.get('/public/summary', async (_req, res) => {
  try {
    await ensureSeeded();
    const [allMembers, allCohorts, allDistricts, activePrograms] = await Promise.all([
      db.select({ status: members.recordStatus }).from(members),
      db.select({ id: cohorts.id, archiveStatus: cohorts.archiveStatus }).from(cohorts),
      db.select({ id: districts.id }).from(districts),
      db.select({ id: programs.id }).from(programs).where(eq(programs.status, 'aktif')),
    ]);

    const verifiedCount = allMembers.filter((m) => m.status === 'verified').length;
    res.json({
      totalMembers: allMembers.length,
      verifiedMembers: verifiedCount,
      totalCohorts: allCohorts.length,
      totalDistricts: allDistricts.length,
      activePrograms: activePrograms.length,
      institution: 'Badan Kesatuan Bangsa dan Politik Kabupaten Sidoarjo',
    });
  } catch (err) {
    sendError(res, 500, 'Gagal memuat ringkasan publik.', err);
  }
});

// 2. CURRENT SESSION & LINKED PROFILE
apiRouter.get('/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeeded();
    const dbUser = req.dbUser!;
    const effectiveRole = req.effectiveRole!;
    const capabilities = getCapabilities(effectiveRole);

    const ownMembers = await db.select().from(members).where(eq(members.userId, dbUser.id)).limit(1);
    const ownMemberBundle = ownMembers.length > 0 ? await fetchFullMemberBundle(ownMembers[0].id, true) : null;

    const userNotifs = await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, dbUser.id))
      .orderBy(desc(notifications.createdAt))
      .limit(15);

    res.json({
      user: {
        id: dbUser.id,
        email: dbUser.email,
        fullName: dbUser.fullName,
        actualRole: dbUser.role,
        effectiveRole,
      },
      capabilities,
      ownMember: ownMemberBundle,
      notifications: userNotifs,
    });
  } catch (err) {
    sendError(res, 500, 'Gagal memuat sesi pengguna.', err);
  }
});

// 2b. VERIFIER / ADMIN LOGIN AUTHORIZATION & ACTIVATION
apiRouter.post('/auth/verifier-login', requireAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeeded();
    const dbUser = req.dbUser!;
    const activationCode = String(req.body?.activationCode || '').trim().toUpperCase();
    const verifierRoles: AppRole[] = ['operator', 'admin', 'super_admin'];

    if (verifierRoles.includes(dbUser.role)) {
      await logAudit({
        actorUserId: dbUser.id,
        actorEmail: dbUser.email,
        actorRole: dbUser.role,
        action: 'VERIFIER_LOGIN_SUCCESS',
        entityType: 'users',
        entityId: dbUser.id,
        purpose: 'Masuk portal khusus Admin / Operator Verifikator Bakesbangpol',
      });
      res.json({ authorized: true, role: dbUser.role, activatedViaCode: false });
      return;
    }

    if (activationCode) {
      const codeRows = await db
        .select()
        .from(verifierAccessCodes)
        .where(eq(verifierAccessCodes.code, activationCode))
        .limit(1);

      if (codeRows.length === 0) {
        await logAudit({
          actorUserId: dbUser.id,
          actorEmail: dbUser.email,
          actorRole: dbUser.role,
          action: 'VERIFIER_LOGIN_DENIED',
          entityType: 'verifier_access_codes',
          purpose: 'Percobaan aktivasi kode verifikator tidak ditemukan',
        });
        sendError(res, 403, 'Kode aktivasi verifikator tidak ditemukan.');
        return;
      }

      const codeRow = codeRows[0];
      if (codeRow.status !== 'active') {
        sendError(res, 403, 'Kode aktivasi verifikator sudah digunakan atau dicabut.');
        return;
      }
      if (new Date(codeRow.expiresAt).getTime() < Date.now()) {
        sendError(res, 403, 'Kode aktivasi verifikator telah kedaluwarsa.');
        return;
      }
      if (codeRow.assignedEmail && codeRow.assignedEmail.toLowerCase() !== dbUser.email.toLowerCase()) {
        sendError(
          res,
          403,
          `Kode aktivasi ini hanya diperuntukkan bagi email ${codeRow.assignedEmail}.`
        );
        return;
      }

      const nextRole: AppRole = isValidRole(codeRow.targetRole) ? codeRow.targetRole : 'operator';

      await db
        .update(users)
        .set({ role: nextRole, updatedAt: new Date() })
        .where(eq(users.id, dbUser.id));

      const roleRow = await db.select().from(roles).where(eq(roles.code, nextRole)).limit(1);
      if (roleRow.length > 0) {
        await db.delete(userRoles).where(eq(userRoles.userId, dbUser.id));
        await db.insert(userRoles).values({ userId: dbUser.id, roleId: roleRow[0].id });
      }

      await db
        .update(verifierAccessCodes)
        .set({ status: 'used', usedByUserId: dbUser.id })
        .where(eq(verifierAccessCodes.id, codeRow.id));

      await logAudit({
        actorUserId: dbUser.id,
        actorEmail: dbUser.email,
        actorRole: nextRole,
        action: 'VERIFIER_CODE_ACTIVATED',
        entityType: 'verifier_access_codes',
        entityId: codeRow.id,
        purpose: `Aktivasi peran ${nextRole} melalui kode verifikator (${codeRow.label})`,
      });

      res.json({ authorized: true, role: nextRole, activatedViaCode: true });
      return;
    }

    await logAudit({
      actorUserId: dbUser.id,
      actorEmail: dbUser.email,
      actorRole: dbUser.role,
      action: 'VERIFIER_LOGIN_DENIED',
      entityType: 'users',
      entityId: dbUser.id,
      purpose: 'Percobaan masuk portal Admin Verifikator tanpa kewenangan',
    });

    sendError(
      res,
      403,
      `Akun Google (${dbUser.email}) saat ini berstatus ${dbUser.role} dan belum memiliki kewenangan Admin Verifikator. Masukkan Kode Aktivasi Verifikator atau hubungi Super Administrator Bakesbangpol.`
    );
  } catch (err) {
    sendError(res, 500, 'Gagal memverifikasi otorisasi Admin Verifikator.', err);
  }
});

apiRouter.post('/notifications/:id/read', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = String(req.params.id);
    await db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, id), eq(notifications.userId, req.dbUser!.id)));
    res.json({ ok: true });
  } catch (err) {
    sendError(res, 500, 'Gagal menandai notifikasi.', err);
  }
});

// 3. MASTER DATA
apiRouter.get('/masters', requireAuth, async (_req: AuthRequest, res) => {
  try {
    await ensureSeeded();
    const [districtList, cohortList, skillList, orgList, periodList, positionList] = await Promise.all([
      db.select().from(districts).orderBy(districts.name),
      db.select().from(cohorts).orderBy(desc(cohorts.cohortYear)),
      db.select().from(skills).orderBy(skills.category, skills.name),
      db.select().from(organizations).orderBy(organizations.name),
      db.select().from(organizationPeriods).orderBy(desc(organizationPeriods.startYear)),
      db.select().from(organizationPositions).orderBy(organizationPositions.rankOrder),
    ]);

    res.json({
      districts: districtList,
      cohorts: cohortList,
      skills: skillList,
      organizations: orgList.map((o) => ({
        ...o,
        periods: periodList.filter((p) => p.organizationId === o.id),
        positions: positionList.filter((pos) => pos.organizationId === o.id),
      })),
    });
  } catch (err) {
    sendError(res, 500, 'Gagal memuat data master.', err);
  }
});

// 4. SELF-SERVICE PROFILE SAVE / SUBMIT + DUPLICATE PREVENTION
apiRouter.post('/members/me', requireAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeeded();
    const dbUser = req.dbUser!;
    const body = req.body || {};

    const fullName = String(body.fullName || '').trim();
    const birthPlace = String(body.birthPlace || '').trim();
    const birthDate = String(body.birthDate || '').trim();
    const gender = String(body.gender || '').trim();
    const homeDistrictId = body.homeDistrictId ? String(body.homeDistrictId) : null;
    const privacyConsentGiven = Boolean(body.privacyConsentGiven);
    const narasumberConsent = Boolean(body.narasumberConsent);
    const submitForVerification = Boolean(body.submitForVerification);
    const submissionNotes = String(body.submissionNotes || '').trim();

    if (!fullName) {
      sendError(res, 400, 'Nama lengkap wajib diisi.');
      return;
    }
    if (submitForVerification && !privacyConsentGiven) {
      sendError(res, 400, 'Persetujuan pemberitahuan privasi (UU No. 27 Tahun 2022) wajib disetujui sebelum mengajukan verifikasi.');
      return;
    }

    const existingOwn = await db.select().from(members).where(eq(members.userId, dbUser.id)).limit(1);
    let memberId: string;
    let nextStatus = 'draft';

    if (existingOwn.length === 0) {
      // Check potential duplicate (name + birthDate + cohort) per PRD Sec 4
      if (birthDate && body.paskibrakaHistory?.cohortId) {
        const dupCandidates = await db
          .select({ id: members.id, fullName: members.fullName, birthDate: members.birthDate })
          .from(members)
          .innerJoin(memberPaskibrakaHistory, eq(members.id, memberPaskibrakaHistory.memberId))
          .where(
            and(
              ilike(members.fullName, fullName),
              eq(members.birthDate, birthDate),
              eq(memberPaskibrakaHistory.cohortId, String(body.paskibrakaHistory.cohortId))
            )
          )
          .limit(1);

        if (dupCandidates.length > 0) {
          sendError(
            res,
            409,
            'Terdeteksi profil dengan nama, tanggal lahir, dan angkatan yang sama. Jika Anda anggota angkatan lama, gunakan kode undangan registrasi atau hubungi operator Bakesbangpol.'
          );
          return;
        }
      }

      nextStatus = submitForVerification ? 'submitted' : 'draft';
      const [created] = await db
        .insert(members)
        .values({
          userId: dbUser.id,
          fullName,
          birthPlace: birthPlace || null,
          birthDate: birthDate || null,
          gender: gender || null,
          homeDistrictId,
          recordStatus: nextStatus,
          privacyConsentGiven,
          privacyConsentAt: privacyConsentGiven ? new Date() : null,
          narasumberConsent,
          dataSourceType: 'self_service',
        })
        .returning();
      memberId = created.id;
    } else {
      const current = existingOwn[0];
      memberId = current.id;
      const wasVerified = current.recordStatus === 'verified';
      const coreChanged =
        current.fullName !== fullName ||
        (current.birthDate || '') !== birthDate ||
        (current.homeDistrictId || '') !== (homeDistrictId || '');

      // PRD Sec 6 Tahap 7: Perubahan penting pada data terverifikasi memicu verifikasi ulang bila diajukan
      if (submitForVerification) {
        nextStatus = 'submitted';
      } else if (wasVerified && !coreChanged) {
        nextStatus = 'verified';
      } else if (wasVerified && coreChanged) {
        nextStatus = 'submitted';
      } else {
        nextStatus = current.recordStatus === 'needs_revision' ? 'draft' : current.recordStatus;
      }

      await db
        .update(members)
        .set({
          fullName,
          birthPlace: birthPlace || null,
          birthDate: birthDate || null,
          gender: gender || null,
          homeDistrictId,
          recordStatus: nextStatus,
          privacyConsentGiven,
          privacyConsentAt: privacyConsentGiven ? current.privacyConsentAt || new Date() : null,
          narasumberConsent,
          updatedAt: new Date(),
        })
        .where(eq(members.id, memberId));
    }

    // Contact upsert
    if (body.contact) {
      const { phone, email, emergencyContact } = body.contact;
      await db
        .insert(memberContacts)
        .values({
          memberId,
          phone: phone ? String(phone) : null,
          email: email ? String(email) : dbUser.email,
          emergencyContact: emergencyContact ? String(emergencyContact) : null,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: memberContacts.memberId,
          set: {
            phone: phone ? String(phone) : null,
            email: email ? String(email) : dbUser.email,
            emergencyContact: emergencyContact ? String(emergencyContact) : null,
            updatedAt: new Date(),
          },
        });
    }

    // Address upsert
    if (body.address) {
      const { districtId, village, addressLine, postalCode } = body.address;
      await db
        .insert(memberAddresses)
        .values({
          memberId,
          districtId: districtId || homeDistrictId || null,
          village: village ? String(village) : null,
          addressLine: addressLine ? String(addressLine) : null,
          postalCode: postalCode ? String(postalCode) : null,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: memberAddresses.memberId,
          set: {
            districtId: districtId || homeDistrictId || null,
            village: village ? String(village) : null,
            addressLine: addressLine ? String(addressLine) : null,
            postalCode: postalCode ? String(postalCode) : null,
            updatedAt: new Date(),
          },
        });
    }

    // Paskibraka History replace
    if (body.paskibrakaHistory && body.paskibrakaHistory.cohortId) {
      await db.delete(memberPaskibrakaHistory).where(eq(memberPaskibrakaHistory.memberId, memberId));
      await db.insert(memberPaskibrakaHistory).values({
        memberId,
        cohortId: String(body.paskibrakaHistory.cohortId),
        assignmentLevel: String(body.paskibrakaHistory.assignmentLevel || 'Kabupaten'),
        schoolName: String(body.paskibrakaHistory.schoolName || '-'),
        unitRole: body.paskibrakaHistory.unitRole ? String(body.paskibrakaHistory.unitRole) : null,
        verificationStatus: nextStatus === 'verified' ? 'verified' : 'pending',
        sourceNotes: body.paskibrakaHistory.sourceNotes ? String(body.paskibrakaHistory.sourceNotes) : null,
      });
    }

    // Education list replace
    if (Array.isArray(body.education)) {
      await db.delete(memberEducation).where(eq(memberEducation.memberId, memberId));
      const validEdu = body.education.filter((e: { institution?: string }) => e?.institution?.trim());
      if (validEdu.length > 0) {
        await db.insert(memberEducation).values(
          validEdu.map((e: { level?: string; institution: string; major?: string; startYear?: number; endYear?: number; isCurrent?: boolean }) => ({
            memberId,
            level: String(e.level || 'S1/D4'),
            institution: String(e.institution).trim(),
            major: e.major ? String(e.major).trim() : null,
            startYear: e.startYear ? Number(e.startYear) : null,
            endYear: e.endYear ? Number(e.endYear) : null,
            isCurrent: Boolean(e.isCurrent),
          }))
        );
      }
    }

    // Employment list replace
    if (Array.isArray(body.employment)) {
      await db.delete(memberEmployment).where(eq(memberEmployment.memberId, memberId));
      const validEmp = body.employment.filter((e: { organizationName?: string }) => e?.organizationName?.trim());
      if (validEmp.length > 0) {
        await db.insert(memberEmployment).values(
          validEmp.map((e: { sector?: string; organizationName: string; positionTitle?: string; startYear?: number; isCurrent?: boolean }) => ({
            memberId,
            sector: String(e.sector || 'Swasta'),
            organizationName: String(e.organizationName).trim(),
            positionTitle: String(e.positionTitle || 'Staf').trim(),
            startYear: e.startYear ? Number(e.startYear) : null,
            isCurrent: e.isCurrent !== false,
          }))
        );
      }
    }

    // Skills list replace
    if (Array.isArray(body.skills)) {
      await db.delete(memberSkills).where(eq(memberSkills.memberId, memberId));
      const validSkills = body.skills.filter((s: { skillId?: string }) => s?.skillId);
      if (validSkills.length > 0) {
        await db.insert(memberSkills).values(
          validSkills.map((s: { skillId: string; proficiencyLevel?: string; yearsExperience?: number; evidenceNotes?: string; availableAsSpeaker?: boolean }) => ({
            memberId,
            skillId: String(s.skillId),
            proficiencyLevel: String(s.proficiencyLevel || 'Menengah'),
            yearsExperience: Number(s.yearsExperience || 1),
            evidenceNotes: s.evidenceNotes ? String(s.evidenceNotes) : null,
            availableAsSpeaker: Boolean(s.availableAsSpeaker),
          }))
        );
      }
    }

    // Organizations list replace
    if (Array.isArray(body.organizations)) {
      await db.delete(organizationMemberships).where(eq(organizationMemberships.memberId, memberId));
      const validOrgs = body.organizations.filter((o: { organizationId?: string }) => o?.organizationId);
      if (validOrgs.length > 0) {
        await db.insert(organizationMemberships).values(
          validOrgs.map((o: { organizationId: string; periodId?: string | null; positionId?: string | null; status?: string }) => ({
            memberId,
            organizationId: String(o.organizationId),
            periodId: o.periodId ? String(o.periodId) : null,
            positionId: o.positionId ? String(o.positionId) : null,
            status: String(o.status || 'aktif'),
          }))
        );
      }
    }

    // Documents list replace (digital reference or archive confirmation)
    if (Array.isArray(body.documents)) {
      await db.delete(memberDocuments).where(eq(memberDocuments.memberId, memberId));
      const validDocs = body.documents.filter((d: { title?: string }) => d?.title?.trim());
      if (validDocs.length > 0) {
        await db.insert(memberDocuments).values(
          validDocs.map((d: { documentType?: string; title: string; referenceNumber?: string; verificationMethod?: string; notes?: string }) => ({
            memberId,
            documentType: String(d.documentType || 'Piagam_Paskibraka'),
            title: String(d.title).trim(),
            referenceNumber: d.referenceNumber ? String(d.referenceNumber).trim() : null,
            verificationMethod: String(d.verificationMethod || 'digital_reference'),
            notes: d.notes ? String(d.notes).trim() : null,
          }))
        );
      }
    }

    // Create verification request if submitted
    if (submitForVerification || nextStatus === 'submitted') {
      const [vr] = await db
        .insert(verificationRequests)
        .values({
          memberId,
          submittedByUserId: dbUser.id,
          status: 'pending',
          submissionNotes: submissionNotes || 'Pengajuan verifikasi profil mandiri anggota.',
        })
        .returning();

      await db.insert(verificationHistory).values({
        verificationRequestId: vr.id,
        memberId,
        actorUserId: dbUser.id,
        action: 'submitted',
        notes: submissionNotes || 'Anggota mengajukan profil untuk diverifikasi oleh operator.',
      });
    }

    await logAudit({
      actorUserId: dbUser.id,
      actorEmail: dbUser.email,
      actorRole: req.effectiveRole,
      action: submitForVerification ? 'MEMBER_PROFILE_SUBMITTED' : 'MEMBER_PROFILE_SAVED',
      entityType: 'members',
      entityId: memberId,
      purpose: 'Pemutakhiran profil mandiri anggota',
    });

    const updatedBundle = await fetchFullMemberBundle(memberId, true);
    res.json({ member: updatedBundle });
  } catch (err) {
    sendError(res, 500, 'Gagal menyimpan profil anggota.', err);
  }
});

// CLAIM REGISTRATION INVITATION FOR LEGACY COHORT
apiRouter.post('/members/claim-invitation', requireAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeeded();
    const token = String(req.body?.token || '').trim().toUpperCase();
    if (!token) {
      sendError(res, 400, 'Kode undangan registrasi wajib diisi.');
      return;
    }

    const invRows = await db
      .select()
      .from(registrationInvitations)
      .where(eq(registrationInvitations.token, token))
      .limit(1);

    if (invRows.length === 0) {
      sendError(res, 404, 'Kode undangan tidak ditemukan.');
      return;
    }

    const inv = invRows[0];
    if (inv.status !== 'active') {
      sendError(res, 400, 'Kode undangan sudah pernah digunakan atau tidak aktif.');
      return;
    }
    if (new Date(inv.expiresAt).getTime() < Date.now()) {
      sendError(res, 400, 'Kode undangan telah melewati masa berlaku. Hubungi operator Bakesbangpol.');
      return;
    }

    const dbUser = req.dbUser!;
    let linkedMemberId = inv.memberId;

    if (linkedMemberId) {
      await db
        .update(members)
        .set({ userId: dbUser.id, updatedAt: new Date() })
        .where(eq(members.id, linkedMemberId));
    } else {
      const cohortRows = await db
        .select()
        .from(cohorts)
        .where(eq(cohorts.cohortYear, inv.cohortYear))
        .limit(1);

      const [newMember] = await db
        .insert(members)
        .values({
          userId: dbUser.id,
          fullName: inv.inviteeName.replace(/\s*\(Arsip.*\)$/i, '').trim(),
          recordStatus: 'draft',
          dataSourceType: 'archive_import',
          privacyConsentGiven: false,
        })
        .returning();
      linkedMemberId = newMember.id;

      if (cohortRows.length > 0) {
        await db.insert(memberPaskibrakaHistory).values({
          memberId: linkedMemberId,
          cohortId: cohortRows[0].id,
          assignmentLevel: 'Kabupaten',
          schoolName: 'Konfirmasi melalui Undangan Arsip',
          verificationStatus: 'pending',
          sourceNotes: `Diklaim menggunakan kode undangan ${inv.token} (Angkatan ${inv.cohortYear}).`,
        });
      }
    }

    await db
      .update(registrationInvitations)
      .set({ status: 'claimed', memberId: linkedMemberId })
      .where(eq(registrationInvitations.id, inv.id));

    await logAudit({
      actorUserId: dbUser.id,
      actorEmail: dbUser.email,
      actorRole: req.effectiveRole,
      action: 'INVITATION_CLAIMED',
      entityType: 'registration_invitations',
      entityId: inv.id,
      purpose: `Klaim undangan registrasi angkatan ${inv.cohortYear}`,
    });

    const bundle = await fetchFullMemberBundle(linkedMemberId, true);
    res.json({ member: bundle, invitation: inv });
  } catch (err) {
    sendError(res, 500, 'Gagal memproses klaim undangan.', err);
  }
});

// 5. MEMBERS DIRECTORY (WITH STRICT SERVER-SIDE RBAC & ROW-LEVEL REDACTION)
apiRouter.get('/members', requireAuth, async (req: AuthRequest, res) => {
  try {
    await ensureSeeded();
    const role = req.effectiveRole!;
    const caps = getCapabilities(role);
    if (!caps.canViewAllMembers) {
      sendError(res, 403, 'Hak akses tidak mencukupi untuk melihat daftar anggota.');
      return;
    }

    const search = String(req.query.search || '').trim().toLowerCase();
    const statusFilter = String(req.query.status || '').trim();
    const districtFilter = String(req.query.districtId || '').trim();
    const cohortYearFilter = String(req.query.cohortYear || '').trim();

    const allMembers = await db.select().from(members).orderBy(desc(members.updatedAt));
    const [allDistricts, allHistory, allCohorts, allSkills, allMemberSkills, allOrgs, allOrgMemberships, allEdu, allEmp] =
      await Promise.all([
        db.select().from(districts),
        db.select().from(memberPaskibrakaHistory),
        db.select().from(cohorts),
        db.select().from(skills),
        db.select().from(memberSkills),
        db.select().from(organizations),
        db.select().from(organizationMemberships),
        db.select().from(memberEducation),
        db.select().from(memberEmployment),
      ]);

    const districtMap = new Map(allDistricts.map((d) => [d.id, d.name]));
    const cohortMap = new Map(allCohorts.map((c) => [c.id, c]));
    const skillMap = new Map(allSkills.map((s) => [s.id, s]));
    const orgMap = new Map(allOrgs.map((o) => [o.id, o]));

    const includeSensitive = caps.canViewSensitivePersonalData;

    const rows = allMembers
      .map((m) => {
        const hist = allHistory.filter((h) => h.memberId === m.id).map((h) => {
          const c = cohortMap.get(h.cohortId);
          return {
            ...h,
            cohortYear: c?.cohortYear ?? null,
            cohortName: c?.cohortName ?? null,
          };
        });
        const mSkills = allMemberSkills
          .filter((ms) => ms.memberId === m.id)
          .map((ms) => ({
            ...ms,
            skillName: skillMap.get(ms.skillId)?.name ?? 'Kompetensi',
          }));
        const mOrgs = allOrgMemberships
          .filter((om) => om.memberId === m.id)
          .map((om) => ({
            ...om,
            organizationName: orgMap.get(om.organizationId)?.shortName ?? orgMap.get(om.organizationId)?.name ?? '',
          }));
        const mEdu = allEdu.filter((e) => e.memberId === m.id);
        const mEmp = allEmp.filter((e) => e.memberId === m.id);

        return {
          id: m.id,
          memberNumber: m.memberNumber,
          fullName: m.fullName,
          gender: m.gender,
          birthPlace: includeSensitive ? m.birthPlace : null,
          birthDate: includeSensitive ? m.birthDate : null,
          homeDistrictId: m.homeDistrictId,
          homeDistrictName: m.homeDistrictId ? districtMap.get(m.homeDistrictId) ?? null : null,
          recordStatus: m.recordStatus,
          narasumberConsent: m.narasumberConsent,
          dataSourceType: m.dataSourceType,
          updatedAt: m.updatedAt,
          redactedForRole: !includeSensitive,
          paskibrakaHistory: hist,
          skills: mSkills,
          organizations: mOrgs,
          education: mEdu,
          employment: mEmp,
        };
      })
      .filter((item) => {
        if (statusFilter && statusFilter !== 'all' && item.recordStatus !== statusFilter) return false;
        if (districtFilter && item.homeDistrictId !== districtFilter) return false;
        if (cohortYearFilter && !item.paskibrakaHistory.some((h) => String(h.cohortYear) === cohortYearFilter)) return false;
        if (search) {
          const hay = [
            item.fullName,
            item.memberNumber || '',
            item.homeDistrictName || '',
            ...item.paskibrakaHistory.map((h) => `${h.schoolName} ${h.cohortYear}`),
            ...item.skills.map((s) => s.skillName),
          ]
            .join(' ')
            .toLowerCase();
          if (!hay.includes(search)) return false;
        }
        return true;
      });

    res.json({ members: rows, redactedForRole: !includeSensitive });
  } catch (err) {
    sendError(res, 500, 'Gagal memuat daftar anggota.', err);
  }
});

apiRouter.get('/members/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const memberId = String(req.params.id);
    const role = req.effectiveRole!;
    const caps = getCapabilities(role);

    const target = await db.select().from(members).where(eq(members.id, memberId)).limit(1);
    if (target.length === 0) {
      sendError(res, 404, 'Profil anggota tidak ditemukan.');
      return;
    }

    const isSelf = target[0].userId === req.dbUser!.id;
    if (!isSelf && !caps.canViewAllMembers) {
      sendError(res, 403, 'Anda tidak berwenang mengakses data anggota lain.');
      return;
    }

    const includeSensitive = isSelf || caps.canViewSensitivePersonalData;
    const bundle = await fetchFullMemberBundle(memberId, includeSensitive);
    res.json({ member: bundle });
  } catch (err) {
    sendError(res, 500, 'Gagal memuat detail anggota.', err);
  }
});

// ASSISTED REGISTRATION BY OPERATOR / ADMIN (PRD Sec 6)
apiRouter.post('/members/assisted', requireAuth, async (req: AuthRequest, res) => {
  try {
    const caps = getCapabilities(req.effectiveRole!);
    if (!caps.canAssistRegistration) {
      sendError(res, 403, 'Hanya Operator, Admin, atau Super Admin yang dapat melakukan pendataan berbantuan.');
      return;
    }

    const body = req.body || {};
    const fullName = String(body.fullName || '').trim();
    const cohortId = String(body.cohortId || '').trim();
    const schoolName = String(body.schoolName || '').trim();
    const assignmentLevel = String(body.assignmentLevel || 'Kabupaten');
    const homeDistrictId = body.homeDistrictId ? String(body.homeDistrictId) : null;
    const confirmationNotes = String(body.confirmationNotes || '').trim();
    const verifyImmediately = Boolean(body.verifyImmediately);

    if (!fullName || !cohortId || !schoolName) {
      sendError(res, 400, 'Nama lengkap, angkatan, dan sekolah asal wajib diisi.');
      return;
    }

    // Duplicate check
    const existing = await db
      .select({ id: members.id })
      .from(members)
      .innerJoin(memberPaskibrakaHistory, eq(members.id, memberPaskibrakaHistory.memberId))
      .where(and(ilike(members.fullName, fullName), eq(memberPaskibrakaHistory.cohortId, cohortId)))
      .limit(1);

    if (existing.length > 0) {
      sendError(res, 409, 'Anggota dengan nama dan angkatan tersebut sudah tercatat di sistem.');
      return;
    }

    const cohortRow = await db.select().from(cohorts).where(eq(cohorts.id, cohortId)).limit(1);
    const cohortYear = cohortRow[0]?.cohortYear || new Date().getFullYear();

    let memberNumber: string | null = null;
    if (verifyImmediately) {
      const existingCountRes = await db.select({ total: sql<number>`count(*)` }).from(members);
      const seq = String(Number(existingCountRes[0]?.total || 0) + 1).padStart(3, '0');
      memberNumber = `PAS-SDA-${cohortYear}-${seq}`;
    }

    const [created] = await db
      .insert(members)
      .values({
        fullName,
        birthPlace: body.birthPlace ? String(body.birthPlace) : null,
        birthDate: body.birthDate ? String(body.birthDate) : null,
        gender: body.gender ? String(body.gender) : null,
        homeDistrictId,
        memberNumber,
        recordStatus: verifyImmediately ? 'verified' : 'submitted',
        privacyConsentGiven: Boolean(body.memberConsented ?? true),
        privacyConsentAt: new Date(),
        narasumberConsent: Boolean(body.narasumberConsent),
        dataSourceType: 'assisted',
      })
      .returning();

    if (body.phone || body.email) {
      await db.insert(memberContacts).values({
        memberId: created.id,
        phone: body.phone ? String(body.phone) : null,
        email: body.email ? String(body.email) : null,
      });
    }

    await db.insert(memberPaskibrakaHistory).values({
      memberId: created.id,
      cohortId,
      assignmentLevel,
      schoolName,
      unitRole: body.unitRole ? String(body.unitRole) : null,
      verificationStatus: verifyImmediately ? 'verified' : 'pending',
      sourceNotes: confirmationNotes || 'Pendataan berbantuan oleh petugas Bakesbangpol dengan persetujuan anggota.',
    });

    await db.insert(memberDocuments).values({
      memberId: created.id,
      documentType: 'Konfirmasi_Arsip',
      title: `Konfirmasi Pendataan Berbantuan Angkatan ${cohortYear}`,
      referenceNumber: `BANTU-${cohortYear}-${created.id.slice(0, 6).toUpperCase()}`,
      verificationMethod: 'officer_validation',
      notes: confirmationNotes || 'Divalidasi petugas melalui arsip/sumber resmi.',
    });

    if (!verifyImmediately) {
      await db.insert(verificationRequests).values({
        memberId: created.id,
        submittedByUserId: req.dbUser!.id,
        status: 'pending',
        submissionNotes: confirmationNotes || 'Input melalui jalur pendataan berbantuan.',
      });
    }

    await logAudit({
      actorUserId: req.dbUser!.id,
      actorEmail: req.dbUser!.email,
      actorRole: req.effectiveRole,
      action: 'ASSISTED_MEMBER_CREATED',
      entityType: 'members',
      entityId: created.id,
      purpose: `Pendataan berbantuan anggota angkatan ${cohortYear}`,
    });

    const bundle = await fetchFullMemberBundle(created.id, true);
    res.status(201).json({ member: bundle });
  } catch (err) {
    sendError(res, 500, 'Gagal menyimpan pendataan berbantuan.', err);
  }
});

// ARCHIVE MEMBER (NO PERMANENT DELETE PER PRD SEC 4)
apiRouter.patch('/members/:id/archive', requireAuth, async (req: AuthRequest, res) => {
  try {
    const caps = getCapabilities(req.effectiveRole!);
    if (!caps.canVerifyMembers) {
      sendError(res, 403, 'Anda tidak memiliki kewenangan mengarsipkan data anggota.');
      return;
    }
    const id = String(req.params.id);
    const reason = String(req.body?.reason || 'Pengarsipan sesuai kebijakan retensi data.').trim();
    await db.update(members).set({ recordStatus: 'archived', updatedAt: new Date() }).where(eq(members.id, id));
    await logAudit({
      actorUserId: req.dbUser!.id,
      actorEmail: req.dbUser!.email,
      actorRole: req.effectiveRole,
      action: 'MEMBER_ARCHIVED',
      entityType: 'members',
      entityId: id,
      purpose: reason,
    });
    res.json({ ok: true });
  } catch (err) {
    sendError(res, 500, 'Gagal mengarsipkan profil anggota.', err);
  }
});

// 6. VERIFICATION QUEUE & INVITATIONS
apiRouter.get('/verifications', requireAuth, async (req: AuthRequest, res) => {
  try {
    const caps = getCapabilities(req.effectiveRole!);
    if (!caps.canVerifyMembers) {
      sendError(res, 403, 'Hanya Operator, Admin, dan Super Admin yang berwenang mengakses antrean verifikasi.');
      return;
    }

    const reqRows = await db.select().from(verificationRequests).orderBy(desc(verificationRequests.submittedAt));
    const items = await Promise.all(
      reqRows.map(async (vr) => {
        const bundle = await fetchFullMemberBundle(vr.memberId, true);
        return {
          ...vr,
          member: bundle,
        };
      })
    );

    res.json({ verifications: items });
  } catch (err) {
    sendError(res, 500, 'Gagal memuat antrean verifikasi.', err);
  }
});

apiRouter.post('/verifications/:id/decide', requireAuth, async (req: AuthRequest, res) => {
  try {
    const caps = getCapabilities(req.effectiveRole!);
    if (!caps.canVerifyMembers) {
      sendError(res, 403, 'Anda tidak memiliki hak akses untuk memverifikasi data.');
      return;
    }

    const id = String(req.params.id);
    const decision = String(req.body?.decision || '');
    const reviewNotes = String(req.body?.reviewNotes || '').trim();

    if (decision !== 'verified' && decision !== 'needs_revision') {
      sendError(res, 400, 'Keputusan verifikasi tidak valid.');
      return;
    }
    if (decision === 'needs_revision' && !reviewNotes) {
      sendError(res, 400, 'Alasan perbaikan wajib diisi saat mengembalikan data ke anggota.');
      return;
    }

    const vrRows = await db.select().from(verificationRequests).where(eq(verificationRequests.id, id)).limit(1);
    if (vrRows.length === 0) {
      sendError(res, 404, 'Permohonan verifikasi tidak ditemukan.');
      return;
    }
    const vr = vrRows[0];

    await db
      .update(verificationRequests)
      .set({
        status: decision,
        reviewerUserId: req.dbUser!.id,
        reviewNotes: reviewNotes || (decision === 'verified' ? 'Data dan riwayat kepaskibrakaan tervalidasi.' : ''),
        reviewedAt: new Date(),
      })
      .where(eq(verificationRequests.id, id));

    const targetMemberRows = await db.select().from(members).where(eq(members.id, vr.memberId)).limit(1);
    const targetMember = targetMemberRows[0];

    let issuedNumber = targetMember?.memberNumber || null;
    if (decision === 'verified' && !issuedNumber) {
      const histRows = await db
        .select({ cohortYear: cohorts.cohortYear })
        .from(memberPaskibrakaHistory)
        .innerJoin(cohorts, eq(memberPaskibrakaHistory.cohortId, cohorts.id))
        .where(eq(memberPaskibrakaHistory.memberId, vr.memberId))
        .limit(1);
      const yr = histRows[0]?.cohortYear || new Date().getFullYear();
      const countRes = await db.select({ total: sql<number>`count(*)` }).from(members);
      const seq = String(Number(countRes[0]?.total || 0) + 10).padStart(3, '0');
      issuedNumber = `PAS-SDA-${yr}-${seq}`;
    }

    await db
      .update(members)
      .set({
        recordStatus: decision,
        memberNumber: issuedNumber,
        updatedAt: new Date(),
      })
      .where(eq(members.id, vr.memberId));

    await db
      .update(memberPaskibrakaHistory)
      .set({ verificationStatus: decision === 'verified' ? 'verified' : 'needs_revision' })
      .where(eq(memberPaskibrakaHistory.memberId, vr.memberId));

    await db.insert(verificationHistory).values({
      verificationRequestId: vr.id,
      memberId: vr.memberId,
      actorUserId: req.dbUser!.id,
      action: decision === 'verified' ? 'verified' : 'returned_for_revision',
      notes: reviewNotes || 'Terverifikasi oleh petugas pemeriksa.',
    });

    if (targetMember?.userId) {
      await db.insert(notifications).values({
        userId: targetMember.userId,
        title: decision === 'verified' ? 'Profil Purna Paskibraka Terverifikasi' : 'Profil Memerlukan Perbaikan',
        message:
          decision === 'verified'
            ? `Profil Anda telah diverifikasi. Nomor Anggota Internal: ${issuedNumber}.`
            : `Profil Anda dikembalikan dengan catatan: ${reviewNotes}`,
      });
    }

    await logAudit({
      actorUserId: req.dbUser!.id,
      actorEmail: req.dbUser!.email,
      actorRole: req.effectiveRole,
      action: decision === 'verified' ? 'VERIFICATION_APPROVED' : 'VERIFICATION_RETURNED',
      entityType: 'verification_requests',
      entityId: vr.id,
      purpose: reviewNotes || 'Pemeriksaan validitas profil anggota',
    });

    res.json({ ok: true, memberNumber: issuedNumber });
  } catch (err) {
    sendError(res, 500, 'Gagal menyimpan keputusan verifikasi.', err);
  }
});

// INVITATIONS
apiRouter.get('/invitations', requireAuth, async (req: AuthRequest, res) => {
  try {
    const caps = getCapabilities(req.effectiveRole!);
    if (!caps.canAssistRegistration) {
      sendError(res, 403, 'Akses ditolak.');
      return;
    }
    const list = await db.select().from(registrationInvitations).orderBy(desc(registrationInvitations.createdAt));
    res.json({ invitations: list });
  } catch (err) {
    sendError(res, 500, 'Gagal memuat undangan registrasi.', err);
  }
});

apiRouter.post('/invitations', requireAuth, async (req: AuthRequest, res) => {
  try {
    const caps = getCapabilities(req.effectiveRole!);
    if (!caps.canAssistRegistration) {
      sendError(res, 403, 'Akses ditolak.');
      return;
    }
    const cohortYear = Number(req.body?.cohortYear || 2005);
    const inviteeName = String(req.body?.inviteeName || '').trim();
    const contactHint = String(req.body?.contactHint || '').trim();
    const expiryDays = Math.min(90, Math.max(1, Number(req.body?.expiryDays || 30)));

    if (!inviteeName) {
      sendError(res, 400, 'Nama penerima undangan wajib diisi.');
      return;
    }

    const token = `UND-${cohortYear}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    const [created] = await db
      .insert(registrationInvitations)
      .values({
        cohortYear,
        inviteeName,
        contactHint: contactHint || null,
        token,
        status: 'active',
        expiresAt,
        createdByUserId: req.dbUser!.id,
      })
      .returning();

    await logAudit({
      actorUserId: req.dbUser!.id,
      actorEmail: req.dbUser!.email,
      actorRole: req.effectiveRole,
      action: 'INVITATION_CREATED',
      entityType: 'registration_invitations',
      entityId: created.id,
      purpose: `Penerbitan tautan undangan angkatan ${cohortYear}`,
    });

    res.status(201).json({ invitation: created });
  } catch (err) {
    sendError(res, 500, 'Gagal membuat undangan registrasi.', err);
  }
});

// 7. EKOSISTEM: SPEAKERS DIRECTORY, ORGANIZATIONS, PROGRAMS, ACTIVITIES, COHORTS
apiRouter.get('/speakers', requireAuth, async (req: AuthRequest, res) => {
  try {
    const caps = getCapabilities(req.effectiveRole!);
    if (!caps.canViewAllMembers) {
      sendError(res, 403, 'Hak akses tidak mencukupi untuk mengakses direktori narasumber.');
      return;
    }

    const skillIdFilter = String(req.query.skillId || '').trim();
    const districtFilter = String(req.query.districtId || '').trim();

    const consentedMembers = await db
      .select()
      .from(members)
      .where(and(eq(members.narasumberConsent, true), eq(members.recordStatus, 'verified')));

    const [allDistricts, allMemberSkills, allSkills, allHistory, allCohorts, allCerts, allContacts] = await Promise.all([
      db.select().from(districts),
      db.select().from(memberSkills).where(eq(memberSkills.availableAsSpeaker, true)),
      db.select().from(skills),
      db.select().from(memberPaskibrakaHistory),
      db.select().from(cohorts),
      db.select().from(certifications),
      caps.canViewSensitivePersonalData ? db.select().from(memberContacts) : Promise.resolve([]),
    ]);

    const districtMap = new Map(allDistricts.map((d) => [d.id, d.name]));
    const skillMap = new Map(allSkills.map((s) => [s.id, s]));
    const cohortMap = new Map(allCohorts.map((c) => [c.id, c.cohortYear]));
    const contactMap = new Map(allContacts.map((c) => [c.memberId, c]));

    const speakers = consentedMembers
      .map((m) => {
        const spSkills = allMemberSkills
          .filter((ms) => ms.memberId === m.id)
          .map((ms) => ({
            ...ms,
            skillName: skillMap.get(ms.skillId)?.name ?? '',
            skillCategory: skillMap.get(ms.skillId)?.category ?? '',
          }));
        if (spSkills.length === 0) return null;

        const hist = allHistory.filter((h) => h.memberId === m.id).map((h) => ({
          cohortYear: cohortMap.get(h.cohortId) ?? null,
          assignmentLevel: h.assignmentLevel,
          schoolName: h.schoolName,
        }));
        const mCerts = allCerts.filter((c) => c.memberId === m.id);
        const contact = caps.canViewSensitivePersonalData ? contactMap.get(m.id) ?? null : null;

        return {
          id: m.id,
          memberNumber: m.memberNumber,
          fullName: m.fullName,
          homeDistrictId: m.homeDistrictId,
          homeDistrictName: m.homeDistrictId ? districtMap.get(m.homeDistrictId) ?? null : null,
          narasumberConsent: m.narasumberConsent,
          skills: spSkills,
          history: hist,
          certifications: mCerts,
          contact: contact ? { phone: contact.phone, email: contact.email } : null,
          contactRedacted: !caps.canViewSensitivePersonalData,
        };
      })
      .filter((item): item is NonNullable<typeof item> => {
        if (!item) return false;
        if (districtFilter && item.homeDistrictId !== districtFilter) return false;
        if (skillIdFilter && !item.skills.some((s) => s.skillId === skillIdFilter)) return false;
        return true;
      });

    res.json({ speakers });
  } catch (err) {
    sendError(res, 500, 'Gagal memuat direktori narasumber.', err);
  }
});

apiRouter.get('/organizations', requireAuth, async (req: AuthRequest, res) => {
  try {
    const caps = getCapabilities(req.effectiveRole!);
    if (!caps.canViewAllMembers) {
      sendError(res, 403, 'Akses ditolak.');
      return;
    }

    const [orgs, periods, positions, memberships, memberRows] = await Promise.all([
      db.select().from(organizations).orderBy(organizations.name),
      db.select().from(organizationPeriods).orderBy(desc(organizationPeriods.startYear)),
      db.select().from(organizationPositions).orderBy(organizationPositions.rankOrder),
      db.select().from(organizationMemberships),
      db.select({ id: members.id, fullName: members.fullName, memberNumber: members.memberNumber, recordStatus: members.recordStatus }).from(members),
    ]);

    const memberMap = new Map(memberRows.map((m) => [m.id, m]));
    const periodMap = new Map(periods.map((p) => [p.id, p]));
    const posMap = new Map(positions.map((p) => [p.id, p]));

    const result = orgs.map((org) => ({
      ...org,
      periods: periods.filter((p) => p.organizationId === org.id),
      positions: positions.filter((p) => p.organizationId === org.id),
      memberships: memberships
        .filter((ms) => ms.organizationId === org.id)
        .map((ms) => ({
          ...ms,
          memberName: memberMap.get(ms.memberId)?.fullName ?? 'Anggota',
          memberNumber: memberMap.get(ms.memberId)?.memberNumber ?? null,
          periodLabel: ms.periodId ? periodMap.get(ms.periodId)?.periodLabel ?? '-' : '-',
          positionTitle: ms.positionId ? posMap.get(ms.positionId)?.title ?? 'Anggota' : 'Anggota',
        })),
    }));

    res.json({ organizations: result });
  } catch (err) {
    sendError(res, 500, 'Gagal memuat data organisasi.', err);
  }
});

apiRouter.get('/activities', requireAuth, async (req: AuthRequest, res) => {
  try {
    const caps = getCapabilities(req.effectiveRole!);
    if (!caps.canViewAllMembers) {
      sendError(res, 403, 'Akses ditolak.');
      return;
    }

    const [progRows, actRows, partRows, progPartRows, memberRows] = await Promise.all([
      db.select().from(programs).orderBy(desc(programs.createdAt)),
      db.select().from(activities).orderBy(desc(activities.activityDate)),
      db.select().from(activityParticipants),
      db.select().from(programParticipants),
      db.select({ id: members.id, fullName: members.fullName, memberNumber: members.memberNumber }).from(members),
    ]);

    const memberMap = new Map(memberRows.map((m) => [m.id, m]));
    const progMap = new Map(progRows.map((p) => [p.id, p.title]));

    res.json({
      programs: progRows.map((p) => ({
        ...p,
        participants: progPartRows
          .filter((pp) => pp.programId === p.id)
          .map((pp) => ({
            ...pp,
            memberName: memberMap.get(pp.memberId)?.fullName ?? 'Anggota',
          })),
      })),
      activities: actRows.map((a) => ({
        ...a,
        programTitle: a.programId ? progMap.get(a.programId) ?? null : null,
        participants: partRows
          .filter((ap) => ap.activityId === a.id)
          .map((ap) => ({
            ...ap,
            memberName: memberMap.get(ap.memberId)?.fullName ?? 'Anggota',
            memberNumber: memberMap.get(ap.memberId)?.memberNumber ?? null,
          })),
      })),
    });
  } catch (err) {
    sendError(res, 500, 'Gagal memuat program pembinaan dan kegiatan.', err);
  }
});

apiRouter.post('/activities', requireAuth, async (req: AuthRequest, res) => {
  try {
    const caps = getCapabilities(req.effectiveRole!);
    if (!caps.canManageActivities) {
      sendError(res, 403, 'Anda tidak berwenang menambah kegiatan.');
      return;
    }
    const { title, organizer, location, activityDate, programId, description, documentationNotes, status } = req.body || {};
    if (!title || !organizer || !location || !activityDate) {
      sendError(res, 400, 'Judul, penyelenggara, lokasi, dan tanggal kegiatan wajib diisi.');
      return;
    }
    const [created] = await db
      .insert(activities)
      .values({
        title: String(title).trim(),
        organizer: String(organizer).trim(),
        location: String(location).trim(),
        activityDate: String(activityDate),
        programId: programId ? String(programId) : null,
        description: description ? String(description) : null,
        documentationNotes: documentationNotes ? String(documentationNotes) : null,
        status: String(status || 'terjadwal'),
      })
      .returning();

    await logAudit({
      actorUserId: req.dbUser!.id,
      actorEmail: req.dbUser!.email,
      actorRole: req.effectiveRole,
      action: 'ACTIVITY_CREATED',
      entityType: 'activities',
      entityId: created.id,
      purpose: `Penambahan kegiatan: ${created.title}`,
    });
    res.status(201).json({ activity: created });
  } catch (err) {
    sendError(res, 500, 'Gagal menambah kegiatan.', err);
  }
});

apiRouter.post('/programs', requireAuth, async (req: AuthRequest, res) => {
  try {
    const caps = getCapabilities(req.effectiveRole!);
    if (!caps.canManageActivities) {
      sendError(res, 403, 'Anda tidak berwenang menambah program pembinaan.');
      return;
    }
    const { title, targetAudience, scheduleSummary, description } = req.body || {};
    if (!title || !targetAudience) {
      sendError(res, 400, 'Judul dan sasaran program pembinaan wajib diisi.');
      return;
    }
    const [created] = await db
      .insert(programs)
      .values({
        title: String(title).trim(),
        targetAudience: String(targetAudience).trim(),
        scheduleSummary: scheduleSummary ? String(scheduleSummary).trim() : null,
        description: description ? String(description).trim() : null,
        status: 'aktif',
      })
      .returning();

    await logAudit({
      actorUserId: req.dbUser!.id,
      actorEmail: req.dbUser!.email,
      actorRole: req.effectiveRole,
      action: 'PROGRAM_CREATED',
      entityType: 'programs',
      entityId: created.id,
      purpose: `Penambahan program pembinaan: ${created.title}`,
    });
    res.status(201).json({ program: created });
  } catch (err) {
    sendError(res, 500, 'Gagal menambah program pembinaan.', err);
  }
});

apiRouter.post('/activities/:id/participants', requireAuth, async (req: AuthRequest, res) => {
  try {
    const caps = getCapabilities(req.effectiveRole!);
    if (!caps.canManageActivities) {
      sendError(res, 403, 'Akses ditolak.');
      return;
    }
    const activityId = String(req.params.id);
    const { memberId, participationRole } = req.body || {};
    if (!memberId) {
      sendError(res, 400, 'Anggota wajib dipilih.');
      return;
    }
    const [created] = await db
      .insert(activityParticipants)
      .values({
        activityId,
        memberId: String(memberId),
        participationRole: String(participationRole || 'Peserta'),
        attendanceStatus: 'terdaftar',
      })
      .returning();
    res.status(201).json({ participant: created });
  } catch (err) {
    sendError(res, 500, 'Gagal menambahkan peserta kegiatan.', err);
  }
});

// COHORTS MANAGEMENT
apiRouter.post('/cohorts', requireAuth, async (req: AuthRequest, res) => {
  try {
    const caps = getCapabilities(req.effectiveRole!);
    if (!caps.canManageCohorts) {
      sendError(res, 403, 'Anda tidak berwenang mengelola master angkatan.');
      return;
    }
    const cohortYear = Number(req.body?.cohortYear);
    const cohortName = String(req.body?.cohortName || `Angkatan ${cohortYear}`).trim();
    const archiveStatus = String(req.body?.archiveStatus || 'available');
    const description = String(req.body?.description || '').trim();

    if (!cohortYear || cohortYear < 1945 || cohortYear > 2100) {
      sendError(res, 400, 'Tahun angkatan tidak valid.');
      return;
    }

    const [created] = await db
      .insert(cohorts)
      .values({ cohortYear, cohortName, archiveStatus, description: description || null, isActive: true })
      .returning();

    await logAudit({
      actorUserId: req.dbUser!.id,
      actorEmail: req.dbUser!.email,
      actorRole: req.effectiveRole,
      action: 'COHORT_CREATED',
      entityType: 'cohorts',
      entityId: created.id,
      purpose: `Penambahan master angkatan ${cohortYear}`,
    });
    res.status(201).json({ cohort: created });
  } catch (err) {
    sendError(res, 500, 'Gagal menambah angkatan (pastikan tahun belum terdaftar).', err);
  }
});

apiRouter.patch('/cohorts/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const caps = getCapabilities(req.effectiveRole!);
    if (!caps.canManageCohorts) {
      sendError(res, 403, 'Akses ditolak.');
      return;
    }
    const id = String(req.params.id);
    const { archiveStatus, description, isActive } = req.body || {};
    const [updated] = await db
      .update(cohorts)
      .set({
        ...(archiveStatus ? { archiveStatus: String(archiveStatus) } : {}),
        ...(description !== undefined ? { description: String(description) } : {}),
        ...(isActive !== undefined ? { isActive: Boolean(isActive) } : {}),
      })
      .where(eq(cohorts.id, id))
      .returning();
    res.json({ cohort: updated });
  } catch (err) {
    sendError(res, 500, 'Gagal memperbarui status arsip angkatan.', err);
  }
});

// 8. DASHBOARD ANALYTICS & AUDITED EXPORT (PRD Sec 8)
apiRouter.get('/analytics', requireAuth, async (req: AuthRequest, res) => {
  try {
    const caps = getCapabilities(req.effectiveRole!);
    if (!caps.canViewAggregateStats) {
      sendError(res, 403, 'Hak akses tidak mencukupi untuk melihat statistik agregat.');
      return;
    }

    const [
      allMembers,
      allCohorts,
      allHistory,
      allDistricts,
      allEdu,
      allEmp,
      allSkills,
      allMemberSkills,
      allOrgs,
      allOrgMemberships,
      allVRs,
      allActivities,
    ] = await Promise.all([
      db.select().from(members),
      db.select().from(cohorts).orderBy(cohorts.cohortYear),
      db.select().from(memberPaskibrakaHistory),
      db.select().from(districts).orderBy(districts.name),
      db.select().from(memberEducation),
      db.select().from(memberEmployment),
      db.select().from(skills),
      db.select().from(memberSkills),
      db.select().from(organizations),
      db.select().from(organizationMemberships),
      db.select().from(verificationRequests),
      db.select().from(activities),
    ]);

    const statusCounts = {
      total: allMembers.length,
      verified: allMembers.filter((m) => m.recordStatus === 'verified').length,
      submitted: allMembers.filter((m) => m.recordStatus === 'submitted').length,
      needs_revision: allMembers.filter((m) => m.recordStatus === 'needs_revision').length,
      draft: allMembers.filter((m) => m.recordStatus === 'draft').length,
      archived: allMembers.filter((m) => m.recordStatus === 'archived').length,
    };

    const byCohort = allCohorts.map((c) => ({
      id: c.id,
      cohortYear: c.cohortYear,
      cohortName: c.cohortName,
      archiveStatus: c.archiveStatus,
      memberCount: allHistory.filter((h) => h.cohortId === c.id).length,
    }));

    const byDistrict = allDistricts
      .map((d) => ({
        id: d.id,
        name: d.name,
        memberCount: allMembers.filter((m) => m.homeDistrictId === d.id).length,
      }))
      .sort((a, b) => b.memberCount - a.memberCount);

    const eduCountsMap = new Map<string, number>();
    for (const e of allEdu) {
      eduCountsMap.set(e.level, (eduCountsMap.get(e.level) || 0) + 1);
    }
    const byEducation = Array.from(eduCountsMap.entries()).map(([label, total]) => ({ label, total }));

    const empCountsMap = new Map<string, number>();
    for (const e of allEmp) {
      empCountsMap.set(e.sector, (empCountsMap.get(e.sector) || 0) + 1);
    }
    const byEmployment = Array.from(empCountsMap.entries()).map(([label, total]) => ({ label, total }));

    const bySkill = allSkills
      .map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        memberCount: allMemberSkills.filter((ms) => ms.skillId === s.id).length,
        speakerCount: allMemberSkills.filter((ms) => ms.skillId === s.id && ms.availableAsSpeaker).length,
      }))
      .sort((a, b) => b.memberCount - a.memberCount);

    const byOrganization = allOrgs.map((o) => ({
      id: o.id,
      shortName: o.shortName,
      name: o.name,
      memberCount: allOrgMemberships.filter((om) => om.organizationId === o.id).length,
    }));

    res.json({
      statusCounts,
      pendingVerifications: allVRs.filter((v) => v.status === 'pending').length,
      totalActivities: allActivities.length,
      byCohort,
      byDistrict,
      byEducation,
      byEmployment,
      bySkill,
      byOrganization,
    });
  } catch (err) {
    sendError(res, 500, 'Gagal menghitung statistik analitik.', err);
  }
});

apiRouter.post('/export', requireAuth, async (req: AuthRequest, res) => {
  try {
    const caps = getCapabilities(req.effectiveRole!);
    if (!caps.canExportData) {
      sendError(res, 403, 'Hak akses tidak mencukupi untuk mengekspor data lengkap anggota.');
      return;
    }

    const purpose = String(req.body?.purpose || '').trim();
    const format = String(req.body?.format || 'excel');
    const statusFilter = String(req.body?.status || 'all');

    if (purpose.length < 8) {
      sendError(res, 400, 'Penanda tujuan penggunaan data wajib diisi (minimal 8 karakter) sesuai tata kelola UU PDP.');
      return;
    }

    const [allMembers, allDistricts, allHistory, allCohorts, allEmp, allSkills, allMemberSkills] = await Promise.all([
      db.select().from(members).orderBy(members.fullName),
      db.select().from(districts),
      db.select().from(memberPaskibrakaHistory),
      db.select().from(cohorts),
      db.select().from(memberEmployment),
      db.select().from(skills),
      db.select().from(memberSkills),
    ]);

    const districtMap = new Map(allDistricts.map((d) => [d.id, d.name]));
    const cohortMap = new Map(allCohorts.map((c) => [c.id, c.cohortYear]));
    const skillMap = new Map(allSkills.map((s) => [s.id, s.name]));

    const filtered = allMembers.filter((m) => (statusFilter === 'all' ? true : m.recordStatus === statusFilter));
    const exportRows = filtered.map((m) => {
      const h = allHistory.find((item) => item.memberId === m.id);
      const emp = allEmp.find((item) => item.memberId === m.id);
      const sk = allMemberSkills
        .filter((item) => item.memberId === m.id)
        .map((item) => `${skillMap.get(item.skillId) || ''} (${item.proficiencyLevel})`)
        .join('; ');

      return {
        nomorAnggota: m.memberNumber || '-',
        namaLengkap: m.fullName,
        jenisKelamin: m.gender || '-',
        kecamatan: m.homeDistrictId ? districtMap.get(m.homeDistrictId) || '-' : '-',
        angkatan: h ? cohortMap.get(h.cohortId) || '-' : '-',
        tingkatPenugasan: h?.assignmentLevel || '-',
        sekolahAsal: h?.schoolName || '-',
        pekerjaan: emp ? `${emp.positionTitle} — ${emp.organizationName}` : '-',
        kompetensi: sk || '-',
        statusVerifikasi: m.recordStatus,
        kesediaanNarasumber: m.narasumberConsent ? 'Bersedia' : 'Tidak',
      };
    });

    await logAudit({
      actorUserId: req.dbUser!.id,
      actorEmail: req.dbUser!.email,
      actorRole: req.effectiveRole,
      action: `DATA_EXPORT_${format.toUpperCase()}`,
      entityType: 'members',
      purpose,
      metadata: { rowCount: exportRows.length, statusFilter, format },
    });

    res.json({
      exportedAt: new Date().toISOString(),
      exportedBy: req.dbUser!.email,
      purpose,
      rows: exportRows,
    });
  } catch (err) {
    sendError(res, 500, 'Gagal memproses ekspor data.', err);
  }
});

// 9. ADMIN: USERS, ROLES, AUDIT LOGS, SYSTEM SETTINGS
apiRouter.get('/admin/users', requireAuth, async (req: AuthRequest, res) => {
  try {
    const caps = getCapabilities(req.effectiveRole!);
    if (!caps.canManageUsersAndRoles) {
      sendError(res, 403, 'Akses pengelolaan akun hanya untuk Administrator dan Super Administrator.');
      return;
    }
    const list = await db.select().from(users).orderBy(desc(users.createdAt));
    res.json({ users: list });
  } catch (err) {
    sendError(res, 500, 'Gagal memuat daftar akun pengguna.', err);
  }
});

apiRouter.patch('/admin/users/:id/role', requireAuth, async (req: AuthRequest, res) => {
  try {
    const callerRole = req.effectiveRole!;
    const caps = getCapabilities(callerRole);
    if (!caps.canManageUsersAndRoles) {
      sendError(res, 403, 'Akses ditolak.');
      return;
    }

    const targetId = String(req.params.id);
    const nextRole = String(req.body?.role || '');
    const isActive = req.body?.isActive !== undefined ? Boolean(req.body.isActive) : undefined;

    if (nextRole && !isValidRole(nextRole)) {
      sendError(res, 400, 'Peran tidak valid.');
      return;
    }

    const targetRows = await db.select().from(users).where(eq(users.id, targetId)).limit(1);
    if (targetRows.length === 0) {
      sendError(res, 404, 'Akun pengguna tidak ditemukan.');
      return;
    }
    const target = targetRows[0];

    // PRD Sec 5: Admin memiliki akses terbatas untuk kelola akun; tidak bisa mengubah Super Admin
    if (callerRole !== 'super_admin' && (target.role === 'super_admin' || nextRole === 'super_admin')) {
      sendError(res, 403, 'Hanya Super Administrator yang dapat mengelola akun Super Administrator.');
      return;
    }

    const updated = await db
      .update(users)
      .set({
        ...(nextRole ? { role: nextRole } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
        updatedAt: new Date(),
      })
      .where(eq(users.id, targetId))
      .returning();

    if (nextRole) {
      const roleRow = await db.select().from(roles).where(eq(roles.code, nextRole)).limit(1);
      if (roleRow.length > 0) {
        await db.delete(userRoles).where(eq(userRoles.userId, targetId));
        await db.insert(userRoles).values({ userId: targetId, roleId: roleRow[0].id });
      }
    }

    await logAudit({
      actorUserId: req.dbUser!.id,
      actorEmail: req.dbUser!.email,
      actorRole: callerRole,
      action: 'USER_ROLE_UPDATED',
      entityType: 'users',
      entityId: targetId,
      purpose: `Perubahan peran/status akun ${target.email} menjadi ${nextRole || target.role}`,
    });

    res.json({ user: updated[0] });
  } catch (err) {
    sendError(res, 500, 'Gagal memperbarui hak akses akun.', err);
  }
});

apiRouter.get('/admin/verifier-codes', requireAuth, async (req: AuthRequest, res) => {
  try {
    const caps = getCapabilities(req.effectiveRole!);
    if (!caps.canManageUsersAndRoles) {
      sendError(res, 403, 'Akses pengelolaan kode verifikator hanya untuk Administrator dan Super Administrator.');
      return;
    }
    const list = await db
      .select()
      .from(verifierAccessCodes)
      .orderBy(desc(verifierAccessCodes.createdAt));
    res.json({ codes: list });
  } catch (err) {
    sendError(res, 500, 'Gagal memuat daftar kode aktivasi verifikator.', err);
  }
});

apiRouter.post('/admin/verifier-codes', requireAuth, async (req: AuthRequest, res) => {
  try {
    const callerRole = req.effectiveRole!;
    const caps = getCapabilities(callerRole);
    if (!caps.canManageUsersAndRoles) {
      sendError(res, 403, 'Akses ditolak.');
      return;
    }

    const label = String(req.body?.label || '').trim();
    const targetRole = String(req.body?.targetRole || 'operator');
    const assignedEmail = String(req.body?.assignedEmail || '').trim();
    const expiryDays = Math.min(90, Math.max(1, Number(req.body?.expiryDays || 14)));

    if (!label) {
      sendError(res, 400, 'Keterangan/nama petugas penerima kode wajib diisi.');
      return;
    }
    if (targetRole !== 'operator' && targetRole !== 'admin') {
      sendError(res, 400, 'Target peran kode aktivasi hanya dapat berupa Operator atau Admin.');
      return;
    }
    if (targetRole === 'admin' && callerRole !== 'super_admin') {
      sendError(res, 403, 'Hanya Super Administrator yang dapat menerbitkan kode aktivasi untuk peran Admin.');
      return;
    }

    const prefix = targetRole === 'admin' ? 'ADM' : 'OPR';
    const code = `VER-${prefix}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const expiresAt = new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000);

    const [created] = await db
      .insert(verifierAccessCodes)
      .values({
        code,
        targetRole,
        assignedEmail: assignedEmail || null,
        label,
        status: 'active',
        expiresAt,
        createdByUserId: req.dbUser!.id,
      })
      .returning();

    await logAudit({
      actorUserId: req.dbUser!.id,
      actorEmail: req.dbUser!.email,
      actorRole: callerRole,
      action: 'VERIFIER_CODE_CREATED',
      entityType: 'verifier_access_codes',
      entityId: created.id,
      purpose: `Penerbitan kode aktivasi ${targetRole} untuk ${label}`,
    });

    res.status(201).json({ code: created });
  } catch (err) {
    sendError(res, 500, 'Gagal menerbitkan kode aktivasi verifikator.', err);
  }
});

apiRouter.patch('/admin/verifier-codes/:id/revoke', requireAuth, async (req: AuthRequest, res) => {
  try {
    const caps = getCapabilities(req.effectiveRole!);
    if (!caps.canManageUsersAndRoles) {
      sendError(res, 403, 'Akses ditolak.');
      return;
    }
    const id = String(req.params.id);
    const [updated] = await db
      .update(verifierAccessCodes)
      .set({ status: 'revoked' })
      .where(eq(verifierAccessCodes.id, id))
      .returning();

    await logAudit({
      actorUserId: req.dbUser!.id,
      actorEmail: req.dbUser!.email,
      actorRole: req.effectiveRole,
      action: 'VERIFIER_CODE_REVOKED',
      entityType: 'verifier_access_codes',
      entityId: id,
      purpose: 'Pencabutan kode aktivasi verifikator',
    });

    res.json({ code: updated });
  } catch (err) {
    sendError(res, 500, 'Gagal mencabut kode aktivasi.', err);
  }
});

apiRouter.get('/admin/audit-logs', requireAuth, async (req: AuthRequest, res) => {
  try {
    const caps = getCapabilities(req.effectiveRole!);
    if (!caps.canViewAuditLogs) {
      sendError(res, 403, 'Anda tidak berwenang melihat jejak audit sistem.');
      return;
    }
    const logs = await db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100);
    res.json({ logs });
  } catch (err) {
    sendError(res, 500, 'Gagal memuat jejak audit.', err);
  }
});

apiRouter.get('/admin/settings', requireAuth, async (req: AuthRequest, res) => {
  try {
    const caps = getCapabilities(req.effectiveRole!);
    if (!caps.canManageSystemSettings) {
      sendError(res, 403, 'Konfigurasi sistem hanya dapat diakses oleh Super Administrator.');
      return;
    }
    const rows = await db.select().from(systemSettings).orderBy(systemSettings.key);
    res.json({ settings: rows });
  } catch (err) {
    sendError(res, 500, 'Gagal memuat pengaturan sistem.', err);
  }
});

apiRouter.patch('/admin/settings/:key', requireAuth, async (req: AuthRequest, res) => {
  try {
    const caps = getCapabilities(req.effectiveRole!);
    if (!caps.canManageSystemSettings) {
      sendError(res, 403, 'Hanya Super Administrator yang dapat mengubah konfigurasi sistem.');
      return;
    }
    const key = String(req.params.key);
    const value = String(req.body?.value || '').trim();
    if (!value) {
      sendError(res, 400, 'Nilai konfigurasi wajib diisi.');
      return;
    }

    const [updated] = await db
      .update(systemSettings)
      .set({ value, updatedByUserId: req.dbUser!.id, updatedAt: new Date() })
      .where(eq(systemSettings.key, key))
      .returning();

    await logAudit({
      actorUserId: req.dbUser!.id,
      actorEmail: req.dbUser!.email,
      actorRole: req.effectiveRole,
      action: 'SYSTEM_SETTING_UPDATED',
      entityType: 'system_settings',
      entityId: key,
      purpose: `Pembaruan konfigurasi sistem: ${key}`,
    });

    res.json({ setting: updated });
  } catch (err) {
    sendError(res, 500, 'Gagal memperbarui konfigurasi sistem.', err);
  }
});

// Helper check so unused import warning is clean
export const _rbacRoleCheck: AppRole = 'anggota';
