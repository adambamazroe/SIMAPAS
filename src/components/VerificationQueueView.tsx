import { useEffect, useState } from 'react';
import { CheckCircle2, RotateCcw, Copy, Check, Plus } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { StatusLabel } from './StatusLabel';
import type { Cohort, MemberBundle, RoleCapabilities } from '../types/simapas';

interface VerificationItem {
  id: string;
  memberId: string;
  status: string;
  submissionNotes: string | null;
  reviewNotes: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  member: MemberBundle | null;
}

interface InvitationItem {
  id: string;
  cohortYear: number;
  inviteeName: string;
  contactHint: string | null;
  token: string;
  status: string;
  expiresAt: string;
}

interface VerificationQueueViewProps {
  capabilities: RoleCapabilities;
  cohorts: Cohort[];
  onRefreshMasters: () => Promise<void>;
}

export function VerificationQueueView({ capabilities, cohorts, onRefreshMasters }: VerificationQueueViewProps) {
  const [activeTab, setActiveTab] = useState<'queue' | 'invitations' | 'cohorts'>('queue');
  const [items, setItems] = useState<VerificationItem[]>([]);
  const [invitations, setInvitations] = useState<InvitationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reviewNotesMap, setReviewNotesMap] = useState<Record<string, string>>({});
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const [inviteForm, setInviteForm] = useState({ cohortYear: 2005, inviteeName: '', contactHint: '', expiryDays: 30 });
  const [creatingInvite, setCreatingInvite] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  const [newCohort, setNewCohort] = useState({ cohortYear: 2026, cohortName: 'Angkatan 2026', archiveStatus: 'available', description: '' });
  const [creatingCohort, setCreatingCohort] = useState(false);

  async function loadData() {
    setLoading(true);
    try {
      const [vrRes, invRes] = await Promise.all([
        apiFetch<{ verifications: VerificationItem[] }>('/api/verifications'),
        capabilities.canAssistRegistration
          ? apiFetch<{ invitations: InvitationItem[] }>('/api/invitations')
          : Promise.resolve({ invitations: [] }),
      ]);
      setItems(vrRes.verifications);
      setInvitations(invRes.invitations);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat antrean verifikasi.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleDecision(id: string, decision: 'verified' | 'needs_revision') {
    const notes = (reviewNotesMap[id] || '').trim();
    if (decision === 'needs_revision' && !notes) {
      setError('Mohon tuliskan alasan perbaikan yang jelas sebelum mengembalikan data ke anggota.');
      return;
    }
    setError(null);
    setDecidingId(id);
    try {
      await apiFetch(`/api/verifications/${id}/decide`, {
        method: 'POST',
        body: JSON.stringify({ decision, reviewNotes: notes }),
      });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses verifikasi.');
    } finally {
      setDecidingId(null);
    }
  }

  async function handleCreateInvite(e: React.FormEvent) {
    e.preventDefault();
    setCreatingInvite(true);
    setError(null);
    try {
      await apiFetch('/api/invitations', {
        method: 'POST',
        body: JSON.stringify(inviteForm),
      });
      setInviteForm({ ...inviteForm, inviteeName: '', contactHint: '' });
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menerbitkan undangan.');
    } finally {
      setCreatingInvite(false);
    }
  }

  async function handleCreateCohort(e: React.FormEvent) {
    e.preventDefault();
    setCreatingCohort(true);
    setError(null);
    try {
      await apiFetch('/api/cohorts', {
        method: 'POST',
        body: JSON.stringify(newCohort),
      });
      await onRefreshMasters();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menambah master angkatan.');
    } finally {
      setCreatingCohort(false);
    }
  }

  async function handleUpdateCohortArchive(cohortId: string, archiveStatus: string) {
    try {
      await apiFetch(`/api/cohorts/${cohortId}`, {
        method: 'PATCH',
        body: JSON.stringify({ archiveStatus }),
      });
      await onRefreshMasters();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memperbarui status arsip.');
    }
  }

  const pendingItems = items.filter((i) => i.status === 'pending');
  const historyItems = items.filter((i) => i.status !== 'pending');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F2942]">Verifikasi, Undangan &amp; Master Angkatan</h1>
          <p className="text-sm text-slate-600 mt-1">
            Pemeriksaan validitas profil anggota, penerbitan tautan undangan angkatan lama, dan transparansi arsip.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 self-start">
          <button
            type="button"
            onClick={() => setActiveTab('queue')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'queue' ? 'bg-white text-[#0F2942] shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Antrean Pemeriksaan ({pendingItems.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('invitations')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'invitations' ? 'bg-white text-[#0F2942] shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Undangan Angkatan Lama
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('cohorts')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'cohorts' ? 'bg-white text-[#0F2942] shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Master Angkatan &amp; Arsip
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3.5 text-sm text-red-800">{error}</div>}

      {activeTab === 'queue' && (
        <div className="space-y-6">
          {loading ? (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-sm text-slate-500">
              Memuat antrean verifikasi...
            </div>
          ) : pendingItems.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-sm text-slate-500">
              Tidak ada pengajuan verifikasi yang menunggu pemeriksaan saat ini.
            </div>
          ) : (
            <div className="space-y-4">
              {pendingItems.map((vr) => {
                const m = vr.member;
                const hist = m?.paskibrakaHistory?.[0];
                return (
                  <div key={vr.id} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-base font-bold text-[#0F2942]">{m?.fullName || 'Anggota'}</h2>
                          <StatusLabel status={vr.status} />
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          Diajukan: {new Date(vr.submittedAt).toLocaleString('id-ID')} · Jalur:{' '}
                          {m?.dataSourceType === 'assisted' ? 'Pendataan Berbantuan' : 'Mandiri'}
                        </p>
                      </div>
                      {hist && (
                        <div className="text-xs sm:text-right">
                          <p className="font-mono font-semibold text-[#0F2942]">
                            Angkatan {hist.cohortYear} · {hist.assignmentLevel}
                          </p>
                          <p className="text-slate-600">{hist.schoolName}</p>
                        </div>
                      )}
                    </div>

                    <div className="grid md:grid-cols-3 gap-4 text-xs">
                      <div>
                        <p className="text-slate-500">Kecamatan &amp; TTL</p>
                        <p className="font-medium text-slate-900 mt-0.5">
                          {m?.homeDistrictName || '-'} · {m?.birthPlace || '-'}, {m?.birthDate || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Kontak Terdaftar</p>
                        <p className="font-mono text-slate-900 mt-0.5">
                          {m?.contact?.phone || '-'} · {m?.contact?.email || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-500">Bukti / Konfirmasi Arsip</p>
                        <p className="text-slate-900 mt-0.5">
                          {m?.documents?.length
                            ? m.documents.map((d) => `${d.title} (${d.referenceNumber || d.verificationMethod})`).join('; ')
                            : hist?.sourceNotes || 'Belum melampirkan referensi dokumen'}
                        </p>
                      </div>
                    </div>

                    {vr.submissionNotes && (
                      <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded p-2.5">
                        Catatan pengaju: {vr.submissionNotes}
                      </p>
                    )}

                    <div className="flex flex-col md:flex-row gap-3 pt-2 border-t border-slate-100">
                      <input
                        type="text"
                        value={reviewNotesMap[vr.id] || ''}
                        onChange={(e) => setReviewNotesMap({ ...reviewNotesMap, [vr.id]: e.target.value })}
                        placeholder="Catatan pemeriksa (wajib diisi bila mengembalikan untuk perbaikan)..."
                        className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
                      />
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          disabled={decidingId === vr.id}
                          onClick={() => handleDecision(vr.id, 'needs_revision')}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-700 bg-white border border-red-300 rounded-md hover:bg-red-50 whitespace-nowrap cursor-pointer disabled:opacity-60"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Kembalikan Perbaikan</span>
                        </button>
                        <button
                          type="button"
                          disabled={decidingId === vr.id}
                          onClick={() => handleDecision(vr.id, 'verified')}
                          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-emerald-700 rounded-md hover:bg-emerald-800 whitespace-nowrap cursor-pointer disabled:opacity-60"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Verifikasi &amp; Terbitkan Nomor</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {historyItems.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-3">
              <h3 className="text-sm font-bold text-[#0F2942]">Riwayat Keputusan Verifikasi</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-slate-500">
                      <th className="py-2 font-medium">Nama Anggota</th>
                      <th className="py-2 font-medium">Keputusan</th>
                      <th className="py-2 font-medium">Catatan Pemeriksa</th>
                      <th className="py-2 font-medium text-right">Tanggal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historyItems.map((vr) => (
                      <tr key={vr.id}>
                        <td className="py-2.5 font-medium text-slate-900">{vr.member?.fullName || '-'}</td>
                        <td className="py-2.5">
                          <StatusLabel status={vr.status} />
                        </td>
                        <td className="py-2.5 text-slate-600">{vr.reviewNotes || '-'}</td>
                        <td className="py-2.5 text-right font-mono text-slate-500">
                          {vr.reviewedAt ? new Date(vr.reviewedAt).toLocaleDateString('id-ID') : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'invitations' && (
        <div className="grid lg:grid-cols-12 gap-6">
          <form onSubmit={handleCreateInvite} className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-6 space-y-4 self-start">
            <div>
              <h2 className="text-base font-bold text-[#0F2942]">Terbitkan Undangan Registrasi</h2>
              <p className="text-xs text-slate-500 mt-1">
                Untuk anggota angkatan lama yang tercatat dalam arsip Bakesbangpol. Tautan/kode memiliki masa berlaku.
              </p>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tahun Angkatan</label>
              <select
                value={inviteForm.cohortYear}
                onChange={(e) => setInviteForm({ ...inviteForm, cohortYear: Number(e.target.value) })}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
              >
                {cohorts.map((c) => (
                  <option key={c.id} value={c.cohortYear}>
                    {c.cohortName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nama Sesuai Arsip *</label>
              <input
                required
                type="text"
                value={inviteForm.inviteeName}
                onChange={(e) => setInviteForm({ ...inviteForm, inviteeName: e.target.value })}
                placeholder="Contoh: Bambang Sutrisno"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Keterangan Sekolah / Kontak Arsip</label>
              <input
                type="text"
                value={inviteForm.contactHint}
                onChange={(e) => setInviteForm({ ...inviteForm, contactHint: e.target.value })}
                placeholder="Alumni SMAN 1 Sidoarjo"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Masa Berlaku (Hari)</label>
              <input
                type="number"
                min={1}
                max={90}
                value={inviteForm.expiryDays}
                onChange={(e) => setInviteForm({ ...inviteForm, expiryDays: Number(e.target.value || 30) })}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
              />
            </div>
            <button
              type="submit"
              disabled={creatingInvite}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0F2942] rounded-md hover:bg-[#163A5C] cursor-pointer disabled:opacity-60"
            >
              <Plus className="w-4 h-4" />
              <span>{creatingInvite ? 'Menerbitkan...' : 'Terbitkan Kode Undangan'}</span>
            </button>
          </form>

          <div className="lg:col-span-8 bg-white border border-slate-200 rounded-lg p-6">
            <h2 className="text-base font-bold text-[#0F2942] mb-4">Daftar Undangan Registrasi</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                    <th className="py-2 font-medium">Kode Undangan</th>
                    <th className="py-2 font-medium">Penerima &amp; Angkatan</th>
                    <th className="py-2 font-medium">Status</th>
                    <th className="py-2 font-medium">Berlaku Hingga</th>
                    <th className="py-2 font-medium text-right">Salin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {invitations.map((inv) => (
                    <tr key={inv.id}>
                      <td className="py-2.5 font-mono text-xs font-semibold text-[#0F2942]">{inv.token}</td>
                      <td className="py-2.5">
                        <p className="font-medium text-slate-900">{inv.inviteeName}</p>
                        <p className="text-xs text-slate-500">
                          Angkatan {inv.cohortYear} {inv.contactHint ? `· ${inv.contactHint}` : ''}
                        </p>
                      </td>
                      <td className="py-2.5 text-xs">
                        {inv.status === 'active' ? (
                          <span className="text-emerald-700 font-medium">Aktif</span>
                        ) : (
                          <span className="text-slate-500">Sudah Diklaim</span>
                        )}
                      </td>
                      <td className="py-2.5 font-mono text-xs text-slate-600">
                        {new Date(inv.expiresAt).toLocaleDateString('id-ID')}
                      </td>
                      <td className="py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(inv.token);
                            setCopiedToken(inv.token);
                            setTimeout(() => setCopiedToken(null), 1500);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-[#0F2942] hover:underline cursor-pointer"
                        >
                          {copiedToken === inv.token ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedToken === inv.token ? 'Disalin' : 'Salin'}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'cohorts' && (
        <div className="grid lg:grid-cols-12 gap-6">
          {capabilities.canManageCohorts && (
            <form onSubmit={handleCreateCohort} className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-6 space-y-4 self-start">
              <div>
                <h2 className="text-base font-bold text-[#0F2942]">Tambah Master Angkatan</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Catat kondisi ketersediaan arsip fisik/digital secara transparan.
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tahun Angkatan</label>
                <input
                  type="number"
                  required
                  value={newCohort.cohortYear}
                  onChange={(e) =>
                    setNewCohort({
                      ...newCohort,
                      cohortYear: Number(e.target.value),
                      cohortName: `Angkatan ${e.target.value}`,
                    })
                  }
                  className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Status Arsip Induk</label>
                <select
                  value={newCohort.archiveStatus}
                  onChange={(e) => setNewCohort({ ...newCohort, archiveStatus: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                >
                  <option value="available">Arsip Tersedia Lengkap</option>
                  <option value="partial">Arsip Parsial</option>
                  <option value="missing">Arsip Fisik Kosong</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Catatan Sumber Arsip</label>
                <input
                  type="text"
                  value={newCohort.description}
                  onChange={(e) => setNewCohort({ ...newCohort, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                />
              </div>
              <button
                type="submit"
                disabled={creatingCohort}
                className="w-full px-4 py-2 text-sm font-semibold text-white bg-[#0F2942] rounded-md hover:bg-[#163A5C] cursor-pointer disabled:opacity-60"
              >
                {creatingCohort ? 'Menyimpan...' : 'Simpan Angkatan'}
              </button>
            </form>
          )}

          <div className={`${capabilities.canManageCohorts ? 'lg:col-span-8' : 'lg:col-span-12'} bg-white border border-slate-200 rounded-lg p-6`}>
            <h2 className="text-base font-bold text-[#0F2942] mb-4">Inventarisasi Angkatan Paskibraka Sidoarjo</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                    <th className="py-2 font-medium">Tahun</th>
                    <th className="py-2 font-medium">Nama Angkatan</th>
                    <th className="py-2 font-medium">Keterangan Arsip</th>
                    <th className="py-2 font-medium">Status Arsip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {cohorts.map((c) => (
                    <tr key={c.id}>
                      <td className="py-2.5 font-mono font-semibold text-slate-900">{c.cohortYear}</td>
                      <td className="py-2.5 font-medium text-slate-800">{c.cohortName}</td>
                      <td className="py-2.5 text-xs text-slate-600">{c.description || '-'}</td>
                      <td className="py-2.5">
                        {capabilities.canManageCohorts ? (
                          <select
                            value={c.archiveStatus}
                            onChange={(e) => handleUpdateCohortArchive(c.id, e.target.value)}
                            className="px-2 py-1 text-xs border border-slate-300 rounded bg-white"
                          >
                            <option value="available">Tersedia</option>
                            <option value="partial">Parsial</option>
                            <option value="missing">Kosong</option>
                          </select>
                        ) : (
                          <span className="text-xs text-slate-700">{c.archiveStatus}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
