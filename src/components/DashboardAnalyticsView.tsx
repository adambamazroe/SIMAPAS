import { useEffect, useState } from 'react';
import { Download, Printer, FileSpreadsheet } from 'lucide-react';
import { apiFetch } from '../lib/api';
import type { AnalyticsResponse, RoleCapabilities } from '../types/simapas';

interface DashboardAnalyticsViewProps {
  capabilities: RoleCapabilities;
  onNavigateQueue?: () => void;
}

export function DashboardAnalyticsView({ capabilities, onNavigateQueue }: DashboardAnalyticsViewProps) {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [exportPurpose, setExportPurpose] = useState('');
  const [exportStatusFilter, setExportStatusFilter] = useState('all');
  const [exporting, setExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [printReportRows, setPrintReportRows] = useState<Array<Record<string, string | number>> | null>(null);
  const [printMeta, setPrintMeta] = useState<{ purpose: string; exportedAt: string; exportedBy: string } | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiFetch<AnalyticsResponse>('/api/analytics')
      .then((res) => {
        if (active) {
          setData(res);
          setError(null);
        }
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function handleExport(format: 'excel' | 'pdf') {
    setExportError(null);
    setExportMessage(null);
    if (exportPurpose.trim().length < 8) {
      setExportError('Harap isi penanda tujuan penggunaan laporan (minimal 8 karakter) untuk pencatatan audit.');
      return;
    }

    setExporting(true);
    try {
      const res = await apiFetch<{
        exportedAt: string;
        exportedBy: string;
        purpose: string;
        rows: Array<Record<string, string | number>>;
      }>('/api/export', {
        method: 'POST',
        body: JSON.stringify({
          purpose: exportPurpose.trim(),
          format,
          status: exportStatusFilter,
        }),
      });

      if (format === 'excel') {
        const headers = [
          'Nomor Anggota',
          'Nama Lengkap',
          'Jenis Kelamin',
          'Kecamatan',
          'Angkatan',
          'Tingkat Penugasan',
          'Sekolah Asal',
          'Pekerjaan',
          'Kompetensi',
          'Status Verifikasi',
          'Kesediaan Narasumber',
        ];
        const keys = [
          'nomorAnggota',
          'namaLengkap',
          'jenisKelamin',
          'kecamatan',
          'angkatan',
          'tingkatPenugasan',
          'sekolahAsal',
          'pekerjaan',
          'kompetensi',
          'statusVerifikasi',
          'kesediaanNarasumber',
        ];
        const escapeCsv = (val: unknown) => `"${String(val ?? '').replace(/"/g, '""')}"`;
        const metaLines = [
          `"LAPORAN RESMI SIMAPAS SIDOARJO - BAKESBANGPOL KABUPATEN SIDOARJO"`,
          `"Tujuan Penggunaan: ${res.purpose.replace(/"/g, '""')}"`,
          `"Diekspor oleh: ${res.exportedBy} pada ${new Date(res.exportedAt).toLocaleString('id-ID')}"`,
          '',
        ];
        const csvLines = [
          ...metaLines,
          headers.map(escapeCsv).join(','),
          ...res.rows.map((r) => keys.map((k) => escapeCsv(r[k])).join(',')),
        ];
        const blob = new Blob(['\uFEFF' + csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `simapas-sidoarjo-laporan-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
        setExportMessage(`Berhasil mengunduh ${res.rows.length} baris data (tercatat di Audit Log).`);
      } else {
        setPrintReportRows(res.rows);
        setPrintMeta({ purpose: res.purpose, exportedAt: res.exportedAt, exportedBy: res.exportedBy });
        setExportMessage(`Laporan siap cetak (${res.rows.length} baris) telah disiapkan dan dicatat di Audit Log.`);
        setTimeout(() => window.print(), 250);
      }
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Gagal mengekspor data.');
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 bg-white border border-slate-200 rounded-lg" />
          ))}
        </div>
        <div className="h-64 bg-white border border-slate-200 rounded-lg" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-sm text-red-800">
        {error || 'Data statistik tidak tersedia.'}
      </div>
    );
  }

  const maxDistrict = Math.max(1, ...data.byDistrict.map((d) => d.memberCount));
  const maxSkill = Math.max(1, ...data.bySkill.map((s) => s.memberCount));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 no-print">
        <div>
          <h1 className="text-2xl font-bold text-[#0F2942]">Dashboard Statistik &amp; Pelaporan</h1>
          <p className="text-sm text-slate-600 mt-1">
            Statistik agregat Purna Paskibraka Kabupaten Sidoarjo, transparansi arsip angkatan, dan sebaran potensi.
          </p>
        </div>
        {capabilities.canVerifyMembers && onNavigateQueue && (
          <button
            type="button"
            onClick={onNavigateQueue}
            className="px-4 py-2 text-sm font-semibold text-white bg-[#0F2942] rounded-md hover:bg-[#163A5C] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Buka Antrean Verifikasi ({data.pendingVerifications})
          </button>
        )}
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 no-print">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Total Terdata</p>
          <p className="text-2xl font-bold text-[#0F2942] mt-2 font-mono tabular-nums">{data.statusCounts.total}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Terverifikasi</p>
          <p className="text-2xl font-bold text-emerald-700 mt-2 font-mono tabular-nums">{data.statusCounts.verified}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Antrean Verifikasi</p>
          <p className="text-2xl font-bold text-amber-700 mt-2 font-mono tabular-nums">{data.pendingVerifications}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Perlu Perbaikan</p>
          <p className="text-2xl font-bold text-red-700 mt-2 font-mono tabular-nums">{data.statusCounts.needs_revision}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Kegiatan Tercatat</p>
          <p className="text-2xl font-bold text-[#0F2942] mt-2 font-mono tabular-nums">{data.totalActivities}</p>
        </div>
      </div>

      {/* Main Analytics Grid */}
      <div className="grid lg:grid-cols-2 gap-6 no-print">
        {/* Angkatan & Transparansi Arsip */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-[#0F2942]">Sebaran Angkatan &amp; Ketersediaan Arsip</h2>
              <p className="text-xs text-slate-500 mt-0.5">Kekosongan atau keterbatasan arsip lama dicatat secara transparan.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs text-slate-500">
                  <th className="py-2 font-medium">Angkatan</th>
                  <th className="py-2 font-medium">Status Arsip Induk</th>
                  <th className="py-2 font-medium text-right">Terdata</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.byCohort.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="py-2.5 font-medium text-slate-900 font-mono tabular-nums">{c.cohortYear}</td>
                    <td className="py-2.5 text-xs">
                      {c.archiveStatus === 'available' && <span className="text-emerald-700 font-medium">Arsip Tersedia</span>}
                      {c.archiveStatus === 'partial' && <span className="text-amber-700 font-medium">Arsip Parsial</span>}
                      {c.archiveStatus === 'missing' && <span className="text-red-700 font-medium">Arsip Fisik Kosong</span>}
                    </td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-slate-900">{c.memberCount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sebaran 18 Kecamatan */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="mb-4">
            <h2 className="text-base font-bold text-[#0F2942]">Sebaran Domisili Kecamatan</h2>
            <p className="text-xs text-slate-500 mt-0.5">18 wilayah kecamatan di Kabupaten Sidoarjo.</p>
          </div>
          <div className="space-y-2.5 max-h-80 overflow-y-auto pr-2">
            {data.byDistrict.map((d) => (
              <div key={d.id} className="grid grid-cols-12 items-center gap-3 text-xs">
                <span className="col-span-4 text-slate-700 truncate font-medium">{d.name}</span>
                <div className="col-span-6 bg-slate-100 h-2 rounded overflow-hidden">
                  <div
                    className="bg-[#0F2942] h-full rounded"
                    style={{ width: `${Math.round((d.memberCount / maxDistrict) * 100)}%` }}
                  />
                </div>
                <span className="col-span-2 text-right font-mono tabular-nums text-slate-700">{d.memberCount}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Komposisi Pendidikan & Pekerjaan */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-[#0F2942]">Komposisi Pendidikan &amp; Sektor Pekerjaan</h2>
            <p className="text-xs text-slate-500 mt-0.5">Ringkasan agregat riwayat akademik dan profesi anggota.</p>
          </div>

          <div className="grid sm:grid-cols-2 gap-6">
            <div>
              <h3 className="text-xs font-semibold text-slate-500 mb-3">Jenjang Pendidikan</h3>
              <ul className="divide-y divide-slate-100 text-sm">
                {data.byEducation.map((e) => (
                  <li key={e.label} className="py-2 flex items-center justify-between">
                    <span className="text-slate-700">{e.label}</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900">{e.total}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-slate-500 mb-3">Sektor Pekerjaan</h3>
              <ul className="divide-y divide-slate-100 text-sm">
                {data.byEmployment.map((e) => (
                  <li key={e.label} className="py-2 flex items-center justify-between">
                    <span className="text-slate-700">{e.label}</span>
                    <span className="font-mono tabular-nums font-semibold text-slate-900">{e.total}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Sebaran Kompetensi & Organisasi */}
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-6">
          <div>
            <h2 className="text-base font-bold text-[#0F2942]">Pemetaan Kompetensi &amp; Organisasi</h2>
            <p className="text-xs text-slate-500 mt-0.5">Keahlian terpetakan serta jumlah kesediaan narasumber.</p>
          </div>

          <div className="space-y-3">
            {data.bySkill.slice(0, 6).map((s) => (
              <div key={s.id} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-800">{s.name}</span>
                  <span className="text-slate-500 font-mono tabular-nums">
                    {s.memberCount} anggota · {s.speakerCount} narasumber
                  </span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded overflow-hidden">
                  <div
                    className="bg-[#B91C1C] h-full rounded"
                    style={{ width: `${Math.round((s.memberCount / maxSkill) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 border-t border-slate-200">
            <h3 className="text-xs font-semibold text-slate-500 mb-2.5">Keterlibatan Organisasi</h3>
            <div className="grid grid-cols-3 gap-3">
              {data.byOrganization.map((o) => (
                <div key={o.id} className="bg-slate-50 border border-slate-200 rounded p-3">
                  <p className="text-xs font-semibold text-[#0F2942] truncate">{o.shortName}</p>
                  <p className="text-lg font-bold font-mono tabular-nums text-slate-900 mt-1">{o.memberCount}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Ekspor Laporan Resmi (Hanya Operator / Admin / Super Admin) */}
      {capabilities.canExportData ? (
        <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-4 no-print">
          <div>
            <h2 className="text-base font-bold text-[#0F2942]">Ekspor Laporan Resmi (Excel / PDF)</h2>
            <p className="text-xs text-slate-600 mt-1">
              Sesuai ketentuan pelindungan data pribadi, setiap ekspor wajib menyertakan penanda tujuan penggunaan dan
              otomatis tercatat dalam jejak audit sistem.
            </p>
          </div>

          <div className="grid md:grid-cols-12 gap-4 items-end">
            <div className="md:col-span-6">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">
                Tujuan Penggunaan Data (Wajib)
              </label>
              <input
                type="text"
                value={exportPurpose}
                onChange={(e) => setExportPurpose(e.target.value)}
                placeholder="Contoh: Rekapitulasi calon instruktur PBB pembinaan SMA Sidoarjo 2026"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-medium text-slate-700 mb-1.5">Filter Status Profil</label>
              <select
                value={exportStatusFilter}
                onChange={(e) => setExportStatusFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-[#0F2942]"
              >
                <option value="all">Semua Status</option>
                <option value="verified">Terverifikasi Saja</option>
                <option value="submitted">Menunggu Verifikasi</option>
              </select>
            </div>

            <div className="md:col-span-3 flex items-center gap-2">
              <button
                type="button"
                disabled={exporting}
                onClick={() => handleExport('excel')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#0F2942] rounded-md hover:bg-[#163A5C] transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Ekspor Excel</span>
              </button>
              <button
                type="button"
                disabled={exporting}
                onClick={() => handleExport('pdf')}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#0F2942] bg-white border border-slate-300 rounded-md hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak PDF</span>
              </button>
            </div>
          </div>

          {exportError && <p className="text-xs text-red-700">{exportError}</p>}
          {exportMessage && (
            <p className="text-xs text-emerald-700 flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5" />
              <span>{exportMessage}</span>
            </p>
          )}
        </div>
      ) : (
        <div className="bg-slate-100 border border-slate-200 rounded-lg p-4 text-xs text-slate-600 no-print">
          Peran <strong>Pengurus</strong> hanya dapat melihat statistik agregat. Ekspor data lengkap dibatasi untuk
          Operator, Administrator, dan Super Administrator.
        </div>
      )}

      {/* Printable Official PDF Sheet */}
      {printReportRows && printMeta && (
        <div className="hidden print-only space-y-4">
          <div className="border-b-2 border-slate-900 pb-3">
            <h1 className="text-lg font-bold uppercase">
              Laporan Resmi SIMAPAS Sidoarjo — Bakesbangpol Kabupaten Sidoarjo
            </h1>
            <p className="text-xs mt-1">
              Tujuan Penggunaan: <strong>{printMeta.purpose}</strong>
            </p>
            <p className="text-xs">
              Diekspor oleh: {printMeta.exportedBy} · Tanggal: {new Date(printMeta.exportedAt).toLocaleString('id-ID')}
            </p>
          </div>
          <table className="w-full text-xs border-collapse border border-slate-400">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-400 p-1.5 text-left">No. Anggota</th>
                <th className="border border-slate-400 p-1.5 text-left">Nama Lengkap</th>
                <th className="border border-slate-400 p-1.5 text-left">Angkatan</th>
                <th className="border border-slate-400 p-1.5 text-left">Kecamatan</th>
                <th className="border border-slate-400 p-1.5 text-left">Sekolah Asal</th>
                <th className="border border-slate-400 p-1.5 text-left">Status</th>
              </tr>
            </thead>
            <tbody>
              {printReportRows.map((row, idx) => (
                <tr key={idx}>
                  <td className="border border-slate-400 p-1.5 font-mono">{row.nomorAnggota}</td>
                  <td className="border border-slate-400 p-1.5">{row.namaLengkap}</td>
                  <td className="border border-slate-400 p-1.5 font-mono">{row.angkatan}</td>
                  <td className="border border-slate-400 p-1.5">{row.kecamatan}</td>
                  <td className="border border-slate-400 p-1.5">{row.sekolahAsal}</td>
                  <td className="border border-slate-400 p-1.5">{row.statusVerifikasi}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
