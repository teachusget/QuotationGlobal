import { Navigate, Route, Routes } from 'react-router-dom'
import { lazy as reactLazy, Suspense } from 'react'
import AppLayout from '../components/layout/AppLayout'
import { allNavigation } from '../data/navigation'
import HomePage from '../pages/HomePage'
import ProtectedRoute from '../auth/ProtectedRoute'
import MarketplacePage from '../pages/MarketplacePage'
import PublicMarketplaceLayout from '../components/layout/PublicMarketplaceLayout'
import { useAuth } from '../auth/useAuth'
import PermissionRoute from '../auth/PermissionRoute'
import ServicesPage from '../pages/ServicesPage'

const lazy = (importer) => reactLazy(importer)

const PlaceholderPage = lazy(() => import('../pages/PlaceholderPage'))
const LoginPage = lazy(() => import('../pages/LoginPage'))
const CategoriesPage = lazy(() => import('../pages/CategoriesPage'))
const BrandsPage = lazy(() => import('../pages/BrandsPage'))
const IndustriesPage = lazy(() => import('../pages/IndustriesPage'))
const VendorsPage = lazy(() => import('../pages/VendorsPage'))
const RegisterPage = lazy(() => import('../pages/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('../pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('../pages/ResetPasswordPage'))
const ProductPage = lazy(() => import('../pages/ProductPage'))
const ServiceTypePage = lazy(() => import('../pages/ServiceTypePage'))
const DemosPage = lazy(() => import('../pages/DemosPage'))
const RfqsPage = lazy(() => import('../pages/RfqsPage'))
const QuotationsPage = lazy(() => import('../pages/QuotationsPage'))
const VendorPurchaseOrdersPage = lazy(() => import('../pages/VendorPurchaseOrdersPage'))
const OrdersPage = lazy(() => import('../pages/OrdersPage'))
const InventoryPage = lazy(() => import('../pages/InventoryPage'))
const CustomersPage = lazy(() => import('../pages/CustomersPage'))
const SalesLeadsPage = lazy(() => import('../pages/SalesLeadsPage'))
const ProjectsPage = lazy(() => import('../pages/ProjectsPage'))
const SpecificationTemplatesPage = lazy(() => import('../pages/SpecificationTemplatesPage'))
const ComparePage = lazy(() => import('../pages/ComparePage'))
const UsersPage = lazy(() => import('../pages/UsersPage'))
const RolesPage = lazy(() => import('../pages/RolesPage'))
const AuditLogsPage = lazy(() => import('../pages/AuditLogsPage'))
const ForbiddenPage = lazy(() => import('../pages/ForbiddenPage'))
const ProfilePage = lazy(() => import('../pages/ProfilePage'))
const CompanyProfilePage = lazy(() => import('../pages/CompanyProfilePage'))
const AccountSettingsPage = lazy(() => import('../pages/AccountSettingsPage'))
const MarketplaceBuilderPage = lazy(() => import('../pages/MarketplaceBuilderPage'))
const FeaturedBannerAdsPage = lazy(() => import('../pages/FeaturedBannerAdsPage'))
const BrowseSolutionsPage = lazy(() => import('../pages/BrowseSolutionsPage'))
const MarketplaceBrandsPage = lazy(() => import('../pages/MarketplaceBrandsPage'))
const MarketplaceIndustriesPage = lazy(() => import('../pages/MarketplaceIndustriesPage'))
const SellingCountriesPage = lazy(() => import('../pages/SellingCountriesPage'))

export default function AppRoutes() {
  const { user } = useAuth()
  const isVendor = user?.account_type === 'vendor'
  const isBuyer = user?.account_type === 'buyer'
  const isAdmin = !isVendor && !isBuyer
  const categoryPaths = ['/categories', '/sub-categories']
  const implementedPaths = ['/', '/brands', '/industries', '/vendors', '/customers', '/services', '/marketplace', '/rfqs', '/compare', '/specification-templates', '/selling-countries', '/featured-banner-ads', ...categoryPaths]
  const placeholderItems = allNavigation.filter((item) => item.path !== '/rfqs' && !implementedPaths.includes(item.path))

  return <Suspense fallback={<div className="mx-auto min-h-96 w-full max-w-[1440px] animate-pulse rounded-xl bg-slate-100"/>}><Routes>
    <Route path="/login" element={<LoginPage/>}/>
    <Route path="/register" element={<RegisterPage/>}/>
    <Route path="/forgot-password" element={<ForgotPasswordPage/>}/>
    <Route path="/reset-password/:token" element={<ResetPasswordPage/>}/>
    <Route element={<PublicMarketplaceLayout/>}>
      <Route path="/marketplace" element={<MarketplacePage/>}/>
      <Route path="/marketplace/solutions" element={<BrowseSolutionsPage/>}/>
      <Route path="/marketplace/brands" element={<MarketplaceBrandsPage/>}/>
      <Route path="/marketplace/brands/:slug" element={<MarketplaceBrandsPage/>}/>
      <Route path="/marketplace/industries" element={<MarketplaceIndustriesPage/>}/>
      <Route path="/marketplace/industries/:slug" element={<MarketplaceIndustriesPage/>}/>
      <Route path="/marketplace/services/:id" element={<ProductPage/>}/>
      <Route path="/marketplace/type/:type" element={<ServiceTypePage/>}/>
      <Route path="/compare" element={<ComparePage/>}/>
    </Route>
    <Route element={<ProtectedRoute/>}>
      <Route element={<AppLayout/>}>
        <Route index element={isVendor ? <Navigate to="/vendors" replace/> : isBuyer ? <Navigate to="/marketplace" replace/> : <HomePage/>}/>
        {categoryPaths.map((path) => <Route key={path} path={path} element={<PermissionRoute permission="categories.view"><CategoriesPage/></PermissionRoute>}/>)}
        <Route path="/brands" element={<PermissionRoute permission="brands.view"><BrandsPage/></PermissionRoute>}/>
        <Route path="/industries" element={<PermissionRoute permission="industries.view"><IndustriesPage/></PermissionRoute>}/>
        <Route path="/vendors" element={<PermissionRoute permission="vendors.view"><VendorsPage/></PermissionRoute>}/>
        <Route path="/customers" element={<PermissionRoute permission="customers.view"><CustomersPage/></PermissionRoute>}/>
        <Route path="/crm/sales" element={<PermissionRoute permission="customers.view"><SalesLeadsPage/></PermissionRoute>}/>
        <Route path="/crm/projects" element={<PermissionRoute permission="customers.view"><ProjectsPage/></PermissionRoute>}/>
        <Route path="/services" element={<PermissionRoute permission="services.view"><ServicesPage/></PermissionRoute>}/>
        <Route path="/specification-templates" element={<PermissionRoute permission="specifications.view"><SpecificationTemplatesPage/></PermissionRoute>}/>
        <Route path="/users" element={<PermissionRoute permission="users.view"><UsersPage/></PermissionRoute>}/>
        <Route path="/roles" element={<PermissionRoute permission="roles.view"><RolesPage/></PermissionRoute>}/>
        <Route path="/audit-logs" element={<PermissionRoute permission="audit_logs.view"><AuditLogsPage/></PermissionRoute>}/>
        <Route path="/demos" element={<PermissionRoute permission="demos.view"><DemosPage/></PermissionRoute>}/>
        <Route path="/rfqs" element={<PermissionRoute permission="rfqs.view"><RfqsPage/></PermissionRoute>}/>
        <Route path="/quotations" element={<PermissionRoute permission="rfqs.view"><QuotationsPage/></PermissionRoute>}/>
        <Route path="/purchase-orders" element={<PermissionRoute permission="purchase_orders.view"><VendorPurchaseOrdersPage/></PermissionRoute>}/>
        <Route path="/orders" element={<OrdersPage/>}/>
        <Route path="/inventory" element={isBuyer ? <Navigate to="/orders" replace/> : <InventoryPage/>}/>
        <Route path="/forbidden" element={<ForbiddenPage/>}/>
        <Route path="/profile" element={<ProfilePage/>}/>
        <Route path="/company-profile" element={<CompanyProfilePage/>}/>
        <Route path="/account-settings" element={<AccountSettingsPage/>}/>
        <Route path="/marketplace-builder" element={<PermissionRoute permission="marketplace_builder.view"><Suspense fallback={<div className="min-h-96 animate-pulse rounded-xl bg-slate-100"/>}><MarketplaceBuilderPage/></Suspense></PermissionRoute>}/>
        <Route path="/featured-banner-ads" element={<PermissionRoute permission="marketplace_builder.view"><FeaturedBannerAdsPage/></PermissionRoute>}/>
        <Route path="/selling-countries" element={<PermissionRoute permission="settings.manage"><SellingCountriesPage/></PermissionRoute>}/>
        {isAdmin && placeholderItems.map((item) => <Route key={item.path} path={item.path} element={<PlaceholderPage/>}/>)}
      </Route>
    </Route>
    <Route path="*" element={<Navigate to={!user ? '/marketplace' : isVendor ? '/vendors' : isBuyer ? '/marketplace' : '/'} replace/>}/>
  </Routes></Suspense>
}
