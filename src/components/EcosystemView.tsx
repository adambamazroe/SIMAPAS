import { useEffect, useState } from 'react';
import { Plus, Calendar, MapPin, Award, Users } from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { District, RoleCapabilities, SkillMaster } from '../types/simapas';

interface SpeakerItem {
  id: string;
  memberNumber: string | null;
  fullName: string;
  homeDistrictId: string | null;
  homeDistrictName: string | null;
  skills: Array<{
    skillId: string;
    skillName: string;
    proficiencyLevel: string;
    yearsExperience: number;
    evidenceNotes: string | null;
  }>;
  history: Array<{
    cohortYear: number | null;
    assignmentLevel: string;
    schoolName: string;
  }>;
  certifications: Array<{
    title: string;
    issuer: string;
    issuedYear: number | null;
  }>;
  contact: { phone: string | null; email: string | null } | null;
  contactRedacted: boolean;
}

interface OrgItem {
  id: string;
  name: string;
  shortName: string;
  category: string;
  description: string | null;
  periods: Array<{ id: string; periodLabel: string; isCurrent: boolean }>;
  memberships: Array<{
    id: string;
    memberName: string;
    memberNumber: string | null;
    periodLabel: string;
    positionTitle: string;
    status: string;
  }>;
}

interface ProgramItem {
  id: string;
  title: string;
  targetAudience: string;
  scheduleSummary: string | null;
  description: string | null;
  status: string;
  participants: Array<{ id: string; memberName: string; role: string }>;
}

interface ActivityItem {
  id: string;
  title: string;
  organizer: string;
  location: string;
  activityDate: string;
  programTitle: string | null;
  description: string | null;
  documentationNotes: string | null;
  status: string;
  participants: Array<{ id: string; memberName: string; participationRole: string }>;
}

interface EcosystemViewProps {
  capabilities: RoleCapabilities;
  districts: District[];
  skills: SkillMaster[];
}

export function EcosystemView({ capabilities, districts, skills }: EcosystemViewProps) {
  const [tab, setTab] = useState<'speakers' | 'organizations' | 'activities'>('speakers');
  const [speakers, setSpeakers] = useState<SpeakerItem[]>([]);
  const [orgs, setOrgs] = useState<OrgItem[]>([]);
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [skillFilter, setSkillFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');

  const [newActivity, setNewActivity] = useState({
    title: '',
    organizer: 'Bakesbangpol & DPPI Kabupaten Sidoarjo',
    location: 'Kabupaten Sidoarjo',
    activityDate: new Date().toISOString().slice(0, 10),
    programId: '',
    description: '',
  });
  const [savingAct, setSavingAct] = useState(false);

  async function loadAll() {
    setLoading(true);
    try {
      const spQs = new URLSearchParams();
      if (skillFilter) spQs.set('skillId', skillFilter);
      if (districtFilter) spQs.set('districtId', districtFilter);

      const [spRes, orgRes, actRes] = await Promise.all([
        apiFetch<{ speakers: SpeakerItem[] }>(`/api/speakers?${spQs.toString()}`),
        apiFetch<{ organizations: OrgItem[] }>('/api/organizations'),
        apiFetch<{ programs: ProgramItem[]; activities: ActivityItem[] }>('/api/activities'),
      ]);
      setSpeakers(spRes.speakers);
      setOrgs(orgRes.organizations);
      setPrograms(actRes.programs);
      setActivities(actRes.activities);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat modul ekosistem.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, [skillFilter, districtFilter]);

  async function handleCreateActivity(e: React.FormEvent) {
    e.preventDefault();
    setSavingAct(true);
    setError(null);
    try {
      await apiFetch('/api/activities', {
        method: 'POST',
        body: JSON.stringify(newActivity),
      });
      setNewActivity({
        ...newActivity,
        title: '',
        description: '',
      });
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan kegiatan.');
    } finally {
      setSavingAct(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F2942]">Ekosistem Pembinaan &amp; Direktori Narasumber</h1>
          <p className="text-sm text-slate-600 mt-1">
            Pemanfaatan kompetensi anggota bersetuju, manajemen organisasi alumni, serta rekam jejak kegiatan pembinaan.
          </p>
        </div>

        <div className="inline-flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 self-start">
          <button
            type="button"
            onClick={() => setTab('speakers')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tab === 'speakers' ? 'bg-white text-[#0F2942] shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Direktori Narasumber
          </button>
          <button
            type="button"
            onClick={() => setTab('organizations')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tab === 'organizations' ? 'bg-white text-[#0F2942] shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Organisasi &amp; Pengurus
          </button>
          <button
            type="button"
            onClick={() => setTab('activities')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tab === 'activities' ? 'bg-white text-[#0F2942] shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Program &amp; Kegiatan
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 rounded-lg p-3.5 text-sm text-red-800">{error}</div>}

      {tab === 'speakers' && (
        <div className="space-y-4">
          <div className="bg-white border border-slate-200 rounded-lg p-4 grid sm:grid-cols-2 gap-3">
            <select
              value={skillFilter}
              onChange={(e) => setSkillFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
            >
              <option value="">Semua Bidang Kompetensi</option>
              {skills.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
            >
              <option value="">Semua Kecamatan Domisili</option>
              {districts.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-slate-500">
            Menampilkan anggota terverifikasi yang telah memberikan persetujuan eksplisit untuk dihubungi sebagai instruktur/narasumber.
          </p>

          {loading ? (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-sm text-slate-500">
              Memuat direktori narasumber...
            </div>
          ) : speakers.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-sm text-slate-500">
              Belum ada narasumber yang sesuai dengan filter kompetensi/kecamatan ini.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {speakers.map((sp) => (
                <div key={sp.id} className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-base font-bold text-[#0F2942]">{sp.fullName}</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {sp.homeDistrictName || 'Sidoarjo'} · Angkatan {sp.history[0]?.cohortYear || '-'} ({sp.history[0]?.assignmentLevel || 'Kabupaten'})
                      </p>
                    </div>
                    <span className="font-mono text-xs text-slate-600">{sp.memberNumber || '-'}</span>
                  </div>

                  <div className="space-y-1.5 border-t border-slate-100 pt-3">
                    {sp.skills.map((s, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-800">{s.skillName}</span>
                        <span className="font-mono text-slate-600">
                          {s.proficiencyLevel} · {s.yearsExperience} thn
                        </span>
                      </div>
                    ))}
                  </div>

                  {sp.certifications.length > 0 && (
                    <div className="text-xs text-slate-600 flex items-start gap-1.5 pt-1">
                      <Award className="w-3.5 h-3.5 text-amber-700 mt-0.5 shrink-0" />
                      <span>{sp.certifications[0].title} ({sp.certifications[0].issuer})</span>
                    </div>
                  )}

                  <div className="border-t border-slate-100 pt-3 text-xs">
                    {sp.contactRedacted ? (
                      <span className="text-slate-500">
                        Kontak pribadi dikoordinasikan melalui Operator Bakesbangpol (Akses Pengurus).
                      </span>
                    ) : (
                      <span className="font-mono text-slate-700">
                        Kontak resmi: {sp.contact?.phone || '-'} · {sp.contact?.email || '-'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'organizations' && (
        <div className="space-y-6">
          {orgs.map((org) => (
            <div key={org.id} className="bg-white border border-slate-200 rounded-lg p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-[#0F2942]">{org.name}</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {org.category} · {org.description}
                  </p>
                </div>
                <span className="text-xs font-mono text-slate-600">
                  Periode Aktif: {org.periods.find((p) => p.isCurrent)?.periodLabel || '-'}
                </span>
              </div>

              {org.memberships.length === 0 ? (
                <p className="text-xs text-slate-500">Belum ada pengurus tercatat pada periode ini.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-slate-500 border-b border-slate-200">
                        <th className="py-2 font-medium">Nama Pengurus / Anggota</th>
                        <th className="py-2 font-medium">Jabatan</th>
                        <th className="py-2 font-medium">Periode</th>
                        <th className="py-2 font-medium">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {org.memberships.map((ms) => (
                        <tr key={ms.id}>
                          <td className="py-2 font-medium text-slate-900">{ms.memberName}</td>
                          <td className="py-2 text-slate-700">{ms.positionTitle}</td>
                          <td className="py-2 font-mono text-xs text-slate-600">{ms.periodLabel}</td>
                          <td className="py-2 text-xs text-emerald-700 font-medium capitalize">{ms.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'activities' && (
        <div className="space-y-8">
          {/* Program Pembinaan */}
          <div className="space-y-3">
            <h2 className="text-base font-bold text-[#0F2942]">Program Pembinaan Berkelanjutan</h2>
            <div className="grid md:grid-cols-2 gap-4">
              {programs.map((p) => (
                <div key={p.id} className="bg-white border border-slate-200 rounded-lg p-5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-bold text-[#0F2942]">{p.title}</h3>
                    <span className="text-xs font-medium text-emerald-700 capitalize">{p.status}</span>
                  </div>
                  <p className="text-xs text-slate-600">{p.description}</p>
                  <p className="text-xs text-slate-500 pt-1">
                    Sasaran: {p.targetAudience} {p.scheduleSummary ? `· ${p.scheduleSummary}` : ''}
                  </p>
                  <p className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" />
                    <span>{p.participants.length} koordinator/peserta terdaftar</span>
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Tambah Kegiatan & Daftar Kegiatan */}
          <div className="grid lg:grid-cols-12 gap-6">
            {capabilities.canManageActivities && (
              <form onSubmit={handleCreateActivity} className="lg:col-span-4 bg-white border border-slate-200 rounded-lg p-6 space-y-4 self-start">
                <h2 className="text-base font-bold text-[#0F2942]">Catat Kegiatan Baru</h2>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Nama Kegiatan *</label>
                  <input
                    required
                    type="text"
                    value={newActivity.title}
                    onChange={(e) => setNewActivity({ ...newActivity, title: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Terkait Program Pembinaan</label>
                  <select
                    value={newActivity.programId}
                    onChange={(e) => setNewActivity({ ...newActivity, programId: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                  >
                    <option value="">Kegiatan Mandiri (Non-Program)</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Penyelenggara *</label>
                  <input
                    required
                    type="text"
                    value={newActivity.organizer}
                    onChange={(e) => setNewActivity({ ...newActivity, organizer: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Lokasi *</label>
                    <input
                      required
                      type="text"
                      value={newActivity.location}
                      onChange={(e) => setNewActivity({ ...newActivity, location: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal *</label>
                    <input
                      required
                      type="date"
                      value={newActivity.activityDate}
                      onChange={(e) => setNewActivity({ ...newActivity, activityDate: e.target.value })}
                      className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Ringkasan Kegiatan</label>
                  <textarea
                    rows={2}
                    value={newActivity.description}
                    onChange={(e) => setNewActivity({ ...newActivity, description: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                  />
                </div>
                <button
                  type="submit"
                  disabled={savingAct}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-[#0F2942] rounded-md hover:bg-[#163A5C] cursor-pointer disabled:opacity-60"
                >
                  <Plus className="w-4 h-4" />
                  <span>{savingAct ? 'Menyimpan...' : 'Simpan Kegiatan'}</span>
                </button>
              </form>
            )}

            <div className={`${capabilities.canManageActivities ? 'lg:col-span-8' : 'lg:col-span-12'} space-y-4`}>
              {activities.map((a) => (
                <div key={a.id} className="bg-white border border-slate-200 rounded-lg p-5 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h3 className="text-base font-bold text-[#0F2942]">{a.title}</h3>
                    <span className="text-xs font-mono text-slate-600 capitalize">{a.status}</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="font-mono">{a.activityDate}</span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      <span>{a.location}</span>
                    </span>
                    <span>Penyelenggara: {a.organizer}</span>
                  </div>
                  {a.description && <p className="text-sm text-slate-700">{a.description}</p>}
                  {a.participants.length > 0 && (
                    <p className="text-xs text-slate-500 pt-1">
                      Partisipan tercatat: {a.participants.map((p) => `${p.memberName} (${p.participationRole})`).join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
