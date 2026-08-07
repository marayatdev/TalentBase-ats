import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";

import LoginPage from "@/pages/auth/Login";
import RegisterPage from "@/pages/auth/Register";
import DashboardPage from "@/pages/dashboard/Dashboard";
import ReportsPage from "@/pages/dashboard/Reports";

import JobListPage from "@/pages/jobs/JobList";
import JobFormPage from "@/pages/jobs/JobForm";
import JobDetailPage from "@/pages/jobs/JobDetail";
import JobPipelinePage from "@/pages/jobs/JobPipeline";

import CandidateListPage from "@/pages/candidates/CandidateList";
import CandidateFormPage from "@/pages/candidates/CandidateForm";
import CandidateDetailPage from "@/pages/candidates/CandidateDetail";

import ApplicationListPage from "@/pages/applications/ApplicationList";
import ApplicationDetailPage from "@/pages/applications/ApplicationDetail";

import PipelineBoardPage from "@/pages/pipeline/PipelineBoard";

import CandidateImportPage from "@/pages/imports/CandidateImport";
import ImportHistoryPage from "@/pages/imports/ImportHistory";

import AIAnalysisPage from "@/pages/ai-analysis/AIAnalysis";

import SettingsPage from "@/pages/settings/Settings";
import BrowserExtensionPage from "@/pages/settings/BrowserExtension";

import NotFoundPage from "@/pages/NotFound";
import CandidateLeadsPage from "@/pages/candidate-leads/CandidateLeadsPage";
import CandidateLeadDetailPage from "./pages/candidate-leads/CandidateLeadDetailPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/reports" element={<ReportsPage />} />

            <Route path="/jobs" element={<JobListPage />} />
            <Route path="/jobs/new" element={<JobFormPage />} />
            <Route path="/jobs/:id" element={<JobDetailPage />} />
            <Route path="/jobs/:id/edit" element={<JobFormPage />} />
            <Route path="/jobs/:id/pipeline" element={<JobPipelinePage />} />

            <Route path="/candidates" element={<CandidateListPage />} />
            <Route path="/candidates/new" element={<CandidateFormPage />} />
            <Route path="/candidates/:id" element={<CandidateDetailPage />} />
            <Route path="/candidates/:id/edit" element={<CandidateFormPage />} />

            <Route path="/candidate-leads" element={<CandidateLeadsPage />} />
            <Route path="/candidate-leads/:id" element={<CandidateLeadDetailPage />} />


            <Route path="/applications" element={<ApplicationListPage />} />
            <Route path="/applications/:id" element={<ApplicationDetailPage />} />

            <Route path="/pipeline" element={<PipelineBoardPage />} />

            <Route path="/imports" element={<CandidateImportPage />} />
            <Route path="/imports/history" element={<ImportHistoryPage />} />

            <Route path="/ai-analysis" element={<AIAnalysisPage />} />

            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/settings/browser-extension" element={<BrowserExtensionPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}
