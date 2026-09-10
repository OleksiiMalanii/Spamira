import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Analyzer } from './pages/Analyzer';
import { History } from './pages/History';
import { Metrics } from './pages/Metrics';
import { About } from './pages/About';
import './styles.css';
import { AuthProvider } from './lib/auth';
import { RequireAccount } from './components/RequireAccount';
import { Account } from './pages/Account';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="analyzer" element={<Analyzer />} />
            <Route
              path="history"
              element={
                <RequireAccount>
                  <History />
                </RequireAccount>
              }
            />
            <Route path="login" element={<Account key="login" mode="login" />} />
            <Route path="register" element={<Account key="register" mode="register" />} />
            <Route path="metrics" element={<Metrics />} />
            <Route path="about" element={<About />} />
            <Route
              path="*"
              element={
                <div className="empty">
                  <h1>Page not found</h1>
                  <Link to="/">Return to overview</Link>
                </div>
              }
            />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
