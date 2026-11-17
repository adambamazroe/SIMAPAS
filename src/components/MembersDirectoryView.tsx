import { useEffect, useState } from 'react';
import { Search, UserPlus, X, ShieldAlert, Archive } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { StatusLabel } from './StatusLabel';
import type { Cohort, District, MemberBundle, RoleCapabilities } from '../types/simapas';

interface MembersDirectoryViewProps {
  capabilities: RoleCapabilities;
  districts: District[];
  cohorts: Cohort[];
}

export function MembersDirectoryView({ capabilities, districts, cohorts }: MembersDirectoryViewProps) {
  const [members, setMembers] = useState<MemberBundle[]>([]);
  const [redactedForRole, setRedactedForRole] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [cohortFilter, setCohortFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');

  const [selectedMember, setSelectedMember] = useState<MemberBundle | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [showAssistedModal, setShowAssistedModal] = useState(false);
  const [assistedForm, setAssistedForm] = useState({
    fullName: '',
    birthPlace: '',
    birthDate: '',
    gender: 'Laki-laki',
    homeDistrictId: districts[0]?.id || '',
    cohortId: cohorts[0]?.id || '',
    assignmentLevel: 'Kabupaten',
    schoolName: '',
    unitRole: '',
    phone: '',
    email: '',
    confirmationNotes: '',
    verifyImmediately: true,
  });
  const [assistedSaving, setAssistedSaving] = useState(false);
  const [assistedError, setAssistedError] = useState<string | null>(null);

  async function loadMembers() {
    setLoading(true);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set('search', search.trim());
      if (statusFilter !== 'all') qs.set('status', statusFilter);
      if (cohortFilter) qs.set('cohortYear', cohortFilter);
      if (districtFilter) qs.set('districtId', districtFilter);

      const res = await apiFetch<{ members: MemberBundle[]; redactedForRole: boolean }>(
        `/api/members?${qs.toString()}`
      );
      setMembers(res.members);
      setRedactedForRole(res.redactedForRole);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat daftar anggota.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      loadMembers();
    }, 180);
    return () => clearTimeout(timer);
  }, [search, statusFilter, cohortFilter, districtFilter]);

  async function openDetail(id: string) {
    setDetailLoading(true);
    try {
      const res = await apiFetch<{ member: MemberBundle }>(`/api/members/${id}`);
      setSelectedMember(res.member);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat detail anggota.');
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleAssistedSubmit(e: React.FormEvent) {
    e.preventDefault();
    setAssistedError(null);
    setAssistedSaving(true);
    try {
      await apiFetch('/api/members/assisted', {
        method: 'POST',
        body: JSON.stringify(assistedForm),
      });
      setShowAssistedModal(false);
      setAssistedForm({
        ...assistedForm,
        fullName: '',
        birthPlace: '',
        birthDate: '',
        schoolName: '',
        unitRole: '',
        phone: '',
        email: '',
        confirmationNotes: '',
      });
      await loadMembers();
    } catch (err) {
      setAssistedError(err instanceof Error ? err.message : 'Gagal menyimpan pendataan berbantuan.');
    } finally {
      setAssistedSaving(false);
    }
  }

  async function handleArchiveMember(id: string) {
    try {
      await apiFetch(`/api/members/${id}/archive`, {
        method: 'PATCH',
        body: JSON.stringify({ reason: 'Diarsipkan sesuai kebijakan retensi data historis.' }),
      });
      setSelectedMember(null);
      await loadMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengarsipkan anggota.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F2942]">Basis Data Anggota Purna Paskibraka</h1>
          <p className="text-sm text-slate-600 mt-1">
            Pencarian terstruktur dengan pembatasan akses tingkat baris sesuai peran pengguna.
          </p>
        </div>

        {capabilities.canAssistRegistration && (
          <button
            type="button"
            onClick={() => setShowAssistedModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0F2942] rounded-md hover:bg-[#163A5C] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            <span>Pendataan Berbantuan</span>
          </button>
        )}
      </div>

      {/* Pemberitahuan pembatasan data pribadi untuk Pengurus (PRD Sec 5 & 9) */}
      {redactedForRole && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 text-xs text-amber-900">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-amber-700" />
          <div>
            <p className="font-semibold">Pembatasan Row-Level Access Aktif (Peran Pengurus)</p>
            <p className="mt-0.5 text-amber-800">
              Sesuai prinsip least privilege dan UU PDP, tanggal lahir lengkap, nomor telepon, alamat rumah, dan dokumen pribadi anggota disembunyikan secara otomatis oleh server.
            </p>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 grid sm:grid-cols-2 lg:grid-cols-12 gap-3">
        <div className="lg:col-span-5 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, nomor anggota, sekolah, atau keahlian..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="lg:col-span-2 px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
        >
          <option value="all">Semua Status</option>
          <option value="verified">Terverifikasi</option>
          <option value="submitted">Menunggu Verifikasi</option>
          <option value="needs_revision">Perlu Perbaikan</option>
          <option value="draft">Draf</option>
          <option value="archived">Diarsipkan</option>
        </select>

        <select
          value={cohortFilter}
          onChange={(e) => setCohortFilter(e.target.value)}
          className="lg:col-span-2 px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
        >
          <option value="">Semua Angkatan</option>
          {cohorts.map((c) => (
            <option key={c.id} value={String(c.cohortYear)}>
              {c.cohortYear}
            </option>
          ))}
        </select>

        <select
          value={districtFilter}
          onChange={(e) => setDistrictFilter(e.target.value)}
          className="lg:col-span-3 px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
        >
          <option value="">Semua Kecamatan (18)</option>
          {districts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-800">{error}</div>
      )}

      {/* High-Density Data Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-xs font-semibold text-slate-600">
                <th className="px-4 py-3">No. Anggota</th>
                <th className="px-4 py-3">Nama Lengkap</th>
                <th className="px-4 py-3">Angkatan &amp; Sekolah</th>
                <th className="px-4 py-3">Kecamatan</th>
                <th className="px-4 py-3">Organisasi</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Memuat data anggota...
                  </td>
                </tr>
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    Tidak ada anggota yang sesuai dengan filter pencarian.
                  </td>
                </tr>
              ) : (
                members.map((m) => {
                  const hist = m.paskibrakaHistory?.[0];
                  const org = m.organizations?.[0];
                  return (
                    <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5 font-mono text-xs tabular-nums text-slate-700 whitespace-nowrap">
                        {m.memberNumber || 'Belum terbit'}
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-slate-900">{m.fullName}</p>
                        <p className="text-xs text-slate-500">
                          {m.gender || '-'}
                          {m.employment?.[0] ? ` · ${m.employment[0].positionTitle}` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="font-mono text-xs font-medium text-slate-800 tabular-nums">
                          {hist ? `${hist.cohortYear} · ${hist.assignmentLevel}` : '-'}
                        </p>
                        <p className="text-xs text-slate-500 truncate max-w-[200px]">
                          {hist?.schoolName || '-'}
                        </p>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700 whitespace-nowrap">
                        {m.homeDistrictName || '-'}
                      </td>
                      <td className="px-4 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                        {org?.organizationName || '-'}
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusLabel status={m.recordStatus} />
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => openDetail(m.id)}
                          className="text-xs font-semibold text-[#0F2942] hover:underline whitespace-nowrap cursor-pointer"
                        >
                          Rincian
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Slide-Over Modal */}
      {(selectedMember || detailLoading) && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex justify-end">
          <div className="bg-white w-full max-w-xl h-full overflow-y-auto border-l border-slate-200 p-6 space-y-6">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <p className="text-xs font-mono text-slate-500">
                  {selectedMember?.memberNumber || 'Nomor Anggota Belum Terbit'}
                </p>
                <h2 className="text-xl font-bold text-[#0F2942] mt-1">
                  {detailLoading ? 'Memuat...' : selectedMember?.fullName}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer"
                aria-label="Tutup rincian"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedMember && (
              <div className="space-y-5 text-sm">
                <div className="flex items-center justify-between">
                  <StatusLabel status={selectedMember.recordStatus} />
                  <span className="text-xs text-slate-500">
                    Jalur data: {selectedMember.dataSourceType === 'assisted' ? 'Pendataan Berbantuan' : selectedMember.dataSourceType === 'archive_import' ? 'Klaim Undangan Arsip' : 'Mandiri'}
                  </span>
                </div>

                {selectedMember.redactedForRole && (
                  <p className="text-xs bg-amber-50 border border-amber-200 text-amber-800 rounded p-3">
                    Tanggal lahir, kontak telepon, alamat lengkap, dan dokumen pribadi disamarkan sesuai hak akses Pengurus.
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-4">
                  <div>
                    <p className="text-xs text-slate-500">Kecamatan Asal</p>
                    <p className="font-medium text-slate-900">{selectedMember.homeDistrictName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Jenis Kelamin</p>
                    <p className="font-medium text-slate-900">{selectedMember.gender || '-'}</p>
                  </div>
                  {!selectedMember.redactedForRole && (
                    <>
                      <div>
                        <p className="text-xs text-slate-500">Tempat, Tanggal Lahir</p>
                        <p className="font-medium text-slate-900 font-mono text-xs">
                          {selectedMember.birthPlace || '-'}, {selectedMember.birthDate || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Telepon / Email</p>
                        <p className="font-medium text-slate-900 font-mono text-xs">
                          {selectedMember.contact?.phone || '-'} · {selectedMember.contact?.email || '-'}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-slate-500">Alamat Domisili</p>
                        <p className="font-medium text-slate-900">
                          {selectedMember.address?.addressLine || '-'} {selectedMember.address?.village ? `(${selectedMember.address.village})` : ''}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <div className="border-t border-slate-100 pt-4 space-y-2">
                  <h3 className="text-xs font-semibold text-slate-500">Riwayat Penugasan Paskibraka</h3>
                  {selectedMember.paskibrakaHistory.map((h, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-200 rounded p-3 text-xs space-y-1">
                      <p className="font-semibold text-[#0F2942]">
                        Angkatan {h.cohortYear} · Tingkat {h.assignmentLevel}
                      </p>
                      <p className="text-slate-700">{h.schoolName} {h.unitRole ? `· ${h.unitRole}` : ''}</p>
                      {h.sourceNotes && <p className="text-slate-500">{h.sourceNotes}</p>}
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-100 pt-4 space-y-2">
                  <h3 className="text-xs font-semibold text-slate-500">Kompetensi &amp; Kesiapan Narasumber</h3>
                  {selectedMember.skills.length === 0 ? (
                    <p className="text-xs text-slate-500">Belum ada kompetensi tercatat.</p>
                  ) : (
                    <ul className="space-y-1.5 text-xs">
                      {selectedMember.skills.map((s, i) => (
                        <li key={i} className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded border border-slate-200">
                          <span className="font-medium text-slate-800">
                            {s.skillName} · {s.proficiencyLevel}
                          </span>
                          <span className="font-mono text-slate-500">
                            {s.yearsExperience} thn {s.availableAsSpeaker && selectedMember.narasumberConsent ? '· Narasumber' : ''}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {!selectedMember.redactedForRole && selectedMember.documents.length > 0 && (
                  <div className="border-t border-slate-100 pt-4 space-y-2">
                    <h3 className="text-xs font-semibold text-slate-500">Bukti Pendukung &amp; Arsip</h3>
                    {selectedMember.documents.map((d, i) => (
                      <div key={i} className="text-xs bg-slate-50 border border-slate-200 rounded p-2.5">
                        <p className="font-medium text-slate-800">{d.title}</p>
                        <p className="font-mono text-slate-500 mt-0.5">
                          {d.documentType} · Ref: {d.referenceNumber || '-'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {capabilities.canVerifyMembers && selectedMember.recordStatus !== 'archived' && (
                  <div className="border-t border-slate-200 pt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={() => handleArchiveMember(selectedMember.id)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-300 rounded hover:bg-slate-100 cursor-pointer"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      <span>Arsipkan Profil (Retensi)</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Pendataan Berbantuan (Operator / Admin) */}
      {showAssistedModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <form
            onSubmit={handleAssistedSubmit}
            className="bg-white border border-slate-200 rounded-lg w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <h2 className="text-base font-bold text-[#0F2942]">Pendataan Berbantuan Anggota</h2>
                <p className="text-xs text-slate-500">
                  Untuk membantu anggota angkatan lama yang mengalami kendala digital atas persetujuan anggota.
                </p>
              </div>
              <button type="button" onClick={() => setShowAssistedModal(false)} className="text-slate-500 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            {assistedError && <p className="text-xs text-red-700 bg-red-50 border border-red-200 p-2.5 rounded">{assistedError}</p>}

            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Nama Lengkap Anggota *</label>
                <input
                  required
                  type="text"
                  value={assistedForm.fullName}
                  onChange={(e) => setAssistedForm({ ...assistedForm, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Angkatan *</label>
                <select
                  value={assistedForm.cohortId}
                  onChange={(e) => setAssistedForm({ ...assistedForm, cohortId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
                >
                  {cohorts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.cohortName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tingkat Penugasan</label>
                <select
                  value={assistedForm.assignmentLevel}
                  onChange={(e) => setAssistedForm({ ...assistedForm, assignmentLevel: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
                >
                  <option value="Kabupaten">Kabupaten</option>
                  <option value="Provinsi">Provinsi</option>
                  <option value="Nasional">Nasional</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Sekolah Saat Bertugas *</label>
                <input
                  required
                  type="text"
                  value={assistedForm.schoolName}
                  onChange={(e) => setAssistedForm({ ...assistedForm, schoolName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Kecamatan Asal</label>
                <select
                  value={assistedForm.homeDistrictId}
                  onChange={(e) => setAssistedForm({ ...assistedForm, homeDistrictId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
                >
                  {districts.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Nomor Telepon</label>
                <input
                  type="text"
                  value={assistedForm.phone}
                  onChange={(e) => setAssistedForm({ ...assistedForm, phone: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal Lahir</label>
                <input
                  type="date"
                  value={assistedForm.birthDate}
                  onChange={(e) => setAssistedForm({ ...assistedForm, birthDate: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-700 mb-1">Sumber Konfirmasi Arsip / Persetujuan Anggota</label>
                <input
                  type="text"
                  value={assistedForm.confirmationNotes}
                  onChange={(e) => setAssistedForm({ ...assistedForm, confirmationNotes: e.target.value })}
                  placeholder="Contoh: Dikonfirmasi dari buku induk Bakesbangpol & persetujuan lisan anggota."
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>
              <label className="sm:col-span-2 flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={assistedForm.verifyImmediately}
                  onChange={(e) => setAssistedForm({ ...assistedForm, verifyImmediately: e.target.checked })}
                />
                <span>Terverifikasi langsung melalui konfirmasi arsip resmi petugas</span>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowAssistedModal(false)}
                className="px-4 py-2 text-sm text-slate-700 border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={assistedSaving}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#0F2942] rounded-md hover:bg-[#163A5C] cursor-pointer disabled:opacity-60"
              >
                {assistedSaving ? 'Menyimpan...' : 'Simpan Data'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
