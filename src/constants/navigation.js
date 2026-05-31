import {
  LayoutDashboard,
  Calendar,
  Gift,
  Wallet,
} from 'lucide-react';

/** Sidebar navigation tabs — id maps to active view in App */
export const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    description: 'Overview & quick actions',
    icon: LayoutDashboard,
  },
  {
    id: 'calendar',
    label: 'My Calendar',
    description: 'Custom calendar · appointments',
    icon: Calendar,
  },
  {
    id: 'souvenirs',
    label: 'Souvenir Log',
    description: 'Meeting souvenir records',
    icon: Gift,
  },
  {
    id: 'expenditure',
    label: 'Expenditure Log',
    description: 'Opening balance · PKR expenses',
    icon: Wallet,
  },
];
