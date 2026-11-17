import { CheckCircle2, Clock, AlertTriangle, FileEdit, Archive } from 'lucide-react';

const STATUS_MAP: Record<string, { label: string; colorClass: string; Icon: typeof CheckCircle2 }> = {
  verified: {
    label: 'Terverifikasi',
    colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    Icon: CheckCircle2,
  },
  submitted: {
    label: 'Menunggu Verifikasi',
    colorClass: 'text-amber-800 bg-amber-50 border-amber-200',
    Icon: Clock,
  },
  pending: {
    label: 'Menunggu Verifikasi',
    colorClass: 'text-amber-800 bg-amber-50 border-amber-200',
    Icon: Clock,
  },
  needs_revision: {
    label: 'Perlu Perbaikan',
    colorClass: 'text-red-700 bg-red-50 border-red-200',
    Icon: AlertTriangle,
  },
  draft: {
    label: 'Draf',
    colorClass: 'text-slate-700 bg-slate-100 border-slate-200',
    Icon: FileEdit,
  },
  archived: {
    label: 'Diarsipkan',
    colorClass: 'text-slate-600 bg-slate-100 border-slate-200',
    Icon: Archive,
  },
};

export function StatusLabel({ status }: { status: string }) {
  const cfg = STATUS_MAP[status] || STATUS_MAP.draft;
  const Icon = cfg.Icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 text-xs font-medium rounded border whitespace-nowrap shrink-0 ${cfg.colorClass}`}>
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{cfg.label}</span>
    </span>
  );
}
