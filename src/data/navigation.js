import { Award, BarChart3, Bell, Bookmark, Boxes, CircleHelp, ClipboardList, Cloud, Columns3, FileText, GalleryHorizontalEnd, Globe2, History, Home, Layers3, LayoutDashboard, ListChecks, ListTree, Mail, Paintbrush, PlaySquare, Settings, Shield, ShoppingCart, UserCog, UserRound, UsersRound } from 'lucide-react'

export const primaryNavigation = [
  { label: 'Home', path: '/', icon: Home }, { label: 'Categories', path: '/categories', icon: Layers3, permission: 'categories.view', children: [{ label: 'Categories', path: '/categories', icon: Layers3, permission: 'categories.view' }, { label: 'Sub Categories', path: '/sub-categories', icon: ListTree, permission: 'categories.view' }] },
  { label: 'Brands', path: '/brands', icon: Award, highlighted: true }, { label: 'Solutions / Services', path: '/services', icon: Cloud, highlighted: true },
  { label: 'Specification Templates', path: '/specification-templates', icon: ListChecks },
  { label: 'Vendors', path: '/vendors', icon: UserRound }, { label: 'Customers', path: '/customers', icon: UsersRound }, { label: 'Compare', path: '/compare', icon: Columns3 },
  { label: 'RFQs', path: '/rfqs', icon: FileText }, { label: 'Demos', path: '/demos', icon: PlaySquare },
  { label: 'Industries', path: '/industries', icon: BarChart3 }, { label: 'Inventory', path: '/inventory', icon: Boxes }, { label: 'Pricing', path: '/pricing', icon: ShoppingCart },
  { label: 'Marketplace', path: '/marketplace', icon: Boxes }, { label: 'Users', path: '/users', icon: UserCog, permission: 'users.view' },
  { label: 'Roles & Permissions', path: '/roles', icon: Shield, permission: 'roles.view' }, { label: 'Audit Log', path: '/audit-logs', icon: ClipboardList, permission: 'audit_logs.view' },
]
export const personalNavigation = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard }, { label: 'Saved', path: '/saved', icon: Bookmark },
  { label: 'Recently Viewed', path: '/recently-viewed', icon: History }, { label: 'Inbox', path: '/inbox', icon: Mail },
  { label: 'Notifications', path: '/notifications', icon: Bell },
]
export const bottomNavigation = [
  { label: 'Help Center', path: '/help-center', icon: CircleHelp }, { label: 'Settings', path: '/settings', icon: Settings, children: [{ label: 'Advertisement Placements', path: '/featured-banner-ads', icon: GalleryHorizontalEnd, permission: 'marketplace_builder.view' }, { label: 'Marketplace Builder', path: '/marketplace-builder', icon: Paintbrush, permission: 'marketplace_builder.view' }, { label: 'Selling Countries', path: '/selling-countries', icon: Globe2, permission: 'settings.manage' }] },
]
export const allNavigation = [...primaryNavigation.flatMap((item) => [item, ...(item.children || [])]), ...personalNavigation, ...bottomNavigation.flatMap((item) => [item, ...(item.children || [])])]
