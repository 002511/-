import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Bot,
  ChevronDown,
  CheckCircle2,
  CircleAlert,
  ClipboardCheck,
  Database,
  Download,
  Eye,
  FileText,
  FolderOpen,
  GitCompare,
  Home,
  Layers,
  ListChecks,
  Lock,
  MessageSquareText,
  PenLine,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  Sparkles,
  Target,
  Wand2,
  Trash2,
  Upload,
  XCircle
} from "lucide-react";
import "./styles.css";

type NavKey = "workbench" | "rewrite" | "continuation" | "memory" | "models" | "prompts" | "settings";
type WorkspaceStats = Record<string, number>;

type Project = {
  id: string;
  name: string;
  book_path: string;
  output_path: string;
  source_format: string;
  model_id: string | null;
  template_id?: string | null;
  prompt_strategy?: string | null;
  user_requirement?: string | null;
  current_stage: number;
  status: string;
  default_mode: string | null;
  concurrency: number;
  expand_word_count: number;
  created_at: string;
  updated_at: string;
  total_chapters: number | null;
  total_words: number | null;
  file_size: number | null;
  workspacePath: string;
  stats: WorkspaceStats;
  source?: string;
};

type Chapter = {
  id: string;
  project_id: string;
  chapter_index: number;
  title: string;
  original_href: string;
  word_count: number;
  rewritten_word_count?: number | null;
  summary?: string | null;
  needs_rewrite: number;
  has_summary: number;
  identify_status?: string | null;
  rewrite_status: string | null;
  merge_status: string | null;
  rewrite_reasons?: string | null;
  rewrite_error?: string | null;
  rewrite_ignored?: number | null;
};

type StageStat = {
  stage: number;
  status: string;
  count: number;
};

type ProjectDetail = {
  project: Project;
  chapters: Chapter[];
  stageStats: StageStat[];
};

type TxtPreviewChapter = {
  index: number;
  title: string;
  lineNumber?: number;
  wordCount: number;
  preview: string;
};

type TxtPreview = {
  totalChapters: number;
  totalWords: number;
  fileSize: number;
  longestChapter: number;
  shortestChapter: number;
  chapters: TxtPreviewChapter[];
};

type Continuation = {
  id: string;
  project_id: string;
  base_chapter_id: string;
  base_chapter_index: number;
  continuation_index: number;
  title: string;
  file_path: string;
  status: string;
  word_count: number;
  source_mode: string;
  version: number;
  exported: number;
  official_at?: string | null;
  review_report?: string | null;
  review_path?: string | null;
  created_at: string;
  updated_at: string;
};

type AiModel = {
  id: string;
  name: string;
  provider: string;
  base_url: string | null;
  model: string;
  temperature: number;
  max_tokens: number;
  timeout: number | null;
  created_at?: string;
  updated_at?: string;
  source?: string;
  is_default?: boolean;
};

type PromptTemplate = {
  id: string;
  name: string;
  summary_template: string | null;
  rewrite_template: string | null;
  breakthrough_template: string | null;
  identify_template: string | null;
  continuation_context_template: string | null;
  continuation_outline_template: string | null;
  continuation_generate_template: string | null;
  continuation_review_template: string | null;
  created_at: string;
  updated_at: string;
  source?: string;
};

type PromptTemplateOverrides = {
  breakthroughTemplate?: string;
  identifyTemplate?: string;
  rewriteTemplate?: string;
};

type WizardPromptTabKey = "breakthrough" | "identify" | "rewrite";
type ProjectConfigTabKey = "basic" | "model" | "prompt";

type ProjectUpdateInput = {
  name: string;
  modelId?: string | null;
  templateId?: string | null;
  promptStrategy?: string | null;
  userRequirement?: string | null;
  concurrency?: number;
  expandWordCount?: number;
};

type PromptTemplateImportPreview = {
  name: string;
  sceneCategoryCount: number;
  hasBreakthroughTemplate: boolean;
  hasIdentifyTemplate: boolean;
  hasRewriteTemplate: boolean;
  hasContinuationTemplates: boolean;
  rewriteHasCommonPrompt: boolean;
  rewriteHasCategoryPrompts: boolean;
  identifyHasCategories: boolean;
};

type PromptTemplateImportValidation = {
  preview: PromptTemplateImportPreview;
  warnings: string[];
  duplicate: { id: string; name: string; created_at?: string; updated_at?: string } | null;
};

type PromptImportDuplicateMode = "" | "overwrite" | "rename";

type MemorySnapshot = {
  id: string;
  chapterId: string;
  chapterNumber: number;
  sourceMode: string;
  summary: string;
  characters: string[];
  characterStateChanges: string[];
  knowledgeChanges: string[];
  foreshadowingChanges: string[];
  newCanonFacts: string[];
  timelineEvents: string[];
  endingHook: string;
  createdAt: string;
  updatedAt: string;
};

type MemoryAggregate = {
  recentSummaries: string[];
  previousEndingHook: string;
  characterStates: string[];
  characterCognition: string[];
  foreshadowing: string[];
  timeline: string[];
  canonFacts: string[];
  conflicts: string[];
};

type MemoryOverview = {
  snapshotCount: number;
  latestSnapshot: MemorySnapshot | null;
  snapshots: MemorySnapshot[];
  aggregate: MemoryAggregate;
  latestContextPack?: {
    id: string;
    content: string;
    created_at: string;
  } | null;
};

type AppSettings = {
  originalDb: {
    dbPath: string;
    source: "config" | "env" | "default";
    configPath: string;
    exists: boolean;
    fallbackOriginalDbPath: string;
    readonly: boolean;
  };
  sidecarDb: {
    dbPath: string;
    exists: boolean;
  };
  config: {
    configPath: string;
    exists: boolean;
    raw: {
      originalDbPath: string;
    };
  };
};

type AppData = {
  projects: Project[];
  detail: ProjectDetail | null;
  selectedProjectId: string | null;
  query: string;
  models: AiModel[];
  templates: PromptTemplate[];
  continuations: Continuation[];
  selectedChapterId: string | null;
  chapterContent: string;
  memoryOverview: MemoryOverview | null;
  continuationTitle: string;
  continuationContent: string;
  rewriteContent: string;
  rewriteOutputPath: string;
  sourceMode: string;
  selectedModelId: string;
  selectedTemplateId: string;
  userRequirement: string;
  targetWordCount: number;
  targetChapters: number;
  contextResult: string;
  outlineResult: string;
  memoryContextResult: string;
  reviewResult: string;
  aiBusy: string | null;
  actionMessage: string | null;
  error: string | null;
  loading: boolean;
};

type AppActions = {
  loadAll: () => Promise<void>;
  selectProject: (projectId: string) => Promise<void>;
  updateProject: (projectId: string, input: ProjectUpdateInput) => Promise<void>;
  deleteProject: (projectId: string) => Promise<void>;
  setQuery: (value: string) => void;
  setSelectedChapterId: (value: string | null) => void;
  setContinuationTitle: (value: string) => void;
  setContinuationContent: (value: string) => void;
  setRewriteContent: (value: string) => void;
  setSourceMode: (value: string) => void;
  setSelectedModelId: (value: string) => void;
  setSelectedTemplateId: (value: string) => void;
  setUserRequirement: (value: string) => void;
  setTargetWordCount: (value: number) => void;
  setTargetChapters: (value: number) => void;
  selectContinuationChapter: (chapterId: string) => Promise<void>;
  loadMemoryOverview: () => Promise<void>;
  ingestRecentMemory: (limit: number) => Promise<void>;
  previewTxtProject: (input: { content: string }) => Promise<TxtPreview>;
  importTxtProject: (input: {
    name: string;
    content: string;
    modelId: string;
    templateId: string;
    promptStrategy: string;
    userRequirement: string;
    concurrency: number;
    expandWordCount: number;
    templateOverrides?: PromptTemplateOverrides | null;
  }) => Promise<Project | null>;
  selectRewriteChapter: (chapterId: string) => Promise<void>;
  generateRewriteByAi: () => Promise<void>;
  generateRewriteChapter: (chapterId: string) => Promise<{ content: string; outputPath: string; aiInputPath: string; wordCount: number } | null>;
  runRewriteStage: (stage: number, input?: Record<string, unknown>) => Promise<void>;
  keepChapterOriginal: (chapterId: string) => Promise<void>;
  saveContinuation: () => Promise<void>;
  confirmContinuation: (continuationId: string) => Promise<void>;
  reviewContinuationDraft: () => Promise<void>;
  reviewSavedContinuation: (continuation: Continuation) => Promise<void>;
  exportWithContinuations: () => Promise<void>;
  analyzeContext: () => Promise<void>;
  generateOutline: () => Promise<void>;
  ingestChapterMemory: () => Promise<void>;
  buildMemoryContextPack: () => Promise<void>;
  generateContinuationByAi: () => Promise<void>;
};

const navItems: Array<{ key: NavKey; label: string; icon: React.ReactNode; desc: string }> = [
  { key: "workbench", label: "我的项目", icon: <Home size={18} />, desc: "小说选择与导入" },
  { key: "rewrite", label: "AI改写", icon: <PenLine size={18} />, desc: "阶段式改写工作台" },
  { key: "continuation", label: "AI续写", icon: <Sparkles size={18} />, desc: "上下文、大纲与续写章节" },
  { key: "memory", label: "记忆中心", icon: <Database size={18} />, desc: "人物、伏笔、时间线与上下文包" },
  { key: "models", label: "模型管理", icon: <Bot size={18} />, desc: "模型配置与连接信息" },
  { key: "prompts", label: "提示词管理", icon: <MessageSquareText size={18} />, desc: "改写与续写提示词" },
  { key: "settings", label: "设置", icon: <Settings size={18} />, desc: "桌面安装与运行策略" }
];

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return new Intl.NumberFormat("zh-CN").format(value);
}

function formatWanWords(value: number | null | undefined) {
  if (value === null || value === undefined) return "-";
  return `${new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value / 10000)} 万字`;
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function stageLabel(stage: number) {
  const labels: Record<number, string> = {
    1: "书籍拆分",
    2: "内容总结",
    3: "识别待处理",
    4: "AI改写",
    5: "合并输出"
  };
  return labels[stage] ?? `阶段 ${stage}`;
}

function statusLabel(status: string | null) {
  if (!status) return "未记录";
  const labels: Record<string, string> = {
    created: "已创建",
    pending: "待处理",
    running: "运行中",
    completed: "完成",
    failed: "失败",
    cancelled: "已取消",
    saved: "草稿",
    official: "正式"
  };
  return labels[status] ?? status;
}

function getStatusClass(status: string | null) {
  if (status === "completed" || status === "saved" || status === "official") return "status status-completed";
  if (status === "running") return "status status-running";
  if (status === "failed") return "status status-failed";
  return "status";
}

function sourceLabel(source: string | null | undefined) {
  return source === "sidecar" ? "自建项目" : "原 FleshOut";
}

function countByStatus(stats: StageStat[], stage: number, status: string) {
  return stats.find((item) => item.stage === stage && item.status === status)?.count ?? 0;
}

function getStageTotal(stats: StageStat[], stage: number, fallback: number) {
  const total = stats.filter((item) => item.stage === stage).reduce((sum, item) => sum + Number(item.count || 0), 0);
  return total || fallback;
}

function getStageSummary(stats: StageStat[], stage: number, fallback: number) {
  const total = getStageTotal(stats, stage, fallback);
  const completed = countByStatus(stats, stage, "completed");
  const failed = countByStatus(stats, stage, "failed");
  const running = countByStatus(stats, stage, "running");
  const pending = Math.max(0, total - completed - failed - running);
  return { total, completed, failed, running, pending, complete: total > 0 && completed >= total };
}

function isStageComplete(stats: StageStat[], stage: number, fallback: number) {
  return getStageSummary(stats, stage, fallback).complete;
}

function canAccessStage(stats: StageStat[], stage: number, fallback: number) {
  if (stage <= 1) return true;
  for (let previous = 1; previous < stage; previous += 1) {
    if (!isStageComplete(stats, previous, fallback)) return false;
  }
  return true;
}

function getMaxAccessibleStage(stats: StageStat[], fallback: number) {
  for (let stage = 1; stage <= 5; stage += 1) {
    if (!canAccessStage(stats, stage, fallback)) return Math.max(1, stage - 1);
  }
  return 5;
}

function stageStartLabel(stage: number) {
  const labels: Record<number, string> = {
    1: "开始拆分",
    2: "开始总结",
    3: "开始识别",
    4: "开始改写本章",
    5: "开始合并"
  };
  return labels[stage] ?? "开始";
}

function stageDescription(stage: number) {
  const descriptions: Record<number, string> = {
    1: "先把小说按章节拆分，生成工作区 chapters/ 文件。",
    2: "对每章正文生成摘要，为后续识别提供上下文。",
    3: "按提示词模板中的场景和规则识别可改写章节。",
    4: "选择单章后执行 AI 改写，可重新改写、看原文、看对比。",
    5: "把已改写章节合并输出，续写内容仍独立保存。"
  };
  return descriptions[stage] ?? "";
}

function inferSceneType(chapter: Chapter) {
  const source = `${chapter.title} ${chapter.rewrite_reasons || ""}`;
  if (/战|斗|杀|血|破|袭|敌|擂|剑|刀/.test(source)) return "冲突战斗";
  if (/情|心|吻|婚|爱|泪|抱|温柔/.test(source)) return "情感关系";
  if (/修炼|功法|境界|突破|灵力|丹|法则/.test(source)) return "修炼设定";
  if (/谋|局|查|疑|案|真相|计划/.test(source)) return "剧情推进";
  if (/景|城|山|院|楼|夜|雨|风/.test(source)) return "环境铺陈";
  return chapter.needs_rewrite ? "常规改写" : "保留原文";
}

function getRewriteReason(chapter: Chapter) {
  if (chapter.rewrite_reasons?.trim()) return chapter.rewrite_reasons;
  if (!chapter.needs_rewrite) return "章节已标记为保留原文。";
  if (chapter.identify_status === "completed") return "识别阶段判定需要扩写、净化或增强细节。";
  return "等待识别阶段给出原因。";
}

function getWordDelta(original: number | null | undefined, rewritten: string) {
  const next = rewritten ? rewritten.replace(/\s+/g, "").length : 0;
  const base = Number(original || 0);
  const delta = next ? next - base : 0;
  const percent = base && next ? Math.round((delta / base) * 100) : 0;
  return { next, delta, percent };
}

function countTextWords(text: string) {
  return text.replace(/\s+/g, "").length;
}

function chapterRewrittenWordCount(chapter: Chapter, selectedChapterId: string | null, rewriteContent: string) {
  if (chapter.id === selectedChapterId && rewriteContent.trim()) return countTextWords(rewriteContent);
  return Number(chapter.rewritten_word_count || 0);
}

function isChapterWordShort(chapter: Chapter, targetWordCount: number, selectedChapterId: string | null, rewriteContent: string) {
  if (!targetWordCount || chapter.rewrite_status !== "completed") return false;
  const rewrittenCount = chapterRewrittenWordCount(chapter, selectedChapterId, rewriteContent);
  return Boolean(rewrittenCount && rewrittenCount < targetWordCount * 0.85);
}

function formatChapterWords(value: number | null | undefined) {
  const numberValue = Number(value || 0);
  if (!numberValue) return "-";
  if (numberValue >= 1000) {
    return `${new Intl.NumberFormat("zh-CN", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1
    }).format(numberValue / 1000)}k字`;
  }
  return `${formatNumber(numberValue)}字`;
}

function formatChapterHeading(chapter: Chapter) {
  const title = String(chapter.title || "").trim();
  return /^第\s*[0-9零一二三四五六七八九十百千万两〇]+章/.test(title) ? title : `第${chapter.chapter_index}章 ${title}`;
}

type ChapterSummaryItem = {
  name: string;
  detail: string;
};

type ChapterSummaryDetail = {
  overview: string;
  characters: ChapterSummaryItem[];
  events: ChapterSummaryItem[];
};

type ChapterSceneRule = {
  name: string;
  detail: string;
  source: string;
};

function tryParseLooseJson(text: string) {
  const normalized = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  if (!normalized) return null;
  const candidate = normalized.startsWith("{") || normalized.startsWith("[")
    ? normalized
    : normalized.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)?.[0];
  if (!candidate) return null;
  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function textFromValue(value: unknown) {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map(textFromValue).filter(Boolean).join("；");
  if (isRecord(value)) return Object.values(value).map(textFromValue).filter(Boolean).join("；");
  return "";
}

function firstTextField(record: Record<string, unknown>, fields: string[]) {
  for (const field of fields) {
    const value = textFromValue(record[field]);
    if (value) return value;
  }
  return "";
}

function namedItemsFromValue(value: unknown, fallbackPrefix: string): ChapterSummaryItem[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value
      .map((item, index) => {
        if (isRecord(item)) {
          const name = firstTextField(item, ["name", "title", "person", "character", "event", "人物", "姓名", "事件", "标题"]) || `${fallbackPrefix}${index + 1}`;
          const detail =
            firstTextField(item, ["detail", "description", "summary", "state", "content", "change", "描写", "状态", "概要", "摘要", "内容", "变化"]) ||
            textFromValue(
              Object.fromEntries(
                Object.entries(item).filter(([key]) => !["name", "title", "person", "character", "event", "人物", "姓名", "事件", "标题"].includes(key))
              )
            );
          return { name, detail };
        }
        const text = textFromValue(item);
        const [name, ...rest] = text.split(/[：:]/);
        return { name: rest.length ? name.trim() : `${fallbackPrefix}${index + 1}`, detail: rest.length ? rest.join("：").trim() : text };
      })
      .filter((item) => item.name || item.detail);
  }
  if (isRecord(value)) {
    return Object.entries(value)
      .map(([name, detail]) => ({ name, detail: textFromValue(detail) }))
      .filter((item) => item.name || item.detail);
  }
  return textFromValue(value)
    .split(/\n+|[；;]/)
    .map((item, index) => {
      const [name, ...rest] = item.split(/[：:]/);
      return { name: rest.length ? name.trim() : `${fallbackPrefix}${index + 1}`, detail: rest.length ? rest.join("：").trim() : item.trim() };
    })
    .filter((item) => item.detail);
}

function parseSummaryItemsFromText(text: string, fallbackPrefix: string) {
  return text
    .split(/\n+|[；;]/)
    .map((line) => line.replace(/^\s*[-*•\d.、]+/, "").trim())
    .filter(Boolean)
    .map((line, index) => {
      const [name, ...rest] = line.split(/[：:]/);
      return { name: rest.length ? name.trim() : `${fallbackPrefix}${index + 1}`, detail: rest.length ? rest.join("：").trim() : line };
    });
}

function parseSectionedSummaryText(raw: string): ChapterSummaryDetail {
  const sections: Record<"overview" | "characters" | "events", string[]> = {
    overview: [],
    characters: [],
    events: []
  };
  let current: keyof typeof sections = "overview";
  for (const line of raw.split(/\r?\n/)) {
    const normalized = line.replace(/^#+\s*/, "").replace(/[：:]\s*$/, "").trim();
    if (!normalized) continue;
    if (/^(情节概要|剧情概要|章节摘要|概要|摘要)$/.test(normalized)) {
      current = "overview";
      continue;
    }
    if (/^(登场人物|人物|角色|主要人物)$/.test(normalized)) {
      current = "characters";
      continue;
    }
    if (/^(关键事件|事件|重要事件|剧情事件)$/.test(normalized)) {
      current = "events";
      continue;
    }
    const inlineHeading = normalized.match(/^(情节概要|剧情概要|章节摘要|概要|摘要|登场人物|人物|角色|主要人物|关键事件|事件|重要事件|剧情事件)[：:]\s*(.+)$/);
    if (inlineHeading) {
      const heading = inlineHeading[1];
      const content = inlineHeading[2];
      if (/人物|角色/.test(heading)) {
        sections.characters.push(content);
      } else if (/事件/.test(heading)) {
        sections.events.push(content);
      } else {
        sections.overview.push(content);
      }
      continue;
    }
    sections[current].push(normalized);
  }

  const overview = sections.overview.join("\n").trim() || raw;
  return {
    overview,
    characters: parseSummaryItemsFromText(sections.characters.join("\n"), "人物"),
    events: parseSummaryItemsFromText(sections.events.join("\n"), "事件")
  };
}

function parseChapterSummary(summary: string | null | undefined): ChapterSummaryDetail {
  const raw = String(summary || "").trim();
  if (!raw) {
    return { overview: "当前章节暂无总结内容。", characters: [], events: [] };
  }
  const parsed = tryParseLooseJson(raw);
  if (!isRecord(parsed)) {
    return parseSectionedSummaryText(raw);
  }
  const overview =
    firstTextField(parsed, ["summary", "overview", "plot", "plotSummary", "story", "情节概要", "章节摘要", "剧情", "概要", "摘要", "content"]) ||
    compactPromptText(JSON.stringify(parsed), 800);
  return {
    overview,
    characters: namedItemsFromValue(parsed.characters ?? parsed.people ?? parsed.roles ?? parsed["登场人物"] ?? parsed["人物"], "人物"),
    events: namedItemsFromValue(parsed.events ?? parsed.keyEvents ?? parsed.key_events ?? parsed.timelineEvents ?? parsed.timeline_events ?? parsed["关键事件"] ?? parsed["事件"], "事件")
  };
}

function getChapterReasonTypes(chapter: Chapter) {
  const lines = String(chapter.rewrite_reasons || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const types = lines
    .map((line) => line.split(/[：:]/)[0]?.trim())
    .filter(Boolean);
  if (!types.length && chapter.needs_rewrite && chapter.identify_status === "completed") {
    types.push(inferSceneType(chapter));
  }
  return Array.from(new Set(types));
}

function chapterHasRewriteMark(chapter: Chapter) {
  return Boolean(chapter.needs_rewrite && (chapter.identify_status === "completed" || chapter.rewrite_reasons?.trim()));
}

function textMatchesRule(text: string, ruleName: string, ruleId = "") {
  const normalizedText = text.toLowerCase();
  const candidates = [ruleName, ruleId].map((item) => item.toLowerCase().trim()).filter(Boolean);
  return candidates.some((candidate) => normalizedText.includes(candidate) || candidate.includes(normalizedText));
}

function getChapterSceneRules(
  chapter: Chapter,
  identifyCategories: IdentifyCategory[],
  rewritePromptSummary: ReturnType<typeof getRewritePromptSummary>
): ChapterSceneRule[] {
  const reasonText = `${chapter.rewrite_reasons || ""} ${inferSceneType(chapter)}`.trim();
  const reasonTypes = getChapterReasonTypes(chapter);
  const rules: ChapterSceneRule[] = [];

  for (const category of identifyCategories) {
    const matched = reasonTypes.some((type) => textMatchesRule(type, category.name, category.id)) || (reasonText && textMatchesRule(reasonText, category.name, category.id));
    if (matched) {
      rules.push({
        name: category.name,
        detail: compactPromptText(category.conditions || category.prompt || "模板中未填写场景条件。", 280),
        source: "场景识别"
      });
    }
  }

  for (const categoryPrompt of rewritePromptSummary.categoryPrompts) {
    const already = rules.find((rule) => textMatchesRule(rule.name, categoryPrompt.name, categoryPrompt.id));
    const matched = reasonTypes.some((type) => textMatchesRule(type, categoryPrompt.name, categoryPrompt.id)) || (reasonText && textMatchesRule(reasonText, categoryPrompt.name, categoryPrompt.id));
    if (already && matched && categoryPrompt.prompt) {
      already.detail = compactPromptText(`${already.detail}\n\n${categoryPrompt.prompt}`, 420);
      already.source = `${already.source} / 改写规则`;
    } else if (!already && matched) {
      rules.push({
        name: categoryPrompt.name,
        detail: compactPromptText(categoryPrompt.prompt || "模板中未填写改写规则。", 280),
        source: "改写规则"
      });
    }
  }

  if (!rules.length && chapter.rewrite_reasons?.trim()) {
    rules.push({
      name: getChapterReasonTypes(chapter)[0] || "识别依据",
      detail: compactPromptText(chapter.rewrite_reasons, 320),
      source: "识别结果"
    });
  }

  return rules;
}

type DiffPart = {
  text: string;
  type: "same" | "removed" | "added";
};

function splitDiffUnits(text: string) {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];
  const paragraphs = normalized.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  if (paragraphs.length > 1) return paragraphs;
  return normalized.match(/[^。！？!?；;]+[。！？!?；;]?/g)?.map((item) => item.trim()).filter(Boolean) ?? [normalized];
}

function buildDiffParts(original: string, rewritten: string) {
  const left = splitDiffUnits(original);
  const right = splitDiffUnits(rewritten);
  const dp = Array.from({ length: left.length + 1 }, () => Array(right.length + 1).fill(0));
  for (let i = left.length - 1; i >= 0; i -= 1) {
    for (let j = right.length - 1; j >= 0; j -= 1) {
      dp[i][j] = left[i] === right[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const originalParts: DiffPart[] = [];
  const rewrittenParts: DiffPart[] = [];
  let i = 0;
  let j = 0;
  while (i < left.length || j < right.length) {
    if (i < left.length && j < right.length && left[i] === right[j]) {
      originalParts.push({ text: left[i], type: "same" });
      rewrittenParts.push({ text: right[j], type: "same" });
      i += 1;
      j += 1;
    } else if (j < right.length && (i === left.length || dp[i][j + 1] >= dp[i + 1][j])) {
      rewrittenParts.push({ text: right[j], type: "added" });
      j += 1;
    } else if (i < left.length) {
      originalParts.push({ text: left[i], type: "removed" });
      i += 1;
    }
  }
  return { originalParts, rewrittenParts };
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || body.error || `请求失败：${response.status}`);
  }
  return response.json();
}

async function postJson<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || body.error || `请求失败：${response.status}`);
  }
  return response.json();
}

async function putJson<T>(url: string, payload: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || body.error || `请求失败：${response.status}`);
  }
  return response.json();
}

async function deleteJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { method: "DELETE" });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || body.error || `请求失败：${response.status}`);
  }
  return response.json();
}

const emptyModelForm = {
  name: "",
  provider: "custom",
  apiKey: "",
  baseUrl: "",
  model: "",
  temperature: 0.7,
  maxTokens: 128000,
  timeout: 300
};

function App() {
  const [activeNav, setActiveNav] = useState<NavKey>("workbench");
  const [state, setState] = useState<AppData>({
    projects: [],
    detail: null,
    selectedProjectId: null,
    query: "",
    models: [],
    templates: [],
    continuations: [],
    selectedChapterId: null,
    chapterContent: "",
    memoryOverview: null,
    continuationTitle: "",
    continuationContent: "",
    rewriteContent: "",
    rewriteOutputPath: "",
    sourceMode: "original",
    selectedModelId: "",
    selectedTemplateId: "",
    userRequirement: "",
    targetWordCount: 4000,
  targetChapters: 1,
  contextResult: "",
  outlineResult: "",
  memoryContextResult: "",
  reviewResult: "",
  aiBusy: null,
    actionMessage: null,
    error: null,
    loading: true
  });

  function patch(next: Partial<AppData>) {
    setState((current) => ({ ...current, ...next }));
  }

  async function loadModels() {
    const data = await fetchJson<{ models: AiModel[] }>("/api/models");
    const preferredModel = data.models.find((model) => model.is_default) || data.models[0];
    setState((current) => ({
      ...current,
      models: data.models,
      selectedModelId:
        current.selectedModelId && data.models.some((model) => model.id === current.selectedModelId)
          ? current.selectedModelId
          : preferredModel?.id || ""
    }));
  }

  async function loadTemplates() {
    const data = await fetchJson<{ templates: PromptTemplate[] }>("/api/prompt-templates");
    setState((current) => ({
      ...current,
      templates: data.templates,
      selectedTemplateId:
        current.selectedTemplateId && data.templates.some((template) => template.id === current.selectedTemplateId)
          ? current.selectedTemplateId
          : data.templates[0]?.id || ""
    }));
  }

  async function loadContinuations(projectId: string) {
    const data = await fetchJson<{ continuations: Continuation[] }>(
      `/api/projects/${encodeURIComponent(projectId)}/continuations`
    );
    patch({ continuations: data.continuations });
  }

  async function loadMemoryOverviewForProject(projectId: string, sourceMode = state.sourceMode) {
    const data = await fetchJson<MemoryOverview>(
      `/api/projects/${encodeURIComponent(projectId)}/memory/overview?sourceMode=${encodeURIComponent(sourceMode)}`
    );
    patch({ memoryOverview: data });
  }

  async function refreshDetail(projectId: string) {
    const detail = await fetchJson<ProjectDetail>(`/api/projects/${encodeURIComponent(projectId)}`);
    patch({ detail });
    await loadContinuations(projectId);
    await loadMemoryOverviewForProject(projectId);
  }

  async function loadAll() {
    patch({ loading: true, error: null });
    try {
      const data = await fetchJson<{ projects: Project[] }>("/api/projects");
      const selectedProjectId = state.selectedProjectId || data.projects[0]?.id || null;
      let detail: ProjectDetail | null = null;
      if (selectedProjectId) {
        detail = await fetchJson<ProjectDetail>(`/api/projects/${encodeURIComponent(selectedProjectId)}`);
      }
      patch({ projects: data.projects, selectedProjectId, detail, loading: false });
      if (selectedProjectId) await loadContinuations(selectedProjectId);
      if (selectedProjectId) await loadMemoryOverviewForProject(selectedProjectId);
      await Promise.all([loadModels(), loadTemplates()]);
    } catch (error) {
      patch({ error: error instanceof Error ? error.message : String(error), loading: false });
    }
  }

  async function selectProject(projectId: string) {
    patch({ selectedProjectId: projectId, error: null, actionMessage: null });
    try {
      await refreshDetail(projectId);
    } catch (error) {
      patch({ error: error instanceof Error ? error.message : String(error) });
    }
  }

  async function updateProject(projectId: string, input: ProjectUpdateInput) {
    patch({ error: null, actionMessage: null, aiBusy: `project-update-${projectId}` });
    try {
      const result = await putJson<{ project: Project }>(`/api/projects/${encodeURIComponent(projectId)}`, input);
      patch({ actionMessage: `项目已更新：${result.project.name}` });
      await loadAll();
      await selectProject(projectId);
    } catch (error) {
      patch({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      patch({ aiBusy: null });
    }
  }

  async function deleteProject(projectId: string) {
    patch({ error: null, actionMessage: null, aiBusy: `project-delete-${projectId}` });
    try {
      await deleteJson(`/api/projects/${encodeURIComponent(projectId)}`);
      patch({
        actionMessage: "自建项目已删除。",
        selectedProjectId: state.selectedProjectId === projectId ? null : state.selectedProjectId,
        selectedChapterId: null,
        chapterContent: "",
        continuationContent: "",
        rewriteContent: "",
        rewriteOutputPath: ""
      });
      await loadAll();
    } catch (error) {
      patch({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      patch({ aiBusy: null });
    }
  }

  async function selectContinuationChapter(chapterId: string) {
    if (!state.detail) return;
    const chapter = state.detail.chapters.find((item) => item.id === chapterId);
    patch({
      selectedChapterId: chapterId,
      continuationTitle: chapter ? `第${chapter.chapter_index + 1}章 续写` : "续写章节"
    });
    const data = await fetchJson<{ content: string }>(
      `/api/chapters/${encodeURIComponent(chapterId)}/content?source=${encodeURIComponent(state.sourceMode)}`
    );
    patch({ chapterContent: data.content });
  }

  async function selectRewriteChapter(chapterId: string) {
    if (!state.detail) return;
    patch({
      selectedChapterId: chapterId,
      rewriteContent: "",
      rewriteOutputPath: "",
      actionMessage: null,
      error: null
    });
    const data = await fetchJson<{ content: string }>(
      `/api/chapters/${encodeURIComponent(chapterId)}/content?source=${encodeURIComponent(state.sourceMode)}`
    );
    patch({ chapterContent: data.content });
  }

  async function loadMemoryOverview() {
    if (!state.detail) return;
    patch({ error: null, actionMessage: null, aiBusy: "memory-load" });
    try {
      await loadMemoryOverviewForProject(state.detail.project.id);
    } catch (error) {
      patch({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      patch({ aiBusy: null });
    }
  }

  async function ingestRecentMemory(limit: number) {
    if (!state.detail || !state.selectedModelId) return;
    patch({ error: null, actionMessage: null, aiBusy: "memory-recent" });
    try {
      const result = await postJson<{ total: number; completed: number; failed: number }>(
        `/api/projects/${encodeURIComponent(state.detail.project.id)}/memory/ingest-recent`,
        {
          modelId: state.selectedModelId,
          sourceMode: state.sourceMode,
          limit
        }
      );
      patch({ actionMessage: `最近 ${result.total} 章记忆提取完成：成功 ${result.completed}，失败 ${result.failed}。` });
      await loadMemoryOverviewForProject(state.detail.project.id);
      await refreshDetail(state.detail.project.id);
    } catch (error) {
      patch({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      patch({ aiBusy: null });
    }
  }

  async function previewTxtProject(input: { content: string }) {
    return postJson<TxtPreview>("/api/projects/preview-txt", input);
  }

  async function importTxtProject(input: {
    name: string;
    content: string;
    modelId: string;
    templateId: string;
    promptStrategy: string;
    userRequirement: string;
    concurrency: number;
    expandWordCount: number;
    templateOverrides?: PromptTemplateOverrides | null;
  }) {
    patch({ error: null, actionMessage: null, aiBusy: "import-txt" });
    try {
      const result = await postJson<{ project: Project }>("/api/projects/import-txt", {
        name: input.name,
        content: input.content,
        modelId: input.modelId || state.selectedModelId || null,
        templateId: input.templateId || state.selectedTemplateId || null,
        promptStrategy: input.promptStrategy,
        userRequirement: input.userRequirement,
        concurrency: input.concurrency,
        expandWordCount: input.expandWordCount || state.targetWordCount,
        templateOverrides: input.templateOverrides || null
      });
      patch({
        actionMessage: `项目已创建：${result.project.name}`,
        selectedProjectId: result.project.id,
        selectedChapterId: null,
        chapterContent: "",
        continuationContent: ""
      });
      await loadAll();
      await selectProject(result.project.id);
      return result.project;
    } catch (error) {
      patch({ error: error instanceof Error ? error.message : String(error) });
      return null;
    } finally {
      patch({ aiBusy: null });
    }
  }

  async function runRewriteStage(stage: number, input: Record<string, unknown> = {}) {
    if (!state.detail) return;
    patch({ error: null, actionMessage: null, aiBusy: `stage-${stage}` });
    try {
      const result = await postJson<{ result: { completed: number; failed: number; exportPath?: string } }>(
        `/api/projects/${encodeURIComponent(state.detail.project.id)}/stages/${stage}/run`,
        {
          modelId: state.selectedModelId,
          templateId: state.selectedTemplateId,
          userRequirement: state.userRequirement,
          targetWordCount: state.targetWordCount,
          confirmAiCall: [2, 3, 4].includes(stage) ? true : undefined,
          ...input
        }
      );
      patch({
        actionMessage: `${stageLabel(stage)}执行完成：成功 ${result.result.completed}，失败 ${result.result.failed}${result.result.exportPath ? `，输出：${result.result.exportPath}` : ""}`
      });
      await refreshDetail(state.detail.project.id);
    } catch (error) {
      patch({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      patch({ aiBusy: null });
    }
  }

  async function keepChapterOriginal(chapterId: string) {
    if (!state.detail) return;
    patch({ error: null, actionMessage: null, aiBusy: `keep-${chapterId}` });
    try {
      await postJson(`/api/projects/${encodeURIComponent(state.detail.project.id)}/chapters/${encodeURIComponent(chapterId)}/keep-original`, {});
      patch({ actionMessage: "该章节已标记为保留原文。" });
      await refreshDetail(state.detail.project.id);
    } catch (error) {
      patch({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      patch({ aiBusy: null });
    }
  }

  async function generateRewriteChapter(chapterId: string) {
    if (!state.detail || !state.selectedModelId || !chapterId) return null;
    patch({ error: null, actionMessage: null, aiBusy: "rewrite", rewriteOutputPath: "" });
    try {
      const result = await postJson<{ content: string; outputPath: string; aiInputPath: string; wordCount: number }>(
        `/api/projects/${encodeURIComponent(state.detail.project.id)}/rewrite-chapter`,
        {
          modelId: state.selectedModelId,
          templateId: state.selectedTemplateId,
          chapterId,
          sourceMode: state.sourceMode,
          userRequirement: state.userRequirement,
          targetWordCount: state.targetWordCount,
          confirmAiCall: true
        }
      );
      patch({
        rewriteContent: result.content,
        rewriteOutputPath: result.outputPath,
        actionMessage: `AI改写已完成：${result.outputPath}；调试输入：${result.aiInputPath}`
      });
      await refreshDetail(state.detail.project.id);
      return result;
    } catch (error) {
      patch({ error: error instanceof Error ? error.message : String(error) });
      return null;
    } finally {
      patch({ aiBusy: null });
    }
  }

  async function generateRewriteByAi() {
    if (!state.selectedChapterId) return;
    await generateRewriteChapter(state.selectedChapterId);
  }

  async function saveContinuation() {
    if (!state.detail || !state.selectedChapterId) return;
    patch({ error: null, actionMessage: null });
    try {
      await postJson(`/api/projects/${encodeURIComponent(state.detail.project.id)}/continuations`, {
        baseChapterId: state.selectedChapterId,
        title: state.continuationTitle,
        content: state.continuationContent,
        sourceMode: state.sourceMode
      });
      patch({
        continuationContent: "",
        actionMessage: "续写已保存到 continuations/，记录已写入原型 sidecar 数据库。"
      });
      await refreshDetail(state.detail.project.id);
    } catch (error) {
      patch({ error: error instanceof Error ? error.message : String(error) });
    }
  }

  async function confirmContinuation(continuationId: string) {
    if (!state.detail || !state.selectedModelId) return;
    patch({ error: null, actionMessage: null, aiBusy: `confirm-${continuationId}` });
    try {
      const result = await postJson<{ snapshot?: { summary: string }; markdownPath?: string }>(
        `/api/projects/${encodeURIComponent(state.detail.project.id)}/continuations/${encodeURIComponent(continuationId)}/confirm`,
        { modelId: state.selectedModelId }
      );
      patch({
        actionMessage: `续写已确认为正式章节，并写入记忆中心${result.markdownPath ? `：${result.markdownPath}` : "。"}`
      });
      await refreshDetail(state.detail.project.id);
    } catch (error) {
      patch({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      patch({ aiBusy: null });
    }
  }

  async function reviewContinuationDraft() {
    if (!state.detail || !state.selectedModelId || !state.continuationContent.trim()) return;
    patch({ error: null, actionMessage: null, aiBusy: "review" });
    try {
      const result = await postJson<{ report: string; reviewPath: string }>(
        `/api/projects/${encodeURIComponent(state.detail.project.id)}/continuation-review`,
        {
          modelId: state.selectedModelId,
          baseChapterId: state.selectedChapterId,
          title: state.continuationTitle || "未命名续写",
          content: state.continuationContent,
          userRequirement: state.userRequirement,
          sourceMode: state.sourceMode
        }
      );
      patch({
        reviewResult: result.report,
        actionMessage: `续写审查已完成：${result.reviewPath}`
      });
    } catch (error) {
      patch({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      patch({ aiBusy: null });
    }
  }

  async function reviewSavedContinuation(continuation: Continuation) {
    if (!state.detail || !state.selectedModelId) return;
    patch({ error: null, actionMessage: null, aiBusy: `review-${continuation.id}` });
    try {
      const result = await postJson<{ report: string; reviewPath: string }>(
        `/api/projects/${encodeURIComponent(state.detail.project.id)}/continuation-review`,
        {
          modelId: state.selectedModelId,
          continuationId: continuation.id,
          baseChapterId: continuation.base_chapter_id,
          title: continuation.title,
          userRequirement: state.userRequirement,
          sourceMode: continuation.source_mode
        }
      );
      patch({
        reviewResult: result.report,
        actionMessage: `已保存续写审查完成：${result.reviewPath}`
      });
      await refreshDetail(state.detail.project.id);
    } catch (error) {
      patch({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      patch({ aiBusy: null });
    }
  }

  async function exportWithContinuations() {
    if (!state.detail) return;
    patch({ error: null, actionMessage: null });
    try {
      const result = await postJson<{ exportPath: string }>(`/api/projects/${encodeURIComponent(state.detail.project.id)}/export`, {
        continuationIds: state.continuations.map((item) => item.id),
        sourceMode: state.sourceMode
      });
      patch({ actionMessage: `已导出：${result.exportPath}` });
      await refreshDetail(state.detail.project.id);
    } catch (error) {
      patch({ error: error instanceof Error ? error.message : String(error) });
    }
  }

  async function analyzeContext() {
    if (!state.detail || !state.selectedModelId) return;
    patch({ error: null, actionMessage: null, aiBusy: "context" });
    try {
      const result = await postJson<{ content: string; contextPath: string }>(
        `/api/projects/${encodeURIComponent(state.detail.project.id)}/continuation-context`,
        { modelId: state.selectedModelId, userRequirement: state.userRequirement }
      );
      patch({ contextResult: result.content, actionMessage: `全书上下文已保存：${result.contextPath}` });
      await refreshDetail(state.detail.project.id);
    } catch (error) {
      patch({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      patch({ aiBusy: null });
    }
  }

  async function generateOutline() {
    if (!state.detail || !state.selectedModelId) return;
    patch({ error: null, actionMessage: null, aiBusy: "outline" });
    try {
      const result = await postJson<{ content: string; outlinePath: string }>(
        `/api/projects/${encodeURIComponent(state.detail.project.id)}/continuation-outline`,
        {
          modelId: state.selectedModelId,
          userRequirement: state.userRequirement,
          targetChapters: state.targetChapters
        }
      );
      patch({ outlineResult: result.content, actionMessage: `续写大纲已保存：${result.outlinePath}` });
      await refreshDetail(state.detail.project.id);
    } catch (error) {
      patch({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      patch({ aiBusy: null });
    }
  }

  async function ingestChapterMemory() {
    if (!state.detail || !state.selectedModelId || !state.selectedChapterId) return;
    patch({ error: null, actionMessage: null, aiBusy: "memory-ingest" });
    try {
      const result = await postJson<{ snapshot: { summary: string }; jsonPath: string; markdownPath: string }>(
        `/api/projects/${encodeURIComponent(state.detail.project.id)}/memory/ingest-chapter`,
        {
          modelId: state.selectedModelId,
          chapterId: state.selectedChapterId,
          sourceMode: state.sourceMode
        }
      );
      patch({
        actionMessage: `本章记忆已提取：${result.markdownPath}`,
        memoryContextResult: result.snapshot?.summary ? `本章摘要：${result.snapshot.summary}` : state.memoryContextResult
      });
      await refreshDetail(state.detail.project.id);
    } catch (error) {
      patch({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      patch({ aiBusy: null });
    }
  }

  async function buildMemoryContextPack() {
    if (!state.detail || !state.selectedChapterId) return;
    patch({ error: null, actionMessage: null, aiBusy: "memory-pack" });
    try {
      const result = await postJson<{ content: string; contextPackPath: string; snapshotCount: number }>(
        `/api/projects/${encodeURIComponent(state.detail.project.id)}/memory/context-pack`,
        {
          baseChapterId: state.selectedChapterId,
          userRequirement: state.userRequirement,
          sourceMode: state.sourceMode,
          targetWordCount: state.targetWordCount,
          contextBudgetChars: 24000
        }
      );
      patch({
        memoryContextResult: result.content,
        actionMessage: `记忆上下文包已生成：${result.contextPackPath}（已使用 ${result.snapshotCount} 个快照）`
      });
      await refreshDetail(state.detail.project.id);
    } catch (error) {
      patch({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      patch({ aiBusy: null });
    }
  }

  async function generateContinuationByAi() {
    if (!state.detail || !state.selectedModelId || !state.selectedChapterId) return;
    patch({ error: null, actionMessage: null, aiBusy: "generate" });
    try {
      const result = await postJson<{ content: string; aiInputPath: string; contextPackPath?: string; snapshotCount?: number }>(
        `/api/projects/${encodeURIComponent(state.detail.project.id)}/continuation-generate`,
        {
          modelId: state.selectedModelId,
          baseChapterId: state.selectedChapterId,
          userRequirement: state.userRequirement,
          sourceMode: state.sourceMode,
          targetWordCount: state.targetWordCount
        }
      );
      patch({
        continuationContent: result.content,
        actionMessage: `AI续写已生成，调试输入已保存：${result.aiInputPath}${result.contextPackPath ? `；记忆包：${result.contextPackPath}` : ""}`
      });
      await refreshDetail(state.detail.project.id);
    } catch (error) {
      patch({ error: error instanceof Error ? error.message : String(error) });
    } finally {
      patch({ aiBusy: null });
    }
  }

  useEffect(() => {
    void loadAll();
  }, []);

  useEffect(() => {
    if (state.selectedChapterId) {
      void selectContinuationChapter(state.selectedChapterId);
    }
  }, [state.sourceMode]);

  const actions: AppActions = {
    loadAll,
    selectProject,
    updateProject,
    deleteProject,
    setQuery: (query) => patch({ query }),
    setSelectedChapterId: (selectedChapterId) => patch({ selectedChapterId }),
    setContinuationTitle: (continuationTitle) => patch({ continuationTitle }),
    setContinuationContent: (continuationContent) => patch({ continuationContent }),
    setRewriteContent: (rewriteContent) => patch({ rewriteContent }),
    setSourceMode: (sourceMode) => patch({ sourceMode }),
    setSelectedModelId: (selectedModelId) => patch({ selectedModelId }),
    setSelectedTemplateId: (selectedTemplateId) => patch({ selectedTemplateId }),
    setUserRequirement: (userRequirement) => patch({ userRequirement }),
    setTargetWordCount: (targetWordCount) => patch({ targetWordCount }),
    setTargetChapters: (targetChapters) => patch({ targetChapters }),
    selectContinuationChapter,
    selectRewriteChapter,
    loadMemoryOverview,
    ingestRecentMemory,
    previewTxtProject,
    importTxtProject,
    generateRewriteByAi,
    generateRewriteChapter,
    runRewriteStage,
    keepChapterOriginal,
    saveContinuation,
    confirmContinuation,
    reviewContinuationDraft,
    reviewSavedContinuation,
    exportWithContinuations,
    analyzeContext,
    generateOutline,
    ingestChapterMemory,
    buildMemoryContextPack,
    generateContinuationByAi
  };

  return (
    <main className={activeNav === "rewrite" ? "app-shell app-shell-compact-nav" : "app-shell"}>
      <aside className="sidebar nav-sidebar">
        <div className="brand">
          <div className="brand-icon">
            <BookOpen size={22} />
          </div>
          <div>
            <h1>小说AI工作台</h1>
            <p>FleshOut Compatible</p>
          </div>
        </div>

        <nav className="main-nav">
          {navItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={activeNav === item.key ? "nav-item active" : "nav-item"}
              title={item.label}
              aria-label={item.label}
              onClick={() => setActiveNav(item.key)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button className="refresh-button" type="button" title="刷新数据" aria-label="刷新数据" onClick={() => void loadAll()}>
          <RefreshCw size={16} />
          刷新数据
        </button>
      </aside>

      <section className="workspace">
        {state.error ? (
          <div className="notice error">
            <CircleAlert size={18} />
            {state.error}
          </div>
        ) : null}

        {state.loading ? (
          <div className="empty-state">正在读取 FleshOut 数据库...</div>
        ) : (
          <>
            {activeNav === "workbench" ? (
              <WorkbenchPage
                state={state}
                actions={actions}
                goRewrite={() => setActiveNav("rewrite")}
                goContinuation={() => setActiveNav("continuation")}
              />
            ) : null}
            {activeNav === "rewrite" ? <RewritePage state={state} actions={actions} /> : null}
            {activeNav === "continuation" ? <ContinuationPage state={state} actions={actions} /> : null}
            {activeNav === "memory" ? <MemoryPage state={state} actions={actions} /> : null}
            {activeNav === "models" ? <ModelsPage state={state} reload={loadAll} /> : null}
            {activeNav === "prompts" ? <PromptsPage state={state} reload={loadAll} /> : null}
            {activeNav === "settings" ? <SettingsPage /> : null}
          </>
        )}
      </section>
    </main>
  );
}

function WorkbenchPage({
  state,
  actions,
  goRewrite,
  goContinuation
}: {
  state: AppData;
  actions: AppActions;
  goRewrite: () => void;
  goContinuation: () => void;
}) {
  const [projectQuery, setProjectQuery] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const detail = state.detail;

  const filteredProjects = useMemo(() => {
    const keyword = projectQuery.trim().toLowerCase();
    const projects = [...state.projects].sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
    if (!keyword) return projects;
    return projects.filter((project) => {
      return (
        project.name.toLowerCase().includes(keyword) ||
        project.book_path.toLowerCase().includes(keyword) ||
        project.output_path.toLowerCase().includes(keyword)
      );
    });
  }, [projectQuery, state.projects]);

  const selectedProject = detail?.project ?? state.projects.find((project) => project.id === state.selectedProjectId) ?? null;
  const selectedIsSidecar = selectedProject?.source === "sidecar";
  const projectCompletion = selectedProject?.total_chapters
    ? Math.round(
        (countByStatus(detail?.stageStats ?? [], selectedProject.current_stage, "completed") /
          Math.max(getStageTotal(detail?.stageStats ?? [], selectedProject.current_stage, selectedProject.total_chapters ?? 0), 1)) *
          100
      )
    : 0;

  function openEdit(project: Project) {
    setEditingProject(project);
  }

  async function deleteSelectedProject(project: Project) {
    if (project.source !== "sidecar") return;
    const confirmed = window.confirm(`确认删除自建项目“${project.name}”？此操作只会删除 sidecar 项目和 data/user-projects 下的文件。`);
    if (!confirmed) return;
    await actions.deleteProject(project.id);
  }

  return (
    <>
      <PageHeader
        eyebrow="工作台"
        title="项目入口"
        desc={`${state.projects.length} 个项目 · 快速定位与管理`}
        action={
          <button className="primary-action workbench-new-button" type="button" onClick={() => setImportOpen(true)}>
            <Plus size={16} />
            新建工程
          </button>
        }
      />

      {state.actionMessage ? <div className="notice success compact-notice">{state.actionMessage}</div> : null}

      <section className="workbench-layout">
        <div className="workbench-projects">
          <div className="workbench-toolbar">
            <label className="search-box project-search">
              <Search size={16} />
              <input value={projectQuery} onChange={(event) => setProjectQuery(event.target.value)} placeholder="搜索项目名称、路径或源文件" />
            </label>
          </div>

          <div className="project-list-panel">
            {filteredProjects.map((project) => (
              <button
                key={project.id}
                type="button"
                className={project.id === state.selectedProjectId ? "project-list-card active" : "project-list-card"}
                onClick={() => void actions.selectProject(project.id)}
              >
                <span className="project-cover-mini">{project.source === "sidecar" ? "TXT" : "FO"}</span>
                <span className="project-list-main">
                  <strong>{project.name}</strong>
                  <small>
                    <span className={getStatusClass(project.status)}>{statusLabel(project.status)}</span>
                    <span>{sourceLabel(project.source)}</span>
                  </small>
                </span>
                <span className="project-list-date">{project.updated_at ? String(project.updated_at).slice(0, 10) : ""}</span>
              </button>
            ))}
            {!filteredProjects.length ? <div className="empty-inline">没有匹配的项目。</div> : null}
          </div>
        </div>

        <aside className="project-detail-panel project-spotlight">
          {selectedProject ? (
            <>
              <div className="project-hero">
                <div className="project-cover-large">
                  <BookOpen size={34} />
                  <span>{selectedProject.source_format?.toUpperCase() || "TXT"}</span>
                </div>
                <div className="project-hero-main">
                  <div className="project-status-row">
                    <span className={getStatusClass(selectedProject.status)}>{statusLabel(selectedProject.status)}</span>
                    <span className="source-pill">{sourceLabel(selectedProject.source)}</span>
                  </div>
                  <h3>{selectedProject.name}</h3>
                  <p>{selectedProject.book_path || "暂无描述信息..."}</p>
                  <div className="project-hero-metrics">
                    <div>
                      <span>章节</span>
                      <strong>{formatNumber(selectedProject.total_chapters)}</strong>
                    </div>
                    <div>
                      <span>字数</span>
                      <strong>{formatNumber(selectedProject.total_words)}</strong>
                    </div>
                    <div>
                      <span>阶段</span>
                      <strong>{stageLabel(selectedProject.current_stage)}</strong>
                    </div>
                    <div>
                      <span>完成度</span>
                      <strong>{projectCompletion}%</strong>
                    </div>
                  </div>
                  <div className="workbench-actions">
                    <button className="primary-action" type="button" onClick={goRewrite}>
                      <ArrowRight size={16} />
                      进入工作台
                    </button>
                    <button className="secondary-action" type="button" onClick={() => selectedProject && openEdit(selectedProject)}>
                      <Pencil size={16} />
                      编辑
                    </button>
                    {selectedIsSidecar ? (
                      <button
                        className="danger-action"
                        type="button"
                        onClick={() => selectedProject && void deleteSelectedProject(selectedProject)}
                        disabled={Boolean(state.aiBusy)}
                      >
                        <Trash2 size={16} />
                        删除
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="kv-grid detail-kv">
                <Info label="章节数" value={formatNumber(selectedProject.total_chapters)} />
                <Info label="总字数" value={formatNumber(selectedProject.total_words)} />
                <Info label="当前阶段" value={stageLabel(selectedProject.current_stage)} />
                <Info label="目标扩写字数" value={formatNumber(selectedProject.expand_word_count)} />
              </div>

              <div className="detail-paths">
                <label className="field">
                  <span>源文件</span>
                  <input value={selectedProject.book_path} readOnly />
                </label>
                <label className="field">
                  <span>工作区</span>
                  <input value={selectedProject.workspacePath} readOnly />
                </label>
              </div>

              {detail ? (
                <div className="mini-stage-grid">
                  {[1, 2, 3, 4, 5].map((stage) => (
                    <div className="mini-stage" key={stage}>
                      <span>{stageLabel(stage)}</span>
                      <strong>{countByStatus(detail.stageStats, stage, "completed")} / {getStageTotal(detail.stageStats, stage, detail.chapters.length)}</strong>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="workbench-secondary-actions">
                <button className="secondary-action" type="button" onClick={goContinuation}>
                  <Sparkles size={16} />
                  进入 AI续写
                </button>
                <span className="muted-line">双击左侧项目可直接切换，筛选和排序会自动保持选择。</span>
              </div>
            </>
          ) : (
            <div className="empty-state">请选择一个项目。</div>
          )}
        </aside>
      </section>

      {importOpen ? <ImportTxtModal state={state} actions={actions} onClose={() => setImportOpen(false)} /> : null}

      {editingProject ? (
        <ProjectConfigModal
          project={editingProject}
          models={state.models}
          templates={state.templates}
          busy={Boolean(state.aiBusy)}
          onClose={() => setEditingProject(null)}
          onSave={async (input) => {
            await actions.updateProject(editingProject.id, input);
            setEditingProject(null);
          }}
        />
      ) : null}
    </>
  );
}

function projectModeLabel(mode: string | null | undefined) {
  const labels: Record<string, string> = {
    auto: "自动模式",
    semi_auto: "半自动模式",
    manual: "手动模式"
  };
  return labels[String(mode || "auto")] || "自动模式";
}

function ProjectConfigModal({
  project,
  models,
  templates,
  busy,
  onClose,
  onSave
}: {
  project: Project;
  models: AiModel[];
  templates: PromptTemplate[];
  busy: boolean;
  onClose: () => void;
  onSave: (input: ProjectUpdateInput) => Promise<void>;
}) {
  const [activeTab, setActiveTab] = useState<ProjectConfigTabKey>("basic");
  const [promptTab, setPromptTab] = useState<WizardPromptTabKey>("breakthrough");
  const [name, setName] = useState(project.name);
  const [modelId, setModelId] = useState(project.model_id || models.find((model) => model.is_default)?.id || models[0]?.id || "");
  const [templateId, setTemplateId] = useState(project.template_id || templates[0]?.id || "");
  const [promptStrategy, setPromptStrategy] = useState(project.prompt_strategy || "rewrite-standard");
  const [userRequirement, setUserRequirement] = useState(project.user_requirement || "");
  const [concurrency, setConcurrency] = useState(project.concurrency || 3);
  const [expandWordCount, setExpandWordCount] = useState(project.expand_word_count || 4000);

  const selectedModel = models.find((model) => model.id === modelId);
  const selectedTemplate = templates.find((template) => template.id === templateId);
  const identifyCategories = useMemo(() => getIdentifyCategories(selectedTemplate?.identify_template), [selectedTemplate?.identify_template]);
  const identifyParseState = useMemo(() => parsePromptJson(selectedTemplate?.identify_template), [selectedTemplate?.identify_template]);
  const rewriteSummary = useMemo(() => getRewritePromptSummary(selectedTemplate?.rewrite_template), [selectedTemplate?.rewrite_template]);
  const promptTabs: Array<{ key: WizardPromptTabKey; label: string; icon: React.ReactNode; count?: number }> = [
    { key: "breakthrough", label: "系统破甲", icon: <Lock size={14} /> },
    { key: "identify", label: "场景识别", icon: <Target size={14} />, count: identifyCategories.length || undefined },
    { key: "rewrite", label: "改写规则", icon: <PenLine size={14} />, count: rewriteSummary.categoryPrompts.length || undefined }
  ];
  const canSave = Boolean(name.trim()) && !busy;
  const canPersistFullConfig = project.source === "sidecar";

  function updateConcurrency(value: number) {
    setConcurrency(clampNumber(value, 1, 30));
  }

  function updateExpandWordCount(value: number) {
    setExpandWordCount(clampNumber(value, 1000, 20000));
  }

  async function saveConfig() {
    await onSave({
      name,
      modelId,
      templateId,
      promptStrategy,
      userRequirement,
      concurrency,
      expandWordCount
    });
  }

  return (
    <Modal title="项目配置" onClose={onClose} size="wide">
      <div className="project-config-shell">
        <header className="project-config-head">
          <div>
            <h3>项目配置</h3>
            <p>编辑项目设置 · {project.name}</p>
          </div>
          <span className="source-pill">{sourceLabel(project.source)}</span>
        </header>

        <div className="project-config-layout">
          <aside className="project-config-nav" aria-label="项目配置导航">
            {[
              { key: "basic" as const, label: "基础设置", desc: "名称、模式、并发", icon: <Settings size={17} /> },
              { key: "model" as const, label: "AI 模型", desc: "选择模型与参数", icon: <Bot size={17} /> },
              { key: "prompt" as const, label: "提示词策略", desc: "识别 / 破甲 / 改写", icon: <FileText size={17} /> }
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                className={activeTab === item.key ? "project-config-nav-item active" : "project-config-nav-item"}
                onClick={() => setActiveTab(item.key)}
              >
                <span>{item.icon}</span>
                <strong>{item.label}</strong>
                <small>{item.desc}</small>
              </button>
            ))}
          </aside>

          <section className="project-config-content">
            {activeTab === "basic" ? (
              <div className="project-config-pane">
                <label className="field">
                  <span>项目名称</span>
                  <input value={name} onChange={(event) => setName(event.target.value)} />
                </label>

                <div className="config-section-head">
                  <strong>处理模式</strong>
                  <small>项目创建完成后不可更改</small>
                </div>
                <div className="processing-mode-grid">
                  <button className={project.default_mode === "auto" || !project.default_mode ? "processing-mode-card active" : "processing-mode-card disabled"} type="button" disabled>
                    <span><PenLine size={18} /></span>
                    <strong>自动模式</strong>
                    <small>自动化批量处理，适合整本书改写</small>
                  </button>
                  <button className={project.default_mode === "semi_auto" ? "processing-mode-card active" : "processing-mode-card disabled"} type="button" disabled>
                    <span><Sparkles size={18} /></span>
                    <strong>半自动模式</strong>
                    <small>用户标注 + 自动改写，平衡控制与效率</small>
                  </button>
                  <button className={project.default_mode === "manual" ? "processing-mode-card active" : "processing-mode-card disabled"} type="button" disabled>
                    <span><Settings size={18} /></span>
                    <strong>手动模式</strong>
                    <small>AI 对话式精细改写，适合单章精修</small>
                  </button>
                </div>

                <div className="range-setting">
                  <div className="setting-label-row">
                    <strong>并发处理数</strong>
                    <em>{formatNumber(concurrency)}</em>
                  </div>
                  <input type="range" min={1} max={30} step={1} value={concurrency} onChange={(event) => updateConcurrency(Number(event.target.value))} />
                  <div className="range-scale"><span>1</span><span>30</span></div>
                  <small>数值越高速度越快，但可能触发 API 速率限制；建议按模型套餐与限额调整。</small>
                </div>

                <label className="field word-target-field">
                  <span>加料字数</span>
                  <div className="input-with-unit">
                    <input
                      type="number"
                      value={expandWordCount}
                      min={1000}
                      max={20000}
                      step={500}
                      onChange={(event) => updateExpandWordCount(Number(event.target.value))}
                    />
                    <em>字</em>
                  </div>
                  <small>每个识别到的场景扩写目标字数，范围：1000-20000。</small>
                </label>
              </div>
            ) : null}

            {activeTab === "model" ? (
              <div className="project-config-pane">
                <label className="field">
                  <span>选择 AI 模型</span>
                  <select value={modelId} onChange={(event) => setModelId(event.target.value)}>
                    {models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="project-config-model-card">
                  <span className="source-pill">{selectedModel?.source === "sidecar" ? "custom" : templateSourceLabel(selectedModel?.source)}</span>
                  <h3>{selectedModel?.name || "未选择模型"}</h3>
                  <code>{selectedModel?.model || "-"}</code>
                  <div className="model-stat-row">
                    <Info label="Temperature" value={formatNumber(selectedModel?.temperature)} />
                    <Info label="Max Tokens" value={formatNumber(selectedModel?.max_tokens)} />
                    <Info label="Timeout" value={`${formatNumber(selectedModel?.timeout)}s`} />
                  </div>
                </div>
              </div>
            ) : null}

            {activeTab === "prompt" ? (
              <div className="project-config-pane project-config-prompt">
                <div className="prompt-strategy-head">
                  <div>
                    <h3>提示词策略</h3>
                    <p>{selectedTemplate ? selectedTemplate.name : "未选择模板"}</p>
                  </div>
                  <select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
                    {templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="prompt-tabbar mini" role="tablist" aria-label="项目提示词策略分区">
                  {promptTabs.map((tab) => (
                    <button
                      key={tab.key}
                      className={promptTab === tab.key ? "prompt-tab active" : "prompt-tab"}
                      type="button"
                      onClick={() => setPromptTab(tab.key)}
                      role="tab"
                      aria-selected={promptTab === tab.key}
                    >
                      {tab.icon}
                      {tab.label}
                      {tab.count ? <em>{tab.count}</em> : null}
                    </button>
                  ))}
                </div>

                {promptTab === "breakthrough" ? (
                  <div className="project-config-prompt-body">
                    <div className="notice warning compact-notice">此配置将全局注入到 AI 上下文中，修改请谨慎。</div>
                    <pre className="prompt-readable-box project-config-prompt-text">{selectedTemplate?.breakthrough_template || "当前模板未填写系统破甲。"}</pre>
                  </div>
                ) : null}

                {promptTab === "identify" ? (
                  <div className="project-config-prompt-body">
                    <div className="prompt-section-head compact">
                      <div>
                        <h4>剧情场景规则</h4>
                        <p>{identifyCategories.length ? "点击场景行可展开查看识别字段。" : "当前模板未解析出 categories 数组。"}</p>
                      </div>
                      <span className="prompt-count-pill">{identifyCategories.length} 条</span>
                    </div>
                    {identifyCategories.length ? (
                      <div className="prompt-rule-list">
                        {identifyCategories.map((category, index) => (
                          <details className="prompt-rule-row" key={`${category.id}-${index}`}>
                            <summary>
                              <span className="prompt-rule-index">#{String(index + 1).padStart(2, "0")}</span>
                              <strong>{category.name}</strong>
                              <code>{category.id}</code>
                              <ChevronDown size={15} />
                            </summary>
                            <div className="prompt-rule-body">
                              {category.conditions ? (
                                <div>
                                  <span>识别条件</span>
                                  <p>{category.conditions}</p>
                                </div>
                              ) : null}
                              {category.prompt ? (
                                <div>
                                  <span>提示词</span>
                                  <p>{category.prompt}</p>
                                </div>
                              ) : null}
                            </div>
                          </details>
                        ))}
                      </div>
                    ) : identifyParseState.failed ? (
                      <div className="notice warning compact-notice">场景识别内容看起来是 JSON，但当前无法解析。</div>
                    ) : (
                      <pre className="prompt-readable-box project-config-prompt-text">{selectedTemplate?.identify_template || "当前模板未填写场景识别。"}</pre>
                    )}
                  </div>
                ) : null}

                {promptTab === "rewrite" ? (
                  <div className="project-config-prompt-body">
                    <div className="prompt-rule-grid">
                      <div className="prompt-rule-panel">
                        <div className="prompt-section-head compact">
                          <div>
                            <h4>通用指导</h4>
                            <p>适用于所有场景的统一改写规则。</p>
                          </div>
                        </div>
                        <div className="prompt-readable-box">
                          {rewriteSummary.commonPrompt ? compactPromptText(rewriteSummary.commonPrompt, 1200) : compactPromptText(selectedTemplate?.rewrite_template || "", 1200) || "暂无通用指导"}
                        </div>
                      </div>
                      <div className="prompt-rule-panel">
                        <div className="prompt-section-head compact">
                          <div>
                            <h4>场景特定</h4>
                            <p>按场景补充的改写规则。</p>
                          </div>
                          <span className="prompt-count-pill">{rewriteSummary.categoryPrompts.length} 条</span>
                        </div>
                        {rewriteSummary.categoryPrompts.length ? (
                          <div className="prompt-category-list">
                            {rewriteSummary.categoryPrompts.map((rule, index) => (
                              <details className="prompt-category-rule" key={`${rule.id}-${index}`}>
                                <summary>
                                  <strong>{rule.name}</strong>
                                  <code>{rule.id}</code>
                                  <ChevronDown size={15} />
                                </summary>
                                <p>{rule.prompt}</p>
                              </details>
                            ))}
                          </div>
                        ) : (
                          <div className="prompt-empty-small">{rewriteSummary.parseFailed ? "改写规则 JSON 无法解析。" : "未发现 categoryPrompts，当前仅使用通用规则。"}</div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}

                <div className="model-form-grid">
                  <label className="field">
                    <span>提示词策略</span>
                    <select value={promptStrategy} onChange={(event) => setPromptStrategy(event.target.value)}>
                      <option value="rewrite-standard">标准加料改写</option>
                      <option value="rewrite-conservative">保守净化改写</option>
                      <option value="rewrite-expand">扩写增强细节</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>模板来源</span>
                    <input value={selectedTemplate ? templateSourceLabel(selectedTemplate.source) : "未选择"} readOnly />
                  </label>
                </div>
                <label className="field">
                  <span>全局改写要求</span>
                  <textarea
                    className="requirement-editor project-config-requirement"
                    value={userRequirement}
                    onChange={(event) => setUserRequirement(event.target.value)}
                    placeholder="例如：保持原剧情，强化环境描写、人物心理和冲突张力。"
                  />
                </label>
              </div>
            ) : null}
          </section>
        </div>

        {!canPersistFullConfig ? (
          <div className="notice warning compact-notice">原 FleshOut 项目保持只读；此处只保存显示名，模型、提示词、并发和加料字数仅自建 TXT 项目可持久化。</div>
        ) : null}

        <div className="modal-actions project-config-actions">
          <span className="modal-spacer">
            当前模式：{projectModeLabel(project.default_mode)}
          </span>
          <button className="secondary-action" type="button" onClick={onClose}>
            取消
          </button>
          <button className="primary-action" type="button" onClick={() => void saveConfig()} disabled={!canSave}>
            <CheckCircle2 size={16} />
            保存配置
          </button>
        </div>
      </div>
    </Modal>
  );
}

function ImportTxtModal({ state, actions, onClose }: { state: AppData; actions: AppActions; onClose: () => void }) {
  const steps = [
    { title: "导入文件", desc: "选择电子书文件" },
    { title: "TXT 拆分", desc: "配置章节识别规则" },
    { title: "预览信息", desc: "确认章节与元数据" },
    { title: "模型配置", desc: "选择 AI 推理引擎" },
    { title: "提示词策略", desc: "设定改写风格" },
    { title: "确认创建", desc: "最终预览" }
  ];
  const [step, setStep] = useState(0);
  const [importName, setImportName] = useState("");
  const [importContent, setImportContent] = useState("");
  const [sourceFileName, setSourceFileName] = useState("");
  const [preview, setPreview] = useState<TxtPreview | null>(null);
  const [wizardMessage, setWizardMessage] = useState("");
  const [modelId, setModelId] = useState(state.selectedModelId);
  const [templateId, setTemplateId] = useState(state.selectedTemplateId);
  const [promptStrategy, setPromptStrategy] = useState("rewrite-standard");
  const [userRequirement, setUserRequirement] = useState(state.userRequirement);
  const [concurrency, setConcurrency] = useState(3);
  const [targetWordCount, setTargetWordCount] = useState(state.targetWordCount);
  const [promptTab, setPromptTab] = useState<WizardPromptTabKey>("breakthrough");
  const [breakthroughDraft, setBreakthroughDraft] = useState("");
  const [identifyDraft, setIdentifyDraft] = useState("");
  const [rewriteDraft, setRewriteDraft] = useState("");
  const [expandedIdentifyIndex, setExpandedIdentifyIndex] = useState<number | null>(0);

  const selectedModel = state.models.find((model) => model.id === modelId);
  const selectedTemplate = state.templates.find((template) => template.id === templateId);
  const identifyCategories = useMemo(() => getIdentifyCategories(identifyDraft), [identifyDraft]);
  const identifyParseState = useMemo(() => parsePromptJson(identifyDraft), [identifyDraft]);
  const rewriteSummary = useMemo(() => getRewritePromptSummary(rewriteDraft), [rewriteDraft]);
  const promptTemplateChanged = Boolean(
    selectedTemplate &&
      (breakthroughDraft !== (selectedTemplate.breakthrough_template || "") ||
        identifyDraft !== (selectedTemplate.identify_template || "") ||
        rewriteDraft !== (selectedTemplate.rewrite_template || ""))
  );

  useEffect(() => {
    setBreakthroughDraft(selectedTemplate?.breakthrough_template || "");
    setIdentifyDraft(selectedTemplate?.identify_template || "");
    setRewriteDraft(selectedTemplate?.rewrite_template || "");
    setPromptTab("breakthrough");
    setExpandedIdentifyIndex(0);
  }, [selectedTemplate?.id]);

  async function readFile(file: File | null) {
    if (!file) return;
    const text = await file.text();
    const defaultName = file.name.replace(/\.[^.]+$/, "");
    setImportContent(text);
    setImportName(defaultName);
    setSourceFileName(file.name);
    setPreview(null);
    setWizardMessage(`已读取文件：${file.name}`);
  }

  async function runPreview() {
    setWizardMessage("");
    try {
      const result = await actions.previewTxtProject({ content: importContent });
      setPreview(result);
      setWizardMessage(`识别到 ${formatNumber(result.totalChapters)} 个章节`);
    } catch (error) {
      setWizardMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function createProject() {
    const project = await actions.importTxtProject({
      name: importName,
      content: importContent,
      modelId,
      templateId,
      promptStrategy,
      userRequirement,
      concurrency,
      expandWordCount: targetWordCount,
      templateOverrides: promptTemplateChanged
        ? {
            breakthroughTemplate: breakthroughDraft,
            identifyTemplate: identifyDraft,
            rewriteTemplate: rewriteDraft
          }
        : null
    });
    if (project) onClose();
  }

  function updateIdentifyCategory(index: number, field: keyof IdentifyCategory, value: string) {
    setIdentifyDraft((current) => {
      const result = parsePromptJson(current);
      if (!isRecord(result.parsed) || !Array.isArray(result.parsed.categories)) return current;
      const categories = result.parsed.categories.map((category) => (isRecord(category) ? { ...category } : category));
      const target = categories[index];
      if (!isRecord(target)) return current;
      categories[index] = { ...target, [field]: value };
      return JSON.stringify({ ...result.parsed, categories }, null, 2);
    });
  }

  function updateRewriteCommonPrompt(value: string) {
    setRewriteDraft((current) => {
      const result = parsePromptJson(current);
      if (!isRecord(result.parsed)) return current;
      return JSON.stringify({ ...result.parsed, commonPrompt: value }, null, 2);
    });
  }

  function updateRewriteCategoryPrompt(id: string, field: "name" | "prompt", value: string) {
    setRewriteDraft((current) => {
      const result = parsePromptJson(current);
      if (!isRecord(result.parsed) || !isRecord(result.parsed.categoryPrompts)) return current;
      const existing = result.parsed.categoryPrompts[id];
      const nextValue = isRecord(existing) ? { ...existing, [field]: value } : field === "prompt" ? value : { name: value, prompt: promptValueToText(existing) };
      return JSON.stringify(
        {
          ...result.parsed,
          categoryPrompts: {
            ...result.parsed.categoryPrompts,
            [id]: nextValue
          }
        },
        null,
        2
      );
    });
  }

  const canContinueFromImport = importName.trim() && importContent.trim();
  const activeTitle = steps[step]?.title ?? "新建项目";
  const canGoNext =
    (step === 0 && Boolean(canContinueFromImport)) ||
    (step === 1 && Boolean(preview)) ||
    (step === 2 && Boolean(preview)) ||
    (step === 3 && Boolean(modelId)) ||
    (step === 4 && Boolean(templateId));

  return (
    <Modal title="" onClose={onClose} size="wide">
      <div className="import-wizard-shell">
        <aside className="import-wizard-rail">
          <div className="wizard-brand">
            <span><Wand2 size={18} /></span>
            <strong>新建项目</strong>
          </div>
          <div className="wizard-steps">
            {steps.map((item, index) => (
              <button
                key={item.title}
                type="button"
                className={step === index ? "wizard-step active" : index < step ? "wizard-step done" : "wizard-step"}
                onClick={() => setStep(index)}
                disabled={index > step + 1}
              >
                <span>{index < step ? <CheckCircle2 size={15} /> : index + 1}</span>
                <strong>{item.title}</strong>
                <small>{item.desc}</small>
              </button>
            ))}
          </div>
          <button className="wizard-cancel" type="button" onClick={onClose}>
            <XCircle size={15} />
            取消创建
          </button>
        </aside>

        <section className="import-wizard-main">
          <div className="wizard-content-scroll">
            <header className="wizard-pane-title">
              <h2>{step === 0 ? "上传您的电子书" : activeTitle}</h2>
              {step === 5 ? <span className="ready-pill"><CheckCircle2 size={15} />就绪</span> : null}
            </header>

            {step === 0 ? (
              <section className="wizard-pane import-file-pane">
                <label className={sourceFileName ? "drop-zone has-file" : "drop-zone"}>
                  <Upload size={34} />
                  {sourceFileName ? (
                    <div className="selected-book-card">
                      <span className="selected-book-icon"><FileText size={22} /></span>
                      <div className="selected-book-meta">
                        <strong>{sourceFileName}</strong>
                        <small>{importName || "未命名书籍"}</small>
                      </div>
                      <em>TXT</em>
                    </div>
                  ) : (
                    <>
                      <strong>点击选择 TXT 文件</strong>
                      <span>请选择电子书文件，最大建议 50MB</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept=".txt,text/plain"
                    onChange={(event) => {
                      void readFile(event.target.files?.[0] || null);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                {sourceFileName ? (
                <label className="field import-name-field">
                  <span>项目名称</span>
                  <input value={importName} onChange={(event) => setImportName(event.target.value)} placeholder="例如：我的新小说" />
                </label>
                ) : null}
              </section>
            ) : null}

            {step === 1 ? (
              <section className="wizard-pane">
                <div className="split-rule-panel">
                  <div className="split-rule-row">
                    <label><input type="radio" checked readOnly /> 简易规则</label>
                    <label><input type="checkbox" checked readOnly /> 行首标识</label>
                    <select value="第" disabled>
                      <option>第</option>
                    </select>
                    <select value="mixed" disabled>
                      <option>混合型数字</option>
                    </select>
                    <select value="chapter" disabled>
                      <option>[章回卷节集部]</option>
                    </select>
                  </div>
                  <label className="field">
                    <span>附加规则</span>
                    <input
                      value={"^\\s*(?:序章|序言|前言|楔子|引子|序曲|后记|尾声|终章|最终章|外传|特别篇|番外|第[0-9一二三四五六七八九十百千万]+[章回卷节集部])"}
                      readOnly
                    />
                  </label>
                  <div className="split-rule-row disabled">
                    <label><input type="radio" readOnly /> 正则表达式</label>
                    <input value={"^\\s*(?:第\\s*[0-9一二三四五六七八九十百千万]+\\s*[章回卷节集部])"} readOnly />
                  </div>
                </div>
                <div className="chapter-preview-panel">
                  <div className="chapter-preview-head">
                    <div>
                      <strong>章节预览</strong>
                      <span>{preview ? `识别到 ${formatNumber(preview.totalChapters)} 个章节` : "点击预览后显示识别结果"}</span>
                    </div>
                    <button className="secondary-action" type="button" onClick={() => void runPreview()} disabled={!importContent.trim()}>
                      <Play size={15} />
                      预览
                    </button>
                  </div>
                  {preview ? (
                    <div className="chapter-preview-table">
                      {preview.chapters.map((chapter) => (
                        <div key={chapter.index}>
                          <span>{chapter.index}</span>
                          <strong>{chapter.title}</strong>
                          <em>{chapter.lineNumber ? `L${formatNumber(chapter.lineNumber)}` : "-"}</em>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="empty-inline">还没有章节预览。</div>
                  )}
                </div>
              </section>
            ) : null}

            {step === 2 ? (
              <section className="wizard-pane preview-book-pane">
                {preview ? (
                  <>
                    <div className="book-preview-cover">
                      <BookOpen size={32} />
                      <strong>TXT</strong>
                    </div>
                    <div className="book-preview-info">
                      <span className="source-pill"><FileText size={13} />TXT 格式</span>
                      <h3>{importName || "未命名项目"}</h3>
                      <div className="book-meta-grid">
                        <Info label="语言" value="中文" />
                        <Info label="编码" value="UTF-8" />
                        <Info label="总章节" value={`${formatNumber(preview.totalChapters)} 章`} />
                        <Info label="总字数" value={formatWanWords(preview.totalWords)} />
                      </div>
                      <label className="field">
                        <span>项目名称</span>
                        <input value={importName} onChange={(event) => setImportName(event.target.value)} />
                      </label>
                    </div>
                  </>
                ) : (
                  <div className="empty-inline">请先执行 TXT 拆分。</div>
                )}
              </section>
            ) : null}

            {step === 3 ? (
              <section className="wizard-pane model-picker-pane">
                <label className="field model-field">
                  <span>选择 AI 模型</span>
                  <select value={modelId} onChange={(event) => setModelId(event.target.value)}>
                    {state.models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name} · {model.model}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="model-detail-card">
                  <span className="source-pill">{selectedModel?.provider || "Custom"}</span>
                  <h3>{selectedModel?.name || "未选择模型"}</h3>
                  <code>{selectedModel?.model || "-"}</code>
                  <div className="model-stat-row">
                    <Info label="Temperature" value={formatNumber(selectedModel?.temperature)} />
                    <Info label="Max Tokens" value={formatNumber(selectedModel?.max_tokens)} />
                    <Info label="Timeout" value={`${formatNumber(selectedModel?.timeout)}s`} />
                  </div>
                </div>
                <div className="processing-config-panel">
                  <div className="config-section-head">
                    <strong>处理模式</strong>
                  </div>
                  <div className="processing-mode-grid single">
                    <button className="processing-mode-card active" type="button" aria-pressed="true">
                      <span><PenLine size={18} /></span>
                      <strong>自动模式</strong>
                      <small>自动化批量处理，适合整本书改写</small>
                    </button>
                  </div>
                  <div className="range-setting">
                    <div className="setting-label-row">
                      <strong>并发处理数</strong>
                      <em>{formatNumber(concurrency)}</em>
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={30}
                      step={1}
                      value={concurrency}
                      onChange={(event) => setConcurrency(clampNumber(Number(event.target.value), 1, 30))}
                    />
                    <div className="range-scale"><span>1</span><span>30</span></div>
                    <small>数值越大速度越快，但可能增加 API 速率限制风险。</small>
                  </div>
                  <label className="field word-target-field">
                    <span>加料字数</span>
                    <div className="input-with-unit">
                      <input
                        type="number"
                        value={targetWordCount}
                        min={1000}
                        max={20000}
                        step={500}
                        onChange={(event) => setTargetWordCount(clampNumber(Number(event.target.value), 1000, 20000))}
                      />
                      <em>字</em>
                    </div>
                    <small>每个识别到的场景的扩写目标字数，范围：1000-20000。</small>
                  </label>
                </div>
              </section>
            ) : null}

            {step === 4 ? (
              <section className="wizard-pane">
                <div className="prompt-strategy-head">
                  <h3>提示词策略</h3>
                  <select value={templateId} onChange={(event) => setTemplateId(event.target.value)}>
                    {state.templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="prompt-strategy-preview wizard-prompt-editor">
                  <div className="prompt-tabbar mini" role="tablist" aria-label="提示词策略分区">
                    <button
                      className={promptTab === "breakthrough" ? "prompt-tab active" : "prompt-tab"}
                      type="button"
                      onClick={() => setPromptTab("breakthrough")}
                      role="tab"
                      aria-selected={promptTab === "breakthrough"}
                    >
                      <Lock size={14} />系统破甲
                    </button>
                    <button
                      className={promptTab === "identify" ? "prompt-tab active" : "prompt-tab"}
                      type="button"
                      onClick={() => setPromptTab("identify")}
                      role="tab"
                      aria-selected={promptTab === "identify"}
                    >
                      <Target size={14} />场景识别
                      {identifyCategories.length ? <em>{identifyCategories.length}</em> : null}
                    </button>
                    <button
                      className={promptTab === "rewrite" ? "prompt-tab active" : "prompt-tab"}
                      type="button"
                      onClick={() => setPromptTab("rewrite")}
                      role="tab"
                      aria-selected={promptTab === "rewrite"}
                    >
                      <PenLine size={14} />改写规则
                      {rewriteSummary.categoryPrompts.length ? <em>{rewriteSummary.categoryPrompts.length}</em> : null}
                    </button>
                  </div>

                  {promptTab === "breakthrough" ? (
                    <div className="wizard-prompt-pane">
                      <div className="notice warning compact-notice">此配置将会注入到 AI 上下文中，修改请谨慎。</div>
                      <label className="field">
                        <span>系统破甲</span>
                        <textarea
                          className="prompt-preview prompt-editor-large wizard-template-textarea"
                          value={breakthroughDraft}
                          onChange={(event) => setBreakthroughDraft(event.target.value)}
                          placeholder="暂无系统破甲模板。"
                        />
                      </label>
                    </div>
                  ) : null}

                  {promptTab === "identify" ? (
                    <div className="wizard-prompt-pane">
                      <div className="prompt-section-head compact">
                        <div>
                          <h4>剧情场景规则</h4>
                          <p>{identifyCategories.length ? "点击场景行可展开或收起详情，并直接编辑识别字段。" : "当前模板未解析出 categories 数组。"}</p>
                        </div>
                        <span className="prompt-count-pill">{identifyCategories.length} 条</span>
                      </div>
                      {identifyCategories.length ? (
                        <div className="prompt-rule-list wizard-rule-list">
                          {identifyCategories.map((category, index) => (
                            <div className="prompt-rule-row wizard-rule-row" key={`${category.id}-${index}`}>
                              <button
                                className="wizard-rule-summary"
                                type="button"
                                onClick={() => setExpandedIdentifyIndex(expandedIdentifyIndex === index ? null : index)}
                                aria-expanded={expandedIdentifyIndex === index}
                              >
                                <span className="prompt-rule-index">#{String(index + 1).padStart(2, "0")}</span>
                                <strong>{category.name}</strong>
                                <code>{category.id}</code>
                                <ChevronDown size={15} />
                              </button>
                              {expandedIdentifyIndex === index ? (
                                <div className="wizard-rule-edit-grid">
                                  <label className="field">
                                    <span>ID 标识</span>
                                    <input value={category.id} onChange={(event) => updateIdentifyCategory(index, "id", event.target.value)} />
                                  </label>
                                  <label className="field">
                                    <span>场景名称</span>
                                    <input value={category.name} onChange={(event) => updateIdentifyCategory(index, "name", event.target.value)} />
                                  </label>
                                  <label className="field wide">
                                    <span>触发条件</span>
                                    <textarea value={category.conditions} onChange={(event) => updateIdentifyCategory(index, "conditions", event.target.value)} />
                                  </label>
                                  {category.prompt ? (
                                    <label className="field wide">
                                      <span>识别提示词</span>
                                      <textarea value={category.prompt} onChange={(event) => updateIdentifyCategory(index, "prompt", event.target.value)} />
                                    </label>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : identifyParseState.failed ? (
                        <div className="notice warning compact-notice">场景识别内容看起来是 JSON，但当前无法解析，下面保留原始文本编辑。</div>
                      ) : (
                        <div className="prompt-empty-small">没有结构化场景规则，下面可直接编辑原始模板。</div>
                      )}
                      <label className="field">
                        <span>原始场景识别模板</span>
                        <textarea
                          className="prompt-preview prompt-editor-raw wizard-template-raw"
                          value={identifyDraft}
                          onChange={(event) => setIdentifyDraft(event.target.value)}
                        />
                      </label>
                    </div>
                  ) : null}

                  {promptTab === "rewrite" ? (
                    <div className="wizard-prompt-pane">
                      <div className="prompt-rule-grid wizard-rewrite-grid">
                        <div className="prompt-rule-panel">
                          <div className="prompt-section-head compact">
                            <div>
                              <h4>通用指导</h4>
                              <p>适用于所有场景的统一改写规则。</p>
                            </div>
                          </div>
                          {rewriteSummary.hasStructuredData ? (
                            <textarea
                              className="prompt-readable-box wizard-common-prompt-editor"
                              value={rewriteSummary.commonPrompt}
                              onChange={(event) => updateRewriteCommonPrompt(event.target.value)}
                            />
                          ) : (
                            <textarea
                              className="prompt-readable-box wizard-common-prompt-editor"
                              value={rewriteDraft}
                              onChange={(event) => setRewriteDraft(event.target.value)}
                            />
                          )}
                        </div>
                        <div className="prompt-rule-panel">
                          <div className="prompt-section-head compact">
                            <div>
                              <h4>场景特定</h4>
                              <p>按场景补充的改写规则。</p>
                            </div>
                            <span className="prompt-count-pill">{rewriteSummary.categoryPrompts.length} 条</span>
                          </div>
                          {rewriteSummary.categoryPrompts.length ? (
                            <div className="prompt-category-list wizard-category-list">
                              {rewriteSummary.categoryPrompts.map((rule) => (
                                <div className="prompt-category-rule wizard-category-rule" key={rule.id}>
                                  <div className="wizard-category-head">
                                    <input value={rule.name} onChange={(event) => updateRewriteCategoryPrompt(rule.id, "name", event.target.value)} />
                                    <code>{rule.id}</code>
                                  </div>
                                  <textarea value={rule.prompt} onChange={(event) => updateRewriteCategoryPrompt(rule.id, "prompt", event.target.value)} />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="prompt-empty-small">{rewriteSummary.parseFailed ? "改写规则 JSON 无法解析。" : "未发现 categoryPrompts，当前仅使用通用规则。"}</div>
                          )}
                        </div>
                      </div>
                      <label className="field">
                        <span>原始改写规则模板</span>
                        <textarea
                          className="prompt-preview prompt-editor-raw wizard-template-raw compact"
                          value={rewriteDraft}
                          onChange={(event) => setRewriteDraft(event.target.value)}
                        />
                      </label>
                    </div>
                  ) : null}
                  {promptTemplateChanged ? <div className="notice success compact-notice">已修改模板内容，创建项目时会保存为项目专属副本。</div> : null}
                </div>
                <div className="model-form-grid">
                  <label className="field">
                    <span>提示词策略</span>
                    <select value={promptStrategy} onChange={(event) => setPromptStrategy(event.target.value)}>
                      <option value="rewrite-standard">标准加料改写</option>
                      <option value="rewrite-conservative">保守净化改写</option>
                      <option value="rewrite-expand">扩写增强细节</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>模板来源</span>
                    <input value={selectedTemplate ? sourceLabel(selectedTemplate.source) : "未选择"} readOnly />
                  </label>
                </div>
                <label className="field">
                  <span>全局改写要求</span>
                  <textarea
                    className="requirement-editor"
                    value={userRequirement}
                    onChange={(event) => setUserRequirement(event.target.value)}
                    placeholder="例如：保持原剧情，强化环境描写、人物心理和冲突张力。"
                  />
                </label>
              </section>
            ) : null}

            {step === 5 ? (
              <section className="wizard-pane confirm-config-pane">
                <div className="confirm-grid">
                  <Info label="项目名称" value={importName || "-"} />
                  <Info label="书名" value={importName || "-"} />
                  <Info label="规模" value={`${formatNumber(preview?.totalChapters)} 章节`} />
                  <Info label="模型名称" value={selectedModel?.name || "-"} />
                  <Info label="处理模式" value="自动模式" />
                  <Info label="并发处理数" value={formatNumber(concurrency)} />
                  <Info label="加料字数" value={`${formatNumber(targetWordCount)} 字`} />
                </div>
                <label className="field">
                  <span>源文件</span>
                  <input value={importName ? `${importName}.txt` : "TXT 正文导入"} readOnly />
                </label>
                <div className="notice warning compact-notice">
                  创建后进入工作台，从“书籍拆分”开始；完成当前步骤后再继续下一步。
                </div>
              </section>
            ) : null}

            {wizardMessage ? <div className="notice success compact-notice">{wizardMessage}</div> : null}
          </div>

          <footer className="wizard-footer">
            <button className="secondary-action" type="button" onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}>
              上一步
            </button>
            <span>Enter 快速继续</span>
            {step < 5 ? (
              <button
                className="primary-action"
                type="button"
                onClick={() => {
                  if (step === 0 && canContinueFromImport) setStep(1);
                  else if (step === 1 && preview) setStep(2);
                  else setStep(Math.min(5, step + 1));
                }}
                disabled={!canGoNext}
              >
                下一步
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                className="primary-action"
                type="button"
                onClick={() => void createProject()}
                disabled={!importName.trim() || !importContent.trim() || !modelId || !templateId || Boolean(state.aiBusy)}
              >
                {state.aiBusy === "import-txt" ? "创建中..." : "开始创建"}
                <ArrowRight size={16} />
              </button>
            )}
          </footer>
        </section>
      </div>
    </Modal>
  );
}

function RewritePage({ state, actions }: { state: AppData; actions: AppActions }) {
  const detail = state.detail;
  const [activeStage, setActiveStage] = useState(1);
  const [rewriteView, setRewriteView] = useState<"original" | "rewritten">("original");
  const [keptChapterIds, setKeptChapterIds] = useState<Set<string>>(new Set());
  const [batchMessage, setBatchMessage] = useState("");
  const [compareState, setCompareState] = useState<{
    open: boolean;
    loading: boolean;
    chapter: Chapter | null;
    original: string;
    rewritten: string;
    error: string;
  }>({ open: false, loading: false, chapter: null, original: "", rewritten: "", error: "" });

  useEffect(() => {
    const first = detail?.chapters[0];
    if (first && !state.selectedChapterId) {
      void actions.selectRewriteChapter(first.id);
    }
  }, [detail?.project.id]);

  const filteredChapters = useMemo(() => {
    const chapters = detail?.chapters ?? [];
    const keyword = state.query.trim().toLowerCase();
    if (!keyword) return chapters;
    return chapters.filter((chapter) => {
      return (
        String(chapter.chapter_index).includes(keyword) ||
        chapter.title.toLowerCase().includes(keyword) ||
        chapter.original_href.toLowerCase().includes(keyword) ||
        getRewriteReason(chapter).toLowerCase().includes(keyword)
      );
    });
  }, [detail?.chapters, state.query]);

  const workflowStats = detail?.stageStats ?? [];
  const workflowChapterCount = detail?.chapters.length ?? 0;
  const maxAccessibleStage = getMaxAccessibleStage(workflowStats, workflowChapterCount);

  useEffect(() => {
    if (!detail) return;
    const preferredStage = detail.project.current_stage ? Math.min(Math.max(detail.project.current_stage, 1), 5) : 1;
    setActiveStage(Math.min(preferredStage, maxAccessibleStage));
  }, [detail?.project.id, detail?.project.current_stage, maxAccessibleStage]);

  useEffect(() => {
    if (activeStage > maxAccessibleStage) {
      setActiveStage(maxAccessibleStage);
    }
  }, [activeStage, maxAccessibleStage]);

  if (!detail) {
    return (
      <>
        <PageHeader eyebrow="AI改写" title="五步改写流水线" desc="请选择一个项目后进入书籍拆分、内容总结、识别待处理、AI改写、合并输出。" />
        <div className="empty-state">没有读取到项目。</div>
      </>
    );
  }

  const selectedChapter = detail.chapters.find((chapter) => chapter.id === state.selectedChapterId) ?? detail.chapters[0] ?? null;
  const selectedTemplate = state.templates.find((template) => template.id === state.selectedTemplateId) ?? null;
  const identifyCategories = getIdentifyCategories(selectedTemplate?.identify_template);
  const rewritePromptSummary = getRewritePromptSummary(selectedTemplate?.rewrite_template);
  const selectedSummary = parseChapterSummary(selectedChapter?.summary);
  const selectedRewriteMarked = selectedChapter ? chapterHasRewriteMark(selectedChapter) : false;
  const selectedSceneRules = selectedChapter ? getChapterSceneRules(selectedChapter, identifyCategories, rewritePromptSummary) : [];
  const rewriteCompleted = countByStatus(detail.stageStats, 4, "completed");
  const rewritePending = countByStatus(detail.stageStats, 4, "pending");
  const rewriteFailed = detail.chapters.filter((chapter) => chapter.rewrite_status === "failed").length || countByStatus(detail.stageStats, 4, "failed");
  const rewriteTotal = getStageTotal(detail.stageStats, 4, detail.chapters.length);
  const rewriteProgress = rewriteTotal ? Math.round((rewriteCompleted / rewriteTotal) * 100) : 0;
  const needsRewriteCount = detail.chapters.filter((chapter) => chapter.needs_rewrite && !keptChapterIds.has(chapter.id)).length;
  const keptCount = detail.chapters.filter((chapter) => !chapter.needs_rewrite || keptChapterIds.has(chapter.id)).length;
  const pendingChapters = detail.chapters.filter(
    (chapter) => chapter.needs_rewrite && !keptChapterIds.has(chapter.id) && chapter.rewrite_status !== "completed"
  );
  const failedChapters = detail.chapters.filter((chapter) => chapter.rewrite_status === "failed");
  const wordShortChapters = detail.chapters.filter((chapter) =>
    chapter.needs_rewrite && !keptChapterIds.has(chapter.id) && isChapterWordShort(chapter, state.targetWordCount, state.selectedChapterId, state.rewriteContent)
  );
  const sceneStats = detail.chapters.reduce<Record<string, number>>((acc, chapter) => {
    const key = inferSceneType(chapter);
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const wordDelta = selectedChapter ? getWordDelta(selectedChapter.word_count, state.rewriteContent) : { next: 0, delta: 0, percent: 0 };
  const wordShort = Boolean(state.rewriteContent && state.targetWordCount && wordDelta.next < state.targetWordCount * 0.85);
  const canOperateProject = Boolean(detail.project);
  const visibleStage = Math.min(activeStage, maxAccessibleStage);
  const canAccessVisibleStage = canAccessStage(detail.stageStats, visibleStage, detail.chapters.length);
  const stageBusy = state.aiBusy === `stage-${visibleStage}`;
  const activeStageSummary = getStageSummary(detail.stageStats, visibleStage, detail.chapters.length);
  const activeStageTotal = activeStageSummary.total;
  const activeStageCompleted = activeStageSummary.completed;
  const activeStageFailed = activeStageSummary.failed;
  const activeStagePending = activeStageSummary.pending;
  const nextStage = Math.min(visibleStage + 1, 5);
  const canContinueToNextStage = visibleStage < 5 && canAccessStage(detail.stageStats, nextStage, detail.chapters.length);
  const canUseIdentifyStage = canAccessStage(detail.stageStats, 3, detail.chapters.length);
  const canUseRewriteStage = canAccessStage(detail.stageStats, 4, detail.chapters.length);
  const starterStage = visibleStage === 1 || visibleStage === 2;

  async function viewOriginal(chapter: Chapter) {
    setRewriteView("original");
    await actions.selectRewriteChapter(chapter.id);
  }

  async function viewRewritten(chapter: Chapter, view: "rewritten" | "compare" = "rewritten") {
    setRewriteView("rewritten");
    await actions.selectRewriteChapter(chapter.id);
    try {
      const data = await fetchJson<{ content: string }>(
        `/api/chapters/${encodeURIComponent(chapter.id)}/content?source=rewritten_preferred`
      );
      actions.setRewriteContent(data.content);
    } catch {
      actions.setRewriteContent("");
    }
  }

  async function openCompare(chapter: Chapter) {
    setCompareState({ open: true, loading: true, chapter, original: "", rewritten: "", error: "" });
    try {
      const [originalData, rewrittenData] = await Promise.all([
        fetchJson<{ content: string }>(`/api/chapters/${encodeURIComponent(chapter.id)}/content?source=original`),
        fetchJson<{ content: string }>(`/api/chapters/${encodeURIComponent(chapter.id)}/content?source=rewritten_preferred`)
      ]);
      setCompareState({
        open: true,
        loading: false,
        chapter,
        original: originalData.content,
        rewritten: rewrittenData.content,
        error: ""
      });
    } catch (error) {
      setCompareState({
        open: true,
        loading: false,
        chapter,
        original: "",
        rewritten: "",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  function markKeep(chapter: Chapter) {
    if (!canOperateProject) return;
    if (!canUseIdentifyStage) return;
    setKeptChapterIds((current) => {
      const next = new Set(current);
      next.add(chapter.id);
      return next;
    });
    void actions.keepChapterOriginal(chapter.id);
  }

  async function runActiveStage(stage: number) {
    if (!canOperateProject) return;
    if (!canAccessStage(detail.stageStats, stage, detail.chapters.length)) return;
    if ([2, 3, 4].includes(stage)) {
      const ok = window.confirm(`${stageLabel(stage)}会调用当前模型并产生实际请求，确认执行？`);
      if (!ok) return;
    }
    await actions.runRewriteStage(stage);
  }

  async function rewriteSelected() {
    if (!selectedChapter) return;
    if (!canOperateProject) return;
    if (!canUseRewriteStage) return;
    if (!window.confirm("重新/本章改写会调用当前模型并产生实际请求，确认执行？")) return;
    setRewriteView("rewritten");
    await actions.generateRewriteChapter(selectedChapter.id);
  }

  async function rewriteBatch(chapters: Chapter[]) {
    if (!canOperateProject) return;
    if (!canUseRewriteStage) return;
    if (!chapters.length) return;
    const confirmed = window.confirm(`确认批量改写 ${chapters.length} 个待处理章节？该操作会调用当前模型并产生实际请求。`);
    if (!confirmed) return;
    setBatchMessage(`批量改写开始：0 / ${chapters.length}`);
    for (let index = 0; index < chapters.length; index += 1) {
      const chapter = chapters[index];
      setBatchMessage(`正在改写第 ${chapter.chapter_index} 章：${index + 1} / ${chapters.length}`);
      await actions.selectRewriteChapter(chapter.id);
      await actions.generateRewriteChapter(chapter.id);
    }
    setBatchMessage(`批量改写完成：${chapters.length} 章`);
  }

  return (
    <>
      <RewriteProjectBar project={detail.project} />

      {state.actionMessage ? <div className="notice success compact-notice">{state.actionMessage}</div> : null}
      {batchMessage ? <div className="notice success compact-notice">{batchMessage}</div> : null}

      <section className="pipeline-steps" aria-label="AI改写流程">
        {[1, 2, 3, 4, 5].map((stage) => {
          const total = getStageTotal(detail.stageStats, stage, detail.chapters.length);
          const completed = countByStatus(detail.stageStats, stage, "completed");
          const accessible = canAccessStage(detail.stageStats, stage, detail.chapters.length);
          const stepClassName = [
            "pipeline-step",
            visibleStage === stage ? "active" : "",
            accessible ? "" : "locked"
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={stage}
              type="button"
              className={stepClassName}
              onClick={() => accessible && setActiveStage(stage)}
              disabled={!accessible}
              title={accessible ? stageLabel(stage) : `请先完成${stageLabel(stage - 1)}`}
              aria-disabled={!accessible}
            >
              <span>{accessible ? stage : <Lock size={14} />}</span>
              <strong>{stageLabel(stage)}</strong>
              <em>{completed}/{total}</em>
            </button>
          );
        })}
      </section>

      <section className="rewrite-pipeline-grid">
        <aside className="chapter-nav-panel">
          <div className="chapter-nav-head">
            <div>
              <h3>章节导航</h3>
              <p>{filteredChapters.length} / {detail.chapters.length} 章</p>
            </div>
          </div>
          <label className="search-box chapter-search">
            <Search size={16} />
            <input value={state.query} onChange={(event) => actions.setQuery(event.target.value)} placeholder="搜索章节或识别原因" />
          </label>
          <div className="chapter-nav-list">
            {filteredChapters.map((chapter) => {
              const markedRewrite = chapterHasRewriteMark(chapter);
              const kept = (!chapter.needs_rewrite && chapter.identify_status === "completed") || keptChapterIds.has(chapter.id);
              return (
                <button
                  key={chapter.id}
                  type="button"
                  className={chapter.id === selectedChapter?.id ? "chapter-nav-item active" : "chapter-nav-item"}
                  onClick={() => void viewOriginal(chapter)}
                >
                  <strong>{chapter.chapter_index}. {chapter.title}</strong>
                  <span className="chapter-nav-meta">
                    <em>{formatChapterWords(chapter.word_count)}</em>
                    {markedRewrite ? <b>需改写</b> : kept ? <b className="keep">无需改写</b> : <i>{chapter.has_summary ? "已总结" : statusLabel(chapter.rewrite_status || "待处理")}</i>}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="pipeline-main">
          {visibleStage === 1 ? (
            <div className="split-stage-empty">
              <strong>{detail.project.name}</strong>
            </div>
          ) : null}

          {visibleStage === 2 ? (
            <PipelineStageShell
              icon={<ClipboardCheck size={18} />}
              title="内容总结"
              desc="查看每章情节概要、登场人物、关键事件；已识别为需改写的章节会显示模板场景规则。"
            >
              {activeStageSummary.complete && selectedChapter ? (
                <ChapterSummaryWorkbench
                  chapter={selectedChapter}
                  summary={selectedSummary}
                  markedRewrite={selectedRewriteMarked}
                  sceneRules={selectedSceneRules}
                  onRegenerate={() => void runActiveStage(2)}
                />
              ) : (
                <StageStartPanel
                  step="Step 2"
                  title="内容总结"
                  description={activeStageSummary.running ? "内容总结正在执行。" : "待开始"}
                  summary={activeStageSummary}
                  progressLabel="总结进度"
                />
              )}
            </PipelineStageShell>
          ) : null}

          {visibleStage === 3 ? (
            <PipelineStageShell
              icon={<ListChecks size={18} />}
              title="识别待处理"
              desc="按提示词模板中的场景和规则识别可改写单章，识别完成后继续进入 AI改写。"
              footer={
                <StageActionBar
                  stage={visibleStage}
                  summary={activeStageSummary}
                  busy={stageBusy}
                  disabled={!canOperateProject || Boolean(state.aiBusy)}
                  onStart={() => void runActiveStage(visibleStage)}
                  onContinue={() => setActiveStage(nextStage)}
                />
              }
            >
              <div className="stage-workbench-hero">
                <div>
                  <span className="source-pill">Step 3</span>
                  <h3>按模板识别可改写章节</h3>
                  <p>{stageDescription(3)}</p>
                </div>
                <div className="stage-progress-card">
                  <strong>{formatNumber(needsRewriteCount)}</strong>
                  <span>待改写章节</span>
                </div>
              </div>
              <section className="template-rule-preview">
                <div>
                  <div className="subsection-title">当前提示词模板</div>
                  <strong>{selectedTemplate?.name || "未选择模板"}</strong>
                  <p>{selectedTemplate ? `${templateSourceLabel(selectedTemplate.source)} · ${countFilledPromptFields(selectedTemplate)} 个字段已配置` : "请先在提示词管理中选择或导入模板。"}</p>
                </div>
                <div className="template-rule-chips">
                  {(identifyCategories.length ? identifyCategories.slice(0, 6) : Object.keys(sceneStats).slice(0, 6)).map((item) => (
                    <span key={typeof item === "string" ? item : item.id}>{typeof item === "string" ? item : item.name}</span>
                  ))}
                  {!identifyCategories.length && !Object.keys(sceneStats).length ? <span>暂无场景规则</span> : null}
                </div>
              </section>
              <div className="subsection-title">场景分类统计</div>
              <section className="scene-grid">
                {Object.entries(sceneStats).map(([scene, count]) => (
                  <div className="scene-cell" key={scene}>
                    <span>{scene}</span>
                    <strong>{count}</strong>
                  </div>
                ))}
              </section>
              <div className="subsection-title">每章识别原因与处理状态</div>
              <div className="identify-list">
                {filteredChapters.map((chapter) => {
                  const kept = !chapter.needs_rewrite || keptChapterIds.has(chapter.id);
                  return (
                    <article className="identify-row" key={chapter.id}>
                      <div>
                        <div className="identify-title">
                          <strong>{chapter.chapter_index}. {chapter.title}</strong>
                          <span className={kept ? "status" : "status status-running"}>{kept ? "保留原文" : "待改写"}</span>
                        </div>
                        <p>{getRewriteReason(chapter)}</p>
                      </div>
                      <div className="table-action-row">
                        <button className="text-action" type="button" onClick={() => void viewOriginal(chapter)}>
                          查看原文
                        </button>
                        <button className="text-action" type="button" onClick={() => markKeep(chapter)} disabled={kept || !canOperateProject || !canUseIdentifyStage}>
                          标记保留
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </PipelineStageShell>
          ) : null}

          {visibleStage === 4 ? (
            <PipelineStageShell
              icon={<Sparkles size={18} />}
              title="AI改写"
              desc="选择识别出的单章执行 AI 改写，可重新改写、查看原文、查看对比。"
              footer={
                <StageActionBar
                  stage={visibleStage}
                  summary={activeStageSummary}
                  busy={state.aiBusy === "rewrite"}
                  disabled={!canOperateProject || !canUseRewriteStage || !selectedChapter || !state.selectedModelId || !state.selectedTemplateId || Boolean(state.aiBusy)}
                  onStart={() => void rewriteSelected()}
                  onContinue={() => setActiveStage(nextStage)}
                  startLabel={selectedChapter?.rewrite_status === "completed" ? "重新改写" : "开始改写"}
                />
              }
            >
              <div className="rewrite-stage-layout">
                <div className="stage-workbench-hero">
                  <div>
                    <span className="source-pill">Step 4</span>
                    <h3>{selectedChapter ? `第${selectedChapter.chapter_index}章 ${selectedChapter.title}` : "选择单章改写"}</h3>
                    <p>{selectedChapter ? getRewriteReason(selectedChapter) : stageDescription(4)}</p>
                  </div>
                  <div className="stage-progress-card">
                    <strong>{formatNumber(rewriteCompleted)} / {formatNumber(rewriteTotal)}</strong>
                    <span>已改写章节</span>
                  </div>
                </div>
                <div className="rewrite-rule-card">
                  <span>改写规则</span>
                  <strong>{selectedTemplate?.name || "未选择模板"}</strong>
                  <p>{compactPromptText(rewritePromptSummary.commonPrompt || rewritePromptSummary.categoryPrompts[0]?.prompt || selectedTemplate?.rewrite_template || "暂无改写规则", 160)}</p>
                </div>
              </div>
              <div className="rewrite-toolbar">
                <label className="field">
                  <span>模型</span>
                  <select value={state.selectedModelId} onChange={(event) => actions.setSelectedModelId(event.target.value)}>
                    {state.models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>提示词模板</span>
                  <select value={state.selectedTemplateId} onChange={(event) => actions.setSelectedTemplateId(event.target.value)}>
                    {state.templates.map((template) => (
                      <option key={template.id} value={template.id}>
                        {template.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>目标字数</span>
                  <input type="number" value={state.targetWordCount} onChange={(event) => actions.setTargetWordCount(Number(event.target.value))} />
                </label>
              </div>
              <label className="field">
                <span>补充要求</span>
                <textarea
                  className="requirement-editor"
                  value={state.userRequirement}
                  onChange={(event) => actions.setUserRequirement(event.target.value)}
                  placeholder="例如：保持原剧情，增强细节描写和人物心理。"
                />
              </label>
              <div className="view-tabs">
                <button className={rewriteView === "original" ? "tab-button active" : "tab-button"} type="button" onClick={() => selectedChapter && void viewOriginal(selectedChapter)}>
                  <Eye size={15} /> 查看原文
                </button>
                <button className="tab-button" type="button" onClick={() => void rewriteSelected()} disabled={!canOperateProject || !canUseRewriteStage || !selectedChapter || !state.selectedModelId || !state.selectedTemplateId || Boolean(state.aiBusy)}>
                  <RefreshCw size={15} /> 重新改写
                </button>
                <button className="tab-button" type="button" onClick={() => selectedChapter && void openCompare(selectedChapter)}>
                  <GitCompare size={15} /> 查看对比
                </button>
              </div>
              {state.rewriteOutputPath ? <div className="notice success compact-notice">改写输出：{state.rewriteOutputPath}</div> : null}
              {wordShort ? <div className="notice warning compact-notice">字数不达标：当前 {formatNumber(wordDelta.next)} 字，低于目标字数的 85%。</div> : null}
              <RewriteContentViewer
                view={rewriteView}
                original={state.chapterContent}
                rewritten={state.rewriteContent}
                onRewriteChange={actions.setRewriteContent}
              />
            </PipelineStageShell>
          ) : null}

          {visibleStage === 5 ? (
            <PipelineStageShell
              icon={<Download size={18} />}
              title="合并输出"
              desc="查看合并前状态；合并阶段沿用工作区 output/，不会写回原 fleshout.db。"
              footer={
                <StageActionBar
                  stage={visibleStage}
                  summary={activeStageSummary}
                  busy={stageBusy}
                  disabled={!canOperateProject || Boolean(state.aiBusy)}
                  onStart={() => void runActiveStage(visibleStage)}
                />
              }
            >
              <div className="stage-workbench-hero">
                <div>
                  <span className="source-pill">Step 5</span>
                  <h3>合并输出文件</h3>
                  <p>{stageDescription(5)}</p>
                </div>
                <div className="stage-progress-card">
                  <strong>{formatNumber(detail.project.stats.output)}</strong>
                  <span>输出文件</span>
                </div>
              </div>
              <section className="metrics-grid compact-metrics">
                <Metric icon={<CheckCircle2 size={18} />} label="已改写" value={formatNumber(rewriteCompleted)} />
                <Metric icon={<RefreshCw size={18} />} label="待改写" value={formatNumber(rewritePending)} />
                <Metric icon={<XCircle size={18} />} label="失败" value={formatNumber(rewriteFailed)} />
                <Metric icon={<Download size={18} />} label="输出文件" value={formatNumber(detail.project.stats.output)} />
              </section>
              <div className="notice warning compact-notice">
                合并阶段当前沿用原工作区 output/ 文件；续写增强不会写回原 fleshout.db。
              </div>
              <WorkspacePanel project={detail.project} />
            </PipelineStageShell>
          ) : null}
        </section>

        <aside className={visibleStage === 1 ? "pipeline-side split-only-side" : "pipeline-side"}>
          {visibleStage === 1 ? (
            <SplitStageSidePanel
              summary={activeStageSummary}
              busy={stageBusy}
              disabled={!canOperateProject || !canAccessVisibleStage || Boolean(state.aiBusy)}
              onStart={() => (canContinueToNextStage ? setActiveStage(nextStage) : void runActiveStage(visibleStage))}
              canContinue={canContinueToNextStage}
            />
          ) : (
            <>
              <div className="panel-title">
                <BarChart3 size={17} />
                阶段统计
              </div>
              <div className="stage-run-box">
                <span>当前阶段</span>
                <strong>{stageLabel(visibleStage)}</strong>
                <em>
                  完成 {formatNumber(activeStageCompleted)} / 待处理 {formatNumber(activeStagePending)} / 失败 {formatNumber(activeStageFailed)}
                </em>
                <button
                  className="primary-action"
                  type="button"
                  onClick={() => (canContinueToNextStage ? setActiveStage(nextStage) : void runActiveStage(visibleStage))}
                  disabled={!canContinueToNextStage && (!canOperateProject || !canAccessVisibleStage || Boolean(state.aiBusy))}
                >
                  {canContinueToNextStage ? <ArrowRight size={16} /> : <Play size={16} />}
                  {stageBusy ? "执行中..." : canContinueToNextStage ? "继续下一步" : stageStartLabel(visibleStage)}
                </button>
              </div>
            </>
          )}
          {starterStage ? null : (
            <>
              <div className="side-stat-grid">
                <Info label="待改写" value={formatNumber(needsRewriteCount)} />
                <Info label="失败" value={formatNumber(rewriteFailed)} />
                <Info label="字数不达标" value={formatNumber(wordShortChapters.length)} />
                <Info label="改写进度" value={`${rewriteProgress}%`} />
              </div>
              <div className="progress-box">
                <div className="progress-track">
                  <span style={{ width: `${rewriteProgress}%` }} />
                </div>
                <em>{formatNumber(rewriteCompleted)} / {formatNumber(rewriteTotal)} 章</em>
              </div>
              <div className="selected-chapter-box">
                <span>当前章节</span>
                <strong>{selectedChapter ? `${selectedChapter.chapter_index}. ${selectedChapter.title}` : "未选择"}</strong>
                <p>{selectedChapter ? getRewriteReason(selectedChapter) : ""}</p>
              </div>
              <div className="word-stat">
                <span>字数变化</span>
                <strong>
                  {formatNumber(selectedChapter?.word_count)} → {state.rewriteContent ? formatNumber(wordDelta.next) : "-"}
                </strong>
                <em>{state.rewriteContent ? `${wordDelta.delta >= 0 ? "+" : ""}${wordDelta.delta} (${wordDelta.percent}%)` : "等待改写结果"}</em>
              </div>
              <div className="side-actions">
                <button className="primary-action" type="button" onClick={() => void rewriteSelected()} disabled={!canOperateProject || !canUseRewriteStage || !selectedChapter || !state.selectedModelId || !state.selectedTemplateId || Boolean(state.aiBusy)}>
                  <Sparkles size={16} />
                  {state.aiBusy === "rewrite" ? "改写中..." : selectedChapter?.rewrite_status === "completed" ? "重新改写" : "改写本章"}
                </button>
                <button className="secondary-action" type="button" onClick={() => selectedChapter && void viewOriginal(selectedChapter)} disabled={!selectedChapter}>
                  <Eye size={16} />
                  查看原文
                </button>
                <button className="secondary-action" type="button" onClick={() => selectedChapter && void openCompare(selectedChapter)} disabled={!selectedChapter}>
                  <GitCompare size={16} />
                  查看对比
                </button>
                <button className="secondary-action" type="button" onClick={() => selectedChapter && markKeep(selectedChapter)} disabled={!canOperateProject || !canUseIdentifyStage || !selectedChapter || keptChapterIds.has(selectedChapter.id)}>
                  <CheckCircle2 size={16} />
                  标记保留原文
                </button>
                <button className="secondary-action" type="button" onClick={() => void rewriteBatch(failedChapters)} disabled={!canOperateProject || !canUseRewriteStage || !failedChapters.length || Boolean(state.aiBusy)}>
                  <RefreshCw size={16} />
                  失败重试
                </button>
                <button className="secondary-action" type="button" onClick={() => void rewriteBatch(wordShortChapters)} disabled={!canOperateProject || !canUseRewriteStage || !wordShortChapters.length || Boolean(state.aiBusy)}>
                  <RefreshCw size={16} />
                  重试字数不达标章节
                </button>
                <button className="primary-action" type="button" onClick={() => void runActiveStage(4)} disabled={!canOperateProject || !canUseRewriteStage || !pendingChapters.length || !state.selectedModelId || Boolean(state.aiBusy)}>
                  <Play size={16} />
                  批量改写待处理章节
                </button>
              </div>
            </>
          )}
        </aside>
      </section>
      {compareState.open && compareState.chapter ? (
        <RewriteCompareModal
          chapter={compareState.chapter}
          original={compareState.original}
          rewritten={compareState.rewritten}
          loading={compareState.loading}
          error={compareState.error}
          onClose={() => setCompareState((current) => ({ ...current, open: false }))}
        />
      ) : null}
    </>
  );
}

function PipelineStageShell({
  icon,
  title,
  desc,
  children,
  footer
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="pipeline-stage-shell">
      <header className="pipeline-stage-header">
        <div className="stage-title-icon">{icon}</div>
        <div>
          <h3>{title}</h3>
          <p>{desc}</p>
        </div>
      </header>
      {children}
      {footer ? <footer className="stage-action-footer">{footer}</footer> : null}
    </div>
  );
}

function StageStartPanel({
  step,
  title,
  description,
  summary,
  progressLabel
}: {
  step: string;
  title: string;
  description: string;
  summary: ReturnType<typeof getStageSummary>;
  progressLabel: string;
}) {
  const progress = summary.total ? Math.round((summary.completed / summary.total) * 100) : 0;
  return (
    <div className="stage-start-panel">
      <div className="stage-start-content">
        <span className="source-pill">{step}</span>
        <h3>{title}</h3>
        <p>{description}</p>
      </div>
      <div className="stage-start-progress">
        <div>
          <span>{progressLabel}</span>
          <strong>{progress}%</strong>
        </div>
        <div className="progress-track">
          <span style={{ width: `${progress}%` }} />
        </div>
        <em>{formatNumber(summary.completed)} / {formatNumber(summary.total)}</em>
      </div>
    </div>
  );
}

function ChapterSummaryWorkbench({
  chapter,
  summary,
  markedRewrite,
  sceneRules,
  onRegenerate
}: {
  chapter: Chapter;
  summary: ChapterSummaryDetail;
  markedRewrite: boolean;
  sceneRules: ChapterSceneRule[];
  onRegenerate: () => void;
}) {
  const characterItems = summary.characters.length ? summary.characters : [{ name: "暂无结构化人物", detail: "当前总结没有拆出登场人物；可先查看情节概要。" }];
  const eventItems = summary.events.length ? summary.events : [{ name: "暂无结构化事件", detail: "当前总结没有拆出关键事件；可先查看情节概要。" }];

  return (
    <div className="chapter-summary-workbench">
      <header className="chapter-summary-hero">
        <div>
          <h3>{formatChapterHeading(chapter)}</h3>
          <p>
            {formatChapterWords(chapter.word_count)}
            {markedRewrite ? <span className="summary-rewrite-badge">需改写</span> : <span className="summary-keep-badge">无需改写</span>}
          </p>
        </div>
        <button className="secondary-action" type="button" onClick={onRegenerate}>
          <RefreshCw size={15} />
          重新生成
        </button>
      </header>

      <div className="chapter-summary-scroll">
        <section className="summary-overview-card">
          <div className="subsection-title">情节概要</div>
          <p>{summary.overview}</p>
        </section>

        <section className="summary-detail-grid">
          <div className="summary-detail-card">
            <div className="subsection-title">登场人物</div>
            <div className="summary-item-list">
              {characterItems.map((item, index) => (
                <article key={`${item.name}-${index}`} className={summary.characters.length ? "summary-item-card" : "summary-item-card muted"}>
                  <strong>{item.name}</strong>
                  <p>{item.detail}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="summary-detail-card">
            <div className="subsection-title">关键事件</div>
            <div className="summary-item-list">
              {eventItems.map((item, index) => (
                <article key={`${item.name}-${index}`} className={summary.events.length ? "summary-item-card" : "summary-item-card muted"}>
                  <strong>{item.name}</strong>
                  <p>{item.detail}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {markedRewrite ? (
          <section className="summary-rule-card">
            <div className="subsection-title">场景识别标记</div>
            <div className="summary-rule-list">
              {sceneRules.length ? (
                sceneRules.map((rule, index) => (
                  <article key={`${rule.name}-${index}`} className="summary-rule-item">
                    <span>{rule.source}</span>
                    <strong>{rule.name}</strong>
                    <p>{rule.detail}</p>
                  </article>
                ))
              ) : (
                <article className="summary-rule-item muted">
                  <span>等待识别</span>
                  <strong>未匹配到模板规则</strong>
                  <p>当前章节被标记为需改写，但还没有可展示的场景规则；请先完成识别待处理步骤或检查提示词模板。</p>
                </article>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function StageActionBar({
  stage,
  summary,
  busy,
  disabled,
  onStart,
  onContinue,
  startLabel
}: {
  stage: number;
  summary: ReturnType<typeof getStageSummary>;
  busy: boolean;
  disabled: boolean;
  onStart: () => void;
  onContinue?: () => void;
  startLabel?: string;
}) {
  const progress = summary.total ? Math.round((summary.completed / summary.total) * 100) : 0;
  const canContinue = stage < 5 && summary.complete && Boolean(onContinue);

  return (
    <div className="stage-action-bar">
      <div className="stage-action-main">
        <strong>{stageLabel(stage)}</strong>
        <div className="progress-track">
          <span style={{ width: `${progress}%` }} />
        </div>
        <em>
          {formatNumber(summary.completed)} / {formatNumber(summary.total)}
          {summary.failed ? ` · 失败 ${formatNumber(summary.failed)}` : ""}
        </em>
      </div>
      <button className="primary-action" type="button" onClick={canContinue ? onContinue : onStart} disabled={canContinue ? false : disabled}>
        {canContinue ? <ArrowRight size={16} /> : <Play size={16} />}
        {busy ? "执行中..." : canContinue ? "继续" : startLabel || stageStartLabel(stage)}
      </button>
    </div>
  );
}

function RewriteContentViewer({
  view,
  original,
  rewritten,
  onRewriteChange
}: {
  view: "original" | "rewritten";
  original: string;
  rewritten: string;
  onRewriteChange: (value: string) => void;
}) {
  if (view === "rewritten") {
    return (
      <label className="field">
        <span>改写结果</span>
        <textarea
          className="rewrite-reader tall-reader"
          value={rewritten}
          onChange={(event) => onRewriteChange(event.target.value)}
          placeholder="点击改写本章后显示结果。"
        />
      </label>
    );
  }

  return (
    <label className="field">
      <span>原文</span>
      <textarea className="rewrite-reader tall-reader" value={original} readOnly />
    </label>
  );
}

function RewriteCompareModal({
  chapter,
  original,
  rewritten,
  loading,
  error,
  onClose
}: {
  chapter: Chapter;
  original: string;
  rewritten: string;
  loading: boolean;
  error: string;
  onClose: () => void;
}) {
  const originalWords = countTextWords(original);
  const rewrittenWords = countTextWords(rewritten);
  const delta = rewrittenWords - originalWords;
  const diff = useMemo(() => buildDiffParts(original, rewritten), [original, rewritten]);

  return (
    <Modal title={`第${chapter.chapter_index}章 ${chapter.title} - 内容对比`} onClose={onClose} size="compare">
      {loading ? <div className="notice success compact-notice">正在读取原文与改写结果...</div> : null}
      {error ? <div className="notice error compact-notice">{error}</div> : null}
      <div className="compare-modal-grid">
        <DiffColumn title="ORIGINAL" words={originalWords} parts={diff.originalParts} side="original" />
        <DiffColumn title="REWRITTEN" words={rewrittenWords} delta={delta} parts={diff.rewrittenParts} side="rewritten" />
      </div>
    </Modal>
  );
}

function DiffColumn({
  title,
  words,
  delta,
  parts,
  side
}: {
  title: string;
  words: number;
  delta?: number;
  parts: DiffPart[];
  side: "original" | "rewritten";
}) {
  return (
    <section className="diff-column">
      <header className="diff-column-header">
        <strong>{title}</strong>
        <span>
          {formatNumber(words)} 字
          {typeof delta === "number" ? <em>{delta >= 0 ? ` +${formatNumber(delta)}` : ` ${formatNumber(delta)}`}</em> : null}
        </span>
      </header>
      <div className="diff-content">
        {parts.length ? (
          parts.map((part, index) => (
            <p className={`diff-part ${part.type === "same" ? "" : side === "original" ? "removed" : "added"}`} key={`${side}-${index}`}>
              {part.text}
            </p>
          ))
        ) : (
          <p className="diff-part muted">暂无内容</p>
        )}
      </div>
    </section>
  );
}

function ContinuationPage({ state, actions }: { state: AppData; actions: AppActions }) {
  const detail = state.detail;
  useEffect(() => {
    const lastChapter = detail?.chapters[detail.chapters.length - 1];
    if (lastChapter && !state.selectedChapterId) {
      void actions.selectContinuationChapter(lastChapter.id);
    }
  }, [detail?.project.id]);

  return (
    <>
      <PageHeader
        eyebrow="小说续写"
        title="上下文分析、大纲与单章续写"
        desc="复用原项目章节、模型配置和提示词体系，续写结果独立保存。"
      />
      <ProjectSelector state={state} actions={actions} />

      {detail ? (
        <section className="continuation-panel">
          {state.actionMessage ? <div className="notice success">{state.actionMessage}</div> : null}

          <div className="ai-control-grid">
            <label className="field">
              <span>模型</span>
              <select value={state.selectedModelId} onChange={(event) => actions.setSelectedModelId(event.target.value)}>
                {state.models.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} · {model.model}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>目标字数</span>
              <input
                type="number"
                value={state.targetWordCount}
                min={500}
                step={500}
                onChange={(event) => actions.setTargetWordCount(Number(event.target.value))}
              />
            </label>
            <label className="field">
              <span>大纲章节数</span>
              <input
                type="number"
                value={state.targetChapters}
                min={1}
                max={10}
                onChange={(event) => actions.setTargetChapters(Number(event.target.value))}
              />
            </label>
          </div>

          <label className="field">
            <span>续写需求</span>
            <textarea
              className="requirement-editor"
              value={state.userRequirement}
              onChange={(event) => actions.setUserRequirement(event.target.value)}
              placeholder="例如：从最后一章自然接续，先推进主线冲突，再埋下下一章钩子；保持原文叙事节奏和人物口吻。"
            />
          </label>

          <div className="ai-action-row">
            <button
              className="secondary-action"
              type="button"
              onClick={() => void actions.ingestChapterMemory()}
              disabled={!state.selectedModelId || !state.selectedChapterId || Boolean(state.aiBusy)}
            >
              <Database size={16} />
              {state.aiBusy === "memory-ingest" ? "提取中..." : "提取本章记忆"}
            </button>
            <button
              className="secondary-action"
              type="button"
              onClick={() => void actions.buildMemoryContextPack()}
              disabled={!state.selectedChapterId || Boolean(state.aiBusy)}
            >
              <FileText size={16} />
              {state.aiBusy === "memory-pack" ? "组装中..." : "生成记忆包"}
            </button>
            <button
              className="secondary-action"
              type="button"
              onClick={() => void actions.analyzeContext()}
              disabled={!state.selectedModelId || Boolean(state.aiBusy)}
            >
              <Bot size={16} />
              {state.aiBusy === "context" ? "分析中..." : "分析全书"}
            </button>
            <button
              className="secondary-action"
              type="button"
              onClick={() => void actions.generateOutline()}
              disabled={!state.selectedModelId || Boolean(state.aiBusy)}
            >
              <Layers size={16} />
              {state.aiBusy === "outline" ? "生成中..." : "生成大纲"}
            </button>
            <button
              className="primary-action"
              type="button"
              onClick={() => void actions.generateContinuationByAi()}
              disabled={!state.selectedModelId || !state.selectedChapterId || Boolean(state.aiBusy)}
            >
              <Sparkles size={16} />
              {state.aiBusy === "generate" ? "生成中..." : "AI生成单章"}
            </button>
            <button
              className="secondary-action"
              type="button"
              onClick={() => void actions.reviewContinuationDraft()}
              disabled={!state.selectedModelId || !state.continuationContent.trim() || Boolean(state.aiBusy)}
            >
              <CircleAlert size={16} />
              {state.aiBusy === "review" ? "审查中..." : "审查草稿"}
            </button>
          </div>

          {(state.memoryContextResult || state.contextResult || state.outlineResult || state.reviewResult) ? (
            <div className="ai-result-grid">
              <label className="field">
                <span>记忆上下文包</span>
                <textarea className="ai-result" value={state.memoryContextResult} readOnly />
              </label>
              <label className="field">
                <span>全书上下文</span>
                <textarea className="ai-result" value={state.contextResult} readOnly />
              </label>
              <label className="field">
                <span>续写大纲</span>
                <textarea className="ai-result" value={state.outlineResult} readOnly />
              </label>
              <label className="field">
                <span>续写审查报告</span>
                <textarea className="ai-result" value={state.reviewResult} readOnly />
              </label>
            </div>
          ) : null}

          <div className="continuation-grid">
            <div className="continuation-column">
              <label className="field">
                <span>基准章节</span>
                <select
                  value={state.selectedChapterId ?? ""}
                  onChange={(event) => void actions.selectContinuationChapter(event.target.value)}
                >
                  {detail.chapters.map((chapter) => (
                    <option key={chapter.id} value={chapter.id}>
                      {chapter.chapter_index}. {chapter.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>正文来源</span>
                <select value={state.sourceMode} onChange={(event) => actions.setSourceMode(event.target.value)}>
                  <option value="original">原文</option>
                  <option value="rewritten_preferred">改写版优先</option>
                </select>
              </label>
              <label className="field">
                <span>基准章节内容</span>
                <textarea className="chapter-preview" value={state.chapterContent} readOnly />
              </label>
            </div>

            <div className="continuation-column">
              <label className="field">
                <span>续写标题</span>
                <input value={state.continuationTitle} onChange={(event) => actions.setContinuationTitle(event.target.value)} />
              </label>
              <label className="field grow">
                <span>续写正文</span>
                <textarea
                  className="continuation-editor"
                  value={state.continuationContent}
                  onChange={(event) => actions.setContinuationContent(event.target.value)}
                  placeholder="可手工输入，也可点击 AI生成单章后再编辑。"
                />
              </label>
              <div className="action-row">
                <button
                  className="primary-action"
                  type="button"
                  onClick={() => void actions.saveContinuation()}
                  disabled={!state.selectedChapterId || !state.continuationContent.trim()}
                >
                  <Sparkles size={16} />
                  保存续写
                </button>
                <button
                  className="secondary-action"
                  type="button"
                  onClick={() => void actions.exportWithContinuations()}
                  disabled={!state.continuations.length}
                >
                  <Download size={16} />
                  导出原文+续写
                </button>
              </div>
            </div>
          </div>

          <ContinuationList continuations={state.continuations} state={state} actions={actions} />
        </section>
      ) : (
        <div className="empty-state">请选择一个项目。</div>
      )}
    </>
  );
}

function MemoryPage({ state, actions }: { state: AppData; actions: AppActions }) {
  const overview = state.memoryOverview;
  const aggregate = overview?.aggregate;

  return (
    <>
      <PageHeader
        eyebrow="记忆中心"
        title="人物、伏笔与时间线记忆"
        desc="从正式章节或基准章节提取结构化记忆，供 AI续写上下文包复用。"
        action={
          <div className="header-actions">
            <button className="secondary-action" type="button" onClick={() => void actions.loadMemoryOverview()} disabled={Boolean(state.aiBusy)}>
              <RefreshCw size={16} />
              刷新记忆
            </button>
            <button
              className="primary-action"
              type="button"
              onClick={() => void actions.ingestRecentMemory(5)}
              disabled={!state.selectedModelId || Boolean(state.aiBusy)}
            >
              <Database size={16} />
              {state.aiBusy === "memory-recent" ? "提取中..." : "提取最近5章"}
            </button>
          </div>
        }
      />
      <ProjectSelector state={state} actions={actions} />
      <ModelNotice state={state} />

      {state.actionMessage ? <div className="notice success">{state.actionMessage}</div> : null}

      {overview ? (
        <>
          <section className="metrics-grid">
            <Metric icon={<Database size={18} />} label="快照数" value={formatNumber(overview.snapshotCount)} />
            <Metric icon={<FileText size={18} />} label="近期摘要" value={formatNumber(aggregate?.recentSummaries.length ?? 0)} />
            <Metric icon={<Layers size={18} />} label="伏笔记录" value={formatNumber(aggregate?.foreshadowing.length ?? 0)} />
            <Metric icon={<Sparkles size={18} />} label="时间线" value={formatNumber(aggregate?.timeline.length ?? 0)} />
          </section>

          <section className="memory-grid">
            <MemoryList title="人物状态" items={aggregate?.characterStates ?? []} />
            <MemoryList title="角色认知" items={aggregate?.characterCognition ?? []} />
            <MemoryList title="伏笔状态" items={aggregate?.foreshadowing ?? []} />
            <MemoryList title="时间线" items={aggregate?.timeline ?? []} />
            <MemoryList title="正史设定" items={aggregate?.canonFacts ?? []} />
            <MemoryList title="最近摘要" items={aggregate?.recentSummaries ?? []} />
          </section>

          <section className="chapter-panel">
            <div className="chapter-toolbar">
              <div>
                <h3>章节快照</h3>
                <p>{overview.snapshots.length} 条</p>
              </div>
              <span className="status">{overview.latestSnapshot ? `最新：第${overview.latestSnapshot.chapterNumber}章` : "暂无快照"}</span>
            </div>
            <div className="memory-snapshot-list">
              {overview.snapshots.length ? (
                overview.snapshots.slice().reverse().map((snapshot) => (
                  <article className="memory-snapshot" key={snapshot.id}>
                    <div>
                      <strong>第{snapshot.chapterNumber}章</strong>
                      <p>{snapshot.summary || "无摘要"}</p>
                    </div>
                    <div className="snapshot-tags">
                      <span>人物 {snapshot.characters.length}</span>
                      <span>伏笔 {snapshot.foreshadowingChanges.length}</span>
                      <span>时间线 {snapshot.timelineEvents.length}</span>
                    </div>
                  </article>
                ))
              ) : (
                <div className="empty-inline">还没有章节记忆。可以先在小说续写页提取本章记忆，或在这里提取最近5章。</div>
              )}
            </div>
          </section>
        </>
      ) : (
        <div className="empty-state">正在读取记忆中心...</div>
      )}
    </>
  );
}

function MemoryList({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="panel memory-list-panel">
      <div className="panel-title">{title}</div>
      {items.length ? (
        <ul className="memory-list">
          {items.slice(0, 12).map((item, index) => (
            <li key={`${title}-${index}`}>{item}</li>
          ))}
        </ul>
      ) : (
        <div className="empty-inline">暂无记录</div>
      )}
    </section>
  );
}

function ModelNotice({ state }: { state: AppData }) {
  const selected = state.models.find((model) => model.id === state.selectedModelId);
  if (!state.models.length) {
    return (
      <div className="notice warning compact-notice">
        还没有接入模型。请先到模型管理添加 OpenAI Compatible 或 Ollama 模型。
      </div>
    );
  }
  if (!selected) {
    return (
      <div className="notice warning compact-notice">
        当前没有选中模型。请选择一个模型后再执行 AI 分析、记忆提取或续写。
      </div>
    );
  }
  const isCallable = selected.provider === "ollama" ? Boolean(selected.model) : Boolean(selected.model && selected.base_url);
  return (
    <div className={isCallable ? "notice success compact-notice" : "notice warning compact-notice"}>
      当前模型：{selected.name} · {selected.model}
      {selected.is_default ? " · 默认" : ""}
      {isCallable ? "" : "。该模型配置不完整，请到模型管理补充 Base URL 或模型 ID。"}
    </div>
  );
}

function ModelsPage({ state, reload }: { state: AppData; reload: () => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyModelForm);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState("");

  function updateForm(key: keyof typeof emptyModelForm, value: string | number) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function testConnection() {
    setBusy("test");
    setMessage("");
    try {
      const result = await postJson<{ content: string }>("/api/models/test", form);
      setMessage(`测试成功：${result.content}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy("");
    }
  }

  async function createModel() {
    setBusy("create");
    setMessage("");
    try {
      if (editingId) {
        await putJson(`/api/models/${encodeURIComponent(editingId)}`, form);
        setMessage("模型已保存。");
      } else {
        await postJson("/api/models", form);
        setMessage("模型已添加。");
        setForm(emptyModelForm);
      }
      setOpen(false);
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy("");
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm(emptyModelForm);
    setMessage("");
    setOpen(true);
  }

  function openEdit(model: AiModel) {
    setEditingId(model.id);
    setForm({
      name: model.name,
      provider: model.provider,
      apiKey: model.provider === "ollama" ? "" : "",
      baseUrl: model.base_url || "",
      model: model.model,
      temperature: model.temperature,
      maxTokens: model.max_tokens,
      timeout: model.timeout || 300
    });
    setMessage("安全起见，编辑时请重新填写 API Key。");
    setOpen(true);
  }

  async function setDefault(model: AiModel) {
    setMessage("");
    try {
      await postJson(`/api/models/${encodeURIComponent(model.id)}/default`, {});
      setMessage("默认模型已设置。");
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function deleteModel(model: AiModel) {
    if (model.source !== "sidecar") {
      setMessage("原库模型只读，不能在兼容版中删除。");
      return;
    }
    setMessage("");
    try {
      await deleteJson(`/api/models/${encodeURIComponent(model.id)}`);
      setMessage("模型已删除。");
      await reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="模型管理"
        title="模型配置"
        desc="兼容原模型配置；新增模型先保存到 sidecar 数据库。"
        action={
          <button className="primary-action" type="button" onClick={openCreate}>
            <Plus size={16} />
            接入新模型
          </button>
        }
      />
      {message ? <div className="notice success compact-notice">{message}</div> : null}
      <section className="management-grid">
        {state.models.map((model) => (
          <article className="management-card" key={model.id}>
            <div className="card-title-row">
              <h3>{model.name}</h3>
              <div className="card-actions">
                {model.is_default ? <span className="status status-completed">默认</span> : null}
                <span className="status">{model.source === "sidecar" ? "自建" : "原库"}</span>
              </div>
            </div>
            <div className="kv-grid">
              <Info label="模型 ID" value={model.model} />
              <Info label="API 端点" value={model.base_url || "-"} />
              <Info label="Temperature" value={String(model.temperature)} />
              <Info label="Max Tokens" value={formatNumber(model.max_tokens)} />
              <Info label="Timeout" value={`${model.timeout ?? "-"}s`} />
            </div>
            <div className="card-footer-actions">
              <button className="secondary-action" type="button" onClick={() => void setDefault(model)}>
                设为默认
              </button>
              <button className="secondary-action" type="button" onClick={() => openEdit(model)} disabled={model.source !== "sidecar"}>
                编辑
              </button>
              <button className="danger-action" type="button" onClick={() => void deleteModel(model)} disabled={model.source !== "sidecar"}>
                删除
              </button>
            </div>
          </article>
        ))}
      </section>
      {open ? (
        <Modal title={editingId ? "编辑模型" : "接入新模型"} onClose={() => setOpen(false)}>
          <div className="model-form-grid">
            <label className="field">
              <span>自定义名称 *</span>
              <input value={form.name} onChange={(event) => updateForm("name", event.target.value)} placeholder="例如：GPT-4主力" />
            </label>
            <label className="field">
              <span>服务提供商 *</span>
              <select value={form.provider} onChange={(event) => updateForm("provider", event.target.value)}>
                <option value="custom">Custom (OpenAI Compatible)</option>
                <option value="ollama">Ollama (Local)</option>
              </select>
            </label>
            <label className="field">
              <span>API Key *</span>
              <input value={form.apiKey} onChange={(event) => updateForm("apiKey", event.target.value)} placeholder="sk-..." />
            </label>
            <label className="field">
              <span>Base URL</span>
              <input
                value={form.baseUrl}
                onChange={(event) => updateForm("baseUrl", event.target.value)}
                placeholder={form.provider === "ollama" ? "http://localhost:11434" : "https://api.example.com/v1"}
              />
            </label>
            <label className="field model-field">
              <span>模型 *</span>
              <input value={form.model} onChange={(event) => updateForm("model", event.target.value)} placeholder="gpt-4o" />
            </label>
            <div className="form-divider" />
            <label className="field">
              <span>Temperature</span>
              <input type="number" step="0.1" value={form.temperature} onChange={(event) => updateForm("temperature", Number(event.target.value))} />
            </label>
            <label className="field">
              <span>Max Tokens</span>
              <input type="number" value={form.maxTokens} onChange={(event) => updateForm("maxTokens", Number(event.target.value))} />
            </label>
            <label className="field">
              <span>Timeout (s)</span>
              <input type="number" value={form.timeout} onChange={(event) => updateForm("timeout", Number(event.target.value))} />
            </label>
          </div>
          <div className="modal-actions">
            <button className="secondary-action" type="button" onClick={() => void testConnection()} disabled={Boolean(busy)}>
              <Sparkles size={16} />
              {busy === "test" ? "测试中..." : "测试连接"}
            </button>
            <span className="modal-spacer" />
            <button className="secondary-action" type="button" onClick={() => setOpen(false)}>
              取消
            </button>
            <button className="primary-action" type="button" onClick={() => void createModel()} disabled={Boolean(busy)}>
              {busy === "create" ? "保存中..." : editingId ? "保存配置" : "确认添加"}
            </button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}

type PromptTabKey = "breakthrough" | "identify" | "rewrite" | "continuation";

type IdentifyCategory = {
  id: string;
  name: string;
  conditions: string;
  prompt: string;
};

type RewriteCategoryPrompt = {
  id: string;
  name: string;
  prompt: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function promptValueToText(value: unknown) {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return String(value);
}

function parsePromptJson(text: string | null | undefined): { parsed: unknown | null; failed: boolean } {
  const normalized = (text ?? "").trim();
  if (!normalized || (!normalized.startsWith("{") && !normalized.startsWith("["))) {
    return { parsed: null, failed: false };
  }
  try {
    return { parsed: JSON.parse(normalized), failed: false };
  } catch {
    return { parsed: null, failed: true };
  }
}

function getIdentifyCategories(text: string | null | undefined): IdentifyCategory[] {
  const result = parsePromptJson(text);
  const categories = isRecord(result.parsed) ? result.parsed.categories : null;
  if (!Array.isArray(categories)) return [];
  return categories.filter(isRecord).map((category, index) => ({
    id: promptValueToText(category.id) || `category-${index + 1}`,
    name: promptValueToText(category.name) || `场景 ${index + 1}`,
    conditions: promptValueToText(category.conditions),
    prompt: promptValueToText(category.prompt)
  }));
}

function getRewritePromptSummary(text: string | null | undefined): {
  commonPrompt: string;
  categoryPrompts: RewriteCategoryPrompt[];
  parseFailed: boolean;
  hasStructuredData: boolean;
} {
  const result = parsePromptJson(text);
  if (!isRecord(result.parsed)) {
    return { commonPrompt: "", categoryPrompts: [], parseFailed: result.failed, hasStructuredData: false };
  }
  const rawCategoryPrompts = result.parsed.categoryPrompts;
  const categoryPrompts = isRecord(rawCategoryPrompts)
    ? Object.entries(rawCategoryPrompts)
        .map(([id, value]) => {
          if (isRecord(value)) {
            return {
              id,
              name: promptValueToText(value.name) || id,
              prompt: promptValueToText(value.prompt ?? value.content ?? value.rule)
            };
          }
          return { id, name: id, prompt: promptValueToText(value) };
        })
        .filter((item) => item.prompt.trim() || item.name.trim())
    : [];
  return {
    commonPrompt: promptValueToText(result.parsed.commonPrompt),
    categoryPrompts,
    parseFailed: result.failed,
    hasStructuredData: true
  };
}

function countFilledPromptFields(template: PromptTemplate) {
  return [
    template.breakthrough_template,
    template.identify_template,
    template.rewrite_template,
    template.continuation_context_template,
    template.continuation_outline_template,
    template.continuation_generate_template,
    template.continuation_review_template
  ].filter((value) => Boolean(value?.trim())).length;
}

function compactPromptText(text: string, maxLength = 220) {
  const normalized = text.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength)}...` : normalized;
}

function templateSourceLabel(source: string | null | undefined) {
  return source === "sidecar" ? "自建" : "原库只读";
}

function PromptsPage({ state, reload }: { state: AppData; reload: () => Promise<void> }) {
  const [selectedId, setSelectedId] = useState("");
  const [importOpen, setImportOpen] = useState(false);
  const [importText, setImportText] = useState("");
  const [importMessage, setImportMessage] = useState("");
  const [importValidation, setImportValidation] = useState<PromptTemplateImportValidation | null>(null);
  const [importDuplicateMode, setImportDuplicateMode] = useState<PromptImportDuplicateMode>("");
  const [importBusy, setImportBusy] = useState(false);
  const [editDraft, setEditDraft] = useState<PromptTemplate | null>(null);
  const [saveMessage, setSaveMessage] = useState("");
  const [activePromptTab, setActivePromptTab] = useState<PromptTabKey>("breakthrough");
  const [templateQuery, setTemplateQuery] = useState("");
  const selected = state.templates.find((item) => item.id === (selectedId || state.templates[0]?.id));
  const activeTemplate = editDraft && selected && editDraft.id === selected.id ? editDraft : selected;
  const canEdit = activeTemplate?.source === "sidecar";
  const filteredTemplates = useMemo(() => {
    const keyword = templateQuery.trim().toLowerCase();
    if (!keyword) return state.templates;
    return state.templates.filter((template) => {
      const sourceText = templateSourceLabel(template.source).toLowerCase();
      return template.name.toLowerCase().includes(keyword) || sourceText.includes(keyword) || template.id.toLowerCase().includes(keyword);
    });
  }, [state.templates, templateQuery]);
  const identifyCategories = useMemo(() => getIdentifyCategories(activeTemplate?.identify_template), [activeTemplate?.identify_template]);
  const identifyParseState = useMemo(() => parsePromptJson(activeTemplate?.identify_template), [activeTemplate?.identify_template]);
  const rewriteSummary = useMemo(() => getRewritePromptSummary(activeTemplate?.rewrite_template), [activeTemplate?.rewrite_template]);
  const continuationPromptBlocks: Array<{ label: string; key: keyof PromptTemplate; content: string | null; hint: string }> = activeTemplate
    ? [
        { label: "全书分析", key: "continuation_context_template", content: activeTemplate.continuation_context_template, hint: "整理全书设定、人物关系和续写上下文。" },
        { label: "续写大纲", key: "continuation_outline_template", content: activeTemplate.continuation_outline_template, hint: "生成后续章节走向和阶段安排。" },
        { label: "单章续写", key: "continuation_generate_template", content: activeTemplate.continuation_generate_template, hint: "按当前上下文生成单章正文。" },
        { label: "续写审查", key: "continuation_review_template", content: activeTemplate.continuation_review_template, hint: "检查连贯性、设定一致性和可读性。" }
      ]
    : [];
  const promptTabs: Array<{ key: PromptTabKey; label: string; icon: React.ReactNode; count?: number }> = [
    { key: "breakthrough", label: "系统破甲", icon: <Lock size={15} /> },
    { key: "identify", label: "场景识别", icon: <Target size={15} />, count: identifyCategories.length || undefined },
    { key: "rewrite", label: "改写规则", icon: <PenLine size={15} />, count: rewriteSummary.categoryPrompts.length || undefined },
    { key: "continuation", label: "续写模板", icon: <Sparkles size={15} /> }
  ];

  function resetImportState(nextText = "") {
    setImportText(nextText);
    setImportMessage("");
    setImportValidation(null);
    setImportDuplicateMode("");
  }

  function parseImportPayload(text = importText) {
    return JSON.parse(text);
  }

  async function validateImportTemplate(text = importText) {
    setImportMessage("");
    setImportValidation(null);
    setImportDuplicateMode("");
    const payload = parseImportPayload(text);
    const validation = await postJson<PromptTemplateImportValidation>("/api/prompt-templates/validate-import", payload);
    setImportValidation(validation);
    if (validation.duplicate) {
      setImportMessage("sidecar DB 中已有同名模板，请选择覆盖、另存为新模板或取消导入。");
    } else if (validation.warnings.length) {
      setImportMessage("校验完成，但存在警告；确认无误后仍可导入。");
    } else {
      setImportMessage("校验通过，可以导入。");
    }
    return { payload, validation };
  }

  function handleImportTextChange(value: string) {
    resetImportState(value);
  }

  async function handleImportFile(file: File | null) {
    if (!file) return;
    setImportBusy(true);
    try {
      const text = await file.text();
      resetImportState(text);
      await validateImportTemplate(text);
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setImportBusy(false);
    }
  }

  async function importTemplate() {
    setImportMessage("");
    setImportBusy(true);
    try {
      const { payload, validation } = importValidation ? { payload: parseImportPayload(), validation: importValidation } : await validateImportTemplate();
      if (validation.duplicate && !importDuplicateMode) {
        setImportMessage("sidecar DB 中已有同名模板，请先选择处理方式。");
        return;
      }
      const result = await postJson<{ template: PromptTemplate }>("/api/prompt-templates/import", {
        template: payload,
        duplicateMode: validation.duplicate ? importDuplicateMode : undefined
      });
      setImportMessage("模板已导入 sidecar DB。");
      resetImportState("");
      setImportOpen(false);
      setSelectedId(result.template.id);
      setEditDraft(result.template);
      setActivePromptTab("breakthrough");
      await reload();
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setImportBusy(false);
    }
  }

  function selectTemplate(id: string) {
    setSelectedId(id);
    const next = state.templates.find((item) => item.id === id);
    setEditDraft(next ? { ...next } : null);
    setSaveMessage("");
    setActivePromptTab("breakthrough");
  }

  function updateDraft(key: keyof PromptTemplate, value: string) {
    setEditDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  useEffect(() => {
    if (selected && (!editDraft || editDraft.id !== selected.id)) {
      setEditDraft({ ...selected });
    }
  }, [selected?.id]);

  async function saveTemplate() {
    if (!editDraft || editDraft.source !== "sidecar") {
      setSaveMessage("原库模板只读，不能在兼容版中保存。");
      return;
    }
    setSaveMessage("");
    try {
      await putJson(`/api/prompt-templates/${encodeURIComponent(editDraft.id)}`, editDraft);
      setSaveMessage("模板已保存。");
      await reload();
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : String(error));
    }
  }

  async function deleteTemplate() {
    if (!activeTemplate || activeTemplate.source !== "sidecar") {
      setSaveMessage("原库模板只读，不能在兼容版中删除。");
      return;
    }
    setSaveMessage("");
    try {
      await deleteJson(`/api/prompt-templates/${encodeURIComponent(activeTemplate.id)}`);
      setSaveMessage("模板已删除。");
      setSelectedId("");
      setEditDraft(null);
      await reload();
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="提示词管理"
        title="模板与规则"
        desc="改写模板与续写模板分组管理；原库模板只读，自建模板写入 sidecar 数据库。"
        action={
          <button className="primary-action" type="button" onClick={() => setImportOpen(true)}>
            <Download size={16} />
            导入模板
          </button>
        }
      />
      <section className="prompt-layout prompt-shell">
        <aside className="panel prompt-sidebar">
          <div className="prompt-sidebar-head">
            <div>
              <div className="panel-title">模板库</div>
              <p>{filteredTemplates.length} / {state.templates.length} 个模板</p>
            </div>
          </div>
          <label className="search-box prompt-search">
            <Search size={16} />
            <input
              value={templateQuery}
              onChange={(event) => setTemplateQuery(event.target.value)}
              placeholder="搜索模板名称或来源"
            />
          </label>
          <div className="prompt-template-list">
            {filteredTemplates.length ? (
              filteredTemplates.map((template) => {
                const categoryCount = getIdentifyCategories(template.identify_template).length;
                const rewriteCount = getRewritePromptSummary(template.rewrite_template).categoryPrompts.length;
                const filledCount = countFilledPromptFields(template);
                return (
                  <button
                    key={template.id}
                    type="button"
                    className={template.id === (selected?.id ?? "") ? "prompt-template-card active" : "prompt-template-card"}
                    onClick={() => selectTemplate(template.id)}
                  >
                    <span className="prompt-template-icon">
                      <FileText size={16} />
                    </span>
                    <span className="prompt-template-main">
                      <strong>{template.name}</strong>
                      <span>{categoryCount ? `${categoryCount} 个场景` : "未解析场景"} · {rewriteCount ? `${rewriteCount} 条规则` : "通用规则"}</span>
                    </span>
                    <span className="prompt-template-meta">
                      <em>{templateSourceLabel(template.source)}</em>
                      <small>{filledCount}/7</small>
                    </span>
                  </button>
                );
              })
            ) : (
              <div className="prompt-empty-small">没有匹配的模板</div>
            )}
          </div>
        </aside>
        <div className="prompt-detail prompt-workspace">
          {activeTemplate ? (
            <>
              <div className="prompt-workspace-head">
                <div className="prompt-heading">
                  <span className="prompt-heading-icon">
                    <FileText size={18} />
                  </span>
                  <div>
                    <h3>{activeTemplate.name}</h3>
                    <p>{identifyCategories.length || 0} 个场景规则 · {rewriteSummary.categoryPrompts.length || 0} 条场景改写规则</p>
                  </div>
                </div>
                <div className="card-actions">
                  <span className="status">{templateSourceLabel(activeTemplate.source)}</span>
                  <button className="secondary-action" type="button" onClick={() => void saveTemplate()} disabled={!canEdit}>
                    <Save size={16} />
                    保存全部
                  </button>
                  <button className="danger-action" type="button" onClick={() => void deleteTemplate()} disabled={!canEdit}>
                    <Trash2 size={16} />
                    删除
                  </button>
                </div>
              </div>
              <div className="prompt-meta-row">
                <label className="field prompt-name-field">
                  <span>模板名称</span>
                  <input
                    value={editDraft?.name ?? activeTemplate.name}
                    onChange={(event) => updateDraft("name", event.target.value)}
                    readOnly={!canEdit}
                  />
                </label>
                <div className={canEdit ? "prompt-edit-state editable" : "prompt-edit-state readonly"}>
                  {canEdit ? "可编辑 sidecar 模板" : "原库模板只读"}
                </div>
              </div>
              <div className="prompt-tabbar" role="tablist" aria-label="提示词模板分区">
                {promptTabs.map((tab) => (
                  <button
                    key={tab.key}
                    className={activePromptTab === tab.key ? "prompt-tab active" : "prompt-tab"}
                    type="button"
                    onClick={() => setActivePromptTab(tab.key)}
                    role="tab"
                    aria-selected={activePromptTab === tab.key}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    {tab.count ? <em>{tab.count}</em> : null}
                  </button>
                ))}
              </div>

              {activePromptTab === "breakthrough" ? (
                <div className="prompt-section">
                  <div className="notice warning compact-notice">
                    系统破甲会进入 AI 上下文最前段，适合放全局执行协议、边界和风格约束。
                  </div>
                  <label className="field">
                    <span>系统破甲</span>
                    <textarea
                      className="prompt-preview prompt-editor-large"
                      value={activeTemplate.breakthrough_template || ""}
                      readOnly={!canEdit}
                      onChange={(event) => updateDraft("breakthrough_template", event.target.value)}
                    />
                  </label>
                </div>
              ) : null}

              {activePromptTab === "identify" ? (
                <div className="prompt-section">
                  <div className="prompt-section-head">
                    <div>
                      <h4>剧情场景规则</h4>
                      <p>{identifyCategories.length ? "已从 identifyTemplate.categories 解析为规则列表。" : "当前内容未解析出 categories 数组。"}</p>
                    </div>
                    <span className="prompt-count-pill">{identifyCategories.length} 条</span>
                  </div>
                  {identifyCategories.length ? (
                    <div className="prompt-rule-list">
                      {identifyCategories.map((category, index) => (
                        <details className="prompt-rule-row" key={`${category.id}-${index}`}>
                          <summary>
                            <span className="prompt-rule-index">#{String(index + 1).padStart(2, "0")}</span>
                            <strong>{category.name}</strong>
                            <code>{category.id}</code>
                            <ChevronDown size={15} />
                          </summary>
                          <div className="prompt-rule-body">
                            {category.conditions ? (
                              <div>
                                <span>识别条件</span>
                                <p>{category.conditions}</p>
                              </div>
                            ) : null}
                            {category.prompt ? (
                              <div>
                                <span>提示词</span>
                                <p>{category.prompt}</p>
                              </div>
                            ) : null}
                          </div>
                        </details>
                      ))}
                    </div>
                  ) : identifyParseState.failed ? (
                    <div className="notice warning compact-notice">场景识别内容看起来是 JSON，但当前无法解析，下面保留原始文本编辑。</div>
                  ) : (
                    <div className="prompt-empty-small">没有结构化场景规则，下面可直接编辑原始模板。</div>
                  )}
                  <label className="field">
                    <span>原始场景识别模板</span>
                    <textarea
                      className="prompt-preview prompt-editor-raw"
                      value={activeTemplate.identify_template || ""}
                      readOnly={!canEdit}
                      onChange={(event) => updateDraft("identify_template", event.target.value)}
                    />
                  </label>
                </div>
              ) : null}

              {activePromptTab === "rewrite" ? (
                <div className="prompt-section">
                  <div className="prompt-rule-grid">
                    <div className="prompt-rule-panel">
                      <div className="prompt-section-head compact">
                        <div>
                          <h4>通用指导</h4>
                          <p>适用于所有场景的统一改写规则。</p>
                        </div>
                      </div>
                      <div className="prompt-readable-box">
                        {rewriteSummary.commonPrompt ? compactPromptText(rewriteSummary.commonPrompt, 1200) : compactPromptText(activeTemplate.rewrite_template || "", 1200) || "暂无通用指导"}
                      </div>
                    </div>
                    <div className="prompt-rule-panel">
                      <div className="prompt-section-head compact">
                        <div>
                          <h4>场景特定</h4>
                          <p>按场景补充的改写规则。</p>
                        </div>
                        <span className="prompt-count-pill">{rewriteSummary.categoryPrompts.length} 条</span>
                      </div>
                      {rewriteSummary.categoryPrompts.length ? (
                        <div className="prompt-category-list">
                          {rewriteSummary.categoryPrompts.map((rule, index) => (
                            <details className="prompt-category-rule" key={`${rule.id}-${index}`}>
                              <summary>
                                <strong>{rule.name}</strong>
                                <code>{rule.id}</code>
                                <ChevronDown size={15} />
                              </summary>
                              <p>{rule.prompt}</p>
                            </details>
                          ))}
                        </div>
                      ) : (
                        <div className="prompt-empty-small">{rewriteSummary.parseFailed ? "改写规则 JSON 无法解析。" : "未发现 categoryPrompts，当前仅使用通用规则。"}</div>
                      )}
                    </div>
                  </div>
                  <label className="field">
                    <span>原始改写规则模板</span>
                    <textarea
                      className="prompt-preview prompt-editor-raw"
                      value={activeTemplate.rewrite_template || ""}
                      readOnly={!canEdit}
                      onChange={(event) => updateDraft("rewrite_template", event.target.value)}
                    />
                  </label>
                </div>
              ) : null}

              {activePromptTab === "continuation" ? (
                <div className="prompt-section">
                  <div className="prompt-continuation-grid">
                    {continuationPromptBlocks.map((block) => (
                      <label className="field prompt-continuation-card" key={block.key}>
                        <span>{block.label}</span>
                        <small>{block.hint}</small>
                        <textarea
                          className="prompt-preview"
                          value={block.content || ""}
                          readOnly={!canEdit}
                          onChange={(event) => updateDraft(block.key, event.target.value)}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              ) : null}

              {saveMessage ? <div className="notice success compact-notice">{saveMessage}</div> : null}
            </>
          ) : (
            <div className="empty-state">暂无提示词模板</div>
          )}
        </div>
      </section>
      {importOpen ? (
        <Modal
          title="导入提示词模板"
          onClose={() => {
            setImportOpen(false);
            resetImportState("");
          }}
          size="wide"
        >
          <div className="notice warning compact-notice">
            必需字段：name、rewriteTemplate、identifyTemplate、breakthroughTemplate。续写模板字段仅作为兼容版扩展导入，不会影响原 AI 改写模板。
          </div>
          <div className="import-file-row">
            <label className="file-picker">
              <Upload size={16} />
              选择 JSON 文件
              <input type="file" accept=".json,application/json" onChange={(event) => void handleImportFile(event.target.files?.[0] || null)} />
            </label>
            <button
              className="secondary-action"
              type="button"
              onClick={() => void validateImportTemplate()}
              disabled={!importText.trim() || importBusy}
            >
              <ClipboardCheck size={16} />
              校验预览
            </button>
          </div>
          <label className="field">
            <span>模板 JSON</span>
            <textarea
              className="import-editor"
              value={importText}
              onChange={(event) => handleImportTextChange(event.target.value)}
              placeholder='{"name":"模板名称","rewriteTemplate":"...","identifyTemplate":"...","breakthroughTemplate":"..."}'
            />
          </label>
          {importValidation ? (
            <div className="import-preview-box">
              <div className="panel-title">导入前预览</div>
              <div className="import-preview-grid">
                <div>
                  <span>模板名称</span>
                  <strong>{importValidation.preview.name}</strong>
                </div>
                <div>
                  <span>场景分类数量</span>
                  <strong>{importValidation.preview.sceneCategoryCount}</strong>
                </div>
                <div>
                  <span>系统破甲</span>
                  <strong>{importValidation.preview.hasBreakthroughTemplate ? "包含" : "缺失"}</strong>
                </div>
                <div>
                  <span>场景识别</span>
                  <strong>{importValidation.preview.hasIdentifyTemplate ? "包含" : "缺失"}</strong>
                </div>
                <div>
                  <span>改写规则</span>
                  <strong>{importValidation.preview.hasRewriteTemplate ? "包含" : "缺失"}</strong>
                </div>
                <div>
                  <span>续写模板字段</span>
                  <strong>{importValidation.preview.hasContinuationTemplates ? "包含" : "未包含"}</strong>
                </div>
              </div>
              {importValidation.warnings.length ? (
                <div className="notice warning compact-notice">
                  {importValidation.warnings.map((warning) => (
                    <div key={warning}>{warning}</div>
                  ))}
                </div>
              ) : null}
              {importValidation.duplicate ? (
                <div className="duplicate-choice">
                  <div>
                    <strong>发现同名 sidecar 模板</strong>
                    <span>{importValidation.duplicate.name}</span>
                  </div>
                  <button
                    className={importDuplicateMode === "overwrite" ? "secondary-action active-choice" : "secondary-action"}
                    type="button"
                    onClick={() => setImportDuplicateMode("overwrite")}
                  >
                    覆盖已有模板
                  </button>
                  <button
                    className={importDuplicateMode === "rename" ? "secondary-action active-choice" : "secondary-action"}
                    type="button"
                    onClick={() => setImportDuplicateMode("rename")}
                  >
                    另存为新模板
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          {importMessage ? (
            <div className={importMessage.includes("警告") || importMessage.includes("同名") ? "notice warning compact-notice" : "notice success compact-notice"}>
              {importMessage}
            </div>
          ) : null}
          <div className="modal-actions">
            <span className="modal-spacer" />
            <button
              className="secondary-action"
              type="button"
              onClick={() => {
                setImportOpen(false);
                resetImportState("");
              }}
            >
              取消导入
            </button>
            <button
              className="primary-action"
              type="button"
              onClick={() => void importTemplate()}
              disabled={!importText.trim() || importBusy || Boolean(importValidation?.duplicate && !importDuplicateMode)}
            >
              {importBusy ? "处理中..." : "确认导入"}
            </button>
          </div>
        </Modal>
      ) : null}
    </>
  );
}

function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [originalDbPath, setOriginalDbPath] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const installItems = [
    ["安装目录", "默认固定到 %LOCALAPPDATA%\\FleshOut-Compatible-App，用户数据随安装目录保留在 AppData。"],
    ["快捷入口", "Setup 创建桌面快捷方式和开始菜单项，启动 WebView2 桌面壳。"],
    ["卸载能力", "安装器登记卸载项，清理程序文件，用户数据目录保留或由卸载选项控制。"],
    ["日志目录", "运行日志落到 %LOCALAPPDATA%\\FleshOut-Compatible-App\\logs，便于排查本地服务和模型请求。"],
    ["本地服务", "保留 127.0.0.1 WebView2 架构，安装版启动时使用随机端口。"],
    ["数据边界", "原 fleshout.db 只读，新项目、续写和模型增强数据写入 data/continuations.db 或 .fleshout-workspace。"]
  ];

  useEffect(() => {
    void loadSettings();
  }, []);

  async function loadSettings() {
    setBusy(true);
    setError(null);
    try {
      const result = await fetchJson<AppSettings>("/api/settings");
      setSettings(result);
      setOriginalDbPath(result.originalDb.dbPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function saveSettings() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await putJson<AppSettings>("/api/settings", { originalDbPath });
      setSettings(result);
      setOriginalDbPath(result.originalDb.dbPath);
      setMessage("原库路径已保存到 config.json，后续读取仍保持只读。");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  const sourceText = settings?.originalDb.source === "config"
    ? "config.json"
    : settings?.originalDb.source === "env"
      ? "FLESHOUT_DB 环境变量"
      : "默认路径";

  return (
    <>
      <PageHeader
        eyebrow="设置"
        title="桌面安装与数据路径"
        desc="管理安装版运行策略和原 FleshOut 数据库读取路径；原库始终只读。"
      />
      <section className="continuation-panel settings-path-panel">
        <div className="continuation-header">
          <div>
            <h3>原 FleshOut 数据库</h3>
            <p>换机器或换用户时，在这里指定原应用的 fleshout.db。本应用只读取，不写回。</p>
          </div>
          <span className={settings?.originalDb.exists ? "status status-completed" : "status status-failed"}>
            {settings?.originalDb.exists ? "已找到" : "未找到"}
          </span>
        </div>
        <div className="settings-form">
          <label className="field">
            <span>fleshout.db 路径</span>
            <input
              value={originalDbPath}
              onChange={(event) => setOriginalDbPath(event.target.value)}
              placeholder="C:\\Users\\Admin\\AppData\\Roaming\\com.fleshout.app\\fleshout.db"
            />
          </label>
          <div className="settings-actions">
            <button className="primary-action" type="button" onClick={() => void saveSettings()} disabled={busy || !originalDbPath.trim()}>
              <Save size={16} />
              {busy ? "保存中..." : "保存路径"}
            </button>
            <button className="secondary-action" type="button" onClick={() => void loadSettings()} disabled={busy}>
              <RefreshCw size={16} />
              重新读取
            </button>
          </div>
        </div>
        {message ? <div className="notice">{message}</div> : null}
        {error ? <div className="notice error">{error}</div> : null}
        <div className="settings-info-grid">
          <Info label="当前来源" value={sourceText || "-"} />
          <Info label="配置文件" value={settings?.config.configPath || "-"} />
          <Info label="sidecar DB" value={settings?.sidecarDb.dbPath || "-"} />
          <Info label="只读打开" value={settings?.originalDb.readonly ? "是" : "是"} />
        </div>
      </section>
      <section className="settings-grid">
        {installItems.map(([title, desc]) => (
          <article className="settings-card" key={title}>
            <div className="settings-card-icon">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <h3>{title}</h3>
              <p>{desc}</p>
            </div>
          </article>
        ))}
      </section>
      <section className="continuation-panel">
        <div className="continuation-header">
          <div>
            <h3>当前运行策略</h3>
            <p>先完善 UI/流程结构和数据兼容，再切换到正式 Setup 安装器。</p>
          </div>
        </div>
        <div className="release-roadmap">
          <div className="roadmap-step done">
            <span>1</span>
            <strong>WebView2 壳</strong>
            <p>继续作为桌面外壳承载 React UI 与本地 Node API。</p>
          </div>
          <ArrowRight size={18} />
          <div className="roadmap-step active">
            <span>2</span>
            <strong>Setup 安装器</strong>
            <p>固定目录、快捷方式、开始菜单、卸载项和日志目录。</p>
          </div>
          <ArrowRight size={18} />
          <div className="roadmap-step done">
            <span>3</span>
            <strong>本地服务收敛</strong>
            <p>安装版使用随机端口，WebView2 内部加载，不显示地址栏。</p>
          </div>
        </div>
      </section>
    </>
  );
}

function PageHeader({ eyebrow, title, desc, action }: { eyebrow: string; title: string; desc: string; action?: React.ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h2>{title}</h2>
        <p>{desc}</p>
      </div>
      {action}
    </header>
  );
}

function ProjectSelector({ state, actions }: { state: AppData; actions: AppActions }) {
  return (
    <section className="project-strip">
      <label className="field">
        <span>当前项目</span>
        <select value={state.selectedProjectId ?? ""} onChange={(event) => void actions.selectProject(event.target.value)}>
          {state.projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
      </label>
      {state.detail ? <div className="path-text">{state.detail.project.workspacePath}</div> : null}
    </section>
  );
}

function RewriteProjectBar({ project }: { project: Project }) {
  return (
    <header className="rewrite-project-bar">
      <div>
        <strong>{project.name}</strong>
        <span className="status">{stageLabel(project.current_stage)}</span>
      </div>
      <button className="icon-button dark-icon-button" type="button" title="工作台设置" aria-label="工作台设置">
        <Settings size={17} />
      </button>
    </header>
  );
}

function SplitStageSidePanel({
  summary,
  busy,
  disabled,
  onStart,
  canContinue
}: {
  summary: ReturnType<typeof getStageSummary>;
  busy: boolean;
  disabled: boolean;
  onStart: () => void;
  canContinue: boolean;
}) {
  const progress = summary.total ? Math.round((summary.completed / summary.total) * 100) : 0;
  return (
    <div className="split-side-panel">
      <div className="split-side-action">
        <strong>书籍拆分</strong>
        <div className="progress-track">
          <span style={{ width: `${progress}%` }} />
        </div>
        <em>{formatNumber(summary.completed)} / {formatNumber(summary.total)}</em>
        <button className="primary-action" type="button" onClick={onStart} disabled={canContinue ? false : disabled}>
          {canContinue ? <ArrowRight size={16} /> : <Play size={16} />}
          {busy ? "执行中..." : canContinue ? "继续下一步" : "开始"}
        </button>
      </div>
    </div>
  );
}

function WorkspacePanel({ project }: { project: Project }) {
  return (
    <div className="panel">
      <div className="panel-title">
        <FolderOpen size={17} />
        运行目录
      </div>
      <div className="folder-grid">
        {Object.entries(project.stats).map(([name, count]) => (
          <div className="folder-row" key={name}>
            <span>{name}</span>
            <strong>{count}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function StagePanel({ stageStats }: { stageStats: StageStat[] }) {
  return (
    <div className="panel">
      <div className="panel-title">
        <Layers size={17} />
        阶段状态
      </div>
      <div className="stage-list">
        {stageStats.map((item) => (
          <div className="stage-row" key={`${item.stage}-${item.status}`}>
            <span>{stageLabel(item.stage)}</span>
            <span className={getStatusClass(item.status)}>{statusLabel(item.status)}</span>
            <strong>{item.count}</strong>
          </div>
        ))}
      </div>
    </div>
  );
}

function RewriteWorkbench({ state, actions }: { state: AppData; actions: AppActions }) {
  const detail = state.detail;
  const selectedChapter = detail?.chapters.find((chapter) => chapter.id === state.selectedChapterId) ?? null;

  if (!detail) return null;

  return (
    <section className="continuation-panel">
      <div className="continuation-header">
        <div>
          <h3>单章 AI 改写</h3>
          <p>读取原章节，按选定模型和提示词生成改写结果，并写入 output/。</p>
        </div>
        <div className="header-actions">
          <button
            className="primary-action"
            type="button"
            onClick={() => void actions.generateRewriteByAi()}
            disabled={!state.selectedChapterId || !state.selectedModelId || !state.selectedTemplateId || Boolean(state.aiBusy)}
          >
            <Sparkles size={16} />
            {state.aiBusy === "rewrite" ? "改写中..." : "AI改写本章"}
          </button>
        </div>
      </div>

      <div className="ai-control-grid">
        <label className="field">
          <span>章节</span>
          <select value={state.selectedChapterId ?? ""} onChange={(event) => void actions.selectRewriteChapter(event.target.value)}>
            <option value="">选择章节</option>
            {detail.chapters.map((chapter) => (
              <option key={chapter.id} value={chapter.id}>
                第{chapter.chapter_index}章 {chapter.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>模型</span>
          <select value={state.selectedModelId} onChange={(event) => actions.setSelectedModelId(event.target.value)}>
            {state.models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>来源</span>
          <select value={state.sourceMode} onChange={(event) => actions.setSourceMode(event.target.value)}>
            <option value="original">原文</option>
            <option value="rewritten_preferred">改写版优先</option>
          </select>
        </label>
      </div>

      <div className="ai-control-grid rewrite-control-grid">
        <label className="field">
          <span>提示词模板</span>
          <select value={state.selectedTemplateId} onChange={(event) => actions.setSelectedTemplateId(event.target.value)}>
            {state.templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>目标字数</span>
          <input
            type="number"
            value={state.targetWordCount}
            onChange={(event) => actions.setTargetWordCount(Number(event.target.value))}
          />
        </label>
        <div className="info-box">
          <span>当前章节</span>
          <strong>{selectedChapter ? `第${selectedChapter.chapter_index}章 ${selectedChapter.title}` : "未选择"}</strong>
        </div>
      </div>

      <label className="field">
        <span>补充要求</span>
        <textarea
          className="requirement-editor"
          value={state.userRequirement}
          onChange={(event) => actions.setUserRequirement(event.target.value)}
          placeholder="例如：保持原剧情，增强细节描写和人物心理。"
        />
      </label>

      {state.rewriteOutputPath ? <div className="notice success compact-notice">改写输出：{state.rewriteOutputPath}</div> : null}

      <div className="ai-result-grid">
        <label className="field">
          <span>原章节预览</span>
          <textarea className="ai-result" value={state.chapterContent} readOnly />
        </label>
        <label className="field">
          <span>AI 改写结果</span>
          <textarea
            className="ai-result"
            value={state.rewriteContent}
            onChange={(event) => actions.setRewriteContent(event.target.value)}
            placeholder="点击 AI改写本章后显示结果。"
          />
        </label>
      </div>
    </section>
  );
}

function ChapterTable({
  chapters,
  total,
  query,
  setQuery,
  onRewrite,
  onContinue
}: {
  chapters: Chapter[];
  total: number;
  query: string;
  setQuery: (value: string) => void;
  onRewrite: (chapter: Chapter) => void;
  onContinue: (chapter: Chapter) => void;
}) {
  return (
    <section className="chapter-panel">
      <div className="chapter-toolbar">
        <div>
          <h3>章节</h3>
          <p>{chapters.length} / {total} 条</p>
        </div>
        <label className="search-box">
          <Search size={16} />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索章节序号、标题或文件" />
        </label>
      </div>
      <div className="chapter-table-wrap">
        <table className="chapter-table">
          <thead>
            <tr>
              <th>序号</th>
              <th>标题</th>
              <th>字数</th>
              <th>摘要</th>
              <th>需改写</th>
              <th>改写状态</th>
              <th>操作</th>
              <th>源文件</th>
            </tr>
          </thead>
          <tbody>
            {chapters.map((chapter) => (
              <tr key={chapter.id}>
                <td>{chapter.chapter_index}</td>
                <td className="chapter-title">{chapter.title}</td>
                <td>{formatNumber(chapter.word_count)}</td>
                <td>{chapter.has_summary ? "有" : "无"}</td>
                <td>{chapter.needs_rewrite ? "是" : "否"}</td>
                <td>
                  <span className={getStatusClass(chapter.rewrite_status)}>{statusLabel(chapter.rewrite_status)}</span>
                </td>
                <td>
                  <div className="table-action-row">
                    <button className="text-action" type="button" onClick={() => onRewrite(chapter)}>
                      改写
                    </button>
                    <button className="text-action" type="button" onClick={() => onContinue(chapter)}>
                      续写
                    </button>
                  </div>
                </td>
                <td className="mono">{chapter.original_href}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ContinuationList({
  continuations,
  state,
  actions
}: {
  continuations: Continuation[];
  state: AppData;
  actions: AppActions;
}) {
  return (
    <div className="continuation-list">
      <h4>已保存续写</h4>
      {continuations.length ? (
        <div className="continuation-items">
          {continuations.map((item) => (
            <div className="continuation-item" key={item.id}>
              <div>
                <strong>{item.title}</strong>
                <span>基于第 {item.base_chapter_index} 章 · 第 {item.continuation_index} 章 · v{item.version}</span>
                <code>{item.file_path}</code>
              </div>
              <div className="continuation-item-actions">
                <span className={getStatusClass(item.exported ? "completed" : item.status)}>
                  {item.exported ? "已导出" : statusLabel(item.status)}
                </span>
                <button
                  className="mini-action"
                  type="button"
                  onClick={() => void actions.reviewSavedContinuation(item)}
                  disabled={!state.selectedModelId || Boolean(state.aiBusy)}
                >
                  {state.aiBusy === `review-${item.id}` ? "审查中" : "审查"}
                </button>
                <button
                  className="mini-action primary-mini"
                  type="button"
                  onClick={() => void actions.confirmContinuation(item.id)}
                  disabled={!state.selectedModelId || item.status === "official" || Boolean(state.aiBusy)}
                >
                  {state.aiBusy === `confirm-${item.id}` ? "入库中" : "确认正式"}
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-inline">还没有保存续写。</div>
      )}
    </div>
  );
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="metric">
      <div className="metric-icon">{icon}</div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-box">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Modal({
  title,
  children,
  onClose,
  size = "default"
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  size?: "default" | "wide" | "compare";
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previousPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.paddingRight = previousPaddingRight;
    };
  }, []);

  return (
    <div className="modal-backdrop">
      <section className={size === "compare" ? "modal compare-modal" : size === "wide" ? "modal wide" : "modal"}>
        <header className="modal-header">
          <h3>{title}</h3>
          <button className="icon-button" type="button" onClick={onClose}>
            ×
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
