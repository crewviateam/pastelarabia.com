import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import InventoryPage from './pages/InventoryPage';
import CustomersPage from './pages/CustomersPage';
import VendorsPage from './pages/VendorsPage';
import AccountsPage from './pages/AccountsPage';
import ContactDetailPage from './pages/ContactDetailPage';
import AddProductPage from './pages/AddProductPage';
import ProductDetailPage from './pages/ProductDetailPage';
import SalesPage from './pages/SalesPage';
import CreateSalePage from './pages/CreateSalePage';
import SaleDetailPage from './pages/SaleDetailPage';
import InvoicesPage from './pages/InvoicesPage';
import InvoiceDetailPage from './pages/InvoiceDetailPage';
import PaymentsPage from './pages/PaymentsPage';
import PurchasesPage from './pages/PurchasesPage';
import PurchaseDetailPage from './pages/PurchaseDetailPage';
import CreatePurchasePage from './pages/CreatePurchasePage';
import BranchesPage from './pages/BranchesPage';
import StaffPage from './pages/StaffPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AIAssistantPage from './pages/AIAssistantPage';
import ChatPage from './pages/ChatPage';
import StorefrontPreviewPage from './pages/StorefrontPreviewPage';
import { ReactNode } from 'react';

import SettingsPage from './pages/SettingsPage';

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">🚧</div>
      <h3>{title}</h3>
      <p>This module is being built. Check back shortly.</p>
    </div>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) {
    return (
      <div className="loading-page" style={{ minHeight: '100vh' }}>
        <div className="loading-spinner lg" />
        <span>Loading...</span>
      </div>
    );
  }
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function PublicRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  return isAuthenticated ? <Navigate to="/" replace /> : <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
            <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route index element={<DashboardPage />} />
              <Route path="branches" element={<BranchesPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="inventory/new" element={<AddProductPage />} />
              <Route path="inventory/:id" element={<ProductDetailPage />} />
              <Route path="customers" element={<CustomersPage />} />
              <Route path="customers/:id" element={<ContactDetailPage />} />
              <Route path="vendors" element={<VendorsPage />} />
              <Route path="vendors/:id" element={<ContactDetailPage />} />
              <Route path="accounts" element={<AccountsPage />} />
              <Route path="sales" element={<SalesPage />} />
              <Route path="sales/new" element={<CreateSalePage />} />
              <Route path="sales/:id" element={<SaleDetailPage />} />
              <Route path="purchases" element={<PurchasesPage />} />
              <Route path="purchases/new" element={<CreatePurchasePage />} />
              <Route path="purchases/:id" element={<PurchaseDetailPage />} />
              <Route path="invoices" element={<InvoicesPage />} />
              <Route path="invoices/:id" element={<InvoiceDetailPage />} />
              <Route path="payments" element={<PaymentsPage />} />
              <Route path="staff" element={<StaffPage />} />
              <Route path="staff/:id" element={<PlaceholderPage title="Staff Detail" />} />
              <Route path="chat" element={<ChatPage />} />
              <Route path="ai" element={<AIAssistantPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="reports" element={<PlaceholderPage title="Reports" />} />
              <Route path="website" element={<StorefrontPreviewPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
