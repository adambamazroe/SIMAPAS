import type { NextFunction, Request, Response } from 'express';
import { count, eq } from 'drizzle-orm';
import type { DecodedIdToken } from 'firebase-admin/auth';
import { adminAuth } from '../lib/firebase-admin.ts';
import { db } from '../db/index.ts';
import { roles, userRoles, users } from '../db/schema.ts';
import { type AppRole, isValidRole } from '../server/rbac.ts';

export interface DbUserRecord {
  id: string;
  uid: string;
  email: string;
  fullName: string | null;
  role: AppRole;
  isActive: boolean;
}

export interface AuthRequest extends Request {
  firebaseUser?: DecodedIdToken;
  dbUser?: DbUserRecord;
  effectiveRole?: AppRole;
}

export async function upsertUserFromToken(decoded: DecodedIdToken): Promise<DbUserRecord> {
  const email = decoded.email || `${decoded.uid}@simapas.sidoarjokab.go.id`;
  const fullName = decoded.name || email.split('@')[0];

  const existing = await db.select().from(users).where(eq(users.uid, decoded.uid)).limit(1);
  if (existing.length > 0) {
    const row = existing[0];
    if (row.email !== email) {
      await db
        .update(users)
        .set({ email, updatedAt: new Date() })
        .where(eq(users.id, row.id));
    }
    return {
      id: row.id,
      uid: row.uid,
      email,
      fullName: row.fullName,
      role: (isValidRole(row.role) ? row.role : 'anggota') as AppRole,
      isActive: row.isActive,
    };
  }

  // First user registered in the system becomes super_admin so Bakesbangpol administrator can initialize governance
  const totalUsersRes = await db.select({ total: count() }).from(users);
  const totalUsers = Number(totalUsersRes[0]?.total || 0);
  const assignedRole: AppRole = totalUsers === 0 ? 'super_admin' : 'anggota';

  const inserted = await db
    .insert(users)
    .values({
      uid: decoded.uid,
      email,
      fullName,
      role: assignedRole,
      isActive: true,
    })
    .onConflictDoUpdate({
      target: users.uid,
      set: {
        email,
        updatedAt: new Date(),
      },
    })
    .returning();

  const created = inserted[0];

  // Link into normalized user_roles table if role exists
  const roleRow = await db.select().from(roles).where(eq(roles.code, assignedRole)).limit(1);
  if (roleRow.length > 0) {
    await db.insert(userRoles).values({
      userId: created.id,
      roleId: roleRow[0].id,
    });
  }

  return {
    id: created.id,
    uid: created.uid,
    email: created.email,
    fullName: created.fullName,
    role: (isValidRole(created.role) ? created.role : 'anggota') as AppRole,
    isActive: created.isActive,
  };
}

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Akses ditolak: token autentikasi tidak ditemukan.' });
    return;
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.firebaseUser = decodedToken;

    const dbUser = await upsertUserFromToken(decodedToken);
    if (!dbUser.isActive) {
      res.status(403).json({ error: 'Akun Anda dinonaktifkan oleh administrator.' });
      return;
    }

    req.dbUser = dbUser;

    // Only a verified super_admin in PostgreSQL may use the role perspective switcher header
    const previewHeader = req.headers['x-simapas-preview-role'];
    if (
      dbUser.role === 'super_admin' &&
      typeof previewHeader === 'string' &&
      isValidRole(previewHeader)
    ) {
      req.effectiveRole = previewHeader;
    } else {
      req.effectiveRole = dbUser.role;
    }

    next();
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    res.status(401).json({ error: 'Sesi tidak valid atau kedaluwarsa. Silakan masuk ulang.' });
  }
};
