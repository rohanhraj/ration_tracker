
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider } from './store/DataContext';
import Layout from './components/Layout';
import DataEntry from './pages/DataEntry';
import DailyReport from './pages/DailyReport';
import MonthlyReport from './pages/MonthlyReport';
import BuyerHistory from './pages/BuyerHistory';

function App() {
  return (
    <DataProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/entry" replace />} />
            <Route path="entry" element={<DataEntry />} />
            <Route path="daily" element={<DailyReport />} />
            <Route path="monthly" element={<MonthlyReport />} />
            <Route path="history" element={<BuyerHistory />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </DataProvider>
  );
}

export default App;
