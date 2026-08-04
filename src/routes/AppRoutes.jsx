import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from '../components/layout/AppLayout'
import { allNavigation } from '../data/navigation'
import HomePage from '../pages/HomePage'
import PlaceholderPage from '../pages/PlaceholderPage'
import LoginPage from '../pages/LoginPage'
import ProtectedRoute from '../auth/ProtectedRoute'
import CategoriesPage from '../pages/CategoriesPage'
import BrandsPage from '../pages/BrandsPage'
import IndustriesPage from '../pages/IndustriesPage'
import VendorsPage from '../pages/VendorsPage'
import RegisterPage from '../pages/RegisterPage'
import ForgotPasswordPage from '../pages/ForgotPasswordPage'
import ResetPasswordPage from '../pages/ResetPasswordPage'
import ServicesPage from '../pages/ServicesPage'
import MarketplacePage from '../pages/MarketplacePage'
import ProductPage from '../pages/ProductPage'
import ServiceTypePage from '../pages/ServiceTypePage'
import DemosPage from '../pages/DemosPage'
import RfqsPage from '../pages/RfqsPage'
import VendorPurchaseOrdersPage from '../pages/VendorPurchaseOrdersPage'
import CustomersPage from '../pages/CustomersPage'
import SpecificationTemplatesPage from '../pages/SpecificationTemplatesPage'
import ComparePage from '../pages/ComparePage'
import PublicMarketplaceLayout from '../components/layout/PublicMarketplaceLayout'
import { useAuth } from '../auth/useAuth'

export default function AppRoutes() {
  const { user } = useAuth()
  const isVendor = user?.role === 'vendor'
  const isBuyer = user?.role === 'buyer'
  const isAdmin = !isVendor && !isBuyer
  const categoryPaths = ['/categories', '/sub-categories']
  const implementedPaths = ['/', '/brands', '/industries', '/vendors', '/customers', '/services', '/marketplace', '/rfqs', '/compare', '/specification-templates', ...categoryPaths]
  const placeholderItems = allNavigation.filter((item) => item.path !== '/rfqs' && !implementedPaths.includes(item.path))

  return <Routes>
    <Route path="/login" element={<LoginPage/>}/>
    <Route path="/register" element={<RegisterPage/>}/>
    <Route path="/forgot-password" element={<ForgotPasswordPage/>}/>
    <Route path="/reset-password/:token" element={<ResetPasswordPage/>}/>
    <Route element={<PublicMarketplaceLayout/>}>
      <Route path="/marketplace" element={<MarketplacePage/>}/>
      <Route path="/marketplace/services/:id" element={<ProductPage/>}/>
      <Route path="/marketplace/type/:type" element={<ServiceTypePage/>}/>
      <Route path="/compare" element={<ComparePage/>}/>
    </Route>
    <Route element={<ProtectedRoute/>}>
      <Route element={<AppLayout/>}>
        <Route index element={isVendor ? <Navigate to="/vendors" replace/> : isBuyer ? <Navigate to="/marketplace" replace/> : <HomePage/>}/>
        {isAdmin && categoryPaths.map((path) => <Route key={path} path={path} element={<CategoriesPage/>}/>)}
        {!isBuyer && <Route path="/brands" element={<BrandsPage/>}/>} 
        {isAdmin && <Route path="/industries" element={<IndustriesPage/>}/>}
        {!isBuyer && <Route path="/vendors" element={<VendorsPage/>}/>}
        {!isBuyer && <Route path="/customers" element={<CustomersPage/>}/>}
        {!isBuyer && <Route path="/services" element={<ServicesPage/>}/>} 
        {isAdmin && <Route path="/specification-templates" element={<SpecificationTemplatesPage/>}/>} 
        <Route path="/demos" element={<DemosPage/>}/>
        <Route path="/rfqs" element={<RfqsPage/>}/>
        {(isVendor || isAdmin) && <Route path="/purchase-orders" element={<VendorPurchaseOrdersPage/>}/>}
        {isAdmin && placeholderItems.map((item) => <Route key={item.path} path={item.path} element={<PlaceholderPage/>}/>)}
      </Route>
    </Route>
    <Route path="*" element={<Navigate to={!user ? '/marketplace' : isVendor ? '/vendors' : isBuyer ? '/marketplace' : '/'} replace/>}/>
  </Routes>
}
