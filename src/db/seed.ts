import { count } from 'drizzle-orm';
import { db } from './index.ts';
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
  verificationHistory,
  verificationRequests,
} from './schema.ts';

let seedPromise: Promise<void> | null = null;

export async function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeedIfEmpty().catch((err) => {
      seedPromise = null;
      throw err;
    });
  }
  return seedPromise;
}

async function runSeedIfEmpty(): Promise<void> {
  const existingDistricts = await db.select({ total: count() }).from(districts);
  if (Number(existingDistricts[0]?.total || 0) > 0) {
    return;
  }

  // 1. 18 Kecamatan Resmi Kabupaten Sidoarjo
  const districtData = [
    { code: 'SDA-01', name: 'Sidoarjo' },
    { code: 'SDA-02', name: 'Buduran' },
    { code: 'SDA-03', name: 'Candi' },
    { code: 'SDA-04', name: 'Porong' },
    { code: 'SDA-05', name: 'Krembung' },
    { code: 'SDA-06', name: 'Tulangan' },
    { code: 'SDA-07', name: 'Tanggulangin' },
    { code: 'SDA-08', name: 'Jabon' },
    { code: 'SDA-09', name: 'Krian' },
    { code: 'SDA-10', name: 'Balongbendo' },
    { code: 'SDA-11', name: 'Wonoayu' },
    { code: 'SDA-12', name: 'Tarik' },
    { code: 'SDA-13', name: 'Prambon' },
    { code: 'SDA-14', name: 'Taman' },
    { code: 'SDA-15', name: 'Waru' },
    { code: 'SDA-16', name: 'Gedangan' },
    { code: 'SDA-17', name: 'Sedati' },
    { code: 'SDA-18', name: 'Sukodono' },
  ];
  const insertedDistricts = await db.insert(districts).values(districtData).returning();
  const dByName = new Map(insertedDistricts.map((d) => [d.name, d.id]));

  // 2. 5 Master Roles (PRD Sec 5)
  await db.insert(roles).values([
    { code: 'anggota', label: 'Anggota', description: 'Mengelola profil induk sendiri secara mandiri (self-service).' },
    { code: 'pengurus', label: 'Pengurus', description: 'Akses terbatas informasi organisasi dan kegiatan tanpa data pribadi sensitif.' },
    { code: 'operator', label: 'Operator Bakesbangpol', description: 'Memeriksa, memverifikasi, mengembalikan data, dan pendataan berbantuan.' },
    { code: 'admin', label: 'Administrator', description: 'Mengelola angkatan, organisasi, kegiatan, statistik, ekspor, dan akun.' },
    { code: 'super_admin', label: 'Super Administrator', description: 'Kendali penuh konfigurasi sistem, kebijakan retensi, dan hak akses.' },
  ]);

  // 3. Master Angkatan (termasuk transparansi status arsip lama)
  const insertedCohorts = await db
    .insert(cohorts)
    .values([
      { cohortYear: 1998, cohortName: 'Angkatan 1998', description: 'Arsip fisik sebelum era digitalisasi; pendataan melalui jalur berbantuan.', archiveStatus: 'missing', isActive: true },
      { cohortYear: 2005, cohortName: 'Angkatan 2005', description: 'Sebagian daftar SK tersedia di arsip Bakesbangpol.', archiveStatus: 'partial', isActive: true },
      { cohortYear: 2012, cohortName: 'Angkatan 2012', description: 'Arsip SK Penugasan Bupati tersedia parsial.', archiveStatus: 'partial', isActive: true },
      { cohortYear: 2016, cohortName: 'Angkatan 2016', description: 'Rekapitulasi lengkap Paskibraka Kabupaten Sidoarjo 2016.', archiveStatus: 'available', isActive: true },
      { cohortYear: 2018, cohortName: 'Angkatan 2018', description: 'Arsip resmi Bakesbangpol & Dinas Pemuda Olahraga 2018.', archiveStatus: 'available', isActive: true },
      { cohortYear: 2019, cohortName: 'Angkatan 2019', description: 'Arsip lengkap penugasan HUT RI ke-74 Kabupaten Sidoarjo.', archiveStatus: 'available', isActive: true },
      { cohortYear: 2021, cohortName: 'Angkatan 2021', description: 'Formasi penugasan terbatas masa adaptasi.', archiveStatus: 'available', isActive: true },
      { cohortYear: 2022, cohortName: 'Angkatan 2022', description: 'Angkatan di bawah koordinasi pembinaan Bakesbangpol & DPPI.', archiveStatus: 'available', isActive: true },
      { cohortYear: 2023, cohortName: 'Angkatan 2023', description: 'Arsip digital terstruktur Bakesbangpol Sidoarjo 2023.', archiveStatus: 'available', isActive: true },
      { cohortYear: 2024, cohortName: 'Angkatan 2024', description: 'Paskibraka Kabupaten Sidoarjo HUT RI ke-79.', archiveStatus: 'available', isActive: true },
      { cohortYear: 2025, cohortName: 'Angkatan 2025', description: 'Purna Paskibraka Kabupaten Sidoarjo terbaru.', archiveStatus: 'available', isActive: true },
    ])
    .returning();
  const cByYear = new Map(insertedCohorts.map((c) => [c.cohortYear, c.id]));

  // 4. Master Kompetensi
  const insertedSkills = await db
    .insert(skills)
    .values([
      { name: 'Peraturan Baris Berbaris (PBB)', category: 'Kepaskibrakaan' },
      { name: 'Tata Upacara Bendera (TUB)', category: 'Kepaskibrakaan' },
      { name: 'Wawasan Kebangsaan & Ideologi Pancasila', category: 'Kebangsaan' },
      { name: 'Keprotokolan & MC Resmi Daerah', category: 'Komunikasi' },
      { name: 'Kepemimpinan & Fasilitasi Pelatihan', category: 'Manajemen' },
      { name: 'Pertolongan Pertama & Siaga Bencana', category: 'Kemanusiaan' },
      { name: 'Teknologi Informasi & Pengolahan Data', category: 'Teknis' },
      { name: 'Manajemen Organisasi Kepemudaan', category: 'Organisasi' },
    ])
    .returning();
  const sByName = new Map(insertedSkills.map((s) => [s.name, s.id]));

  // 5. Master Organisasi, Periode & Jabatan
  const insertedOrgs = await db
    .insert(organizations)
    .values([
      {
        name: 'Duta Pancasila Paskibraka Indonesia Kabupaten Sidoarjo',
        shortName: 'DPPI Sidoarjo',
        category: 'Pembinaan Ideologi & Kebangsaan',
        description: 'Wadah pembinaan purna paskibraka di bawah pembinaan Bakesbangpol dan BPIP.',
      },
      {
        name: 'Purna Paskibraka Indonesia Kabupaten Sidoarjo',
        shortName: 'PPI Sidoarjo',
        category: 'Organisasi Alumni',
        description: 'Organisasi kemasyarakatan alumni Paskibraka lintas angkatan Kabupaten Sidoarjo.',
      },
      {
        name: 'Korps Pelatih & Pembina Paskibraka Sidoarjo',
        shortName: 'Korps Pelatih',
        category: 'Instruktur & Kepelatihan',
        description: 'Tim teknis pelatihan PBB, formasi, dan pendampingan pemusatan diklat.',
      },
    ])
    .returning();
  const orgDppi = insertedOrgs[0];
  const orgPpi = insertedOrgs[1];
  const orgKorps = insertedOrgs[2];

  const [periodDppi] = await db
    .insert(organizationPeriods)
    .values([
      { organizationId: orgDppi.id, periodLabel: '2022–2026', startYear: 2022, endYear: 2026, isCurrent: true },
      { organizationId: orgPpi.id, periodLabel: '2023–2028', startYear: 2023, endYear: 2028, isCurrent: true },
      { organizationId: orgKorps.id, periodLabel: '2024–2026', startYear: 2024, endYear: 2026, isCurrent: true },
    ])
    .returning();

  const allPeriods = await db.select().from(organizationPeriods);
  const periodPpi = allPeriods.find((p) => p.organizationId === orgPpi.id) || periodDppi;
  const periodKorps = allPeriods.find((p) => p.organizationId === orgKorps.id) || periodDppi;

  const insertedPositions = await db
    .insert(organizationPositions)
    .values([
      { organizationId: orgDppi.id, title: 'Ketua Pelaksana', rankOrder: 1 },
      { organizationId: orgDppi.id, title: 'Sekretaris', rankOrder: 2 },
      { organizationId: orgDppi.id, title: 'Koordinator Bidang Pembinaan', rankOrder: 3 },
      { organizationId: orgPpi.id, title: 'Ketua Umum', rankOrder: 1 },
      { organizationId: orgPpi.id, title: 'Wakil Ketua', rankOrder: 2 },
      { organizationId: orgPpi.id, title: 'Anggota Bidang Pengabdian', rankOrder: 4 },
      { organizationId: orgKorps.id, title: 'Instruktur Utama PBB', rankOrder: 1 },
      { organizationId: orgKorps.id, title: 'Pelatih Pendamping', rankOrder: 2 },
    ])
    .returning();

  const posByOrgAndTitle = (orgId: string, title: string) =>
    insertedPositions.find((p) => p.organizationId === orgId && p.title === title)?.id;

  // 6. Anggota Sample Data (Sidoarjo)
  const sampleMembersSeed = [
    {
      memberNumber: 'PAS-SDA-2016-001',
      fullName: 'Raka Pratama Wijaya',
      birthPlace: 'Sidoarjo',
      birthDate: '2000-04-12',
      gender: 'Laki-laki',
      district: 'Sidoarjo',
      recordStatus: 'verified',
      narasumberConsent: true,
      dataSourceType: 'self_service',
      phone: '081234560101',
      email: 'raka.wijaya@example.id',
      village: 'Pucang',
      addressLine: 'Jl. Pahlawan No. 18, Sidokumpul',
      cohortYear: 2016,
      level: 'Provinsi',
      school: 'SMAN 1 Sidoarjo',
      unitRole: 'Komandan Pasukan 8',
      eduLevel: 'S1/D4',
      eduInst: 'Universitas Airlangga',
      eduMajor: 'Ilmu Administrasi Negara',
      empSector: 'ASN/TNI/Polri',
      empOrg: 'Pemerintah Kabupaten Sidoarjo',
      empTitle: 'Analis Kebijakan Muda',
      skillName: 'Wawasan Kebangsaan & Ideologi Pancasila',
      skillLevel: 'Instruktur',
      yearsExp: 6,
      speaker: true,
      certTitle: 'Sertifikat Pembina Ideologi Pancasila Tingkat Daerah',
      certIssuer: 'BPIP / Bakesbangpol Jawa Timur',
      certYear: 2023,
      orgId: orgDppi.id,
      periodId: periodDppi.id,
      posId: posByOrgAndTitle(orgDppi.id, 'Ketua Pelaksana'),
    },
    {
      memberNumber: 'PAS-SDA-2018-004',
      fullName: 'Nadia Kusuma Wardani',
      birthPlace: 'Sidoarjo',
      birthDate: '2002-08-23',
      gender: 'Perempuan',
      district: 'Buduran',
      recordStatus: 'verified',
      narasumberConsent: true,
      dataSourceType: 'self_service',
      phone: '081234560202',
      email: 'nadia.wardani@example.id',
      village: 'Entalsewu',
      addressLine: 'Perum Puri Indah Blok C-14',
      cohortYear: 2018,
      level: 'Kabupaten',
      school: 'SMAN 2 Sidoarjo',
      unitRole: 'Pembawa Baki Pagi',
      eduLevel: 'S1/D4',
      eduInst: 'Institut Teknologi Sepuluh Nopember',
      eduMajor: 'Sistem Informasi',
      empSector: 'BUMN/BUMD',
      empOrg: 'PT Pelindo Regional 3',
      empTitle: 'Business Systems Analyst',
      skillName: 'Keprotokolan & MC Resmi Daerah',
      skillLevel: 'Mahir',
      yearsExp: 4,
      speaker: true,
      certTitle: 'Sertifikasi Kehumasan dan Keprotokolan Pemerintahan',
      certIssuer: 'BPSDM Provinsi Jawa Timur',
      certYear: 2024,
      orgId: orgDppi.id,
      periodId: periodDppi.id,
      posId: posByOrgAndTitle(orgDppi.id, 'Sekretaris'),
    },
    {
      memberNumber: 'PAS-SDA-2019-011',
      fullName: 'Bagas Aditya Nugroho',
      birthPlace: 'Krian',
      birthDate: '2003-01-19',
      gender: 'Laki-laki',
      district: 'Krian',
      recordStatus: 'verified',
      narasumberConsent: true,
      dataSourceType: 'self_service',
      phone: '081234560303',
      email: 'bagas.nugroho@example.id',
      village: 'Kemasan',
      addressLine: 'Jl. Raya Krian Km 27',
      cohortYear: 2019,
      level: 'Kabupaten',
      school: 'SMAN 1 Krian',
      unitRole: 'Pengibar Bendera',
      eduLevel: 'S1/D4',
      eduInst: 'Universitas Negeri Surabaya',
      eduMajor: 'Pendidikan Jasmani dan Kepelatihan',
      empSector: 'Pendidikan',
      empOrg: 'SMAN 1 Krian',
      empTitle: 'Guru PJOK & Pembina Ekstrakurikuler Paskibra',
      skillName: 'Peraturan Baris Berbaris (PBB)',
      skillLevel: 'Instruktur',
      yearsExp: 5,
      speaker: true,
      certTitle: 'Lisensi Pelatih Dasar PBB & Tata Upacara',
      certIssuer: 'PPI Provinsi Jawa Timur',
      certYear: 2022,
      orgId: orgKorps.id,
      periodId: periodKorps.id,
      posId: posByOrgAndTitle(orgKorps.id, 'Instruktur Utama PBB'),
    },
    {
      memberNumber: 'PAS-SDA-2022-019',
      fullName: 'Aulia Putri Maharani',
      birthPlace: 'Sidoarjo',
      birthDate: '2006-05-07',
      gender: 'Perempuan',
      district: 'Taman',
      recordStatus: 'submitted',
      narasumberConsent: false,
      dataSourceType: 'self_service',
      phone: '081234560404',
      email: 'aulia.maharani@example.id',
      village: 'Geluran',
      addressLine: 'Jl. Raya Geluran Gang 3',
      cohortYear: 2022,
      level: 'Kabupaten',
      school: 'SMAN 1 Taman',
      unitRole: 'Pasukan 17',
      eduLevel: 'S1/D4',
      eduInst: 'Universitas Brawijaya',
      eduMajor: 'Ilmu Hukum',
      empSector: 'Mahasiswa',
      empOrg: 'Universitas Brawijaya',
      empTitle: 'Mahasiswa Aktif',
      skillName: 'Kepemimpinan & Fasilitasi Pelatihan',
      skillLevel: 'Menengah',
      yearsExp: 2,
      speaker: false,
      certTitle: 'Piagam Penghargaan Purna Paskibraka 2022',
      certIssuer: 'Bupati Sidoarjo',
      certYear: 2022,
      orgId: orgPpi.id,
      periodId: periodPpi.id,
      posId: posByOrgAndTitle(orgPpi.id, 'Anggota Bidang Pengabdian'),
    },
    {
      memberNumber: null,
      fullName: 'Dimas Wahyu Santoso',
      birthPlace: 'Sidoarjo',
      birthDate: '1982-11-04',
      gender: 'Laki-laki',
      district: 'Waru',
      recordStatus: 'submitted',
      narasumberConsent: true,
      dataSourceType: 'assisted',
      phone: '081234560505',
      email: 'dimas.santoso@example.id',
      village: 'Tropodo',
      addressLine: 'Jl. Tropodo Indah No. 9',
      cohortYear: 1998,
      level: 'Kabupaten',
      school: 'SMAN 1 Waru',
      unitRole: 'Pasukan 45',
      eduLevel: 'S2',
      eduInst: 'Universitas Airlangga',
      eduMajor: 'Magister Manajemen',
      empSector: 'Wirausaha',
      empOrg: 'CV Delta Karya Mandiri',
      empTitle: 'Direktur Operasional',
      skillName: 'Manajemen Organisasi Kepemudaan',
      skillLevel: 'Instruktur',
      yearsExp: 14,
      speaker: true,
      certTitle: 'Konfirmasi Arsip Lintas Angkatan 1998',
      certIssuer: 'Bakesbangpol Kab. Sidoarjo',
      certYear: 2025,
      orgId: orgPpi.id,
      periodId: periodPpi.id,
      posId: posByOrgAndTitle(orgPpi.id, 'Wakil Ketua'),
    },
    {
      memberNumber: 'PAS-SDA-2023-008',
      fullName: 'Fajar Ramadhan Putra',
      birthPlace: 'Sidoarjo',
      birthDate: '2007-09-29',
      gender: 'Laki-laki',
      district: 'Candi',
      recordStatus: 'needs_revision',
      narasumberConsent: false,
      dataSourceType: 'self_service',
      phone: '081234560606',
      email: 'fajar.putra@example.id',
      village: 'Larangan',
      addressLine: 'Perum Mutiara Candi Blok D-02',
      cohortYear: 2023,
      level: 'Nasional',
      school: 'SMAN 3 Sidoarjo',
      unitRole: 'Utusan Provinsi Jawa Timur (Nasional)',
      eduLevel: 'SMA/SMK',
      eduInst: 'SMAN 3 Sidoarjo',
      eduMajor: 'IPA',
      empSector: 'Mahasiswa',
      empOrg: 'Politeknik Elektronika Negeri Surabaya',
      empTitle: 'Mahasiswa Teknik Informatika',
      skillName: 'Teknologi Informasi & Pengolahan Data',
      skillLevel: 'Mahir',
      yearsExp: 2,
      speaker: false,
      certTitle: 'Piagam Paskibraka Tingkat Nasional 2023',
      certIssuer: 'BPIP RI',
      certYear: 2023,
      orgId: orgDppi.id,
      periodId: periodDppi.id,
      posId: posByOrgAndTitle(orgDppi.id, 'Koordinator Bidang Pembinaan'),
    },
    {
      memberNumber: 'PAS-SDA-2024-015',
      fullName: 'Siti Nur Halimah',
      birthPlace: 'Porong',
      birthDate: '2008-03-14',
      gender: 'Perempuan',
      district: 'Porong',
      recordStatus: 'verified',
      narasumberConsent: true,
      dataSourceType: 'self_service',
      phone: '081234560707',
      email: 'halimah.nur@example.id',
      village: 'Juwetkenongo',
      addressLine: 'Jl. Bhayangkari No. 41',
      cohortYear: 2024,
      level: 'Kabupaten',
      school: 'SMAN 1 Porong',
      unitRole: 'Pembawa Baki Sore',
      eduLevel: 'SMA/SMK',
      eduInst: 'SMAN 1 Porong',
      eduMajor: 'IPS',
      empSector: 'Mahasiswa',
      empOrg: 'UIN Sunan Ampel Surabaya',
      empTitle: 'Mahasiswa Ilmu Komunikasi',
      skillName: 'Tata Upacara Bendera (TUB)',
      skillLevel: 'Menengah',
      yearsExp: 2,
      speaker: true,
      certTitle: 'Piagam Purna Paskibraka Kabupaten Sidoarjo 2024',
      certIssuer: 'Pemerintah Kabupaten Sidoarjo',
      certYear: 2024,
      orgId: orgKorps.id,
      periodId: periodKorps.id,
      posId: posByOrgAndTitle(orgKorps.id, 'Pelatih Pendamping'),
    },
  ];

  const createdMemberIds: string[] = [];

  for (const item of sampleMembersSeed) {
    const [m] = await db
      .insert(members)
      .values({
        memberNumber: item.memberNumber,
        fullName: item.fullName,
        birthPlace: item.birthPlace,
        birthDate: item.birthDate,
        gender: item.gender,
        homeDistrictId: dByName.get(item.district) || null,
        recordStatus: item.recordStatus,
        privacyConsentGiven: true,
        privacyConsentAt: new Date(),
        narasumberConsent: item.narasumberConsent,
        dataSourceType: item.dataSourceType,
      })
      .returning();

    createdMemberIds.push(m.id);

    await db.insert(memberContacts).values({
      memberId: m.id,
      phone: item.phone,
      email: item.email,
    });

    await db.insert(memberAddresses).values({
      memberId: m.id,
      districtId: dByName.get(item.district) || null,
      village: item.village,
      addressLine: item.addressLine,
    });

    const cohortId = cByYear.get(item.cohortYear);
    if (cohortId) {
      await db.insert(memberPaskibrakaHistory).values({
        memberId: m.id,
        cohortId,
        assignmentLevel: item.level,
        schoolName: item.school,
        unitRole: item.unitRole,
        verificationStatus: item.recordStatus === 'verified' ? 'verified' : item.recordStatus === 'needs_revision' ? 'needs_revision' : 'pending',
        sourceNotes:
          item.cohortYear === 1998
            ? 'Konfirmasi arsip lisan & daftar induk alumni 1998 oleh petugas Bakesbangpol.'
            : 'Terdaftar pada SK Penugasan Paskibraka Kabupaten Sidoarjo.',
      });
    }

    await db.insert(memberEducation).values({
      memberId: m.id,
      level: item.eduLevel,
      institution: item.eduInst,
      major: item.eduMajor,
      isCurrent: item.empSector === 'Mahasiswa',
    });

    await db.insert(memberEmployment).values({
      memberId: m.id,
      sector: item.empSector,
      organizationName: item.empOrg,
      positionTitle: item.empTitle,
      isCurrent: true,
    });

    const skillId = sByName.get(item.skillName);
    if (skillId) {
      await db.insert(memberSkills).values({
        memberId: m.id,
        skillId,
        proficiencyLevel: item.skillLevel,
        yearsExperience: item.yearsExp,
        evidenceNotes: item.certTitle,
        availableAsSpeaker: item.speaker,
      });
    }

    await db.insert(certifications).values({
      memberId: m.id,
      title: item.certTitle,
      issuer: item.certIssuer,
      issuedYear: item.certYear,
    });

    await db.insert(organizationMemberships).values({
      memberId: m.id,
      organizationId: item.orgId,
      periodId: item.periodId,
      positionId: item.posId || null,
      status: 'aktif',
    });

    await db.insert(memberDocuments).values({
      memberId: m.id,
      documentType: item.cohortYear === 1998 ? 'Konfirmasi_Arsip' : 'Piagam_Paskibraka',
      title: item.certTitle,
      referenceNumber: item.cohortYear === 1998 ? 'ARSIP-1998-BKS-09' : `SK-${item.cohortYear}-SDA`,
      verificationMethod: item.cohortYear === 1998 ? 'archive_confirmation' : 'digital_reference',
      notes: 'Tersimpan di arsip terkontrol Bakesbangpol.',
    });

    if (item.recordStatus === 'submitted' || item.recordStatus === 'needs_revision') {
      const [vr] = await db
        .insert(verificationRequests)
        .values({
          memberId: m.id,
          status: item.recordStatus === 'submitted' ? 'pending' : 'needs_revision',
          submissionNotes:
            item.dataSourceType === 'assisted'
              ? 'Pendataan berbantuan angkatan lama (1998) dengan konfirmasi arsip petugas.'
              : 'Pengajuan pembaruan profil mandiri anggota.',
          reviewNotes:
            item.recordStatus === 'needs_revision'
              ? 'Mohon lengkapi nomor referensi SK/Piagam Tingkat Nasional tahun 2023 agar sesuai arsip provinsi.'
              : null,
        })
        .returning();

      await db.insert(verificationHistory).values({
        verificationRequestId: vr.id,
        memberId: m.id,
        action: item.recordStatus === 'needs_revision' ? 'returned_for_revision' : 'submitted',
        notes:
          item.recordStatus === 'needs_revision'
            ? 'Dikembalikan untuk melengkapi nomor referensi piagam.'
            : 'Diajukan untuk pemeriksaan operator.',
      });
    }
  }

  // 7. Program Pembinaan & Kegiatan
  const [progPembinaan] = await db
    .insert(programs)
    .values([
      {
        title: 'Pembinaan Ideologi Pancasila & Wawasan Kebangsaan Lintas Angkatan',
        targetAudience: 'Purna Paskibraka Angkatan 2016–2025 & Pelajar SMA/SMK Sidoarjo',
        scheduleSummary: 'Triwulan I & III — Pendopo Delta Wibawa / Bakesbangpol',
        description: 'Program penguatan nilai Pancasila, kepemimpinan sipil, dan penyiapan fasilitator sekolah.',
        status: 'aktif',
      },
      {
        title: 'Kaderisasi Instruktur PBB & Tata Upacara Bendera Daerah',
        targetAudience: 'Korps Pelatih & Purna Paskibraka bersertifikat',
        scheduleSummary: 'Mei – Agustus setiap tahun (Pra-Pemusatan Diklat)',
        description: 'Penyamaan standar kepelatihan PBB, formasi pengibaran, dan pendampingan calon paskibraka.',
        status: 'aktif',
      },
    ])
    .returning();

  const allPrograms = await db.select().from(programs);
  const progDiklat = allPrograms[1] || progPembinaan;

  await db.insert(programParticipants).values([
    { programId: progPembinaan.id, memberId: createdMemberIds[0], role: 'Narasumber Utama' },
    { programId: progPembinaan.id, memberId: createdMemberIds[1], role: 'Koordinator Acara' },
    { programId: progDiklat.id, memberId: createdMemberIds[2], role: 'Instruktur Utama' },
    { programId: progDiklat.id, memberId: createdMemberIds[6], role: 'Pelatih Pendamping' },
  ]);

  const [act1, act2] = await db
    .insert(activities)
    .values([
      {
        programId: progPembinaan.id,
        title: 'Sarasehan Kebangsaan & Pemutakhiran Basis Data Alumni Sidoarjo',
        organizer: 'Bakesbangpol & DPPI Kabupaten Sidoarjo',
        location: 'Aula Bakesbangpol Kabupaten Sidoarjo',
        activityDate: '2026-08-19',
        description: 'Konsolidasi pendataan purna paskibraka angkatan lama dan sosialisasi kebijakan pelindungan data pribadi.',
        documentationNotes: 'Notulensi, daftar hadir 64 alumni lintas angkatan, dan berita acara konfirmasi arsip.',
        status: 'terlaksana',
      },
      {
        programId: progDiklat.id,
        title: 'Bimbingan Teknis Pelatih PBB & Tata Upacara Sekolah',
        organizer: 'Korps Pelatih Paskibraka Sidoarjo',
        location: 'GOR Delta Sidoarjo',
        activityDate: '2026-11-28',
        description: 'Penyegaran teknis PBB bagi instruktur Purna Paskibraka untuk pendampingan sekolah tingkat kecamatan.',
        documentationNotes: 'Jadwal praktek lapangan dan modul evaluasi instruktur.',
        status: 'terjadwal',
      },
    ])
    .returning();

  await db.insert(activityParticipants).values([
    { activityId: act1.id, memberId: createdMemberIds[0], participationRole: 'Narasumber', attendanceStatus: 'hadir' },
    { activityId: act1.id, memberId: createdMemberIds[1], participationRole: 'Notulis & Protokol', attendanceStatus: 'hadir' },
    { activityId: act1.id, memberId: createdMemberIds[4], participationRole: 'Perwakilan Angkatan 1998', attendanceStatus: 'hadir' },
    { activityId: act2.id, memberId: createdMemberIds[2], participationRole: 'Instruktur', attendanceStatus: 'terdaftar' },
    { activityId: act2.id, memberId: createdMemberIds[6], participationRole: 'Asisten Pelatih', attendanceStatus: 'terdaftar' },
  ]);

  // 8. Undangan Registrasi Angkatan Lama (Sample)
  await db.insert(registrationInvitations).values([
    {
      cohortYear: 2005,
      inviteeName: 'Hendra Kurniawan (Arsip Angkatan 2005)',
      contactHint: 'Alumni SMAN 1 Sidoarjo · Konfirmasi via Kecamatan Sidoarjo',
      token: 'UND-2005-SDA-8421',
      status: 'active',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    {
      cohortYear: 2012,
      inviteeName: 'Ratna Dewi Anggraini (Arsip Angkatan 2012)',
      contactHint: 'Alumni SMAN 1 Waru · Arsip Parsial 2012',
      token: 'UND-2012-SDA-3910',
      status: 'active',
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  ]);

  // 9. Pengaturan Sistem & Kebijakan Retensi (PRD Sec 9 & 12)
  await db.insert(systemSettings).values([
    {
      key: 'instansi_pengelola',
      value: 'Badan Kesatuan Bangsa dan Politik (Bakesbangpol) Kabupaten Sidoarjo',
      description: 'Instansi pengendali data resmi SIMAPAS Sidoarjo.',
    },
    {
      key: 'masa_retensi_arsip_tahun',
      value: '25',
      description: 'Masa retensi penyimpanan data historis kepaskibrakaan sebelum evaluasi arsip/penghapusan.',
    },
    {
      key: 'masa_berlaku_undangan_hari',
      value: '30',
      description: 'Durasi validitas tautan/kode undangan registrasi anggota angkatan lama.',
    },
    {
      key: 'ambang_batas_sel_agregat',
      value: '1',
      description: 'Catatan transparansi privasi untuk kelompok statistik dengan jumlah sangat kecil.',
    },
    {
      key: 'rujukan_hukum_privasi',
      value: 'UU Nomor 27 Tahun 2022 tentang Pelindungan Data Pribadi & Kebijakan SPBE Kabupaten Sidoarjo',
      description: 'Dasar hukum tata kelola dan pemberitahuan privasi anggota.',
    },
  ]);

  // 10. Initial Audit Log
  await db.insert(auditLogs).values([
    {
      actorEmail: 'sistem@bakesbangpol.sidoarjokab.go.id',
      actorRole: 'super_admin',
      action: 'SYSTEM_INITIALIZE',
      entityType: 'database',
      purpose: 'Inisialisasi basis data master kecamatan, angkatan, organisasi, dan arsip awal SIMAPAS Sidoarjo.',
    },
  ]);
}
