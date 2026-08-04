import { Award, BarChart3, Bell, Bookmark, Boxes, CircleHelp, Cloud, Columns3, FileText, History, Home, Layers3, LayoutDashboard, ListChecks, ListTree, Mail, PlaySquare, Settings, ShoppingCart, UserRound, UsersRound } from 'lucide-react'

export const primaryNavigation = [
  { label: 'Home', path: '/', icon: Home }, { label: 'Categories', path: '/categories', icon: Layers3, children: [{ label: 'Categories', path: '/categories', icon: Layers3 }, { label: 'Sub Categories', path: '/sub-categories', icon: ListTree }] },
  { label: 'Brands', path: '/brands', icon: Award, highlighted: true }, { label: 'Solutions / Services', path: '/services', icon: Cloud, highlighted: true },
  { label: 'Specification Templates', path: '/specification-templates', icon: ListChecks },
  { label: 'Vendors', path: '/vendors', icon: UserRound }, { label: 'Customers', path: '/customers', icon: UsersRound }, { label: 'Compare', path: '/compare', icon: Columns3 },
  { label: 'RFQs', path: '/rfqs', icon: FileText }, { label: 'Demos', path: '/demos', icon: PlaySquare },
  { label: 'Industries', path: '/industries', icon: BarChart3 }, { label: 'Pricing', path: '/pricing', icon: ShoppingCart },
  { label: 'Marketplace', path: '/marketplace', icon: Boxes },
]
export const personalNavigation = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }, { label: 'Saved', path: '/saved', icon: Bookmark },
  { label: 'Recently Viewed', path: '/recently-viewed', icon: History }, { label: 'Inbox', path: '/inbox', icon: Mail },
  { label: 'Notifications', path: '/notifications', icon: Bell },
]
export const bottomNavigation = [
  { label: 'Help Center', path: '/help-center', icon: CircleHelp }, { label: 'Settings', path: '/settings', icon: Settings },
]
export const allNavigation = [...primaryNavigation.flatMap((item) => [item, ...(item.children || [])]), ...personalNavigation, ...bottomNavigation]
