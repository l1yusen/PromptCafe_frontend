import { createRouter, createWebHistory } from "vue-router";
import { getAuthMe, getStoredUser, isAuthenticated } from "../api/auth";
import LoginPage from "../pages/LoginPage.vue";
import PromptHomePage from "../pages/PromptHomePage.vue";
import PromptHomeMain from "../pages/PromptHomeMain.vue";
import RegisterPage from "../pages/RegisterPage.vue";
import ProfilePage from "../pages/ProfilePage.vue";
import AdminReviewPage from "../pages/AdminReviewPage.vue";
import AdminUsersPage from "../pages/AdminUsersPage.vue";
import AdminPromptsPage from "../pages/AdminPromptsPage.vue";
import AdminReportsPage from "../pages/AdminReportsPage.vue";
import AdminAuditLogsPage from "../pages/AdminAuditLogsPage.vue";
import PromptVersionsPage from "../pages/PromptVersionsPage.vue";
import PromptVersionsComparePage from "../pages/PromptVersionsComparePage.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/login", name: "login", component: LoginPage },
    { path: "/register", name: "register", component: RegisterPage },
    {
      path: "/",
      name: "home",
      component: PromptHomePage,
      meta: { requiresAuth: true },
      children: [
        { path: "", name: "home-main", component: PromptHomeMain },
        {
          path: "prompts/:id/versions",
          name: "prompt-versions",
          component: PromptVersionsPage,
          meta: { requiresAuth: true }
        },
        {
          path: "prompts/:id/versions/compare",
          name: "prompt-versions-compare",
          component: PromptVersionsComparePage,
          meta: { requiresAuth: true }
        }
      ]
    },
    { path: "/profile", name: "profile", component: ProfilePage, meta: { requiresAuth: true } },
    { path: "/admin/reviews", name: "admin-reviews", component: AdminReviewPage, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: "/admin/users", name: "admin-users", component: AdminUsersPage, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: "/admin/prompts", name: "admin-prompts", component: AdminPromptsPage, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: "/admin/reports", name: "admin-reports", component: AdminReportsPage, meta: { requiresAuth: true, requiresAdmin: true } },
    { path: "/admin/audit-logs", name: "admin-audit-logs", component: AdminAuditLogsPage, meta: { requiresAuth: true, requiresAdmin: true } }
  ]
});

router.beforeEach(async (to) => {
  if (!to.meta.requiresAuth) {
    if ((to.name === "login" || to.name === "register") && isAuthenticated()) {
      return "/";
    }
    return true;
  }

  if (!isAuthenticated()) {
    return { path: "/login", query: { redirect: to.fullPath } };
  }

  let user = getStoredUser();
  if (!user) {
    try {
      user = await getAuthMe();
    } catch {
      return { path: "/login", query: { redirect: to.fullPath } };
    }
  }

  if (to.meta.requiresAdmin && user.role !== "admin") {
    return "/";
  }

  return true;
});

export default router;
