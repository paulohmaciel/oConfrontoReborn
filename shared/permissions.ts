export const roles = ['PLAYER', 'SUPPORT', 'MODERATOR', 'ADMIN'] as const;
export type Role = typeof roles[number];
const staff = ['SUPPORT', 'MODERATOR', 'ADMIN'] as const, mods = ['MODERATOR', 'ADMIN'] as const, admins = ['ADMIN'] as const;
export const permissions = {
  'accounts.read': staff, 'ledger.read': staff, 'tickets.read': staff, 'tickets.reply': staff,
  'punish.apply': mods, 'audit.read': mods, 'community.moderate': mods, 'notices.manage': mods, 'duels.read': mods,
  'settings.read': admins, 'settings.write': admins, 'economy.read': admins, 'premium.grant': admins,
  'orders.read': admins, 'orders.manage': admins, 'gold.adjust': admins,
} as const satisfies Record<string, readonly Role[]>;
export type Permission = keyof typeof permissions;
export function can(role: string, permission: Permission): boolean { return (permissions[permission] as readonly string[]).includes(role); }
export function permissionsOf(role: string): Permission[] { return (Object.keys(permissions) as Permission[]).filter(p => can(role, p)); }
