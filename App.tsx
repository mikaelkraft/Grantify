import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { ScrollToTop } from './components/ScrollToTop';
import { Home } from './pages/Home';
import { Repayment } from './pages/Repayment';
import { Admin } from './pages/Admin';
import { Terms } from './pages/Terms';
import { Privacy } from './pages/Privacy';
import { Contact } from './pages/Contact';
import { LoanProviders } from './pages/LoanProviders';
import { ApiService } from './services/storage';

function App() {
  // Auto-seed database on first load if tables are empty
  useEffect(() => {
    const initializeDatabase = async () => {
      try {
        const result = await ApiService.seedDatabase();
        if (result.success && Object.values(result.seeded).some(v => v)) {
          console.log('Database seeded with initial data:', result.seeded);
        }
      } catch (e) {
        console.warn('Database seeding skipped (API may be unavailable)');
      }
    };
    initializeDatabase();
  }, []);

  return (
    <HashRouter>
      <ScrollToTop />
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/repayment" element={<Repayment />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/loan-providers" element={<LoanProviders />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </HashRouter>
  );
}

export default App;