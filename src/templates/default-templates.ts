import type { PromptTemplate } from "../types";

export const DEFAULT_TEMPLATES: PromptTemplate[] = [
  {
    id: "webpage-summary",
    name: "网页总结",
    category: "阅读",
    description: "总结当前网页或选中文本的核心内容",
    shortcut: "/summary",
    content:
      "请基于以下信息总结网页内容。\n\n页面标题：{{pageTitle}}\n页面链接：{{pageUrl}}\n日期：{{date}}\n\n选中内容：\n{{selection}}\n\n补充要求：\n{{input}}\n\n请输出：\n1. 一句话结论\n2. 核心要点\n3. 值得继续关注的问题"
  },
  {
    id: "extract-opinions",
    name: "提炼观点",
    category: "阅读",
    description: "从文本中提炼明确观点、依据和潜在反驳",
    shortcut: "/points",
    content:
      "请从以下内容中提炼观点。\n\n文本：\n{{selection}}\n\n我的关注点：{{input}}\n\n请按以下结构输出：\n- 主要观点\n- 支撑依据\n- 隐含假设\n- 可能的反对意见\n- 可复用表达"
  },
  {
    id: "xiaohongshu-rewrite",
    name: "小红书改写",
    category: "写作",
    description: "把素材改写成自然、有分享感的小红书风格文案",
    shortcut: "/xhs",
    content:
      "请把以下素材改写成小红书风格文案。\n\n素材：\n{{selection}}\n\n目标受众或语气要求：{{input}}\n\n请输出：\n1. 标题 5 个\n2. 正文一版，语气自然，不夸张\n3. 适合的标签 8 个\n\n日期参考：{{date}}"
  },
  {
    id: "weekly-report",
    name: "周报生成",
    category: "办公",
    description: "根据零散工作记录生成结构清晰的周报",
    shortcut: "/weekly",
    content:
      "请根据以下工作记录生成周报。\n\n记录：\n{{selection}}\n\n补充说明：{{input}}\n\n日期：{{date}}\n\n请按以下结构输出：\n- 本周完成\n- 关键进展\n- 风险与阻塞\n- 下周计划\n- 需要协同的事项"
  },
  {
    id: "email-polish",
    name: "邮件润色",
    category: "办公",
    description: "润色邮件内容，使表达清晰、礼貌、专业",
    shortcut: "/email",
    content:
      "请润色以下邮件内容。\n\n原文：\n{{selection}}\n\n收件人背景或沟通目标：{{input}}\n\n请输出：\n1. 润色后的邮件正文\n2. 更简洁的主题建议\n3. 如有语气风险，请指出并给出替代表达"
  },
  {
    id: "competitor-analysis",
    name: "竞品分析",
    category: "产品",
    description: "从页面或资料中整理竞品信息和产品启发",
    shortcut: "/competitor",
    content:
      "请基于以下资料做竞品分析。\n\n资料来源：{{pageTitle}}\n链接：{{pageUrl}}\n\n资料内容：\n{{selection}}\n\n分析目标：{{input}}\n\n请输出：\n- 竞品定位\n- 核心功能\n- 用户价值\n- 优势与短板\n- 对我们的启发\n- 后续验证问题"
  },
  {
    id: "requirement-breakdown",
    name: "需求拆解",
    category: "产品",
    description: "把需求描述拆解为目标、范围、流程和验收标准",
    shortcut: "/req",
    content:
      "请拆解以下需求。\n\n需求描述：\n{{selection}}\n\n补充背景：{{input}}\n\n请输出：\n1. 目标与非目标\n2. 用户场景\n3. 功能范围\n4. 关键流程\n5. 边界情况\n6. 验收标准\n7. 待确认问题"
  },
  {
    id: "feedback-root-cause",
    name: "用户反馈归因",
    category: "产品",
    description: "整理用户反馈，归因问题类型并提出处理建议",
    shortcut: "/feedback",
    content:
      "请分析以下用户反馈并做归因。\n\n反馈内容：\n{{selection}}\n\n产品或用户背景：{{input}}\n\n请输出：\n- 反馈摘要\n- 问题分类\n- 可能根因\n- 影响范围判断\n- 优先级建议\n- 可执行改进项\n- 需要继续追问的问题"
  },
  {
    id: "translate-and-explain",
    name: "翻译并解释",
    category: "学习",
    description: "翻译文本并解释关键概念、语气和上下文",
    shortcut: "/translate",
    content:
      "请翻译并解释以下内容。\n\n原文：\n{{selection}}\n\n目标语言或解释要求：{{input}}\n\n请输出：\n1. 自然流畅的翻译\n2. 关键词解释\n3. 原文语气和上下文说明\n4. 如果有歧义，请列出不同理解"
  },
  {
    id: "action-items",
    name: "生成行动项",
    category: "办公",
    description: "从会议记录或讨论文本中提取明确行动项",
    shortcut: "/todo",
    content:
      "请从以下内容中生成行动项。\n\n内容：\n{{selection}}\n\n补充说明：{{input}}\n\n日期：{{date}}\n\n请输出表格，包含：\n- 行动项\n- 负责人\n- 截止时间\n- 优先级\n- 依赖事项\n- 备注\n\n如果信息缺失，请用“待确认”标记。"
  }
];

export const defaultTemplates = DEFAULT_TEMPLATES;
