import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { LiaProvider } from './context/LiaContext';
import Sidebar from './components/Sidebar';
import AIOrb from './components/AIOrb';
import NotificationBell from './components/NotificationBell';
import LiaCompanion from './components/LiaCompanion';

import AuthPage from './pages/AuthPage';
import SetupWizardPage from './pages/SetupWizardPage';
import DashboardPage from './pages/DashboardPage';
import GoalsPage from './pages/GoalsPage';
import TasksPage from './pages/TasksPage';
import HabitsPage from './pages/HabitsPage';
import SleepMoodPage from './pages/SleepMoodPage';
import LearningPage from './pages/LearningPage';
import DigitalHabitsPage from './pages/DigitalHabitsPage';
import FitnessPage from './pages/FitnessPage';
import JournalPage from './pages/JournalPage';
import SettingsPage from './pages/SettingsPage';

// Protected Route wrapper
const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-white">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center animate-pulse shadow-lg shadow-indigo-500/30">
            <span className="font-black text-white text-xl">L</span>
          </div>
          <div className="text-sm font-mono text-white/50 animate-pulse">Synchronizing neural interface...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex min-h-screen bg-[#050816] text-[#f3f4f6]">
      {/* Background glow effects */}
      <div id="ambient-glows" />

      {/* Sidebar Menu */}
      <Sidebar />

      {/* Main page content area */}
      <div className="flex-1 min-h-screen relative">
        {/* Notification Bell – floating top-right inside main content area */}
        <div className="fixed top-5 right-6 z-50">
          <NotificationBell />
        </div>
        {children}
      </div>

      {/* Floating AI Orb */}
      <AIOrb />

      {/* 3D Lia Desktop Toy Companion */}
      <LiaCompanion />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
          <LiaProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<AuthPage />} />

              {/* Setup Wizard */}
              <Route path="/setup" element={
                <ProtectedLayout>
                  <SetupWizardPage />
                </ProtectedLayout>
              } />

              {/* Protected Routes */}
              <Route path="/dashboard" element={
                <ProtectedLayout>
                  <DashboardPage />
                </ProtectedLayout>
              } />
              <Route path="/goals" element={
                <ProtectedLayout>
                  <GoalsPage />
                </ProtectedLayout>
              } />
              <Route path="/tasks" element={
                <ProtectedLayout>
                  <TasksPage />
                </ProtectedLayout>
              } />
              <Route path="/habits" element={
                <ProtectedLayout>
                  <HabitsPage />
                </ProtectedLayout>
              } />
              <Route path="/sleep-mood" element={
                <ProtectedLayout>
                  <SleepMoodPage />
                </ProtectedLayout>
              } />
              <Route path="/learning" element={
                <ProtectedLayout>
                  <LearningPage />
                </ProtectedLayout>
              } />
              <Route path="/digital-habits" element={
                <ProtectedLayout>
                  <DigitalHabitsPage />
                </ProtectedLayout>
              } />
              <Route path="/fitness" element={
                <ProtectedLayout>
                  <FitnessPage />
                </ProtectedLayout>
              } />
              <Route path="/journal" element={
                <ProtectedLayout>
                  <JournalPage />
                </ProtectedLayout>
              } />
              <Route path="/settings" element={
                <ProtectedLayout>
                  <SettingsPage />
                </ProtectedLayout>
              } />

              {/* Default redirect to Dashboard */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </LiaProvider>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
