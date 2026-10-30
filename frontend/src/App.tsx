import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.js';
import { ShopfloorProvider } from './context/ShopfloorContext.js';
import { AppLayout } from './layouts/AppLayout.js';

import { ModulesHubPage } from './pages/ModulesHubPage.js';
import { ShopFloorPage } from './pages/ShopFloorPage.js';
import { MachineDetailPage } from './pages/MachineDetailPage.js';
import { ProductionOrdersPage } from './pages/ProductionOrdersPage.js';
import { SchedulingPage } from './pages/SchedulingPage.js';
import { PackagingPage } from './pages/PackagingPage.js';
import { QualityPage } from './pages/QualityPage.js';
import { TravelerPage } from './pages/TravelerPage.js';
import { MaterialsPage } from './pages/MaterialsPage.js';
import { MaintenancePage } from './pages/MaintenancePage.js';
import { AndonBoardPage } from './pages/AndonBoardPage.js';
import { OeeAnalyticsPage } from './pages/OeeAnalyticsPage.js';
import { AnalyticsPage } from './pages/AnalyticsPage.js';
import { AdminPage } from './pages/AdminPage.js';
import { NotFoundPage } from './pages/NotFoundPage.js';

export function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ShopfloorProvider>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<ModulesHubPage />} />
              <Route path="shopfloor" element={<ShopFloorPage />} />
              <Route path="machines" element={<MachineDetailPage />} />
              <Route path="machines/:code" element={<MachineDetailPage />} />
              <Route path="orders" element={<ProductionOrdersPage />} />
              <Route path="scheduling" element={<SchedulingPage />} />
              <Route path="packaging" element={<PackagingPage />} />
              <Route path="quality" element={<QualityPage />} />
              <Route path="traveler" element={<TravelerPage />} />
              <Route path="materials" element={<MaterialsPage />} />
              <Route path="maintenance" element={<MaintenancePage />} />
              <Route path="andon" element={<AndonBoardPage />} />
              <Route path="oee" element={<OeeAnalyticsPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="admin" element={<AdminPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </ShopfloorProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
