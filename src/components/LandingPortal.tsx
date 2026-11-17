import { useEffect, useState } from 'react';
import { ShieldCheck, FileCheck2, Users, BookOpen, ArrowRight, Lock, X, Shield } from 'lucide-react';
import { SimapasEmblem } from './SimapasEmblem';

interface PublicSummary {
  totalMembers: number;
  verifiedMembers: number;
  totalCohorts: number;
  totalDistricts: number;
  activePrograms: number;
  institution: string;
}

interface LandingPortalProps {
  onSignIn: () => Promise<void>;
  onVerifierSignIn: (activationCode?: string) => Promise<void>;
  signingIn: boolean;
  authError: string | null;
  onClearAuthError: () => void;
}

export function LandingPortal({
  onSignIn,
  onVerifierSignIn,
  signingIn,
  authError,
  onClearAuthError,
}: LandingPortalProps) {
  const [summary, setSummary] = useState<PublicSummary | null>(null);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [loginTab, setLoginTab] = useState<'member' | 'verifier'>('member');
  const [activationCode, setActivationCode] = useState('');

  const openLoginModal = (tab: 'member' | 'verifier') => {
    onClearAuthError();
    setLoginTab(tab);
    setLoginModalOpen(true);
  };

  useEffect(() => {
    let active = true;
    fetch('/api/public/summary')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (active && data) setSummary(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-8">
          <a href="#beranda" className="text-lg font-bold tracking-tight text-[#0F2942] whitespace-nowrap shrink-0 font-display">
            SIMAPAS Sidoarjo
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
            <a href="#ringkasan" className="hover:text-[#0F2942] transition-colors whitespace-nowrap shrink-0">
              Ringkasan
            </a>
            <a href="#jalur-pendataan" className="hover:text-[#0F2942] transition-colors whitespace-nowrap shrink-0">
              Alur Pendataan
            </a>
            <a href="#tata-kelola" className="hover:text-[#0F2942] transition-colors whitespace-nowrap shrink-0">
              Tata Kelola
            </a>
            <a href="#batasan" className="hover:text-[#0F2942] transition-colors whitespace-nowrap shrink-0">
              Kebijakan Privasi
            </a>
          </nav>

          <button
            type="button"
            onClick={() => openLoginModal('member')}
            disabled={signingIn}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#0F2942] rounded-md hover:bg-[#163A5C] transition-colors whitespace-nowrap shrink-0 disabled:opacity-60 cursor-pointer"
          >
            {signingIn ? 'Memproses...' : 'Masuk Portal'}
          </button>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Split */}
        <section id="beranda" className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-6 py-14 lg:py-20 grid lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-between space-y-8">
              <div className="space-y-5">
                <p className="text-[18px] font-bold tracking-wide text-[#B91C1C]">
                  Badan Kesatuan Bangsa dan Politik Kabupaten Sidoarjo
                </p>
                <h1
                  className="text-3xl sm:text-4xl lg:text-[2.75rem] font-bold text-[#0F2942] leading-[1.15] tracking-tight"
                  style={{ textWrap: 'balance' }}
                >
                  Sistem Informasi Manajemen Purna Paskibraka Kabupaten Sidoarjo
                </h1>
                <p className="text-base text-slate-600 leading-relaxed max-w-2xl">
                  Wadah pendataan terpadu, verifikasi riwayat kepaskibrakaan lintas angkatan, pemetaan kompetensi,
                  serta pengelolaan organisasi dan program pembinaan berkelanjutan di bawah tata kelola resmi
                  Bakesbangpol Kabupaten Sidoarjo.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => openLoginModal('member')}
                    disabled={signingIn}
                    className="inline-flex items-center gap-2.5 px-6 py-3 text-sm font-semibold text-white bg-[#0F2942] rounded-md hover:bg-[#163A5C] transition-colors whitespace-nowrap shrink-0 disabled:opacity-60 cursor-pointer"
                  >
                    <span>{signingIn ? 'Menghubungkan Akun...' : 'Masuk Portal Anggota'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => openLoginModal('verifier')}
                    disabled={signingIn}
                    className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-[#0F2942] bg-white border border-[#0F2942] rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 disabled:opacity-60 cursor-pointer"
                  >
                    <Shield className="w-4 h-4" />
                    <span>Login Admin Verifikator</span>
                  </button>
                  <a
                    href="#jalur-pendataan"
                    className="inline-flex items-center px-4 py-3 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0"
                  >
                    Alur Registrasi
                  </a>
                </div>
                {authError && !loginModalOpen && (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3.5 py-2.5 max-w-xl">
                    {authError}
                  </p>
                )}
                <p className="text-xs text-slate-500">
                  Akses terbatas berdasarkan peran dan kewenangan · Bukan direktori publik terbuka
                </p>
              </div>
            </div>

            <div className="lg:col-span-5 flex flex-col justify-between bg-[#0F2942] text-white rounded-lg p-7 border border-[#0F2942]">
              <div className="flex items-start gap-4">
                <SimapasEmblem className="w-11 h-11 shrink-0" />
                <div>
                  <h2 className="text-base font-semibold text-white">Prinsip Pengelolaan Data</h2>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    Satu anggota, satu profil induk terhubung dengan riwayat pendidikan, pekerjaan, organisasi,
                    kompetensi, dan kegiatan.
                  </p>
                </div>
              </div>

              <div className="my-6 border-t border-white/15 pt-5 space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-white">Self-Service dengan Verifikasi Operator</p>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Anggota memperbarui profil mandiri; operator Bakesbangpol memeriksa validitas arsip.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Lock className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-white">Least Privilege &amp; Row-Level Access</p>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Data pribadi sensitif tidak dibuka secara default kepada pengurus atau publik.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <FileCheck2 className="w-4 h-4 text-amber-300 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-white">Inklusif untuk Angkatan Lama</p>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Mendukung undangan registrasi bertanda masa berlaku dan pendataan berbantuan petugas.
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/15 text-xs text-slate-300 flex items-center justify-between">
                <span>Rujukan Hukum</span>
                <span className="font-mono text-white">UU No. 27 Tahun 2022 (PDP)</span>
              </div>
            </div>
          </div>
        </section>

        {/* 4-column Aggregate KPI Strip (Strictly Aggregate, No Small Cell Personal Exposure) */}
        <section id="ringkasan" className="max-w-7xl mx-auto px-6 py-10">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <p className="text-xs font-medium text-slate-500">Total Profil Terdata</p>
              <p className="text-2xl font-bold text-[#0F2942] mt-2 tabular-nums font-mono">
                {summary ? summary.totalMembers : '—'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Agregat tingkat kabupaten</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <p className="text-xs font-medium text-slate-500">Profil Terverifikasi</p>
              <p className="text-2xl font-bold text-emerald-700 mt-2 tabular-nums font-mono">
                {summary ? summary.verifiedMembers : '—'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Telah validasi arsip resmi</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <p className="text-xs font-medium text-slate-500">Angkatan Terinventarisasi</p>
              <p className="text-2xl font-bold text-[#0F2942] mt-2 tabular-nums font-mono">
                {summary ? summary.totalCohorts : '—'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Termasuk pencatatan arsip lama</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <p className="text-xs font-medium text-slate-500">Kecamatan Tercakup</p>
              <p className="text-2xl font-bold text-[#0F2942] mt-2 tabular-nums font-mono">
                {summary ? summary.totalDistricts : '18'}
              </p>
              <p className="text-xs text-slate-500 mt-1">Wilayah Kabupaten Sidoarjo</p>
            </div>
          </div>
        </section>

        {/* Jalur Pendataan & Angkatan Lama */}
        <section id="jalur-pendataan" className="max-w-7xl mx-auto px-6 py-10">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-[#0F2942]">Jalur Registrasi dan Verifikasi Anggota</h2>
            <p className="text-sm text-slate-600 mt-1.5 max-w-2xl">
              Dirancang agar seluruh angkatan Purna Paskibraka Kabupaten Sidoarjo dapat terdata tanpa tertinggal
              keterbatasan arsip digital.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-3">
              <p className="text-xs font-semibold text-[#B91C1C]">Jalur 01 · Mandiri</p>
              <h3 className="text-base font-bold text-[#0F2942]">Registrasi Mandiri (Self-Service)</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Anggota masuk menggunakan akun terverifikasi, melengkapi profil induk, menyetujui pemberitahuan privasi,
                lalu mengajukan pemeriksaan ke operator Bakesbangpol.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-3">
              <p className="text-xs font-semibold text-[#B91C1C]">Jalur 02 · Undangan</p>
              <h3 className="text-base font-bold text-[#0F2942]">Undangan Registrasi Arsip Lama</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Bakesbangpol menerbitkan kode undangan bertanda masa berlaku bagi anggota angkatan terdahulu yang telah
                tercatat di buku induk arsip untuk mengklaim dan memutakhirkan profilnya.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-3">
              <p className="text-xs font-semibold text-[#B91C1C]">Jalur 03 · Berbantuan</p>
              <h3 className="text-base font-bold text-[#0F2942]">Pendataan Berbantuan Petugas</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Operator membantu pendataan anggota angkatan senior yang memiliki kendala akses digital atau dokumen
                fisik lama melalui mekanisme konfirmasi sumber arsip resmi.
              </p>
            </div>
          </div>
        </section>

        {/* Tata Kelola & Batasan Versi Awal */}
        <section id="tata-kelola" className="bg-white border-t border-slate-200">
          <div id="batasan" className="max-w-7xl mx-auto px-6 py-12 grid md:grid-cols-2 gap-10">
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[#0F2942]">
                <Users className="w-5 h-5" />
                <h2 className="text-lg font-bold">Hak Akses Berjenjang (RBAC)</h2>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">
                Sistem memisahkan kewenangan antara Anggota, Pengurus Organisasi, Operator Bakesbangpol, Administrator,
                dan Super Administrator. Pengurus organisasi tidak memperoleh akses terhadap tanggal lahir lengkap,
                nomor telepon, alamat rumah, maupun dokumen pribadi anggota.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[#0F2942]">
                <BookOpen className="w-5 h-5" />
                <h2 className="text-lg font-bold">Batasan dan Pelindungan Data Pribadi</h2>
              </div>
              <ul className="text-sm text-slate-600 space-y-2 list-disc pl-5">
                <li>Tidak mengumpulkan NIK atau dokumen identitas yang tidak relevan dengan tujuan pendataan.</li>
                <li>Tidak menyediakan direktori publik terbuka yang memuat data pribadi individu.</li>
                <li>Seluruh perubahan penting, verifikasi, dan ekspor laporan dicatat dalam jejak audit sistem.</li>
              </ul>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-white border-t border-slate-200 py-5">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span>SIMAPAS Sidoarjo · Badan Kesatuan Bangsa dan Politik Kabupaten Sidoarjo</span>
          <span>Rujukan Tata Kelola: UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi</span>
        </div>
      </footer>

      {/* Modal Portal Login: Anggota vs Admin & Operator Verifikator */}
      {loginModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-lg w-full max-w-md p-6 space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div className="flex items-center gap-3">
                <SimapasEmblem className="w-9 h-9 shrink-0" />
                <div>
                  <h2 className="text-base font-bold text-[#0F2942]">Portal Autentikasi SIMAPAS</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Bakesbangpol Kabupaten Sidoarjo</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLoginModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                aria-label="Tutup dialog login"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => {
                  onClearAuthError();
                  setLoginTab('member');
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  loginTab === 'member' ? 'bg-white text-[#0F2942] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Anggota / Pengurus
              </button>
              <button
                type="button"
                onClick={() => {
                  onClearAuthError();
                  setLoginTab('verifier');
                }}
                className={`py-2 px-3 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  loginTab === 'verifier' ? 'bg-white text-[#0F2942] shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Admin Verifikator
              </button>
            </div>

            {authError && (
              <div className="text-xs text-red-800 bg-red-50 border border-red-200 rounded-md p-3 leading-relaxed">
                {authError}
              </div>
            )}

            {loginTab === 'member' ? (
              <div className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Gunakan akun Google Anda untuk masuk ke profil induk anggota Purna Paskibraka Kabupaten Sidoarjo,
                  melakukan pemutakhiran data mandiri, atau mengklaim kode undangan angkatan lama.
                </p>
                <button
                  type="button"
                  disabled={signingIn}
                  onClick={onSignIn}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0F2942] rounded-md hover:bg-[#163A5C] transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
                >
                  <span>{signingIn ? 'Memverifikasi Akun...' : 'Masuk dengan Akun Google'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  onVerifierSignIn(activationCode);
                }}
                className="space-y-4"
              >
                <div className="bg-slate-50 border border-slate-200 rounded-md p-3 text-xs text-slate-700 leading-relaxed">
                  Jalur masuk khusus petugas <strong>Operator Verifikator</strong>, <strong>Administrator</strong>, dan{' '}
                  <strong>Super Administrator</strong> Bakesbangpol Kabupaten Sidoarjo. Setiap percobaan masuk dicatat
                  dalam jejak audit sistem.
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Kode Aktivasi Verifikator (Opsional — khusus petugas baru)
                  </label>
                  <input
                    type="text"
                    value={activationCode}
                    onChange={(e) => setActivationCode(e.target.value)}
                    placeholder="Contoh: VER-OPR-XXXXXX (kosongkan jika sudah aktif)"
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Jika akun Google Anda sudah ditetapkan sebagai Operator/Admin/Super Admin, biarkan kolom ini kosong.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={signingIn}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#0F2942] rounded-md hover:bg-[#163A5C] transition-colors whitespace-nowrap cursor-pointer disabled:opacity-60"
                >
                  <Shield className="w-4 h-4" />
                  <span>{signingIn ? 'Memeriksa Otorisasi...' : 'Masuk Admin Verifikator (Google)'}</span>
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
