import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import type { ReactElement } from 'react';
import { DataProvider, useData } from './store/DataContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import InventoryDashboard from './pages/InventoryDashboard';
import IssueRation from './pages/IssueRation';
import CardHolders from './pages/CardHolders';
import MonthlyReport from './pages/MonthlyReport';
import BuyerHistory from './pages/BuyerHistory';
import WorkerDistribution from './pages/WorkerDistribution';
import type { Role } from './store/DataContext';

const RoleRoute = ({ role, children }: { role: Role; children: ReactElement }) => {
  const { user } = useData();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) {
    return <Navigate to={user.role === 'owner' ? '/inventory' : '/distribution'} replace />;
  }

  return children;
};

const HomeRedirect = () => {
  const { user, authLoading } = useData();

  if (authLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return <Navigate to={user.role === 'owner' ? '/inventory' : '/distribution'} replace />;
};

function App() {
  return (
    <DataProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Layout />}>
            <Route index element={<HomeRedirect />} />
            <Route
              path="inventory"
              element={
                <RoleRoute role="owner">
                  <InventoryDashboard />
                </RoleRoute>
              }
            />
            <Route
              path="issue"
              element={
                <RoleRoute role="owner">
                  <IssueRation />
                </RoleRoute>
              }
            />
            <Route
              path="cards"
              element={
                <RoleRoute role="owner">
                  <CardHolders />
                </RoleRoute>
              }
            />
            <Route
              path="monthly"
              element={
                <RoleRoute role="owner">
                  <MonthlyReport />
                </RoleRoute>
              }
            />
            <Route
              path="history"
              element={
                <RoleRoute role="owner">
                  <BuyerHistory />
                </RoleRoute>
              }
            />
            <Route
              path="distribution"
              element={
                <RoleRoute role="worker">
                  <WorkerDistribution />
                </RoleRoute>
              }
            />
          </Route>
          <Route path="*" element={<HomeRedirect />} />
        </Routes>
      </BrowserRouter>
    </DataProvider>
  );
}

export default App;
