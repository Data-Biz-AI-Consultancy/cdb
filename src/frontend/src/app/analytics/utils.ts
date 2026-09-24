export function getSeverityBadge(severity: string) {
  switch (severity?.toLowerCase()) {
    case 'critical':
      return 'bg-rose-100 text-rose-800 border-rose-200 font-semibold';
    case 'high':
      return 'bg-amber-100 text-amber-800 border-amber-200 font-medium';
    case 'medium':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'low':
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export function getCategoryBadge(category: string) {
  switch (category?.toLowerCase()) {
    case 'opportunity':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200 font-medium';
    case 'risk':
      return 'bg-rose-100 text-rose-800 border-rose-200 font-medium';
    case 'hybrid':
    default:
      return 'bg-amber-100 text-amber-800 border-amber-200 font-medium';
  }
}
