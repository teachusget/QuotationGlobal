const routeImports = {
  '/categories': () => import('../pages/CategoriesPage'), '/sub-categories': () => import('../pages/CategoriesPage'),
  '/brands': () => import('../pages/BrandsPage'), '/industries': () => import('../pages/IndustriesPage'),
  '/vendors': () => import('../pages/VendorsPage'), '/customers': () => import('../pages/CustomersPage'), '/crm/sales': () => import('../pages/SalesLeadsPage'), '/crm/projects': () => import('../pages/ProjectsPage'),
  '/specification-templates': () => import('../pages/SpecificationTemplatesPage'),
  '/users': () => import('../pages/UsersPage'), '/roles': () => import('../pages/RolesPage'), '/audit-logs': () => import('../pages/AuditLogsPage'),
  '/demos': () => import('../pages/DemosPage'), '/rfqs': () => import('../pages/RfqsPage'), '/purchase-orders': () => import('../pages/VendorPurchaseOrdersPage'), '/orders': () => import('../pages/OrdersPage'), '/inventory': () => import('../pages/InventoryPage'),
  '/marketplace-builder': () => import('../pages/MarketplaceBuilderPage'), '/featured-banner-ads': () => import('../pages/FeaturedBannerAdsPage'), '/profile': () => import('../pages/ProfilePage'),
  '/company-profile': () => import('../pages/CompanyProfilePage'), '/account-settings': () => import('../pages/AccountSettingsPage'),
}
const pending = new Map()
export function prefetchRoute(path) {
  const load = routeImports[path]
  if (!load) return Promise.resolve()
  if (!pending.has(path)) pending.set(path, load().catch(() => { pending.delete(path) }))
  return pending.get(path)
}
