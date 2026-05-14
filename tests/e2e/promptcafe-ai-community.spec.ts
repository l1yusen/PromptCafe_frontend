import { expect, test, type Page } from "@playwright/test";

const now = "2026-05-14T10:00:00.000Z";

const user = {
  id: "u-1",
  username: "tester",
  email: "tester@example.com",
  role: "user",
  status: "active",
  nickname: "测试用户",
  createdAt: now,
  updatedAt: now
};

const promptDetail = {
  id: "p-1",
  title: "客服回复助手",
  description: "用于生成稳定的客服回复",
  systemPrompt: "你是专业客服。",
  userPrompt: "请回复 {{question}}",
  variables: [{ name: "question", type: "text", description: "用户问题", required: true, value: "如何退款？" }],
  tags: ["客服", "回复"],
  visibility: "private",
  currentVersion: 3,
  createdAt: now,
  updatedAt: now
};

const communityPrompt = {
  id: "cp-1",
  promptId: "p-public",
  title: "社区翻译助手",
  description: "把中文内容翻译为英文",
  contentPreview: "翻译为自然英文",
  tags: ["翻译", "写作"],
  authorId: "u-2",
  authorName: "社区作者",
  authorAvatarUrl: null,
  favoriteCount: 8,
  favorited: false,
  viewCount: 20,
  publishedAt: now,
  systemPrompt: "你是翻译专家。",
  userPrompt: "翻译 {{text}}",
  variables: [{ name: "text", type: "textarea", label: "文本", required: true }],
  usageGuide: "输入要翻译的文本后运行。"
};

function ok(data: unknown) {
  return { code: 0, message: "success", data };
}

async function mockApi(page: Page) {
  await page.addInitScript((storedUser) => {
    sessionStorage.setItem("promptcafe_token", "test-token");
    sessionStorage.setItem("promptcafe_refresh_token", "refresh-token");
    sessionStorage.setItem("promptcafe_user", JSON.stringify(storedUser));
  }, user);

  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const path = url.pathname;
    const method = req.method();

    if (path === "/api/auth/me") return route.fulfill({ json: ok(user) });
    if (path === "/api/prompts" && method === "GET") {
      return route.fulfill({ json: ok({ items: [promptDetail], total: 1, page: 1, pageSize: 20 }) });
    }
    if (path === "/api/prompts/p-1" && method === "GET") return route.fulfill({ json: ok(promptDetail) });
    if (path === "/api/prompts/p-1/tags" && method === "PUT") return route.fulfill({ json: ok(promptDetail) });
    if (path === "/api/prompts/p-1" && method === "PUT") return route.fulfill({ json: ok(promptDetail) });
    if (path === "/api/ai/api-key/status") {
      return route.fulfill({
        json: ok({ configured: true, maskedKey: "sk-***test", provider: "openai", baseUrl: "", verified: true, updatedAt: now })
      });
    }
    if (path === "/api/ai/guest/quota") {
      return route.fulfill({ json: ok({ dailyLimit: 20, usedCount: 2, remainingCount: 18, resetAt: now, allowed: true }) });
    }
    if (path === "/api/ai/api-key" && method === "PUT") {
      return route.fulfill({
        json: ok({ configured: true, saved: true, maskedKey: "sk-***saved", provider: "openai", baseUrl: "", verified: true, updatedAt: now })
      });
    }
    if (path === "/api/ai/api-key" && method === "DELETE") {
      return route.fulfill({ json: ok({ deleted: true, deletedAt: now }) });
    }
    if (path === "/api/ai/models") {
      return route.fulfill({ json: ok({ items: [{ provider: "openai", models: ["gpt-4o-mini"] }] }) });
    }
    if (path === "/api/ai/polish" && method === "POST") {
      return route.fulfill({
        json: ok({ original: "请回复 {{question}}", optimized: "请用专业、清晰的语气回复 {{question}}", suggestions: ["明确语气", "保留变量"], latencyMs: 120 })
      });
    }
    if (path === "/api/ai/test" && method === "POST") {
      return route.fulfill({
        json: ok({ recordId: "r-1", promptId: "p-1", provider: "openai", model: "gpt-4o-mini", renderedPrompt: "请回复 如何退款？", output: "测试输出", latencyMs: 200, tokenUsage: { totalTokens: 42 }, createdAt: now })
      });
    }
    if (path === "/api/ai/test-records") {
      return route.fulfill({
        json: ok({ items: [{ id: "r-1", promptId: "p-1", provider: "openai", model: "gpt-4o-mini", inputSummary: "退款", outputSummary: "历史输出", latencyMs: 200, createdAt: now }], pagination: { page: 1, pageSize: 8, total: 1 } })
      });
    }
    if (path === "/api/ai/test-records/r-1") {
      return route.fulfill({
        json: ok({ id: "r-1", promptId: "p-1", provider: "openai", model: "gpt-4o-mini", inputVariables: { question: "如何退款？" }, renderedPrompt: "请回复 如何退款？", output: "历史输出详情", latencyMs: 200, tokenUsage: { totalTokens: 42 }, createdAt: now })
      });
    }
    if (path === "/api/community/shares" && method === "POST") {
      return route.fulfill({ json: ok({ shareId: "s-1", promptId: "p-1", title: "客服回复助手", reviewStatus: "pending", submittedAt: now }) });
    }
    if (path === "/api/community/prompts" && method === "GET") {
      return route.fulfill({ json: ok({ items: [communityPrompt], pagination: { page: 1, pageSize: 10, total: 1 } }) });
    }
    if (path === "/api/community/tags") {
      return route.fulfill({ json: ok({ items: [{ name: "翻译", promptCount: 1 }, { name: "写作", promptCount: 1 }] }) });
    }
    if (path === "/api/community/prompts/cp-1" && method === "GET") return route.fulfill({ json: ok(communityPrompt) });
    if (path === "/api/community/prompts/cp-1/favorite" && method === "POST") {
      return route.fulfill({ json: ok({ communityPromptId: "cp-1", favorited: true, favoriteCount: 9 }) });
    }
    if (path === "/api/community/prompts/cp-1/fork" && method === "POST") {
      return route.fulfill({ json: ok({ promptId: "p-fork", sourceCommunityPromptId: "cp-1", title: "社区翻译助手", createdAt: now }) });
    }
    if (path === "/api/community/prompts/cp-1/reports" && method === "POST") {
      return route.fulfill({ json: ok({ reportId: "rep-1", communityPromptId: "cp-1", status: "pending", submittedAt: now }) });
    }
    if (path === "/api/community/shares/my") {
      return route.fulfill({ json: ok({ items: [], pagination: { page: 1, pageSize: 10, total: 0 } }) });
    }

    return route.fulfill({ status: 404, json: { code: 404, message: `unmocked ${method} ${path}`, data: null } });
  });
}

test.beforeEach(async ({ page }) => {
  await mockApi(page);
});

test("AI 配置、润色、测试和社区分享流程可用", async ({ page }) => {
  await page.goto("/?prompt=p-1");
  await expect(page.getByRole("heading", { name: "客服回复助手" })).toBeVisible();

  await page.getByRole("button", { name: "AI 配置" }).click();
  await expect(page.getByText("游客额度：18 / 20")).toBeVisible();
  await page.locator('input[type="password"]').fill("sk-test");
  await page.getByRole("button", { name: "保存配置" }).click();
  await expect(page.getByText("AI 配置已保存")).toBeVisible();

  await page.getByRole("button", { name: "AI 润色" }).click();
  await page.getByRole("button", { name: "开始润色" }).click();
  await expect(page.getByText("请用专业、清晰的语气回复")).toBeVisible();
  await page.getByRole("button", { name: "应用到编辑区" }).click();
  await expect(page.getByRole("heading", { name: "编辑 Prompt" })).toBeVisible();
  await expect(page.locator("textarea").nth(1)).toHaveValue("请用专业、清晰的语气回复 {{question}}");

  await page.getByRole("button", { name: "AI 测试" }).click();
  await page.getByRole("button", { name: "运行测试" }).click();
  await expect(page.getByText("测试输出")).toBeVisible();
  await expect(page.getByText("历史输出")).toBeVisible();

  await page.getByRole("button", { name: "取消" }).click();
  await page.getByRole("button", { name: "分享到社区" }).click();
  await page.getByRole("button", { name: "提交审核" }).click();
  await expect(page.getByText("已提交社区审核")).toBeVisible();
});

test("社区浏览、收藏、Fork 和举报流程可用", async ({ page }) => {
  await page.goto("/community");
  await expect(page.getByRole("heading", { name: "社区翻译助手" })).toBeVisible();
  await page.locator(".community-card").first().click();

  await page.getByRole("button", { name: "收藏" }).click();
  await expect(page.getByRole("button", { name: "取消收藏" })).toBeVisible();

  await page.getByRole("button", { name: "Fork 到我的 Prompt" }).click();
  await expect(page.getByText("已 Fork：社区翻译助手，可返回我的 Prompt 查看")).toBeVisible();

  await page.getByRole("button", { name: "举报" }).click();
  await page.getByRole("button", { name: "提交举报" }).click();
  await expect(page.getByText("举报已提交")).toBeVisible();
});
