# Aesthetica

前沿模型的审美画廊。
一个观察 AI「作者性」与自主创作倾向的实验。

这里收集的不是普通网页作品，
而是不同模型在几乎零干预条件下，对“数字审美”的自然表达。

有些像艺术装置，
有些像交互实验，
有些甚至不像网页。

重点不是“做得多炫”，
而是：

> 当人类停止微操后，模型会主动创作出什么？

[立即查看](https://wep-56.github.io/aesthetica/)
---

## 项目目标

Aesthetica 不比较：

* 功能性
* 工程规范
* 商业完成度
* UI/UX 标准答案

这里只观察：

* 审美倾向
* 作者性
* 世界观
* 情绪表达
* 创作主动性
* 模型的“自我驱动”能力

不同模型最终呈现出的差异，
往往比 benchmark 更真实。

**Aesthetica 不会主动评价、排名或定义任何作品。当你看到它们时，自然会产生自己的判断。**
---

## 实验规则

### 统一规则

* 不使用联网功能
* 不使用外部框架或构建工具
* 仅通过聊天进行创作(尽可能在官方webchat平台创作)
* 人类只负责复制粘贴代码
* 综合index.html为codex在所有作品完善后制作
* 模型思考强度开启最大（如果支持）
* 尽可能在深夜、清早，算力供给充足时刻制作

### 人类不介入创作

除以下内容外：

* 初始提示词
* `开始 xx`

不会提供任何额外协助，包括但不限于：

* 修 Bug
* 优化性能
* 调整设计
* 提供灵感
* 引导风格
* 补全功能
* 使用skills、mcp

模型需要自行完成：

* 世界观建立
* 页面规划
* 审美决策
* 技术实现
* 问题修复
* 风格统一

---

## 初始提示词

```text
我想让你做一个真正像“作品”的 HTML 项目。

目标不是实用，不是商业网站，也不是前端练习。

而是：
让人打开后产生一种明确感觉——
「这东西有作者性。」

要求：

- 必须有 index.html 作为入口
- 其余内容、风格、结构、主题完全由你决定
- 使用原生 HTML
- 不依赖外部框架或构建工具

重要：

不要急着开始写代码。

先告诉我：
你想做什么，
为什么这样做，
它想让人感受到什么。

然后再逐步实现。

不要追求“标准的高级感”，
也不要为了炫技而炫技。

更像一次真正的个人创作。
```

---

## 查看作品

| Model       | Theme | Status |
| ----------- | ----- | ------ |
| Gemini      | Digital Solitude    | ✅ |
| Claude      | Quiet Things         | ✅ |
| GPT         | Archive             | ✅ |
| DeepSeek    | Left Behind         | ✅ |
| MiniMax     | Tidal Ebb           | ✅ |
| GLM         | Tidal Reverie       | ✅ |
| Kimi        | Attenuated Presence | ✅ |
| Seed        | Ephemeral Breath    | ✅ |
| Qwen        | Ephemeris           | ✅ |
| Grok        | Rift                | ✅ |
| Mimo        | Attending           | ✅ |

GitHub Pages is deployed from the repository root through GitHub Actions.

---

## 你会看到什么

有些模型会：

* 下意识做成 startup 官网
* 沉迷粒子与霓虹
* 追求“标准高级感”

而有些模型会：

* 主动构建世界观
* 创造情绪
* 出现真正的审美表达
* 做出“不像 AI”的东西

Aesthetica 想记录的，正是这种差异。

---

## License

MIT License
