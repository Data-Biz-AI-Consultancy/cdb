export interface RoleOption {
  value: string;
  label: string;
  desc: string;
}

export const AVAILABLE_ROLES: RoleOption[] = [
  { value: 'admin', label: 'Administrator', desc: 'Full system & user access' },
  { value: 'manager', label: 'Sales / RevOps Manager', desc: 'Signal escalation & approval' },
  { value: 'ae', label: 'Account Executive', desc: 'Opportunity & deal ownership' },
  { value: 'sdr', label: 'Sales Development Rep', desc: 'Signal triage & lead qualification' },
  { value: 'member', label: 'Team Member', desc: 'Standard read & act access' },
];

export const getInitials = (name?: string | null, email?: string): string => {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();
  }
  return email ? email.slice(0, 2).toUpperCase() : '??';
};

export const getRoleBadgeColor = (role: string): string => {
  switch (role) {
    case 'admin':
      return 'bg-indigo-100 text-indigo-800 border-indigo-200';
    case 'manager':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'ae':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'sdr':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};
