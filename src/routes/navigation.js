/**
 * Single source of truth for the sidebar and for page titles in the header.
 * Every entry is a working page.
 */
export const NAV_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
      { to: '/deceased', label: 'Deceased Persons', icon: 'user' },
    ],
  },
  {
    title: 'Financial Assets',
    items: [
      { to: '/bank-accounts', label: 'Bank Accounts', icon: 'bank' },
      { to: '/insurance', label: 'Insurance Policies', icon: 'shield' },
    ],
  },
  {
    title: 'Claims',
    items: [
      { to: '/claims', label: 'Claims', icon: 'claims' },
      { to: '/documents', label: 'Documents', icon: 'file' },
    ],
  },
  {
    title: 'Account',
    items: [
      { to: '/notifications', label: 'Notifications', icon: 'bell' },
      { to: '/settings', label: 'Profile & Settings', icon: 'settings' },
    ],
  },
];

export const NAV_ITEMS = NAV_SECTIONS.flatMap((s) => s.items);

export function findNavItem(pathname) {
  return NAV_ITEMS.find((item) => pathname === item.to || pathname.startsWith(`${item.to}/`));
}
