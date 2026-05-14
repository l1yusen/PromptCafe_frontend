import { expect, test, type Page } from "@playwright/test";

const promptSummary = {
  id: "p-001",
  title: "课程报告助手",
  description: "生成课程报告结构",
  tags: ["写作", "课程"],
  currentVersion: 2,
  visibility: "private",
  createdAt: "2026-05-01T10:00:00+08:00",
  updatedAt: "2026-05-02T10:00:00+08:00"
};

const promptDetail = {
  ...promptSummary,
  systemPrompt: "你是一名严谨的软件工程助教。",
  userPrompt: "请为{{topic}}生成实验报告大纲。",
  variables: [{ name: "topic", type: "text", description: "主题", required: true, value: "AI 前端测试" }]
};

const communityItem = {
  id: "c-001",
  promptId: "p-002",
  title: "前端代码评审清单",
  description: "面向 Vue 项目的代码评审 Prompt。",
  contentPreview: "请作为资深前端工程师进行评审...",
  tags: ["前端", "代码评审"],
  authorId: "u-001",
  authorName: "林小白",
  authorAvatarUrl: null,
  favoriteCount: 64,
  favorited: false,
  viewCount: 120,
  publishedAt: "2026-05-01T10:00:00+08:00"
};

async function mockPromptAndAi(page: Page) {
  await page.route("**/api/prompts?**", (route) =>
    route.fulfill({
      json: { code: 0, message: "success", data: { items: [promptSummary], total: 1, page: 1, pageSize: 20 } }
    })
  );
  await page.route("**/api/prompts/p-001", (route) => {
    if (route.request().method() === "GET") {
      return route.fulfill({ json: { code: 0, message: "success", data: promptDetail } });
    }
    return route.fulfill({ json: { code: 0, message: "success", data: promptDetail } });
  });
  await page.route("**/api/prompts/p-001/tags", (route) =>
    route.fulfill({ json: { code: 0, message: "success", data: promptDetail } })
  );
  await page.route("**/api/ai/api-key/status", (route) =>
    route.fulfill({
      json: {
        code: 0,
        message: "success",
        data: {
          configured: true,
          saved: true,
          maskedKey: "sk-****cdef",
          provider: "openai",
          baseUrl: "https://api.openai.com/v1",
          verified: true,
          updatedAt: "2026-05-01T10:00:00+08:00"
        }
      }
    })
  );
  await page.route("**/api/ai/guest/quota", (route) =>
    route.fulfill({
      json: {
        code: 0,
        message: "success",
        data: { dailyLimit: 5, usedCount: 1, remainingCount: 4, resetAt: "2026-05-15T00:00:00+08:00", allowed: true }
      }
    })
  );
  await page.route("**/api/ai/models", (route) =>
    route.fulfill({ json: { code: 0, message: "success", data: { items: [{ provider: "openai", models: ["gpt-4o-mini"] }] } } })
  );
  await page.route("**/api/ai/polish", async (route) => {
    expect(route.request().postDataJSON()).toMatchObject({ promptId: "p-001", content: promptDetail.userPrompt });
    await route.fulfill({
      json: {
        code: 0,
        message: "success",
        data: {
          original: promptDetail.userPrompt,
          optimized: "请围绕 AI 前端测试生成结构化实验报告大纲。",
          suggestions: ["明确角色", "补充输出结构"],
          latencyMs: 1200
        }
      }
    });
  });
  await page.route("**/api/ai/test", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.content).toContain("【系统提示词】");
    expect(body.content).toContain("【用户提示词】");
    await route.fulfill({
      json: {
        code: 0,
        message: "success",
        data: {
          recordId: "tr-001",
          promptId: "p-001",
          provider: "openai",
          model: "gpt-4o-mini",
          renderedPrompt: "请为 AI 前端测试生成实验报告大纲。",
          output: "一、背景；二、设计；三、测试。",
          latencyMs: 1500,
          tokenUsage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
          createdAt: "2026-05-01T11:00:00+08:00"
        }
      }
    });
  });
  await page.route("**/api/ai/test-records?**", (route) =>
    route.fulfill({
      json: {
        code: 0,
        message: "success",
        data: {
          items: [
            {
              id: "tr-001",
              promptId: "p-001",
              provider: "openai",
              model: "gpt-4o-mini",
              inputSummary: "topic=AI 前端测试",
              outputSummary: "生成三段大纲",
              latencyMs: 1500,
              createdAt: "2026-05-01T11:00:00+08:00"
            }
          ],
          pagination: { page: 1, pageSize: 5, total: 1 }
        }
      }
    })
  );
  await page.route("**/api/ai/test-records/tr-001", (route) =>
    route.fulfill({
      json: {
        code: 0,
        message: "success",
        data: {
          id: "tr-001",
          promptId: "p-001",
          provider: "openai",
          model: "gpt-4o-mini",
          inputVariables: { topic: "AI 前端测试" },
          renderedPrompt: "请为 AI 前端测试生成实验报告大纲。",
          output: "测试记录详情输出",
          latencyMs: 1500,
          tokenUsage: { totalTokens: 30 },
          createdAt: "2026-05-01T11:00:00+08:00"
        }
      }
    })
  );
  await page.route("**/api/community/shares", (route) =>
    route.fulfill({
      status: 201,
      json: {
        code: 0,
        message: "success",
        data: { shareId: "s-001", promptId: "p-001", title: "课程报告助手", reviewStatus: "pending", submittedAt: "2026-05-01T12:00:00+08:00" }
      }
    })
  );
}

async function mockCommunity(page: Page) {
  await page.route("**/api/community/prompts?**", (route) =>
    route.fulfill({
      json: { code: 0, message: "success", data: { items: [communityItem], pagination: { page: 1, pageSize: 10, total: 1 } } }
    })
  );
  await page.route("**/api/community/tags", (route) =>
    route.fulfill({ json: { code: 0, message: "success", data: { items: [{ name: "前端", promptCount: 1 }] } } })
  );
  await page.route("**/api/community/tags/%E5%89%8D%E7%AB%AF/prompts?**", (route) =>
    route.fulfill({
      json: { code: 0, message: "success", data: { items: [communityItem], pagination: { page: 1, pageSize: 10, total: 1 } } }
    })
  );
  await page.route("**/api/community/prompts/c-001", (route) =>
    route.fulfill({
      json: {
        code: 0,
        message: "success",
        data: {
          ...communityItem,
          systemPrompt: "你是一名资深前端工程师。",
          userPrompt: "请评审以下{{framework}}代码。",
          variables: [{ name: "framework", type: "text", label: "框架", required: true }],
          usageGuide: "填入框架和代码后运行。"
        }
      }
    })
  );
  await page.route("**/api/community/prompts/c-001/favorite", (route) =>
    route.fulfill({
      json: {
        code: 0,
        message: "success",
        data: { communityPromptId: "c-001", favorited: route.request().method() === "POST", favoriteCount: route.request().method() === "POST" ? 65 : 64 }
      }
    })
  );
  await page.route("**/api/community/prompts/c-001/fork", (route) =>
    route.fulfill({
      status: 201,
      json: { code: 0, message: "success", data: { promptId: "p-new", sourceCommunityPromptId: "c-001", title: "前端代码评审清单 - 副本", createdAt: "2026-05-01T12:00:00+08:00" } }
    })
  );
  await page.route("**/api/community/prompts/c-001/reports", (route) =>
    route.fulfill({
      status: 201,
      json: { code: 0, message: "success", data: { reportId: "r-001", communityPromptId: "c-001", status: "pending", submittedAt: "2026-05-01T12:00:00+08:00" } }
    })
  );
  await page.route("**/api/community/shares/my?**", (route) =>
    route.fulfill({
      json: {
        code: 0,
        message: "success",
        data: {
          items: [{ shareId: "s-001", promptId: "p-001", title: "课程报告助手", reviewStatus: "pending", submittedAt: "2026-05-01T12:00:00+08:00" }],
          pagination: { page: 1, pageSize: 20, total: 1 }
        }
      }
    })
  );
  await page.route("**/api/community/shares/s-001", (route) =>
    route.fulfill({ json: { code: 0, message: "success", data: { shareId: "s-001", withdrawn: true, withdrawnAt: "2026-05-01T13:00:00+08:00" } } })
  );
}

test("AI panels cover config, polish, test records, and community share", async ({ page }) => {
  await mockPromptAndAi(page);
  await page.goto("/");
  await page.getByText("课程报告助手").first().click();
  await expect(page.getByRole("heading", { name: "课程报告助手" })).toBeVisible();

  await page.getByRole("button", { name: "AI 配置" }).click();
  await expect(page.getByText("已配置 openai")).toBeVisible();
  await expect(page.getByText(/游客额度：4 \/ 5/)).toBeVisible();

  await page.getByRole("button", { name: "AI 测试" }).click();
  await expect(page.getByText("测试变量")).toBeVisible();
  await page.getByRole("button", { name: "运行测试" }).click();
  await expect(page.getByText("一、背景；二、设计；三、测试。")).toBeVisible();
  await page.getByRole("button", { name: "生成三段大纲" }).click();
  await expect(page.getByText("测试记录详情输出")).toBeVisible();

  await page.getByRole("button", { name: "AI 润色" }).click();
  await page.getByRole("button", { name: "开始润色" }).click();
  await expect(page.getByText("请围绕 AI 前端测试生成结构化实验报告大纲。")).toBeVisible();
  await page.getByRole("button", { name: "采用结果" }).click();
  await expect(page.getByText("已采用润色结果，请保存 Prompt")).toBeVisible();

  await page.getByRole("button", { name: "取消" }).click();
  await page.getByText("课程报告助手").first().click();
  await page.getByRole("button", { name: "分享到社区" }).click();
  await page.getByRole("button", { name: "提交审核" }).click();
  await expect(page.getByText("已提交社区审核")).toBeVisible();
});

test("community page covers list, tag search, favorite, report, fork, and my shares", async ({ page }) => {
  await mockCommunity(page);
  await page.goto("/community");
  await expect(page.getByRole("heading", { name: "前端代码评审清单" })).toBeVisible();

  await page.getByRole("button", { name: "前端 · 1" }).click();
  await page.getByText("前端代码评审清单").first().click();
  await expect(page.getByText("填入框架和代码后运行。")).toBeVisible();

  await page.getByRole("button", { name: "收藏" }).click();
  await expect(page.getByText("已收藏")).toBeVisible();
  await page.getByRole("button", { name: "举报" }).click();
  await page.getByRole("button", { name: "提交举报" }).click();
  await expect(page.getByText("举报已提交")).toBeVisible();
  await page.getByRole("button", { name: "Fork 到我的 Prompt" }).click();
  await expect(page.getByText(/已 Fork：前端代码评审清单 - 副本/)).toBeVisible();

  await page.getByRole("button", { name: "我的分享" }).click();
  await expect(page.getByText("课程报告助手")).toBeVisible();
  await page.getByRole("button", { name: "撤回" }).click();
  await expect(page.getByText("已撤回分享")).toBeVisible();
});
