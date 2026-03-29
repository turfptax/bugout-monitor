import { Routes, Route } from 'react-router-dom';
import NavBar from './components/layout/NavBar';
import ToastContainer from './components/layout/ToastContainer';
import DashboardTab from './components/dashboard/DashboardTab';
import PlanTab from './components/plan/PlanTab';
import EquipmentTab from './components/equipment/EquipmentTab';
import SettingsTab from './components/settings/SettingsTab';
import SetupWizard from './components/settings/SetupWizard';
import ChatFAB from './components/chat/ChatFAB';
import ChatPanel from './components/chat/ChatPanel';
import { useSettingsStore } from './store/useSettingsStore';

export default function App() {
  const hasOnboarded = useSettingsStore((s) => s.hasCompletedOnboarding);

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      <NavBar />
      <main className="pt-14">
        <Routes>
          <Route path="/" element={<DashboardTab />} />
          <Route path="/plan" element={<PlanTab />} />
          <Route path="/equipment" element={<EquipmentTab />} />
          <Route path="/settings" element={<SettingsTab />} />
        </Routes>
      </main>
      <ToastContainer />
      <ChatFAB />
      <ChatPanel />
      {!hasOnboarded && <SetupWizard />}
    </div>
  );
}
