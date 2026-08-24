import { Navigate, Route, Routes } from "react-router-dom";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute, RoleRoute } from "@/components/layout/ProtectedRoute";

import { LandingPage } from "@/pages/public/LandingPage";
import { ForCreatorsPage } from "@/pages/public/ForCreatorsPage";
import { ForBrandsPage } from "@/pages/public/ForBrandsPage";
import { PricingPage } from "@/pages/public/PricingPage";
import { TrustCompliancePage } from "@/pages/public/TrustCompliancePage";
import { FaqPage } from "@/pages/public/FaqPage";

import { LoginPage } from "@/pages/auth/LoginPage";
import { SignupPage } from "@/pages/auth/SignupPage";

import { CreatorOnboardingPage } from "@/pages/onboarding/CreatorOnboardingPage";
import { BrandOnboardingPage } from "@/pages/onboarding/BrandOnboardingPage";

import { CreatorDashboardPage } from "@/pages/creator/CreatorDashboardPage";
import { CreatorCollaborationsPage } from "@/pages/creator/CreatorCollaborationsPage";
import { CreatorProfilePage } from "@/pages/creator/CreatorProfilePage";

import { BrandDashboardPage } from "@/pages/brand/BrandDashboardPage";
import { DiscoverCreatorsPage } from "@/pages/brand/DiscoverCreatorsPage";
import { CampaignsPage } from "@/pages/brand/CampaignsPage";
import { CampaignNewPage } from "@/pages/brand/CampaignNewPage";
import { BrandCollaborationsPage } from "@/pages/brand/BrandCollaborationsPage";
import { BillingPage } from "@/pages/brand/BillingPage";

import { CreatorProfileViewPage } from "@/pages/shared/CreatorProfileViewPage";
import { CollaborationWorkspacePage } from "@/pages/shared/CollaborationWorkspacePage";

import { AdminOverviewPage } from "@/pages/admin/AdminOverviewPage";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";
import { AdminDisputesPage } from "@/pages/admin/AdminDisputesPage";

import { NotFoundPage } from "@/pages/NotFoundPage";

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/for-creators" element={<ForCreatorsPage />} />
        <Route path="/for-brands" element={<ForBrandsPage />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/trust-and-compliance" element={<TrustCompliancePage />} />
        <Route path="/faq" element={<FaqPage />} />
      </Route>

      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/onboarding/creator" element={<CreatorOnboardingPage />} />
        <Route path="/onboarding/brand" element={<BrandOnboardingPage />} />

        <Route element={<AppLayout />}>
          <Route element={<RoleRoute allow={["creator"]} />}>
            <Route path="/dashboard/creator" element={<CreatorDashboardPage />} />
            <Route path="/dashboard/creator/collaborations" element={<CreatorCollaborationsPage />} />
            <Route path="/dashboard/creator/profile" element={<CreatorProfilePage />} />
          </Route>

          <Route element={<RoleRoute allow={["brand"]} />}>
            <Route path="/dashboard/brand" element={<BrandDashboardPage />} />
            <Route path="/dashboard/brand/discover" element={<DiscoverCreatorsPage />} />
            <Route path="/dashboard/brand/campaigns" element={<CampaignsPage />} />
            <Route path="/dashboard/brand/collaborations" element={<BrandCollaborationsPage />} />
            <Route path="/dashboard/brand/billing" element={<BillingPage />} />
            <Route path="/campaign/new" element={<CampaignNewPage />} />
          </Route>

          <Route element={<RoleRoute allow={["admin"]} />}>
            <Route path="/admin" element={<AdminOverviewPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/disputes" element={<AdminDisputesPage />} />
          </Route>

          <Route path="/creator/:id" element={<CreatorProfileViewPage />} />
          <Route path="/collaboration/:id" element={<CollaborationWorkspacePage />} />
        </Route>
      </Route>

      <Route path="/dashboard" element={<Navigate to="/dashboard/creator" replace />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
