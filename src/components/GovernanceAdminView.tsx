import { useEffect, useState } from 'react';
import { Copy, Check, Plus } from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { AppRole, RoleCapabilities } from '../types/simapas';

interface UserRow {
  id: string;
  email: string;
  fullName: string | null;
  role: AppRole;
  isActive: boolean;
  createdAt: string;
}

interface AuditRow {
  id: string;
  actorEmail: string | null;
  actorRole: string | null;
  action: string;
  entityType: string;
  purpose: string | null;
  createdAt: string;
}

interface SettingRow {
  id: string;
  key: string;
  value: string;
  description: string | null;
}

interface VerifierCodeRow {
  id: string;
  code: string;
  targetRole: string;
  assignedEmail: string | null;
  label: string;
  status: string;
  expiresAt: string;
  createdAt: string;
}

interface GovernanceAdminViewProps {
  capabilities: RoleCapabilities;
  effectiveRole: AppRole;
}

export function GovernanceAdminView({ capabilities, effectiveRole }: GovernanceAdminViewProps) {
  const defaultTab = capabilities.canManageUsersAndRoles
    ? 'users'
    : capabilities.canViewAuditLogs
    ? 'audit'
    : 'settings';

  const [tab, setTab] = useState<'users' | 'verifier_codes' | 'audit' | 'settings'>(defaultTab);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [verifierCodes, setVerifierCodes] = useState<VerifierCodeRow[]>([]);
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [settings, setSettings] = useState<SettingRow[]>([]);
  const [settingDrafts, setSettingDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [codeForm, setCodeForm] = useState({
    label: '',
    targetRole: 'operator',
    assignedEmail: '',
    expiryDays: 14,
  });
  const [creatingCode, setCreatingCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  async function loadGovernance() {
    setLoading(true);
    try {
      const [uRes, vcRes, aRes, sRes] = await Promise.all([
        capabilities.canManageUsersAndRoles ? apiFetch<{ users: UserRow[] }>('/api/admin/users') : Promise.resolve({ users: [] }),
        capabilities.canManageUsersAndRoles
          ? apiFetch<{ codes: VerifierCodeRow[] }>('/api/admin/verifier-codes')
          : Promise.resolve({ codes: [] }),
        capabilities.canViewAuditLogs ? apiFetch<{ logs: AuditRow[] }>('/api/admin/audit-logs') : Promise.resolve({ logs: [] }),
        capabilities.canManageSystemSettings ? apiFetch<{ settings: SettingRow[] }>('/api/admin/settings') : Promise.resolve({ settings: [] }),
      ]);
      setUsers(uRes.users);
      setVerifierCodes(vcRes.codes);
      setLogs(aRes.logs);
      setSettings(sRes.settings);
      const drafts: Record<string, string> = {};
      for (const s of sRes.settings) drafts[s.key] = s.value;
      setSettingDrafts(drafts);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat data tata kelola.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGovernance();
  }, [effectiveRole]);

  async function handleCreateVerifierCode(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setError(null);
    setCreatingCode(true);
    try {
      const res = await apiFetch<{ code: VerifierCodeRow }>('/api/admin/verifier-codes', {
        method: 'POST',
        body: JSON.stringify(codeForm),
      });
      setCodeForm({ label: '', targetRole: 'operator', assignedEmail: '', expiryDays: 14 });
      setMessage(`Kode aktivasi verifikator ${res.code.code} berhasil diterbitkan.`);
      await loadGovernance();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menerbitkan kode aktivasi verifikator.');
    } finally {
      setCreatingCode(false);
    }
  }

  async function handleRevokeCode(id: string) {
    setMessage(null);
    setError(null);
    try {
      await apiFetch(`/api/admin/verifier-codes/${id}/revoke`, { method: 'PATCH' });
      setMessage('Kode aktivasi verifikator berhasil dicabut.');
      await loadGovernance();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mencabut kode.');
    }
  }

  async function handleRoleChange(userId: string, role: string) {
    setMessage(null);
    setError(null);
    try {
      await apiFetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        body: JSON.stringify({ role }),
      });
      setMessage('Hak akses akun berhasil diperbarui dan dicatat di audit log.');
      await loadGovernance();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui peran.');
    }
  }

  async function handleSaveSetting(key: string) {
    setMessage(null);
    setError(null);
    try {
      await apiFetch(`/api/admin/settings/${key}`, {
        method: 'PATCH',
        body: JSON.stringify({ value: settingDrafts[key] }),
      });
      setMessage(`Pengaturan ${key} berhasil disimpan.`);
      await loadGovernance();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan pengaturan.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F2942]">Tata Kelola Akun, Audit &amp; Kebijakan</h1>
          <p className="text-sm text-slate-600 mt-1">
            Pengendalian hak akses RBAC, pencatatan jejak aktivitas, dan kebijakan retensi sistem.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 self-start">
          {capabilities.canManageUsersAndRoles && (
            <>
              <button
                type="button"
                onClick={() => setTab('users')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  tab === 'users' ? 'bg-white text-[#0F2942] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Akun &amp; Role
              </button>
              <button
                type="button"
                onClick={() => setTab('verifier_codes')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  tab === 'verifier_codes' ? 'bg-white text-[#0F2942] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Kode Verifikator
              </button>
            </>
          )}
          {capabilities.canViewAuditLogs && (
            <button
              type="button"
              onClick={() => setTab('audit')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                tab === 'audit' ? 'bg-white text-[#0F2942] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Audit Log
            </button>
          )}
          {capabilities.canManageSystemSettings && (
            <button
              type="button"
              onClick={() => setTab('settings')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                tab === 'settings' ? 'bg-white text-[#0F2942] shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Konfigurasi Sistem
            </button>
          )}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3.5 text-sm text-red-800">{error}</div>}
      {message && <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3.5 text-sm text-emerald-800">{message}</div>}

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-sm text-slate-500">
          Memuat tata kelola sistem...
        </div>
      ) : tab === 'users' ? (
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-base font-bold text-[#0F2942] mb-4">Pengelolaan Akun &amp; Peran RBAC</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="py-2 font-medium">Nama / Email Akun</th>
                  <th className="py-2 font-medium">Peran Saat Ini</th>
                  <th className="py-2 font-medium">Terdaftar</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3">
                      <p className="font-medium text-slate-900">{u.fullName || '-'}</p>
                      <p className="text-xs font-mono text-slate-500">{u.email}</p>
                    </td>
                    <td className="py-3">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        className="px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white"
                      >
                        <option value="anggota">Anggota</option>
                        <option value="pengurus">Pengurus</option>
                        <option value="operator">Operator</option>
                        <option value="admin">Admin</option>
                        {effectiveRole === 'super_admin' && <option value="super_admin">Super Admin</option>}
                      </select>
                    </td>
                    <td className="py-3 font-mono text-xs text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString('id-ID')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : tab === 'verifier_codes' ? (
        <div className="grid lg:grid-cols-12 gap-6">
          <form onSubmit={handleCreateVerifierCode} className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-6 space-y-4 self-start">
            <div>
              <h2 className="text-base font-bold text-[#0F2942]">Terbitkan Kode Aktivasi Verifikator</h2>
              <p className="text-xs text-slate-500 mt-1">
                Berikan kode sekali pakai kepada petugas baru agar dapat mengaktifkan akses Admin/Operator Verifikator saat masuk dengan akun Google.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nama / Unit Petugas *</label>
              <input
                required
                type="text"
                value={codeForm.label}
                onChange={(e) => setCodeForm({ ...codeForm, label: e.target.value })}
                placeholder="Contoh: Petugas Verifikator Bidang Ideologi"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Peran Tujuan</label>
              <select
                value={codeForm.targetRole}
                onChange={(e) => setCodeForm({ ...codeForm, targetRole: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
              >
                <option value="operator">Operator Verifikator</option>
                {effectiveRole === 'super_admin' && <option value="admin">Admin Verifikator</option>}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Kunci Email Google (Opsional)</label>
              <input
                type="email"
                value={codeForm.assignedEmail}
                onChange={(e) => setCodeForm({ ...codeForm, assignedEmail: e.target.value })}
                placeholder="petugas@gmail.com"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Masa Berlaku (Hari)</label>
              <input
                type="number"
                min={1}
                max={90}
                value={codeForm.expiryDays}
                onChange={(e) => setCodeForm({ ...codeForm, expiryDays: Number(e.target.value || 14) })}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
              />
            </div>
            <button
              type="submit"
              disabled={creatingCode}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0F2942] rounded-md hover:bg-[#163A5C] cursor-pointer disabled:opacity-60"
            >
              <Plus className="w-4 h-4" />
              <span>{creatingCode ? 'Menerbitkan...' : 'Terbitkan Kode Aktivasi'}</span>
            </button>
          </form>

          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="text-base font-bold text-[#0F2942] mb-4">Daftar Kode Aktivasi Verifikator</h2>
            {verifierCodes.length === 0 ? (
              <p className="text-sm text-slate-500 py-4">Belum ada kode aktivasi verifikator yang diterbitkan.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="py-2 font-medium">Kode</th>
                      <th className="py-2 font-medium">Petugas &amp; Peran</th>
                      <th className="py-2 font-medium">Status</th>
                      <th className="py-2 font-medium">Berlaku Hingga</th>
                      <th className="py-2 font-medium text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {verifierCodes.map((vc) => (
                      <tr key={vc.id}>
                        <td className="py-2.5 font-mono font-semibold text-[#0F2942]">{vc.code}</td>
                        <td className="py-2.5">
                          <p className="font-medium text-slate-900">{vc.label}</p>
                          <p className="text-slate-500">
                            Peran: {vc.targetRole} {vc.assignedEmail ? `· ${vc.assignedEmail}` : ''}
                          </p>
                        </td>
                        <td className="py-2.5 font-medium">
                          {vc.status === 'active' && <span className="text-emerald-700">Aktif</span>}
                          {vc.status === 'used' && <span className="text-slate-500">Digunakan</span>}
                          {vc.status === 'revoked' && <span className="text-red-700">Dicabut</span>}
                        </td>
                        <td className="py-2.5 font-mono text-slate-600">
                          {new Date(vc.expiresAt).toLocaleDateString('id-ID')}
                        </td>
                        <td className="py-2.5 text-right space-x-3 whitespace-nowrap">
                          {vc.status === 'active' && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard?.writeText(vc.code);
                                  setCopiedCode(vc.code);
                                  setTimeout(() => setCopiedCode(null), 1500);
                                }}
                                className="inline-flex items-center gap-1 text-[#0F2942] hover:underline cursor-pointer"
                              >
                                {copiedCode === vc.code ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                <span>{copiedCode === vc.code ? 'Disalin' : 'Salin'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRevokeCode(vc.id)}
                                className="text-red-700 hover:underline cursor-pointer"
                              >
                                Cabut
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : tab === 'audit' ? (
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <h2 className="text-base font-bold text-[#0F2942] mb-4">Jejak Audit Aktivitas Sistem</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-left text-slate-500">
                  <th className="py-2 font-medium">Waktu</th>
                  <th className="py-2 font-medium">Aktor &amp; Peran</th>
                  <th className="py-2 font-medium">Aksi</th>
                  <th className="py-2 font-medium">Entitas</th>
                  <th className="py-2 font-medium">Tujuan / Keterangan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((l) => (
                  <tr key={l.id}>
                    <td className="py-2.5 font-mono text-slate-500 whitespace-nowrap pr-3">
                      {new Date(l.createdAt).toLocaleString('id-ID')}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="font-mono text-slate-800">{l.actorEmail || '-'}</span>
                      <span className="text-slate-500"> · {l.actorRole || '-'}</span>
                    </td>
                    <td className="py-2.5 font-mono font-semibold text-[#0F2942] pr-3">{l.action}</td>
                    <td className="py-2.5 font-mono text-slate-600 pr-3">{l.entityType}</td>
                    <td className="py-2.5 text-slate-700">{l.purpose || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#0F2942]">Konfigurasi Kebijakan &amp; Retensi Sistem</h2>
            <p className="text-xs text-slate-500 mt-0.5">Hanya dapat diubah oleh Super Administrator.</p>
          </div>
          <div className="divide-y divide-slate-100">
            {settings.map((s) => (
              <div key={s.id} className="py-4 grid md:grid-cols-12 gap-4 items-center">
                <div className="md:col-span-5">
                  <p className="text-xs font-mono font-semibold text-[#0F2942]">{s.key}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{s.description}</p>
                </div>
                <div className="md:col-span-5">
                  <input
                    type="text"
                    value={settingDrafts[s.key] || ''}
                    onChange={(e) => setSettingDrafts({ ...settingDrafts, [s.key]: e.target.value })}
                    className="w-full px-3 py-1.5 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div className="md:col-span-2 text-right">
                  <button
                    type="button"
                    onClick={() => handleSaveSetting(s.key)}
                    className="px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0F2942] rounded-md hover:bg-[#163A5C] cursor-pointer"
                  >
                    Simpan
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
