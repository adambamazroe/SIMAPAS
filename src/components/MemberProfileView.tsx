import { useEffect, useState } from 'react';
import { Plus, Trash2, KeyRound, Check, Send, Save } from 'lucide-react';
import { apiFetch } from '../lib/api';
import { StatusLabel } from './StatusLabel';
import type {
  Cohort,
  District,
  MemberBundle,
  OrganizationMaster,
  SkillMaster,
} from '../types/simapas';

interface MemberProfileViewProps {
  member: MemberBundle | null;
  districts: District[];
  cohorts: Cohort[];
  skills: SkillMaster[];
  organizations: OrganizationMaster[];
  userEmail: string;
  onRefreshSession: () => Promise<void>;
}

export function MemberProfileView({
  member,
  districts,
  cohorts,
  skills,
  organizations,
  userEmail,
  onRefreshSession,
}: MemberProfileViewProps) {
  const [fullName, setFullName] = useState(member?.fullName || '');
  const [birthPlace, setBirthPlace] = useState(member?.birthPlace || '');
  const [birthDate, setBirthDate] = useState(member?.birthDate || '');
  const [gender, setGender] = useState(member?.gender || 'Laki-laki');
  const [homeDistrictId, setHomeDistrictId] = useState(member?.homeDistrictId || districts[0]?.id || '');

  const [phone, setPhone] = useState(member?.contact?.phone || '');
  const [contactEmail, setContactEmail] = useState(member?.contact?.email || userEmail);
  const [emergencyContact, setEmergencyContact] = useState(member?.contact?.emergencyContact || '');

  const [village, setVillage] = useState(member?.address?.village || '');
  const [addressLine, setAddressLine] = useState(member?.address?.addressLine || '');
  const [postalCode, setPostalCode] = useState(member?.address?.postalCode || '');

  const firstHist = member?.paskibrakaHistory?.[0];
  const [cohortId, setCohortId] = useState(firstHist?.cohortId || cohorts[0]?.id || '');
  const [assignmentLevel, setAssignmentLevel] = useState(firstHist?.assignmentLevel || 'Kabupaten');
  const [schoolName, setSchoolName] = useState(firstHist?.schoolName || '');
  const [unitRole, setUnitRole] = useState(firstHist?.unitRole || '');
  const [sourceNotes, setSourceNotes] = useState(firstHist?.sourceNotes || '');

  const [educationList, setEducationList] = useState<MemberBundle['education']>(
    member?.education?.length
      ? member.education
      : [{ level: 'S1/D4', institution: '', major: '', startYear: 2020, endYear: null, isCurrent: false }]
  );

  const [employmentList, setEmploymentList] = useState<MemberBundle['employment']>(
    member?.employment?.length
      ? member.employment
      : [{ sector: 'Swasta', organizationName: '', positionTitle: '', startYear: 2023, isCurrent: true }]
  );

  const [skillList, setSkillList] = useState<MemberBundle['skills']>(
    member?.skills?.length
      ? member.skills
      : skills[0]
      ? [{ skillId: skills[0].id, proficiencyLevel: 'Menengah', yearsExperience: 2, evidenceNotes: '', availableAsSpeaker: false }]
      : []
  );

  const [orgList, setOrgList] = useState<MemberBundle['organizations']>(
    member?.organizations?.length ? member.organizations : []
  );

  const [docList, setDocList] = useState<MemberBundle['documents']>(
    member?.documents?.length
      ? member.documents
      : [{ documentType: 'Piagam_Paskibraka', title: '', referenceNumber: '', verificationMethod: 'digital_reference', notes: '' }]
  );

  const [privacyConsentGiven, setPrivacyConsentGiven] = useState(member?.privacyConsentGiven || false);
  const [narasumberConsent, setNarasumberConsent] = useState(member?.narasumberConsent || false);
  const [submissionNotes, setSubmissionNotes] = useState('');

  const [inviteToken, setInviteToken] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    if (member) {
      setFullName(member.fullName || '');
      setBirthPlace(member.birthPlace || '');
      setBirthDate(member.birthDate || '');
      setGender(member.gender || 'Laki-laki');
      setHomeDistrictId(member.homeDistrictId || districts[0]?.id || '');
      setPhone(member.contact?.phone || '');
      setContactEmail(member.contact?.email || userEmail);
      setEmergencyContact(member.contact?.emergencyContact || '');
      setVillage(member.address?.village || '');
      setAddressLine(member.address?.addressLine || '');
      setPostalCode(member.address?.postalCode || '');
      const h = member.paskibrakaHistory?.[0];
      if (h) {
        setCohortId(h.cohortId);
        setAssignmentLevel(h.assignmentLevel);
        setSchoolName(h.schoolName);
        setUnitRole(h.unitRole || '');
        setSourceNotes(h.sourceNotes || '');
      }
      if (member.education.length) setEducationList(member.education);
      if (member.employment.length) setEmploymentList(member.employment);
      if (member.skills.length) setSkillList(member.skills);
      setOrgList(member.organizations || []);
      if (member.documents.length) setDocList(member.documents);
      setPrivacyConsentGiven(member.privacyConsentGiven);
      setNarasumberConsent(member.narasumberConsent);
    }
  }, [member, districts, userEmail]);

  async function handleClaimInvitation() {
    if (!inviteToken.trim()) return;
    setClaiming(true);
    setFeedback(null);
    try {
      await apiFetch('/api/members/claim-invitation', {
        method: 'POST',
        body: JSON.stringify({ token: inviteToken.trim() }),
      });
      setInviteToken('');
      setFeedback({ type: 'ok', text: 'Undangan arsip angkatan lama berhasil diklaim. Silakan lengkapi dan ajukan verifikasi.' });
      await onRefreshSession();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Gagal mengklaim undangan.' });
    } finally {
      setClaiming(false);
    }
  }

  async function handleSave(submitForVerification: boolean) {
    setFeedback(null);
    if (!fullName.trim()) {
      setFeedback({ type: 'err', text: 'Nama lengkap wajib diisi.' });
      return;
    }
    if (submitForVerification && !privacyConsentGiven) {
      setFeedback({
        type: 'err',
        text: 'Anda wajib mencentang persetujuan pemberitahuan privasi (UU No. 27 Tahun 2022) sebelum mengajukan verifikasi.',
      });
      return;
    }

    setSaving(true);
    try {
      await apiFetch('/api/members/me', {
        method: 'POST',
        body: JSON.stringify({
          fullName,
          birthPlace,
          birthDate,
          gender,
          homeDistrictId,
          privacyConsentGiven,
          narasumberConsent,
          submitForVerification,
          submissionNotes,
          contact: { phone, email: contactEmail, emergencyContact },
          address: { districtId: homeDistrictId, village, addressLine, postalCode },
          paskibrakaHistory: { cohortId, assignmentLevel, schoolName, unitRole, sourceNotes },
          education: educationList,
          employment: employmentList,
          skills: skillList,
          organizations: orgList,
          documents: docList,
        }),
      });
      setFeedback({
        type: 'ok',
        text: submitForVerification
          ? 'Profil berhasil diajukan ke antrean pemeriksaan Operator Bakesbangpol.'
          : 'Draf profil induk Anda berhasil disimpan.',
      });
      await onRefreshSession();
    } catch (err) {
      setFeedback({ type: 'err', text: err instanceof Error ? err.message : 'Gagal menyimpan profil.' });
    } finally {
      setSaving(false);
    }
  }

  const latestReview = member?.verificationRequests?.[0];

  return (
    <div className="space-y-8 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#0F2942]">Profil Induk Purna Paskibraka</h1>
          <p className="text-sm text-slate-600 mt-1">
            Satu anggota, satu profil induk terhubung dengan riwayat kepaskibrakaan, pendidikan, pekerjaan, organisasi, dan kompetensi.
          </p>
        </div>
        {member && (
          <div className="flex items-center gap-3 shrink-0">
            {member.memberNumber && (
              <span className="text-xs font-mono font-semibold text-[#0F2942] bg-slate-100 border border-slate-200 px-2.5 py-1 rounded">
                {member.memberNumber}
              </span>
            )}
            <StatusLabel status={member.recordStatus} />
          </div>
        )}
      </div>

      {/* Catatan pengembalian revisi dari operator */}
      {member?.recordStatus === 'needs_revision' && latestReview?.reviewNotes && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-900">
          <p className="font-semibold">Profil Dikembalikan untuk Perbaikan</p>
          <p className="mt-1 text-red-800">{latestReview.reviewNotes}</p>
        </div>
      )}

      {/* Jalur Klaim Undangan Angkatan Lama jika belum memiliki profil */}
      {!member && (
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-3">
          <div className="flex items-center gap-2 text-[#0F2942]">
            <KeyRound className="w-4 h-4" />
            <h2 className="text-sm font-bold">Punya Kode Undangan Arsip Angkatan Lama?</h2>
          </div>
          <p className="text-xs text-slate-600">
            Jika Anda menerima kode undangan dari Bakesbangpol Kabupaten Sidoarjo (misalnya <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">UND-2005-SDA-8421</code>), masukkan di sini untuk mengklaim data arsip Anda.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-lg">
            <input
              type="text"
              value={inviteToken}
              onChange={(e) => setInviteToken(e.target.value)}
              placeholder="Masukkan kode undangan..."
              className="flex-1 px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
            />
            <button
              type="button"
              disabled={claiming || !inviteToken.trim()}
              onClick={handleClaimInvitation}
              className="px-4 py-2 text-sm font-semibold text-white bg-[#0F2942] rounded-md hover:bg-[#163A5C] transition-colors whitespace-nowrap shrink-0 disabled:opacity-60 cursor-pointer"
            >
              {claiming ? 'Memeriksa...' : 'Klaim Undangan'}
            </button>
          </div>
        </div>
      )}

      {feedback && (
        <div
          className={`rounded-lg p-4 text-sm border ${
            feedback.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Formulir Profil Induk */}
      <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-200">
        {/* Bagian 1: Identitas & Domisili */}
        <section className="p-6 space-y-5">
          <div>
            <h2 className="text-base font-bold text-[#0F2942]">01. Identitas Dasar &amp; Domisili Kecamatan</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Sesuai prinsip minimisasi data UU PDP, sistem tidak mengumpulkan NIK pada profil ini.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Nama Lengkap (Sesuai Ijazah/Piagam)</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Jenis Kelamin</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
              >
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tempat Lahir</label>
              <input
                type="text"
                value={birthPlace}
                onChange={(e) => setBirthPlace(e.target.value)}
                placeholder="Sidoarjo"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tanggal Lahir</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md font-mono focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Kecamatan Asal / Domisili</label>
              <select
                value={homeDistrictId}
                onChange={(e) => setHomeDistrictId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
              >
                {districts.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Desa / Kelurahan</label>
              <input
                type="text"
                value={village}
                onChange={(e) => setVillage(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Alamat Domisili Saat Ini</label>
              <input
                type="text"
                value={addressLine}
                onChange={(e) => setAddressLine(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
              />
            </div>
          </div>
        </section>

        {/* Bagian 2: Kontak Terkontrol */}
        <section className="p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#0F2942]">02. Kontak Pribadi (Akses Terbatas Operator &amp; Admin)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Nomor telepon dan kontak tidak ditampilkan kepada sesama anggota maupun pengurus organisasi secara default.
            </p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Nomor Telepon / WhatsApp</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812..."
                className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Email Kontak</label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Kontak Darurat / Keluarga</label>
              <input
                type="text"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
              />
            </div>
          </div>
        </section>

        {/* Bagian 3: Riwayat Penugasan Paskibraka */}
        <section className="p-6 space-y-4">
          <div>
            <h2 className="text-base font-bold text-[#0F2942]">03. Riwayat Penugasan Paskibraka</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Angkatan Tahun</label>
              <select
                value={cohortId}
                onChange={(e) => setCohortId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
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
                value={assignmentLevel}
                onChange={(e) => setAssignmentLevel(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
              >
                <option value="Kabupaten">Kabupaten Sidoarjo</option>
                <option value="Provinsi">Provinsi Jawa Timur</option>
                <option value="Nasional">Tingkat Nasional</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Sekolah Saat Bertugas</label>
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                placeholder="Contoh: SMAN 1 Sidoarjo"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Peran / Formasi Pasukan</label>
              <input
                type="text"
                value={unitRole}
                onChange={(e) => setUnitRole(e.target.value)}
                placeholder="Contoh: Pasukan 8 / Pembawa Baki"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Keterangan Sumber / Konfirmasi Tambahan (khusus angkatan lama bila tidak memiliki piagam digital)
              </label>
              <input
                type="text"
                value={sourceNotes}
                onChange={(e) => setSourceNotes(e.target.value)}
                placeholder="Contoh: Tercatat di arsip SMAN 1 Sidoarjo atau konfirmasi rekan satu angkatan..."
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
              />
            </div>
          </div>
        </section>

        {/* Bagian 4: Pendidikan & Pekerjaan */}
        <section className="p-6 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#0F2942]">04. Riwayat Pendidikan</h2>
              <button
                type="button"
                onClick={() =>
                  setEducationList([
                    ...educationList,
                    { level: 'S1/D4', institution: '', major: '', startYear: 2022, endYear: null, isCurrent: false },
                  ])
                }
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F2942] hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Pendidikan</span>
              </button>
            </div>
            {educationList.map((edu, idx) => (
              <div key={idx} className="grid sm:grid-cols-12 gap-3 items-center bg-slate-50 p-3 rounded-md border border-slate-200">
                <select
                  value={edu.level}
                  onChange={(e) => {
                    const next = [...educationList];
                    next[idx] = { ...edu, level: e.target.value };
                    setEducationList(next);
                  }}
                  className="sm:col-span-2 px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white"
                >
                  <option value="SMA/SMK">SMA/SMK</option>
                  <option value="D3">D3</option>
                  <option value="S1/D4">S1/D4</option>
                  <option value="S2">S2</option>
                  <option value="S3">S3</option>
                </select>
                <input
                  type="text"
                  value={edu.institution}
                  onChange={(e) => {
                    const next = [...educationList];
                    next[idx] = { ...edu, institution: e.target.value };
                    setEducationList(next);
                  }}
                  placeholder="Nama Institusi / Universitas"
                  className="sm:col-span-5 px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white"
                />
                <input
                  type="text"
                  value={edu.major || ''}
                  onChange={(e) => {
                    const next = [...educationList];
                    next[idx] = { ...edu, major: e.target.value };
                    setEducationList(next);
                  }}
                  placeholder="Jurusan / Program Studi"
                  className="sm:col-span-4 px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white"
                />
                <button
                  type="button"
                  onClick={() => setEducationList(educationList.filter((_, i) => i !== idx))}
                  className="sm:col-span-1 text-slate-400 hover:text-red-600 flex justify-center cursor-pointer"
                  aria-label="Hapus pendidikan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#0F2942]">05. Riwayat Pekerjaan / Profesi</h2>
              <button
                type="button"
                onClick={() =>
                  setEmploymentList([
                    ...employmentList,
                    { sector: 'Swasta', organizationName: '', positionTitle: '', startYear: 2024, isCurrent: true },
                  ])
                }
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F2942] hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Pekerjaan</span>
              </button>
            </div>
            {employmentList.map((emp, idx) => (
              <div key={idx} className="grid sm:grid-cols-12 gap-3 items-center bg-slate-50 p-3 rounded-md border border-slate-200">
                <select
                  value={emp.sector}
                  onChange={(e) => {
                    const next = [...employmentList];
                    next[idx] = { ...emp, sector: e.target.value };
                    setEmploymentList(next);
                  }}
                  className="sm:col-span-3 px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white"
                >
                  <option value="ASN/TNI/Polri">ASN / TNI / Polri</option>
                  <option value="BUMN/BUMD">BUMN / BUMD</option>
                  <option value="Swasta">Swasta</option>
                  <option value="Wirausaha">Wirausaha</option>
                  <option value="Pendidikan">Pendidikan</option>
                  <option value="Mahasiswa">Mahasiswa</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
                <input
                  type="text"
                  value={emp.organizationName}
                  onChange={(e) => {
                    const next = [...employmentList];
                    next[idx] = { ...emp, organizationName: e.target.value };
                    setEmploymentList(next);
                  }}
                  placeholder="Instansi / Perusahaan"
                  className="sm:col-span-4 px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white"
                />
                <input
                  type="text"
                  value={emp.positionTitle}
                  onChange={(e) => {
                    const next = [...employmentList];
                    next[idx] = { ...emp, positionTitle: e.target.value };
                    setEmploymentList(next);
                  }}
                  placeholder="Jabatan / Peran"
                  className="sm:col-span-4 px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white"
                />
                <button
                  type="button"
                  onClick={() => setEmploymentList(employmentList.filter((_, i) => i !== idx))}
                  className="sm:col-span-1 text-slate-400 hover:text-red-600 flex justify-center cursor-pointer"
                  aria-label="Hapus pekerjaan"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Bagian 6: Kompetensi, Pengalaman & Kesediaan Narasumber */}
        <section className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#0F2942]">06. Pemetaan Kompetensi &amp; Direktori Narasumber</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Lengkapi tingkat keahlian, lama pengalaman, dan bukti pendukung opsional.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                skills[0] &&
                setSkillList([
                  ...skillList,
                  { skillId: skills[0].id, proficiencyLevel: 'Menengah', yearsExperience: 1, evidenceNotes: '', availableAsSpeaker: false },
                ])
              }
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F2942] hover:underline cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tambah Keahlian</span>
            </button>
          </div>

          {skillList.map((sk, idx) => (
            <div key={idx} className="grid sm:grid-cols-12 gap-3 items-center bg-slate-50 p-3 rounded-md border border-slate-200">
              <select
                value={sk.skillId}
                onChange={(e) => {
                  const next = [...skillList];
                  next[idx] = { ...sk, skillId: e.target.value };
                  setSkillList(next);
                }}
                className="sm:col-span-4 px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white"
              >
                {skills.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select
                value={sk.proficiencyLevel}
                onChange={(e) => {
                  const next = [...skillList];
                  next[idx] = { ...sk, proficiencyLevel: e.target.value };
                  setSkillList(next);
                }}
                className="sm:col-span-2 px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white"
              >
                <option value="Dasar">Dasar</option>
                <option value="Menengah">Menengah</option>
                <option value="Mahir">Mahir</option>
                <option value="Instruktur">Instruktur</option>
              </select>
              <input
                type="number"
                min={0}
                max={50}
                value={sk.yearsExperience}
                onChange={(e) => {
                  const next = [...skillList];
                  next[idx] = { ...sk, yearsExperience: Number(e.target.value || 0) };
                  setSkillList(next);
                }}
                placeholder="Thn"
                className="sm:col-span-2 px-2.5 py-1.5 text-sm font-mono border border-slate-300 rounded bg-white"
              />
              <label className="sm:col-span-3 flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sk.availableAsSpeaker}
                  onChange={(e) => {
                    const next = [...skillList];
                    next[idx] = { ...sk, availableAsSpeaker: e.target.checked };
                    setSkillList(next);
                  }}
                />
                <span>Siap jadi narasumber</span>
              </label>
              <button
                type="button"
                onClick={() => setSkillList(skillList.filter((_, i) => i !== idx))}
                className="sm:col-span-1 text-slate-400 hover:text-red-600 flex justify-center cursor-pointer"
                aria-label="Hapus keahlian"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </section>

        {/* Bagian 7: Organisasi & Bukti Pendukung */}
        <section className="p-6 space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#0F2942]">07. Keanggotaan Organisasi Purna Paskibraka</h2>
              <button
                type="button"
                onClick={() =>
                  organizations[0] &&
                  setOrgList([
                    ...orgList,
                    {
                      organizationId: organizations[0].id,
                      periodId: organizations[0].periods[0]?.id || null,
                      positionId: organizations[0].positions[0]?.id || null,
                      status: 'aktif',
                    },
                  ])
                }
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F2942] hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Keanggotaan</span>
              </button>
            </div>
            {orgList.map((om, idx) => {
              const orgObj = organizations.find((o) => o.id === om.organizationId) || organizations[0];
              return (
                <div key={idx} className="grid sm:grid-cols-12 gap-3 items-center bg-slate-50 p-3 rounded-md border border-slate-200">
                  <select
                    value={om.organizationId}
                    onChange={(e) => {
                      const nextOrg = organizations.find((o) => o.id === e.target.value);
                      const next = [...orgList];
                      next[idx] = {
                        ...om,
                        organizationId: e.target.value,
                        periodId: nextOrg?.periods[0]?.id || null,
                        positionId: nextOrg?.positions[0]?.id || null,
                      };
                      setOrgList(next);
                    }}
                    className="sm:col-span-5 px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white"
                  >
                    {organizations.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={om.periodId || ''}
                    onChange={(e) => {
                      const next = [...orgList];
                      next[idx] = { ...om, periodId: e.target.value || null };
                      setOrgList(next);
                    }}
                    className="sm:col-span-3 px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white"
                  >
                    {orgObj?.periods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.periodLabel}
                      </option>
                    ))}
                  </select>
                  <select
                    value={om.positionId || ''}
                    onChange={(e) => {
                      const next = [...orgList];
                      next[idx] = { ...om, positionId: e.target.value || null };
                      setOrgList(next);
                    }}
                    className="sm:col-span-3 px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white"
                  >
                    {orgObj?.positions.map((pos) => (
                      <option key={pos.id} value={pos.id}>
                        {pos.title}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setOrgList(orgList.filter((_, i) => i !== idx))}
                    className="sm:col-span-1 text-slate-400 hover:text-red-600 flex justify-center cursor-pointer"
                    aria-label="Hapus organisasi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>

          <div className="space-y-3 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-[#0F2942]">08. Bukti Pendukung / Konfirmasi Arsip</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Angkatan lama tanpa dokumen digital dapat memilih metode Konfirmasi Arsip atau Referensi Petugas.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setDocList([
                    ...docList,
                    { documentType: 'Piagam_Paskibraka', title: '', referenceNumber: '', verificationMethod: 'digital_reference', notes: '' },
                  ])
                }
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F2942] hover:underline cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Bukti</span>
              </button>
            </div>
            {docList.map((doc, idx) => (
              <div key={idx} className="grid sm:grid-cols-12 gap-3 items-center bg-slate-50 p-3 rounded-md border border-slate-200">
                <select
                  value={doc.documentType}
                  onChange={(e) => {
                    const next = [...docList];
                    next[idx] = { ...doc, documentType: e.target.value };
                    setDocList(next);
                  }}
                  className="sm:col-span-3 px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white"
                >
                  <option value="Piagam_Paskibraka">Piagam Paskibraka</option>
                  <option value="SK_Penugasan">SK Penugasan</option>
                  <option value="Sertifikat_Kompetensi">Sertifikat Kompetensi</option>
                  <option value="Konfirmasi_Arsip">Konfirmasi Arsip Lama</option>
                </select>
                <input
                  type="text"
                  value={doc.title}
                  onChange={(e) => {
                    const next = [...docList];
                    next[idx] = { ...doc, title: e.target.value };
                    setDocList(next);
                  }}
                  placeholder="Nama dokumen / sumber konfirmasi"
                  className="sm:col-span-4 px-2.5 py-1.5 text-sm border border-slate-300 rounded bg-white"
                />
                <input
                  type="text"
                  value={doc.referenceNumber || ''}
                  onChange={(e) => {
                    const next = [...docList];
                    next[idx] = { ...doc, referenceNumber: e.target.value };
                    setDocList(next);
                  }}
                  placeholder="Nomor SK / Referensi"
                  className="sm:col-span-4 px-2.5 py-1.5 text-sm font-mono border border-slate-300 rounded bg-white"
                />
                <button
                  type="button"
                  onClick={() => setDocList(docList.filter((_, i) => i !== idx))}
                  className="sm:col-span-1 text-slate-400 hover:text-red-600 flex justify-center cursor-pointer"
                  aria-label="Hapus dokumen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Bagian 9: Persetujuan Privasi & Pengajuan */}
        <section className="p-6 bg-slate-50 space-y-5">
          <div className="space-y-3">
            <h2 className="text-base font-bold text-[#0F2942]">09. Pemberitahuan Privasi &amp; Persetujuan Subjek Data</h2>
            <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={privacyConsentGiven}
                onChange={(e) => setPrivacyConsentGiven(e.target.checked)}
                className="mt-1"
              />
              <span>
                Saya telah membaca pemberitahuan privasi SIMAPAS Sidoarjo dan menyetujui pemrosesan data saya oleh
                Bakesbangpol Kabupaten Sidoarjo untuk tujuan pendataan Purna Paskibraka, verifikasi arsip, serta
                perencanaan program pembinaan sesuai <strong>UU Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi</strong>.
              </span>
            </label>

            <label className="flex items-start gap-3 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={narasumberConsent}
                onChange={(e) => setNarasumberConsent(e.target.checked)}
                className="mt-1"
              />
              <span>
                Saya bersedia dicantumkan dalam <strong>Direktori Narasumber / Instruktur</strong> internal Bakesbangpol
                Kabupaten Sidoarjo dan dihubungi untuk kebutuhan pembinaan atau kegiatan kepaskibrakaan.
              </span>
            </label>
          </div>

          <div className="max-w-xl">
            <label className="block text-xs font-medium text-slate-700 mb-1">Catatan Pengajuan untuk Operator (Opsional)</label>
            <input
              type="text"
              value={submissionNotes}
              onChange={(e) => setSubmissionNotes(e.target.value)}
              placeholder="Contoh: Mohon verifikasi perubahan instansi pekerjaan terbaru"
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(false)}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Draf</span>
            </button>

            <button
              type="button"
              disabled={saving}
              onClick={() => handleSave(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#0F2942] rounded-md hover:bg-[#163A5C] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
            >
              {saving ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              <span>{saving ? 'Menyimpan...' : 'Ajukan Verifikasi'}</span>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
