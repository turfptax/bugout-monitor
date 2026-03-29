import { Routes, Route } from 'react-router-dom';
import NavBar from './components/layout/NavBar';
import ToastContainer from './components/layout/ToastContainer';
import DashboardTab from './components/dashboard/DashboardTab';
import PlanTab from './components/plan/PlanTab';
import PlanErrorBoundary from './components/plan/PlanErrorBoundary';
import EquipmentTab from './components/equipment/EquipmentTab';
import SettingsTab from './components/settings/SettingsTab';
import ChatTab from './components/chat/ChatTab';
import SetupWizard from './components/settings/SetupWizard';
import ChatFAB from './components/chat/ChatFAB';
import ChatPanel from './components/chat/ChatPanel';
import { useSettingsStore } from './store/useSettingsStore';

export default function App() {
  const hasOnboarded = useSettingsStore((s) => s.hasCompletedOnboarding);

  return (
    <div className="min-h-screen bg-bg text-text-primary">
      <NavBar />
      <main className="pt-12 md:pt-14 pb-[72px] md:pb-0">
        <Routes>
          <Route path="/" element={<DashboardTab />} />
          <Route path="/plan" element={<PlanErrorBoundary><PlanTab /></PlanErrorBoundary>} />
          <Route path="/equipment" element={<EquipmentTab />} />
          <Route path="/ai" element={<ChatTab />} />
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
