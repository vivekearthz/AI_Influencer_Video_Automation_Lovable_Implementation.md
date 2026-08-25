import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { LoginPage } from "@/pages/LoginPage";
import { SignupPage } from "@/pages/SignupPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { CreatePage } from "@/pages/studio/CreatePage";
import { CampaignsPage } from "@/pages/studio/CampaignsPage";
import { CampaignDetailPage } from "@/pages/studio/CampaignDetailPage";
import { ScriptsPage } from "@/pages/studio/ScriptsPage";
import { VideosPage } from "@/pages/studio/VideosPage";
import { PresentersPage } from "@/pages/studio/PresentersPage";
import { PublishingPage } from "@/pages/studio/PublishingPage";
import { WhatsAppPage } from "@/pages/studio/WhatsAppPage";
import { EmailPage } from "@/pages/studio/EmailPage";
import { AnalyticsPage } from "@/pages/studio/AnalyticsPage";
import { ProvidersPage } from "@/pages/studio/ProvidersPage";
import { CostsPage } from "@/pages/studio/CostsPage";
import { SettingsPage } from "@/pages/settings/SettingsPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/studio/create" replace />} />
          <Route path="/studio/create" element={<CreatePage />} />
          <Route path="/studio/campaigns" element={<CampaignsPage />} />
          <Route path="/studio/campaigns/:campaignId" element={<CampaignDetailPage />} />
          <Route path="/studio/scripts" element={<ScriptsPage />} />
          <Route path="/studio/videos" element={<VideosPage />} />
          <Route path="/studio/presenters" element={<PresentersPage />} />
          <Route path="/studio/publishing" element={<PublishingPage />} />
          <Route path="/studio/whatsapp" element={<WhatsAppPage />} />
          <Route path="/studio/email" element={<EmailPage />} />
          <Route path="/studio/analytics" element={<AnalyticsPage />} />
          <Route path="/studio/providers" element={<ProvidersPage />} />
          <Route path="/studio/costs" element={<CostsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
