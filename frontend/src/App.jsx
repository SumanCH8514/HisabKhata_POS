import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout.jsx';
import Dashboard from './components/Dashboard.jsx';
import Inventory from './components/Inventory.jsx';
import Parties from './components/Parties.jsx';
import POSBilling from './components/POSBilling.jsx';
import Sales from './components/Sales.jsx';
import Purchase from './components/Purchase.jsx';
import Expenses from './components/Expenses.jsx';
import FundFlow from './components/FundFlow.jsx';
import Reports from './components/Reports.jsx';
import AccountBook from './components/AccountBook.jsx';
import ExtraTools from './components/ExtraTools.jsx';
import Backup from './components/Backup.jsx';
import Referral from './components/Referral.jsx';
import Settings from './components/Settings.jsx';
import CompanyProfile from './components/CompanyProfile.jsx';
import UserProfile from './components/UserProfile.jsx';
import LandingPage from './components/LandingPage.jsx';
import Auth from './components/Auth.jsx';
import InvoicePrintA4 from './components/InvoicePrintA4.jsx';
import InvoicePrintThermal from './components/InvoicePrintThermal.jsx';
import PublicReceipt from './components/PublicReceipt.jsx';
import JoinInvite from './components/JoinInvite.jsx';

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Auth />} />
        <Route path="/signup" element={<Auth defaultIsLogin={false} />} />
        <Route path="/join" element={<JoinInvite />} />
        <Route path="/invite/:token" element={<JoinInvite />} />
        <Route path="/receipt/:id" element={<PublicReceipt />} />
        <Route path="/bill/:id" element={<PublicReceipt />} />
        <Route path="/invoice/:id/print" element={<InvoicePrintA4 />} />
        <Route path="/invoice/:id/print-thermal" element={<InvoicePrintThermal />} />
        
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/pos" element={<POSBilling />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/parties" element={<Parties />} />
          <Route path="/sales" element={<Sales />} />
          <Route path="/purchase" element={<Purchase />} />
          <Route path="/expenses" element={<Expenses />} />
          <Route path="/fundflow" element={<FundFlow />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/account" element={<AccountBook />} />
          <Route path="/tools" element={<ExtraTools />} />
          <Route path="/backup" element={<Backup />} />
          <Route path="/referral" element={<Referral />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/company-profile" element={<CompanyProfile />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
