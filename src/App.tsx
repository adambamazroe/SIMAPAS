import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User as FirebaseUser } from 'firebase/auth';
import {
  BarChart3,
  Bell,
  CheckSquare,
  Compass,
  LogOut,
  Menu,
  Shield,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import { auth, googleAuthProvider } from './lib/firebase';
import { apiFetch, setPreviewRole } from './lib/api';
import { SimapasEmblem } from './components/SimapasEmblem';
import { LandingPortal } from './components/LandingPortal';
import { DashboardAnalyticsView } from './components/DashboardAnalyticsView';
import { MemberProfileView } from './components/MemberProfileView';
import { MembersDirectoryView } from './components/MembersDirectoryView';
import { VerificationQueueView } from './components/VerificationQueueView';
import { EcosystemView } from './components/EcosystemView';
import { GovernanceAdminView } from './components/GovernanceAdminView';
import type {
  AppRole,
  Cohort,
  District,
  OrganizationMaster,
  SessionResponse,
  SkillMaster,
} from './types/simapas';

type NavKey = 'dashboard' | 'profile' | 'members' | 'verification' | 'ecosystem' | 'governance';

const ROLE_DISPLAY: Record<AppRole, string> = {
  anggota: 'Anggota',
  pengurus: 'Pengurus',
  operator: 'Operator',
  admin: 'Admin',
  super_admin: 'Super Admin',
};

const NAV_TITLES: Record<NavKey, string> = {
  dashboard: 'Dashboard & Pelaporan',
  profile: 'Profil Induk Saya',
  members: 'Basis Data Anggota',
  verification: 'Verifikasi & Angkatan',
  ecosystem: 'Ekosistem & Narasumber',
  governance: 'Tata Kelola & Audit',
};

export default function App() {
  const [fbUser, setFbUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [session, setSession] = useState<SessionResponse | null>(null);
  const [districts, setDistricts] = useState<District[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [skills, setSkills] = useState<SkillMaster[]>([]);
  const [organizations, setOrganizations] = useState<OrganizationMaster[]>([]);
  const [loadingSession, setLoadingSession] = useState(false);
  const [sessionError, setSessionError] = useState<string | null>(null);

  const [activeNav, setActiveNav] = useState<NavKey>('profile');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [verifyingPortalAuth, setVerifyingPortalAuth] = useState(false);

  const loadSessionAndMasters = useCallback(async () => {
    setLoadingSession(true);
    setSessionError(null);
    try {
      const [meRes, mastersRes] = await Promise.all([
        apiFetch<SessionResponse>('/api/me'),
        apiFetch<{
          districts: District[];
          cohorts: Cohort[];
          skills: SkillMaster[];
          organizations: OrganizationMaster[];
        }>('/api/masters'),
      ]);
      setSession(meRes);
      setDistricts(mastersRes.districts);
      setCohorts(mastersRes.cohorts);
      setSkills(mastersRes.skills);
      setOrganizations(mastersRes.organizations);

      // Route to sensible landing workspace tab based on role permissions
      setActiveNav((prev) => {
        if (prev === 'dashboard' && !meRes.capabilities.canViewAggregateStats) return 'profile';
        if (prev === 'members' && !meRes.capabilities.canViewAllMembers) return 'profile';
        if (prev === 'verification' && !meRes.capabilities.canVerifyMembers) return 'profile';
        if (prev === 'ecosystem' && !meRes.capabilities.canViewAllMembers) return 'profile';
        if (
          prev === 'governance' &&
          !meRes.capabilities.canManageUsersAndRoles &&
          !meRes.capabilities.canViewAuditLogs &&
          !meRes.capabilities.canManageSystemSettings
        ) {
          return 'profile';
        }
        return prev;
      });
    } catch (err) {
      setSessionError(err instanceof Error ? err.message : 'Gagal memuat sesi aplikasi.');
    } finally {
      setLoadingSession(false);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setFbUser(user);
      setAuthReady(true);
      if (user) {
        if (!verifyingPortalAuth) {
          await loadSessionAndMasters();
        }
      } else {
        setPreviewRole(null);
        setSession(null);
      }
    });
    return () => unsub();
  }, [loadSessionAndMasters, verifyingPortalAuth]);

  // Default landing tab when session first arrives
  useEffect(() => {
    if (session) {
      if (session.capabilities.canViewAggregateStats) {
        setActiveNav((curr) => (curr === 'profile' && !session.ownMember ? 'dashboard' : curr));
      } else {
        setActiveNav('profile');
      }
    }
  }, [session?.user.id]);

  async function handleSignIn() {
    setAuthError(null);
    setSigningIn(true);
    try {
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Gagal masuk dengan akun Google.');
    } finally {
      setSigningIn(false);
    }
  }

  async function handleVerifierSignIn(activationCode?: string) {
    setAuthError(null);
    setSigningIn(true);
    setVerifyingPortalAuth(true);
    try {
      await signInWithPopup(auth, googleAuthProvider);
      await apiFetch<{ authorized: boolean; role: AppRole; activatedViaCode: boolean }>(
        '/api/auth/verifier-login',
        {
          method: 'POST',
          body: JSON.stringify({ activationCode: activationCode || '' }),
        }
      );
      setActiveNav('verification');
      await loadSessionAndMasters();
    } catch (err) {
      await signOut(auth).catch(() => {});
      setSession(null);
      setAuthError(
        err instanceof Error
          ? err.message
          : 'Akses Admin Verifikator ditolak. Pastikan akun memiliki kewenangan atau kode aktivasi yang sah.'
      );
    } finally {
      setVerifyingPortalAuth(false);
      setSigningIn(false);
    }
  }

  async function handleSignOut() {
    setPreviewRole(null);
    await signOut(auth);
  }

  async function handleSwitchPerspective(nextRole: AppRole) {
    setPreviewRole(nextRole);
    await loadSessionAndMasters();
  }

  async function handleMarkNotifRead(id: string) {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: 'POST' });
      await loadSessionAndMasters();
    } catch {
      // ignore
    }
  }

  if (!authReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-600">
        Memuat SIMAPAS Sidoarjo...
      </div>
    );
  }

  if (!fbUser || verifyingPortalAuth) {
    return (
      <LandingPortal
        onSignIn={handleSignIn}
        onVerifierSignIn={handleVerifierSignIn}
        signingIn={signingIn}
        authError={authError}
        onClearAuthError={() => setAuthError(null)}
      />
    );
  }

  if (loadingSession && !session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-sm text-slate-600">
        Menyiapkan ruang kerja dan hak akses SIMAPAS Sidoarjo...
      </div>
    );
  }

  if (sessionError || !session) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white border border-slate-200 rounded-lg p-6 max-w-md w-full space-y-4">
          <h1 className="text-lg font-bold text-[#0F2942]">Gagal Memuat Sesi</h1>
          <p className="text-sm text-red-700">{sessionError || 'Terjadi gangguan koneksi server.'}</p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={loadSessionAndMasters}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#0F2942] rounded-md cursor-pointer"
            >
              Coba Lagi
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="px-4 py-2 text-sm text-slate-700 border border-slate-300 rounded-md cursor-pointer"
            >
              Keluar
            </button>
          </div>
        </div>
      </div>
    );
  }

  const caps = session.capabilities;
  const unreadCount = session.notifications.filter((n) => !n.isRead).length;

  const allNavItems: Array<{ key: NavKey; label: string; Icon: typeof BarChart3; visible: boolean }> = [
    { key: 'dashboard', label: 'Dashboard & Laporan', Icon: BarChart3, visible: caps.canViewAggregateStats },
    { key: 'profile', label: 'Profil Induk Saya', Icon: UserCheck, visible: true },
    { key: 'members', label: 'Basis Data Anggota', Icon: Users, visible: caps.canViewAllMembers },
    { key: 'verification', label: 'Verifikasi & Angkatan', Icon: CheckSquare, visible: caps.canVerifyMembers },
    { key: 'ecosystem', label: 'Ekosistem & Narasumber', Icon: Compass, visible: caps.canViewAllMembers },
    {
      key: 'governance',
      label: 'Tata Kelola & Audit',
      Icon: Shield,
      visible: caps.canManageUsersAndRoles || caps.canViewAuditLogs || caps.canManageSystemSettings,
    },
  ];
  const navItems = allNavItems.filter((item) => item.visible);

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-64 shrink-0 flex-col bg-[#0F2942] text-white border-r border-[#0F2942] no-print">
        <div className="h-16 px-5 flex items-center gap-3 border-b border-white/10">
          <SimapasEmblem className="w-8 h-8 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-bold tracking-tight text-white truncate font-display">SIMAPAS Sidoarjo</p>
            <p className="text-[11px] text-slate-300 truncate">Bakesbangpol Kab. Sidoarjo</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1">
          {navItems.map((item) => {
            const Icon = item.Icon;
            const active = activeNav === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveNav(item.key)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md transition-colors text-left whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-white/15 text-white'
                    : 'text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-3 text-xs">
          <div>
            <p className="text-slate-400">Akun Aktif</p>
            <p className="font-medium text-white truncate mt-0.5">{session.user.fullName || session.user.email}</p>
            <p className="text-slate-300 mt-0.5">Peran: {ROLE_DISPLAY[session.user.effectiveRole]}</p>
          </div>
          <button
            type="button"
            onClick={handleSignOut}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-white bg-white/10 hover:bg-white/15 rounded-md transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Keluar Sesi</span>
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden bg-slate-900/50 flex">
          <div className="w-64 bg-[#0F2942] text-white flex flex-col h-full">
            <div className="h-16 px-4 flex items-center justify-between border-b border-white/10">
              <span className="font-bold text-sm font-display">SIMAPAS Sidoarjo</span>
              <button type="button" onClick={() => setMobileMenuOpen(false)} className="text-white cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.Icon;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      setActiveNav(item.key);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-md text-left cursor-pointer ${
                      activeNav === item.key ? 'bg-white/15 text-white' : 'text-slate-300'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-white/10">
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full py-2 text-xs font-medium text-white bg-white/10 rounded-md cursor-pointer"
              >
                Keluar Sesi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb trail left + 1-2 functional controls right */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-4 sticky top-0 z-20 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 text-slate-700 cursor-pointer"
              aria-label="Buka menu navigasi"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-sm truncate">
              <span className="text-slate-500 hidden sm:inline">SIMAPAS Sidoarjo</span>
              <span className="text-slate-400 hidden sm:inline">/</span>
              <span className="font-semibold text-[#0F2942] truncate">{NAV_TITLES[activeNav]}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Super Admin RBAC Perspective Switcher (Hanya muncul untuk Super Admin terverifikasi di PostgreSQL) */}
            {session.user.actualRole === 'super_admin' && (
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-xs text-slate-500">Simulasi Peran:</span>
                <select
                  value={session.user.effectiveRole}
                  onChange={(e) => handleSwitchPerspective(e.target.value as AppRole)}
                  className="px-2.5 py-1.5 text-xs font-medium border border-slate-300 rounded-md bg-white text-[#0F2942] cursor-pointer"
                >
                  <option value="super_admin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="operator">Operator</option>
                  <option value="pengurus">Pengurus</option>
                  <option value="anggota">Anggota</option>
                </select>
              </div>
            )}

            {/* Notifications popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen(!notifOpen)}
                className="relative p-2 text-slate-600 hover:text-[#0F2942] border border-slate-200 rounded-md bg-white cursor-pointer"
                aria-label="Notifikasi"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="ml-1 text-[11px] font-mono font-bold text-[#B91C1C]">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notifOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-lg shadow-lg p-4 z-40 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-[#0F2942]">Notifikasi Sistem</span>
                    <button type="button" onClick={() => setNotifOpen(false)} className="text-slate-400 cursor-pointer">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  {session.notifications.length === 0 ? (
                    <p className="text-xs text-slate-500 py-2">Belum ada notifikasi baru.</p>
                  ) : (
                    <ul className="space-y-2 max-h-64 overflow-y-auto">
                      {session.notifications.map((n) => (
                        <li
                          key={n.id}
                          onClick={() => handleMarkNotifRead(n.id)}
                          className={`p-2.5 rounded border text-xs cursor-pointer ${
                            n.isRead ? 'bg-slate-50 border-slate-100 text-slate-600' : 'bg-amber-50 border-amber-200 text-slate-900'
                          }`}
                        >
                          <p className="font-semibold">{n.title}</p>
                          <p className="mt-0.5">{n.message}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeNav === 'dashboard' && caps.canViewAggregateStats && (
            <DashboardAnalyticsView
              capabilities={caps}
              onNavigateQueue={() => setActiveNav('verification')}
            />
          )}

          {activeNav === 'profile' && (
            <MemberProfileView
              member={session.ownMember}
              districts={districts}
              cohorts={cohorts}
              skills={skills}
              organizations={organizations}
              userEmail={session.user.email}
              onRefreshSession={loadSessionAndMasters}
            />
          )}

          {activeNav === 'members' && caps.canViewAllMembers && (
            <MembersDirectoryView
              capabilities={caps}
              districts={districts}
              cohorts={cohorts}
            />
          )}

          {activeNav === 'verification' && caps.canVerifyMembers && (
            <VerificationQueueView
              capabilities={caps}
              cohorts={cohorts}
              onRefreshMasters={loadSessionAndMasters}
            />
          )}

          {activeNav === 'ecosystem' && caps.canViewAllMembers && (
            <EcosystemView
              capabilities={caps}
              districts={districts}
              skills={skills}
            />
          )}

          {activeNav === 'governance' && (
            <GovernanceAdminView
              capabilities={caps}
              effectiveRole={session.user.effectiveRole}
            />
          )}
        </main>
      </div>
    </div>
  );
}
