import {
  LayoutDashboard,
  Calendar,
  Gift,
  Wallet,
  Package,
  FileText,
  CheckSquare,
  Sparkles,
  BookUser,
  CloudUpload,
  MessageCircleQuestion,
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
    id: 'ask',
    label: 'Ask Anything',
    description: 'Roman Urdu · live app data only',
    icon: MessageCircleQuestion,
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
  {
    id: 'orders',
    label: 'Order Log',
    description: 'Vendor orders · received',
    icon: Package,
  },
  {
    id: 'dak',
    label: 'Dak Issuance Log',
    description: 'Subject · date · addressee — system assigns dispatch no.',
    icon: FileText,
  },
  {
    id: 'tasks',
    label: 'Task Log',
    description: 'Tasks · date & time · done',
    icon: CheckSquare,
  },
  {
    id: 'capture',
    label: 'Capture',
    description: 'Brain dump · inbox',
    icon: Sparkles,
  },
  {
    id: 'contacts',
    label: 'Contact Database',
    description: 'Naam · phone · email · fast lookup',
    icon: BookUser,
  },
  {
    id: 'sync',
    label: 'Sync & Backup',
    description: 'Laptop ↔ mobile · cloud',
    icon: CloudUpload,
  },
];
