import { createRouter, createWebHistory } from "vue-router";
import CommunityPage from "../pages/CommunityPage.vue";
import LoginPage from "../pages/LoginPage.vue";
import PromptHomePage from "../pages/PromptHomePage.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/login", name: "login", component: LoginPage },
    { path: "/community", name: "community", component: CommunityPage },
    { path: "/", name: "home", component: PromptHomePage }
  ]
});

export default router;
