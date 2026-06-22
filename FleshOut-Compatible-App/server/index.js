import http from "node:http";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import Database from "better-sqlite3";
import { createServer as createViteServer } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const port = Number(process.env.PORT || 5178);
const isDesktop = process.env.FLESHOUT_DESKTOP === "1" || process.env.NODE_ENV === "production";
const distRoot = path.join(root, "dist");
const sidecarDbPath = process.env.FLESHOUT_CONTINUATION_DB || path.join(root, "data", "continuations.db");
const appConfigPath = process.env.FLESHOUT_CONFIG || path.join(root, "config.json");
const fallbackOriginalDbPath = "C:\\Users\\Admin\\AppData\\Roaming\\com.fleshout.app\\fleshout.db";

function json(res, status, payload) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function contentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return (
    {
      ".html": "text/html; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon"
    }[ext] || "application/octet-stream"
  );
}

function readAppConfigSync() {
  if (!fsSync.existsSync(appConfigPath)) return {};
  try {
    return JSON.parse(fsSync.readFileSync(appConfigPath, "utf8"));
  } catch (error) {
    error.message = `CONFIG_READ_FAILED: ${error.message}`;
    throw error;
  }
}

async function writeAppConfig(config) {
  await fs.mkdir(path.dirname(appConfigPath), { recursive: true });
  await fs.writeFile(appConfigPath, `${JSON.stringify(config, null, 2)}\n`, "utf8");
}

function getOriginalDbPathInfo() {
  const config = readAppConfigSync();
  const configuredPath = typeof config.originalDbPath === "string" ? config.originalDbPath.trim() : "";
  const envPath = process.env.FLESHOUT_DB?.trim() || "";
  const dbPath = configuredPath || envPath || fallbackOriginalDbPath;
  const source = configuredPath ? "config" : envPath ? "env" : "default";
  return {
    dbPath,
    source,
    configPath: appConfigPath,
    exists: fsSync.existsSync(dbPath),
    fallbackOriginalDbPath,
    readonly: true
  };
}

async function readSettings() {
  const config = readAppConfigSync();
  return {
    originalDb: getOriginalDbPathInfo(),
    sidecarDb: {
      dbPath: sidecarDbPath,
      exists: fsSync.existsSync(sidecarDbPath)
    },
    config: {
      configPath: appConfigPath,
      exists: fsSync.existsSync(appConfigPath),
      raw: {
        originalDbPath: typeof config.originalDbPath === "string" ? config.originalDbPath : ""
      }
    }
  };
}

async function saveSettings(input) {
  const originalDbPath = String(input?.originalDbPath || "").trim();
  if (!originalDbPath) {
    throw new Error("ORIGINAL_DB_PATH_REQUIRED");
  }
  if (!fsSync.existsSync(originalDbPath) || !fsSync.statSync(originalDbPath).isFile()) {
    throw new Error("ORIGINAL_DB_PATH_NOT_FOUND");
  }
  const nextConfig = { ...readAppConfigSync(), originalDbPath };
  await writeAppConfig(nextConfig);
  return readSettings();
}

async function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requestedPath = decodeURIComponent(url.pathname) === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(distRoot, requestedPath));
  const safeRoot = path.normalize(distRoot + path.sep);
  const candidate = filePath.startsWith(safeRoot) ? filePath : path.join(distRoot, "index.html");
  const finalPath = fsSync.existsSync(candidate) && fsSync.statSync(candidate).isFile()
    ? candidate
    : path.join(distRoot, "index.html");
  const content = await fs.readFile(finalPath);
  res.writeHead(200, {
    "content-type": contentType(finalPath),
    "cache-control": finalPath.endsWith("index.html") ? "no-store" : "public, max-age=31536000, immutable"
  });
  res.end(content);
}

function getDb() {
  return new Database(getOriginalDbPathInfo().dbPath, { readonly: true, fileMustExist: true });
}

async function ensureSidecarDb() {
  await fs.mkdir(path.dirname(sidecarDbPath), { recursive: true });
  const db = new Database(sidecarDbPath);
  db.exec(`
    CREATE TABLE IF NOT EXISTS continuation_chapters (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      base_chapter_id TEXT NOT NULL,
      base_chapter_index INTEGER NOT NULL,
      continuation_index INTEGER NOT NULL,
      title TEXT NOT NULL,
      file_path TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'saved',
      word_count INTEGER DEFAULT 0,
      source_mode TEXT NOT NULL DEFAULT 'original',
      version INTEGER NOT NULL DEFAULT 1,
      exported INTEGER NOT NULL DEFAULT 0,
      official_at TEXT,
      review_report TEXT,
      review_path TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_continuation_project
      ON continuation_chapters(project_id);

    CREATE INDEX IF NOT EXISTS idx_continuation_base_chapter
      ON continuation_chapters(base_chapter_id);

    CREATE TABLE IF NOT EXISTS ai_models (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      provider TEXT NOT NULL,
      api_key TEXT NOT NULL,
      base_url TEXT,
      model TEXT NOT NULL,
      temperature REAL NOT NULL DEFAULT 0.7,
      max_tokens INTEGER NOT NULL DEFAULT 4096,
      timeout INTEGER DEFAULT 300,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS prompt_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      summary_template TEXT,
      rewrite_template TEXT,
      breakthrough_template TEXT,
      identify_template TEXT,
      continuation_context_template TEXT,
      continuation_outline_template TEXT,
      continuation_generate_template TEXT,
      continuation_review_template TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS app_config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      book_path TEXT NOT NULL,
      output_path TEXT NOT NULL,
      source_format TEXT NOT NULL DEFAULT 'txt',
      model_id TEXT,
      template_id TEXT,
      prompt_strategy TEXT,
      user_requirement TEXT,
      current_stage INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'created',
      default_mode TEXT DEFAULT 'manual',
      concurrency INTEGER NOT NULL DEFAULT 1,
      expand_word_count INTEGER NOT NULL DEFAULT 4000,
      total_chapters INTEGER DEFAULT 0,
      total_words INTEGER DEFAULT 0,
      file_size INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      chapter_index INTEGER NOT NULL,
      title TEXT NOT NULL,
      original_href TEXT NOT NULL,
      word_count INTEGER DEFAULT 0,
      summary TEXT,
      needs_rewrite INTEGER NOT NULL DEFAULT 1,
      rewrite_status TEXT DEFAULT 'pending',
      merge_status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      UNIQUE(project_id, chapter_index)
    );

    CREATE INDEX IF NOT EXISTS idx_sidecar_chapters_project
      ON chapters(project_id, chapter_index);

    CREATE TABLE IF NOT EXISTS chapter_stage_status (
      id TEXT PRIMARY KEY,
      chapter_id TEXT NOT NULL,
      stage INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      ignored INTEGER NOT NULL DEFAULT 0,
      error_info TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      UNIQUE(chapter_id, stage)
    );

    CREATE INDEX IF NOT EXISTS idx_sidecar_stage_chapter
      ON chapter_stage_status(chapter_id, stage);

    CREATE TABLE IF NOT EXISTS project_workflow_overrides (
      project_id TEXT PRIMARY KEY,
      display_name TEXT,
      current_stage INTEGER NOT NULL DEFAULT 1,
      status TEXT NOT NULL DEFAULT 'pending',
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS chapter_rewrite_reasons (
      id TEXT PRIMARY KEY,
      chapter_id TEXT NOT NULL,
      type TEXT,
      rewrite_suggestion TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_sidecar_rewrite_reasons_chapter
      ON chapter_rewrite_reasons(chapter_id);

    CREATE TABLE IF NOT EXISTS chapter_memory_snapshots (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      chapter_id TEXT NOT NULL,
      chapter_index INTEGER NOT NULL,
      source_mode TEXT NOT NULL DEFAULT 'original',
      summary TEXT,
      characters_json TEXT,
      locations_json TEXT,
      organizations_json TEXT,
      items_json TEXT,
      events_json TEXT,
      character_state_changes_json TEXT,
      relationship_changes_json TEXT,
      knowledge_changes_json TEXT,
      foreshadowing_changes_json TEXT,
      canon_facts_json TEXT,
      timeline_events_json TEXT,
      conflicts_json TEXT,
      ending_hook TEXT,
      raw_json TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      UNIQUE(project_id, chapter_id, source_mode)
    );

    CREATE INDEX IF NOT EXISTS idx_chapter_memory_project
      ON chapter_memory_snapshots(project_id, chapter_index);

    CREATE TABLE IF NOT EXISTS memory_context_packs (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      base_chapter_id TEXT,
      source_mode TEXT NOT NULL DEFAULT 'original',
      user_requirement TEXT,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE INDEX IF NOT EXISTS idx_memory_context_pack_project
      ON memory_context_packs(project_id, created_at);
  `);

  const promptColumns = db.prepare("PRAGMA table_info(prompt_templates)").all().map((column) => column.name);
  const promptTemplateColumns = [
    ["continuation_context_template", "TEXT"],
    ["continuation_outline_template", "TEXT"],
    ["continuation_generate_template", "TEXT"],
    ["continuation_review_template", "TEXT"]
  ];
  for (const [name, type] of promptTemplateColumns) {
    if (!promptColumns.includes(name)) {
      db.prepare(`ALTER TABLE prompt_templates ADD COLUMN ${name} ${type}`).run();
    }
  }

  const continuationColumns = db.prepare("PRAGMA table_info(continuation_chapters)").all().map((column) => column.name);
  const continuationChapterColumns = [
    ["official_at", "TEXT"],
    ["review_report", "TEXT"],
    ["review_path", "TEXT"]
  ];
  for (const [name, type] of continuationChapterColumns) {
    if (!continuationColumns.includes(name)) {
      db.prepare(`ALTER TABLE continuation_chapters ADD COLUMN ${name} ${type}`).run();
    }
  }

  const projectColumns = db.prepare("PRAGMA table_info(projects)").all().map((column) => column.name);
  const projectExtraColumns = [
    ["template_id", "TEXT"],
    ["prompt_strategy", "TEXT"],
    ["user_requirement", "TEXT"]
  ];
  for (const [name, type] of projectExtraColumns) {
    if (!projectColumns.includes(name)) {
      db.prepare(`ALTER TABLE projects ADD COLUMN ${name} ${type}`).run();
    }
  }

  const workflowOverrideColumns = db.prepare("PRAGMA table_info(project_workflow_overrides)").all().map((column) => column.name);
  if (!workflowOverrideColumns.includes("display_name")) {
    db.prepare("ALTER TABLE project_workflow_overrides ADD COLUMN display_name TEXT").run();
  }

  db.exec(`
    INSERT INTO chapter_stage_status (id, chapter_id, stage, status, ignored)
    SELECT
      lower(hex(randomblob(4))) || '-' ||
        lower(hex(randomblob(2))) || '-' ||
        lower(hex(randomblob(2))) || '-' ||
        lower(hex(randomblob(2))) || '-' ||
        lower(hex(randomblob(6))) AS id,
      c.id,
      s.stage,
      CASE
        WHEN s.stage = 1 THEN 'completed'
        WHEN s.stage = 2 AND c.summary IS NOT NULL AND c.summary <> '' THEN 'completed'
        WHEN s.stage = 3 AND (c.needs_rewrite = 0 OR EXISTS (SELECT 1 FROM chapter_rewrite_reasons r WHERE r.chapter_id = c.id)) THEN 'completed'
        WHEN s.stage = 4 AND c.rewrite_status = 'completed' THEN 'completed'
        WHEN s.stage = 5 AND c.merge_status = 'completed' THEN 'completed'
        ELSE 'pending'
      END AS status,
      CASE
        WHEN s.stage IN (3, 4, 5) AND c.needs_rewrite = 0 THEN 1
        ELSE 0
      END AS ignored
    FROM chapters c
    CROSS JOIN (
      SELECT 1 AS stage UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5
    ) s
    LEFT JOIN chapter_stage_status css
      ON css.chapter_id = c.id AND css.stage = s.stage
    WHERE css.id IS NULL;
  `);

  return db;
}

function getWorkspacePath(project) {
  return path.join(project.output_path, ".fleshout-workspace");
}

function sanitizeFilename(value) {
  return value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_").replace(/\s+/g, " ").trim().slice(0, 80);
}

function countWords(content) {
  const compact = content.replace(/\s+/g, "");
  return compact.length;
}

function clampInteger(value, min, max, fallback) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return fallback;
  return Math.min(max, Math.max(min, Math.round(numberValue)));
}

async function runWithConcurrency(items, concurrency, worker) {
  const queue = [...items];
  let completed = 0;
  let failed = 0;
  const workerCount = Math.min(Math.max(1, concurrency), queue.length || 1);
  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (queue.length) {
        const item = queue.shift();
        if (!item) continue;
        try {
          await worker(item);
          completed += 1;
        } catch {
          failed += 1;
        }
      }
    })
  );
  return { completed, failed };
}

function padIndex(index) {
  return String(index).padStart(3, "0");
}

function userProjectsRoot() {
  return path.join(root, "data", "user-projects");
}

function possibleUserProjectsRoots() {
  const roots = new Set([path.resolve(userProjectsRoot()).toLowerCase()]);
  const cwdRoot = path.resolve(process.cwd(), "data", "user-projects").toLowerCase();
  roots.add(cwdRoot);

  const projectMarker = `${path.sep}FleshOut-Compatible-App${path.sep}`;
  const markerIndex = root.lastIndexOf(projectMarker);
  if (markerIndex !== -1) {
    roots.add(path.resolve(root.slice(0, markerIndex + projectMarker.length), "data", "user-projects").toLowerCase());
  }

  return [...roots];
}

function isSafeUserProjectDir(projectDir) {
  const resolvedProjectDir = path.resolve(projectDir).toLowerCase();
  return possibleUserProjectsRoots().some((safeRoot) => {
    return resolvedProjectDir !== safeRoot && resolvedProjectDir.startsWith(safeRoot + path.sep);
  });
}

function normalizeLineEndings(content) {
  return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
}

function splitTxtIntoChapters(content) {
  const normalized = normalizeLineEndings(content).replace(/^\uFEFF/, "");
  const lines = normalized.split("\n");
  const headingRe = /^\s*(第\s*[0-9零一二三四五六七八九十百千万两〇]+章[^\n]{0,60}|章节\s*[0-9]+[^\n]{0,60}|Chapter\s+[0-9]+[^\n]{0,60})\s*$/i;
  const chapters = [];
  let current = null;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    if (headingRe.test(line.trim())) {
      if (current && current.lines.join("\n").trim()) {
        chapters.push(current);
      }
      current = { title: line.trim(), lines: [line], lineNumber: lineIndex + 1 };
      continue;
    }
    if (!current) {
      current = { title: "正文开篇", lines: [], lineNumber: lineIndex + 1 };
    }
    current.lines.push(line);
  }

  if (current && current.lines.join("\n").trim()) {
    chapters.push(current);
  }

  if (chapters.length > 1) {
    return chapters.map((chapter, index) => ({
      index: index + 1,
      title: chapter.title || `第${index + 1}章`,
      lineNumber: chapter.lineNumber || 1,
      content: chapter.lines.join("\n").trim()
    }));
  }

  const compact = normalized.trim();
  const chunkSize = 6500;
  const fallback = [];
  for (let offset = 0; offset < compact.length; offset += chunkSize) {
    const index = fallback.length + 1;
    fallback.push({
      index,
      title: `第${index}章`,
      lineNumber: compact.slice(0, offset).split("\n").length,
      content: compact.slice(offset, offset + chunkSize).trim()
    });
  }
  return fallback;
}

function previewTxtProject(input) {
  const rawContent = String(input.content || "");
  if (!rawContent.trim()) {
    throw new Error("TXT 内容不能为空");
  }
  const chapters = splitTxtIntoChapters(rawContent);
  const totalWords = chapters.reduce((sum, chapter) => sum + countWords(chapter.content), 0);
  const longestChapter = chapters.reduce((max, chapter) => Math.max(max, countWords(chapter.content)), 0);
  const shortestChapter = chapters.reduce((min, chapter) => Math.min(min, countWords(chapter.content)), chapters.length ? Infinity : 0);
  return {
    totalChapters: chapters.length,
    totalWords,
    fileSize: Buffer.byteLength(rawContent, "utf8"),
    longestChapter,
    shortestChapter: Number.isFinite(shortestChapter) ? shortestChapter : 0,
    chapters: chapters.map((chapter) => ({
      index: chapter.index,
      title: chapter.title,
      lineNumber: chapter.lineNumber || 1,
      wordCount: countWords(chapter.content),
      preview: chapter.content.replace(/\s+/g, " ").slice(0, 160)
    }))
  };
}

function initializeSidecarStageRows(sidecarDb, chapterId, completedStages = []) {
  for (const stage of [1, 2, 3, 4, 5]) {
    sidecarDb
      .prepare(
        `
        INSERT INTO chapter_stage_status (id, chapter_id, stage, status)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(chapter_id, stage) DO UPDATE
        SET status = excluded.status,
            updated_at = datetime('now', 'localtime')
      `
      )
      .run(randomUUID(), chapterId, stage, completedStages.includes(stage) ? "completed" : "pending");
  }
}

function normalizeTemplateOverrideText(value) {
  return typeof value === "string" ? value : null;
}

function templateOverridesChanged(sourceTemplate, overrides) {
  if (!sourceTemplate || !overrides || typeof overrides !== "object") return false;
  const breakthroughTemplate = normalizeTemplateOverrideText(overrides.breakthroughTemplate);
  const identifyTemplate = normalizeTemplateOverrideText(overrides.identifyTemplate);
  const rewriteTemplate = normalizeTemplateOverrideText(overrides.rewriteTemplate);
  return (
    (breakthroughTemplate !== null && breakthroughTemplate !== String(sourceTemplate.breakthrough_template || "")) ||
    (identifyTemplate !== null && identifyTemplate !== String(sourceTemplate.identify_template || "")) ||
    (rewriteTemplate !== null && rewriteTemplate !== String(sourceTemplate.rewrite_template || ""))
  );
}

function clonePromptTemplateForProject(sidecarDb, sourceTemplate, overrides, projectName) {
  const templateId = randomUUID();
  const nowName = new Date().toISOString().replace(/[-:T.Z]/g, "").slice(0, 14);
  const templateName = makeUniquePromptTemplateName(sidecarDb, `${sourceTemplate.name || "提示词模板"} - ${projectName} 自定义 ${nowName}`);
  sidecarDb
    .prepare(
      `
      INSERT INTO prompt_templates (
        id, name, summary_template, rewrite_template, identify_template, breakthrough_template,
        continuation_context_template, continuation_outline_template, continuation_generate_template,
        continuation_review_template
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
    .run(
      templateId,
      templateName,
      sourceTemplate.summary_template ?? null,
      normalizeTemplateOverrideText(overrides.rewriteTemplate) ?? String(sourceTemplate.rewrite_template || ""),
      normalizeTemplateOverrideText(overrides.identifyTemplate) ?? String(sourceTemplate.identify_template || ""),
      normalizeTemplateOverrideText(overrides.breakthroughTemplate) ?? String(sourceTemplate.breakthrough_template || ""),
      sourceTemplate.continuation_context_template ?? null,
      sourceTemplate.continuation_outline_template ?? null,
      sourceTemplate.continuation_generate_template ?? null,
      sourceTemplate.continuation_review_template ?? null
    );
  return templateId;
}

async function createSidecarTxtProject(input) {
  const name = String(input.name || "").trim();
  const rawContent = String(input.content || "");
  if (!name) {
    throw new Error("项目名称不能为空");
  }
  if (!rawContent.trim()) {
    throw new Error("TXT 内容不能为空");
  }

  const projectId = randomUUID();
  const projectDir = path.join(userProjectsRoot(), projectId);
  const workspacePath = path.join(projectDir, ".fleshout-workspace");
  const chaptersDir = path.join(workspacePath, "chapters");
  const outputDir = path.join(workspacePath, "output");
  const aiInputsDir = path.join(workspacePath, "ai-inputs");
  const contextDir = path.join(workspacePath, "_context");
  const sourcePath = path.join(projectDir, `${sanitizeFilename(name) || "book"}.txt`);
  const chapters = splitTxtIntoChapters(rawContent);
  const concurrency = clampInteger(input.concurrency, 1, 30, 3);
  const expandWordCount = clampInteger(input.expandWordCount, 1000, 20000, 4000);
  const sourceTemplate = input.templateId ? await readPromptTemplateForCallAny(input.templateId) : null;
  let totalWords = 0;
  const sidecarDb = await ensureSidecarDb();
  try {
    await fs.mkdir(chaptersDir, { recursive: true });
    await fs.mkdir(outputDir, { recursive: true });
    await fs.mkdir(aiInputsDir, { recursive: true });
    await fs.mkdir(contextDir, { recursive: true });
    await fs.writeFile(sourcePath, rawContent, "utf8");

    for (const chapter of chapters) {
      const safeTitle = sanitizeFilename(chapter.title) || `第${chapter.index}章`;
      const fileName = `${padIndex(chapter.index)}_${safeTitle}.txt`;
      const filePath = path.join(chaptersDir, fileName);
      await fs.writeFile(filePath, chapter.content, "utf8");
      totalWords += countWords(chapter.content);
    }

    sidecarDb.transaction(() => {
      const projectTemplateId = templateOverridesChanged(sourceTemplate, input.templateOverrides)
        ? clonePromptTemplateForProject(sidecarDb, sourceTemplate, input.templateOverrides, name)
        : input.templateId || null;
      sidecarDb
        .prepare(
          `
          INSERT INTO projects (
            id, name, book_path, output_path, source_format, model_id, template_id,
            prompt_strategy, user_requirement, current_stage,
            status, default_mode, concurrency, expand_word_count, total_chapters,
            total_words, file_size
          )
          VALUES (?, ?, ?, ?, 'txt', ?, ?, ?, ?, 1, 'created', 'auto', ?, ?, ?, ?, ?)
        `
        )
        .run(
          projectId,
          name,
          sourcePath,
          projectDir,
          input.modelId || null,
          projectTemplateId,
          String(input.promptStrategy || "rewrite-standard"),
          String(input.userRequirement || ""),
          concurrency,
          expandWordCount,
          chapters.length,
          totalWords,
          Buffer.byteLength(rawContent, "utf8")
        );

      for (const chapter of chapters) {
        const safeTitle = sanitizeFilename(chapter.title) || `第${chapter.index}章`;
        const fileName = `${padIndex(chapter.index)}_${safeTitle}.txt`;
        const wordCount = countWords(chapter.content);
        const chapterId = randomUUID();
        sidecarDb
          .prepare(
            `
            INSERT INTO chapters (
              id, project_id, chapter_index, title, original_href, word_count,
              summary, needs_rewrite, rewrite_status, merge_status
            )
            VALUES (?, ?, ?, ?, ?, ?, '', 1, 'pending', 'pending')
          `
          )
          .run(chapterId, projectId, chapter.index, chapter.title, fileName, wordCount);
        initializeSidecarStageRows(sidecarDb, chapterId, []);
      }
    })();

    return readSidecarProjects(sidecarDb).find((project) => project.id === projectId);
  } catch (error) {
    await fs.rm(projectDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  } finally {
    sidecarDb.close();
  }
}

async function updateSidecarProject(projectId, input) {
  const name = String(input.name || "").trim();
  if (!name) {
    throw new Error("PROJECT_NAME_REQUIRED");
  }
  const sidecarDb = await ensureSidecarDb();
  try {
    const existing = readSidecarProjects(sidecarDb).find((project) => project.id === projectId);
    if (!existing) {
      throw new Error("SIDECAR_PROJECT_NOT_FOUND");
    }
    const concurrency = clampInteger(input.concurrency ?? existing.concurrency, 1, 30, 3);
    const expandWordCount = clampInteger(input.expandWordCount ?? existing.expand_word_count, 1000, 20000, 4000);
    sidecarDb
      .prepare(
        `
        UPDATE projects
        SET
          name = ?,
          model_id = ?,
          template_id = ?,
          prompt_strategy = ?,
          user_requirement = ?,
          concurrency = ?,
          expand_word_count = ?,
          updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `
      )
      .run(
        name,
        input.modelId || existing.model_id || null,
        input.templateId || existing.template_id || null,
        input.promptStrategy ?? existing.prompt_strategy ?? "rewrite-standard",
        input.userRequirement ?? existing.user_requirement ?? "",
        concurrency,
        expandWordCount,
        projectId
      );
    return readSidecarProjects(sidecarDb).find((project) => project.id === projectId);
  } finally {
    sidecarDb.close();
  }
}

async function updateProjectDisplayName(projectId, input) {
  const name = String(input.name || "").trim();
  if (!name) {
    throw new Error("PROJECT_NAME_REQUIRED");
  }

  const sidecarDb = await ensureSidecarDb();
  let originalDb = null;
  let sidecarDbClosed = false;
  try {
    const sidecar = readSidecarProjects(sidecarDb).find((project) => project.id === projectId);
    if (sidecar) {
      sidecarDb.close();
      sidecarDbClosed = true;
      return updateSidecarProject(projectId, input);
    }

    originalDb = getDb();
    const original = readProject(originalDb, projectId);
    if (!original) {
      throw new Error("PROJECT_NOT_FOUND");
    }

    sidecarDb
      .prepare(
        `
        INSERT INTO project_workflow_overrides (project_id, display_name, current_stage, status, updated_at)
        VALUES (?, ?, ?, ?, datetime('now', 'localtime'))
        ON CONFLICT(project_id) DO UPDATE SET
          display_name = excluded.display_name,
          updated_at = excluded.updated_at
      `
      )
      .run(projectId, name, Number(original.current_stage || 1), original.status || "pending");

    const [project] = applyWorkflowOverridesFromDb(sidecarDb, [{ ...original, source: "original" }]);
    return project;
  } finally {
    if (originalDb) originalDb.close();
    if (!sidecarDbClosed) sidecarDb.close();
  }
}

async function deleteSidecarProject(projectId) {
  const sidecarDb = await ensureSidecarDb();
  try {
    const existing = readSidecarProjects(sidecarDb).find((project) => project.id === projectId);
    if (!existing) {
      throw new Error("SIDECAR_PROJECT_NOT_FOUND");
    }

    const projectDir = path.resolve(existing.output_path);
    if (!isSafeUserProjectDir(projectDir)) {
      throw new Error("UNSAFE_PROJECT_DELETE_PATH");
    }

    await fs.rm(projectDir, { recursive: true, force: true });

    sidecarDb.transaction(() => {
      sidecarDb.prepare("DELETE FROM continuation_chapters WHERE project_id = ?").run(projectId);
      sidecarDb.prepare("DELETE FROM chapter_memory_snapshots WHERE project_id = ?").run(projectId);
      sidecarDb.prepare("DELETE FROM memory_context_packs WHERE project_id = ?").run(projectId);
      sidecarDb
        .prepare("DELETE FROM chapter_stage_status WHERE chapter_id IN (SELECT id FROM chapters WHERE project_id = ?)")
        .run(projectId);
      sidecarDb
        .prepare("DELETE FROM chapter_rewrite_reasons WHERE chapter_id IN (SELECT id FROM chapters WHERE project_id = ?)")
        .run(projectId);
      sidecarDb.prepare("DELETE FROM chapters WHERE project_id = ?").run(projectId);
      sidecarDb.prepare("DELETE FROM projects WHERE id = ?").run(projectId);
    })();

    return { deleted: true };
  } finally {
    sidecarDb.close();
  }
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

async function countFiles(dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    return entries.filter((entry) => entry.isFile()).length;
  } catch {
    return 0;
  }
}

async function getWorkspaceStats(project) {
  const workspacePath = getWorkspacePath(project);
  const dirs = ["chapters", "output", "ai-inputs", "_context", "continuations", "exports"];
  const stats = {};

  for (const dir of dirs) {
    stats[dir] = await countFiles(path.join(workspacePath, dir));
  }

  return { workspacePath, stats };
}

function readProjects(db) {
  const rows = db
    .prepare(
      `
      SELECT
        p.id,
        p.name,
        p.book_path,
        p.output_path,
        p.source_format,
        p.model_id,
        NULL AS template_id,
        NULL AS prompt_strategy,
        NULL AS user_requirement,
        p.current_stage,
        p.status,
        p.default_mode,
        p.concurrency,
        p.expand_word_count,
        p.created_at,
        p.updated_at,
        bm.total_chapters,
        bm.total_words,
        bm.file_size
      FROM projects p
      LEFT JOIN book_metadata bm ON bm.project_id = p.id
      ORDER BY p.created_at DESC
    `
    )
    .all();

  return rows;
}

function applyWorkflowOverridesFromDb(sidecarDb, projects) {
  return projects.map((project) => {
    if (project.source === "sidecar") return project;
    const override = sidecarDb
      .prepare("SELECT display_name, current_stage, status, updated_at FROM project_workflow_overrides WHERE project_id = ?")
      .get(project.id);
    return override
      ? {
          ...project,
          name: override.display_name || project.name,
          current_stage: Number(override.current_stage || project.current_stage || 1),
          status: override.status || project.status,
          updated_at: override.updated_at || project.updated_at
        }
      : project;
  });
}

async function applyWorkflowOverrides(projects) {
  const sidecarDb = await ensureSidecarDb();
  try {
    return applyWorkflowOverridesFromDb(sidecarDb, projects);
  } finally {
    sidecarDb.close();
  }
}

function readSidecarProjects(sidecarDb) {
  return sidecarDb
    .prepare(
      `
      SELECT
        id,
        name,
        book_path,
        output_path,
        source_format,
        model_id,
        template_id,
        prompt_strategy,
        user_requirement,
        current_stage,
        status,
        default_mode,
        concurrency,
        expand_word_count,
        created_at,
        updated_at,
        total_chapters,
        total_words,
        file_size
      FROM projects
      ORDER BY created_at DESC
    `
    )
    .all()
    .map((project) => ({ ...project, source: "sidecar" }));
}

async function readAllProjects() {
  const db = getDb();
  const sidecarDb = await ensureSidecarDb();
  try {
    const sidecar = readSidecarProjects(sidecarDb);
    const original = readProjects(db).map((project) => ({ ...project, source: "original" }));
    return applyWorkflowOverridesFromDb(sidecarDb, [...sidecar, ...original]);
  } finally {
    db.close();
    sidecarDb.close();
  }
}

function readProject(db, projectId) {
  return readProjects(db).find((row) => row.id === projectId);
}

async function readAnyProject(projectId) {
  const sidecarDb = await ensureSidecarDb();
  try {
    const sidecar = readSidecarProjects(sidecarDb).find((row) => row.id === projectId);
    if (sidecar) return sidecar;
  } finally {
    sidecarDb.close();
  }
  const db = getDb();
  try {
    const original = readProject(db, projectId);
    const withSource = original ? { ...original, source: "original" } : null;
    if (!withSource) return null;
    const [project] = await applyWorkflowOverrides([withSource]);
    return project;
  } finally {
    db.close();
  }
}

function readChapters(db, projectId) {
  return db
    .prepare(
      `
      SELECT
        c.id,
        c.project_id,
        c."index" AS chapter_index,
        c.title,
        c.original_href,
        c.word_count,
        NULL AS rewritten_word_count,
        c.summary,
        c.needs_rewrite,
        CASE WHEN c.summary IS NULL OR c.summary = '' THEN 0 ELSE 1 END AS has_summary,
        s3.status AS identify_status,
        s4.status AS rewrite_status,
        s4.error_info AS rewrite_error,
        s4.ignored AS rewrite_ignored,
        s5.status AS merge_status,
        GROUP_CONCAT(
          CASE
            WHEN crr.type IS NOT NULL OR crr.rewrite_suggestion IS NOT NULL
            THEN COALESCE(crr.type, '识别原因') || '：' || COALESCE(crr.rewrite_suggestion, '')
          END,
          '\n'
        ) AS rewrite_reasons
      FROM chapters c
      LEFT JOIN chapter_stage_status s3
        ON s3.chapter_id = c.id AND s3.stage = 3
      LEFT JOIN chapter_stage_status s4
        ON s4.chapter_id = c.id AND s4.stage = 4
      LEFT JOIN chapter_stage_status s5
        ON s5.chapter_id = c.id AND s5.stage = 5
      LEFT JOIN chapter_rewrite_reasons crr
        ON crr.chapter_id = c.id
      WHERE c.project_id = ?
      GROUP BY c.id
      ORDER BY c."index" ASC
    `
    )
    .all(projectId);
}

async function readSidecarChapters(projectId) {
  const sidecarDb = await ensureSidecarDb();
  try {
    return sidecarDb
      .prepare(
        `
        SELECT
          chapters.id,
          chapters.project_id,
          chapters.chapter_index,
          chapters.title,
          chapters.original_href,
          chapters.word_count,
          NULL AS rewritten_word_count,
          chapters.summary,
          chapters.needs_rewrite,
          CASE WHEN chapters.summary IS NULL OR chapters.summary = '' THEN 0 ELSE 1 END AS has_summary,
          s3.status AS identify_status,
          COALESCE(s4.status, chapters.rewrite_status) AS rewrite_status,
          s4.error_info AS rewrite_error,
          COALESCE(s4.ignored, 0) AS rewrite_ignored,
          COALESCE(s5.status, chapters.merge_status) AS merge_status,
          GROUP_CONCAT(
            CASE
              WHEN crr.type IS NOT NULL OR crr.rewrite_suggestion IS NOT NULL
              THEN COALESCE(crr.type, '识别原因') || '：' || COALESCE(crr.rewrite_suggestion, '')
            END,
            '\n'
          ) AS rewrite_reasons
        FROM chapters
        LEFT JOIN chapter_stage_status s3
          ON s3.chapter_id = chapters.id AND s3.stage = 3
        LEFT JOIN chapter_stage_status s4
          ON s4.chapter_id = chapters.id AND s4.stage = 4
        LEFT JOIN chapter_stage_status s5
          ON s5.chapter_id = chapters.id AND s5.stage = 5
        LEFT JOIN chapter_rewrite_reasons crr
          ON crr.chapter_id = chapters.id
        WHERE chapters.project_id = ?
        GROUP BY chapters.id
        ORDER BY chapters.chapter_index ASC
      `
      )
      .all(projectId);
  } finally {
    sidecarDb.close();
  }
}

function upsertWorkflowChapters(sidecarDb, project, chapters) {
  const chapterStmt = sidecarDb.prepare(
    `
    INSERT INTO chapters (
      id, project_id, chapter_index, title, original_href, word_count,
      summary, needs_rewrite, rewrite_status, merge_status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending')
    ON CONFLICT(id) DO UPDATE SET
      project_id = excluded.project_id,
      chapter_index = excluded.chapter_index,
      title = excluded.title,
      original_href = excluded.original_href,
      word_count = excluded.word_count,
      summary = CASE
        WHEN (chapters.summary IS NULL OR chapters.summary = '') AND excluded.summary IS NOT NULL AND excluded.summary <> ''
        THEN excluded.summary
        ELSE chapters.summary
      END,
      updated_at = datetime('now', 'localtime')
  `
  );
  const stageStmt = sidecarDb.prepare(
    `
    INSERT INTO chapter_stage_status (id, chapter_id, stage, status, ignored)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(chapter_id, stage) DO UPDATE SET
      status = CASE
        WHEN excluded.status = 'completed' THEN excluded.status
        ELSE chapter_stage_status.status
      END,
      ignored = CASE
        WHEN excluded.status = 'completed' THEN excluded.ignored
        ELSE chapter_stage_status.ignored
      END,
      updated_at = datetime('now', 'localtime')
  `
  );

  sidecarDb.transaction(() => {
    for (const chapter of chapters) {
      chapterStmt.run(
        chapter.id,
        project.id,
        chapter.chapter_index,
        chapter.title,
        chapter.original_href,
        Number(chapter.word_count || 0),
        chapter.summary || "",
        chapter.needs_rewrite ? 1 : 0
      );
      for (const stage of [1, 2, 3, 4, 5]) {
        const initialStatus =
          stage === 1
            ? "completed"
            : stage === 2 && chapter.summary
              ? "completed"
              : stage === 3 && (chapter.identify_status === "completed" || !chapter.needs_rewrite)
                ? "completed"
                : stage === 4 && (chapter.rewrite_status === "completed" || !chapter.needs_rewrite)
                  ? "completed"
                  : stage === 5 && (chapter.merge_status === "completed" || !chapter.needs_rewrite)
                    ? "completed"
                    : "pending";
        const ignored = stage >= 3 && !chapter.needs_rewrite ? 1 : 0;
        stageStmt.run(randomUUID(), chapter.id, stage, initialStatus, ignored);
      }
    }
  })();
}

function syncOriginalRewriteReasons(sidecarDb, originalDb, projectId) {
  const reasons = originalDb
    .prepare(
      `
      SELECT r.id, r.chapter_id, r.type, r.rewrite_suggestion, r.created_at
      FROM chapter_rewrite_reasons r
      JOIN chapters c ON c.id = r.chapter_id
      WHERE c.project_id = ?
    `
    )
    .all(projectId);
  if (!reasons.length) return;

  const deleteStmt = sidecarDb.prepare("DELETE FROM chapter_rewrite_reasons WHERE chapter_id IN (SELECT id FROM chapters WHERE project_id = ?)");
  const insertStmt = sidecarDb.prepare(
    `
    INSERT INTO chapter_rewrite_reasons (id, chapter_id, type, rewrite_suggestion, created_at)
    VALUES (?, ?, ?, ?, COALESCE(?, datetime('now', 'localtime')))
    ON CONFLICT(id) DO UPDATE SET
      type = excluded.type,
      rewrite_suggestion = excluded.rewrite_suggestion
  `
  );

  sidecarDb.transaction(() => {
    deleteStmt.run(projectId);
    for (const reason of reasons) {
      insertStmt.run(
        reason.id || randomUUID(),
        reason.chapter_id,
        reason.type || "识别原因",
        reason.rewrite_suggestion || "",
        reason.created_at || null
      );
    }
  })();
}

async function syncOriginalProjectWorkflow(project, db) {
  if (project?.source === "sidecar") return readSidecarChapters(project.id);
  const originalChapters = readChapters(db, project.id);
  const sidecarDb = await ensureSidecarDb();
  try {
    upsertWorkflowChapters(sidecarDb, project, originalChapters);
    syncOriginalRewriteReasons(sidecarDb, db, project.id);
  } finally {
    sidecarDb.close();
  }
  return readSidecarChapters(project.id);
}

async function ensureWorkflowChapters(project) {
  if (project?.source === "sidecar") {
    return readSidecarChapters(project.id);
  }
  const db = getDb();
  try {
    return syncOriginalProjectWorkflow(project, db);
  } finally {
    db.close();
  }
}

async function readWorkflowChapters(project, db) {
  if (project?.source === "sidecar") return readSidecarChapters(project.id);
  return syncOriginalProjectWorkflow(project, db);
}

async function readAnyChapters(project, db) {
  return readWorkflowChapters(project, db);
}

async function materializeChapterWorkspaceFile(project, chapter) {
  const existingPath = await findChapterFile(project, chapter, "chapters");
  if (existingPath) return existingPath;

  const rawContent = await fs.readFile(project.book_path, "utf8");
  const splitChapters = splitTxtIntoChapters(rawContent);
  const matched =
    splitChapters.find((item) => item.index === Number(chapter.chapter_index)) ||
    splitChapters.find((item) => item.title.trim() === String(chapter.title || "").trim());
  if (!matched?.content?.trim()) {
    throw new Error("CHAPTER_SOURCE_CONTENT_NOT_FOUND");
  }

  const chaptersDir = path.join(getWorkspacePath(project), "chapters");
  await fs.mkdir(chaptersDir, { recursive: true });
  const safeTitle = sanitizeFilename(chapter.title || matched.title) || `第${chapter.chapter_index}章`;
  const fileName = `${padIndex(chapter.chapter_index)}_${safeTitle}.txt`;
  const filePath = path.join(chaptersDir, fileName);
  await fs.writeFile(filePath, matched.content, "utf8");
  return filePath;
}

async function attachRewrittenWordCounts(project, chapters) {
  return Promise.all(
    chapters.map(async (chapter) => {
      if (chapter.rewrite_status !== "completed") {
        return { ...chapter, rewritten_word_count: null };
      }
      try {
        const outputPath = await findChapterFile(project, chapter, "output");
        if (!outputPath) {
          return { ...chapter, rewritten_word_count: null };
        }
        const content = await fs.readFile(outputPath, "utf8");
        return { ...chapter, rewritten_word_count: content.trim() ? countWords(content) : null };
      } catch {
        return { ...chapter, rewritten_word_count: null };
      }
    })
  );
}

async function readSidecarStageStats(projectId) {
  const sidecarDb = await ensureSidecarDb();
  try {
    return sidecarDb
      .prepare(
        `
        SELECT css.stage, css.status, COUNT(*) AS count
        FROM chapter_stage_status css
        JOIN chapters c ON c.id = css.chapter_id
        WHERE c.project_id = ?
        GROUP BY css.stage, css.status
        ORDER BY css.stage, css.status
      `
      )
      .all(projectId);
  } finally {
    sidecarDb.close();
  }
}

async function readWorkflowStageStats(projectId) {
  return readSidecarStageStats(projectId);
}

function countWorkflowStageStatus(stats, stage, status) {
  return Number(stats.find((item) => Number(item.stage) === stage && item.status === status)?.count || 0);
}

function getWorkflowStageTotal(stats, stage, fallback) {
  const total = stats
    .filter((item) => Number(item.stage) === stage)
    .reduce((sum, item) => sum + Number(item.count || 0), 0);
  return total || fallback;
}

function isWorkflowStageComplete(stats, stage, fallback) {
  const total = getWorkflowStageTotal(stats, stage, fallback);
  const completed = countWorkflowStageStatus(stats, stage, "completed");
  return total > 0 && completed >= total;
}

async function assertWorkflowStageAccessible(project, stage) {
  if (stage <= 1) return;
  const chapters = await ensureWorkflowChapters(project);
  const stats = await readWorkflowStageStats(project.id);
  const fallback = chapters.length;
  for (let previous = 1; previous < stage; previous += 1) {
    if (!isWorkflowStageComplete(stats, previous, fallback)) {
      const error = new Error("WORKFLOW_STAGE_LOCKED");
      error.stage = stage;
      error.requiredStage = previous;
      throw error;
    }
  }
}

async function updateSidecarChapterStage(chapterId, stage, status, errorInfo = null, ignored = 0) {
  const sidecarDb = await ensureSidecarDb();
  try {
    sidecarDb
      .prepare(
        `
        INSERT INTO chapter_stage_status (id, chapter_id, stage, status, error_info, ignored)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(chapter_id, stage) DO UPDATE
        SET status = excluded.status,
            error_info = excluded.error_info,
            ignored = excluded.ignored,
            updated_at = datetime('now', 'localtime')
      `
      )
      .run(randomUUID(), chapterId, stage, status, errorInfo, ignored ? 1 : 0);
  } finally {
    sidecarDb.close();
  }
}

async function updateSidecarProjectStage(projectId, currentStage, status = "pending") {
  const sidecarDb = await ensureSidecarDb();
  try {
    sidecarDb
      .prepare(
        `
        UPDATE projects
        SET current_stage = ?, status = ?, updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `
      )
      .run(currentStage, status, projectId);
  } finally {
    sidecarDb.close();
  }
}

async function writeSidecarChapterSummary(chapterId, summary) {
  const sidecarDb = await ensureSidecarDb();
  try {
    sidecarDb
      .prepare("UPDATE chapters SET summary = ?, updated_at = datetime('now', 'localtime') WHERE id = ?")
      .run(summary, chapterId);
  } finally {
    sidecarDb.close();
  }
}

async function writeSidecarRewriteReason(chapterId, type, suggestion, needsRewrite = 1) {
  const sidecarDb = await ensureSidecarDb();
  try {
    sidecarDb.transaction(() => {
      sidecarDb.prepare("DELETE FROM chapter_rewrite_reasons WHERE chapter_id = ?").run(chapterId);
      sidecarDb
        .prepare("INSERT INTO chapter_rewrite_reasons (id, chapter_id, type, rewrite_suggestion) VALUES (?, ?, ?, ?)")
        .run(randomUUID(), chapterId, type, suggestion);
      sidecarDb
        .prepare("UPDATE chapters SET needs_rewrite = ?, updated_at = datetime('now', 'localtime') WHERE id = ?")
        .run(needsRewrite ? 1 : 0, chapterId);
    })();
  } finally {
    sidecarDb.close();
  }
}

async function keepWorkflowChapterOriginal(project, chapterId) {
  await assertWorkflowStageAccessible(project, 3);
  await ensureWorkflowChapters(project);
  const sidecarDb = await ensureSidecarDb();
  try {
    const chapter = sidecarDb
      .prepare("SELECT id FROM chapters WHERE id = ? AND project_id = ?")
      .get(chapterId, project.id);
    if (!chapter) {
      throw new Error("CHAPTER_NOT_FOUND");
    }

    sidecarDb.transaction(() => {
      sidecarDb.prepare("DELETE FROM chapter_rewrite_reasons WHERE chapter_id = ?").run(chapterId);
      sidecarDb
        .prepare("INSERT INTO chapter_rewrite_reasons (id, chapter_id, type, rewrite_suggestion) VALUES (?, ?, ?, ?)")
        .run(randomUUID(), chapterId, "保留原文", "用户在识别阶段标记该章节保留原文。");
      sidecarDb
        .prepare(
          `
          UPDATE chapters
          SET needs_rewrite = 0,
              rewrite_status = 'completed',
              updated_at = datetime('now', 'localtime')
          WHERE id = ?
        `
        )
        .run(chapterId);
      for (const stage of [3, 4]) {
        sidecarDb
          .prepare(
            `
            INSERT INTO chapter_stage_status (id, chapter_id, stage, status, ignored)
            VALUES (?, ?, ?, 'completed', 1)
            ON CONFLICT(chapter_id, stage) DO UPDATE
            SET status = 'completed',
                ignored = 1,
                error_info = NULL,
                updated_at = datetime('now', 'localtime')
          `
          )
          .run(randomUUID(), chapterId, stage);
      }
    })();

    return { kept: true, chapterId };
  } finally {
    sidecarDb.close();
  }
}

function getProjectTemplateId(project, input) {
  return String(input.templateId || project.template_id || "");
}

function getProjectModelId(project, input) {
  return String(input.modelId || project.model_id || "");
}

async function updateWorkflowProjectStage(project, currentStage, status = "pending") {
  if (project?.source === "sidecar") {
    await updateSidecarProjectStage(project.id, currentStage, status);
    return;
  }

  const sidecarDb = await ensureSidecarDb();
  try {
    sidecarDb
      .prepare(
        `
        INSERT INTO project_workflow_overrides (project_id, current_stage, status, updated_at)
        VALUES (?, ?, ?, datetime('now', 'localtime'))
        ON CONFLICT(project_id) DO UPDATE SET
          current_stage = excluded.current_stage,
          status = excluded.status,
          updated_at = excluded.updated_at
      `
      )
      .run(project.id, currentStage, status);
  } finally {
    sidecarDb.close();
  }
}

async function runSplitStage(project) {
  const chapters = await ensureWorkflowChapters(project);
  const chaptersDir = path.join(getWorkspacePath(project), "chapters");
  await fs.mkdir(chaptersDir, { recursive: true });
  let completed = 0;
  for (const chapter of chapters) {
    try {
      await materializeChapterWorkspaceFile(project, chapter);
      await updateSidecarChapterStage(chapter.id, 1, "completed");
      completed += 1;
    } catch (error) {
      await updateSidecarChapterStage(chapter.id, 1, "failed", error instanceof Error ? error.message : String(error));
    }
  }
  await updateWorkflowProjectStage(project, 1, completed === chapters.length ? "split_completed" : "split_failed");
  return { stage: 1, total: chapters.length, completed, failed: chapters.length - completed };
}

async function runSummaryStage(project, input) {
  requireAiCallConfirmation(input);
  const modelId = getProjectModelId(project, input);
  const templateId = getProjectTemplateId(project, input);
  const modelConfig = await readModelForCallAny(modelId);
  const template = (await readPromptTemplateForCallAny(templateId)) || (await readAllPromptTemplates())[0];
  if (!template) throw new Error("PROMPT_TEMPLATE_NOT_FOUND");
  const chapters = await ensureWorkflowChapters(project);
  const limit = Math.max(1, Number(input.limit || chapters.length));
  const selectedChapters = chapters.slice(0, limit);
  const concurrency = clampInteger(input.concurrency || project.concurrency, 1, 30, 1);

  const result = await runWithConcurrency(selectedChapters, concurrency, async (chapter) => {
    try {
      await updateSidecarChapterStage(chapter.id, 2, "running");
      const { content } = await readChapterContent(project, chapter, "original");
      const summaryTemplate =
        template.summary_template ||
        "请为章节生成可供页面展示和后续改写识别使用的 JSON，总结主要事件、人物变化、关键信息和后续伏笔。格式：{\"summary\":\"情节概要\",\"characters\":[{\"name\":\"人物名\",\"detail\":\"本章状态或变化\"}],\"events\":[{\"name\":\"关键事件\",\"detail\":\"事件说明\"}]}。";
      const messages = [
        { role: "system", content: "你是长篇小说章节总结助手。请优先输出严格 JSON，不要附加解释。" },
        {
          role: "user",
          content:
            `书名：${project.name}\n章节：第${chapter.chapter_index}章 ${chapter.title}\n\n总结要求：\n${summaryTemplate}\n\n章节正文：\n${content}`
        }
      ];
      const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
      await writeAiInputFile(project, `summary_${chapter.chapter_index}_${timestamp}.md`, messages.map((item) => `## ${item.role}\n\n${item.content}`).join("\n\n"));
      const summary = await callChatModel(modelConfig, messages, { maxTokens: 1600 });
      await writeSidecarChapterSummary(chapter.id, summary);
      await updateSidecarChapterStage(chapter.id, 2, "completed");
    } catch (error) {
      await updateSidecarChapterStage(chapter.id, 2, "failed", error instanceof Error ? error.message : String(error));
      throw error;
    }
  });
  const { completed, failed } = result;
  await updateWorkflowProjectStage(project, 2, failed ? "summary_failed" : "summary_completed");
  return { stage: 2, total: selectedChapters.length, completed, failed, concurrency };
}

async function runIdentifyStage(project, input) {
  requireAiCallConfirmation(input);
  const modelId = getProjectModelId(project, input);
  const templateId = getProjectTemplateId(project, input);
  const modelConfig = await readModelForCallAny(modelId);
  const template = (await readPromptTemplateForCallAny(templateId)) || (await readAllPromptTemplates())[0];
  if (!template) throw new Error("PROMPT_TEMPLATE_NOT_FOUND");
  const chapters = await ensureWorkflowChapters(project);
  const limit = Math.max(1, Number(input.limit || chapters.length));
  const selectedChapters = chapters.slice(0, limit);
  const concurrency = clampInteger(input.concurrency || project.concurrency, 1, 30, 1);

  const result = await runWithConcurrency(selectedChapters, concurrency, async (chapter) => {
    try {
      await updateSidecarChapterStage(chapter.id, 3, "running");
      const { content } = await readChapterContent(project, chapter, "original");
      const identifyTemplate =
        template.identify_template ||
        "判断该章节是否需要改写加料。请输出 JSON：{\"needsRewrite\":true,\"type\":\"场景类型\",\"reason\":\"原因\",\"suggestion\":\"改写建议\"}。";
      const messages = [
        { role: "system", content: "你是小说改写前的场景识别助手。请严格输出 JSON，不要附加解释。" },
        {
          role: "user",
          content:
            `书名：${project.name}\n章节：第${chapter.chapter_index}章 ${chapter.title}\n章节摘要：${chapter.summary || "暂无"}\n\n识别规则：\n${identifyTemplate}\n\n章节正文：\n${content.slice(0, 12000)}`
        }
      ];
      const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
      await writeAiInputFile(project, `identify_${chapter.chapter_index}_${timestamp}.md`, messages.map((item) => `## ${item.role}\n\n${item.content}`).join("\n\n"));
      const raw = await callChatModel(modelConfig, messages, { maxTokens: 1200 });
      let parsed = null;
      try {
        const jsonText = raw.match(/\{[\s\S]*\}/)?.[0] || raw;
        parsed = JSON.parse(jsonText);
      } catch {
        parsed = { needsRewrite: true, type: inferReasonType(raw), reason: raw.slice(0, 300), suggestion: raw.slice(0, 800) };
      }
      const needsRewrite = parsed.needsRewrite !== false;
      const type = String(parsed.type || parsed.sceneType || "AI识别");
      const suggestion = String(parsed.suggestion || parsed.reason || raw).slice(0, 2000);
      await writeSidecarRewriteReason(chapter.id, type, suggestion, needsRewrite ? 1 : 0);
      await updateSidecarChapterStage(chapter.id, 3, "completed", null, needsRewrite ? 0 : 1);
    } catch (error) {
      await updateSidecarChapterStage(chapter.id, 3, "failed", error instanceof Error ? error.message : String(error));
      throw error;
    }
  });
  const { completed, failed } = result;
  await updateWorkflowProjectStage(project, 3, failed ? "identify_failed" : "identify_completed");
  return { stage: 3, total: selectedChapters.length, completed, failed, concurrency };
}

function inferReasonType(text) {
  if (/战|斗|冲突|动作/.test(text)) return "冲突战斗";
  if (/情|关系|心理/.test(text)) return "情感关系";
  if (/设定|修炼|功法/.test(text)) return "设定扩展";
  return "AI识别";
}

function requireAiCallConfirmation(input) {
  if (input?.confirmAiCall !== true) {
    throw new Error("AI_CALL_CONFIRMATION_REQUIRED");
  }
}

async function runRewriteStage(project, input) {
  requireAiCallConfirmation(input);
  const chapters = (await ensureWorkflowChapters(project)).filter((chapter) => chapter.needs_rewrite && chapter.rewrite_status !== "completed");
  const limit = Math.max(1, Number(input.limit || chapters.length));
  const selectedChapters = chapters.slice(0, limit);
  const concurrency = clampInteger(input.concurrency || project.concurrency, 1, 30, 1);
  const result = await runWithConcurrency(selectedChapters, concurrency, async (chapter) => {
    try {
      await updateSidecarChapterStage(chapter.id, 4, "running");
      await rewriteChapterContent(project, chapter, input);
      await updateSidecarChapterStage(chapter.id, 4, "completed");
    } catch (error) {
      await updateSidecarChapterStage(chapter.id, 4, "failed", error instanceof Error ? error.message : String(error));
      throw error;
    }
  });
  const { completed, failed } = result;
  await updateWorkflowProjectStage(project, 4, failed ? "rewrite_failed" : "rewrite_completed");
  return { stage: 4, total: selectedChapters.length, completed, failed, concurrency };
}

async function runMergeStage(project, input) {
  const chapters = await ensureWorkflowChapters(project);
  const outputParts = [];
  let completed = 0;
  let failed = 0;
  for (const chapter of chapters) {
    try {
      const sourceMode = chapter.needs_rewrite ? "rewritten_preferred" : "original";
      const { content } = await readChapterContent(project, chapter, sourceMode);
      outputParts.push(chapter.title, "", content.trim(), "");
      await updateSidecarChapterStage(chapter.id, 5, "completed", null, chapter.needs_rewrite ? 0 : 1);
      completed += 1;
    } catch (error) {
      failed += 1;
      await updateSidecarChapterStage(chapter.id, 5, "failed", error instanceof Error ? error.message : String(error));
    }
  }
  const exportsPath = path.join(getWorkspacePath(project), "exports");
  await fs.mkdir(exportsPath, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const exportPath = path.join(exportsPath, `${sanitizeFilename(project.name)}_rewrite_merged_${timestamp}.txt`);
  await fs.writeFile(exportPath, outputParts.join("\r\n"), "utf8");
  await updateWorkflowProjectStage(project, 5, failed ? "merge_failed" : "completed");
  return { stage: 5, total: chapters.length, completed, failed, exportPath };
}

async function runWorkflowProjectStage(project, stage, input = {}) {
  await assertWorkflowStageAccessible(project, stage);
  if (stage === 1) return runSplitStage(project, input);
  if (stage === 2) return runSummaryStage(project, input);
  if (stage === 3) return runIdentifyStage(project, input);
  if (stage === 4) return runRewriteStage(project, input);
  if (stage === 5) return runMergeStage(project, input);
  throw new Error("INVALID_STAGE");
}

function readChapter(db, chapterId) {
  return db
    .prepare(
      `
      SELECT
        c.id,
        c.project_id,
        c."index" AS chapter_index,
        c.title,
        c.original_href,
        c.word_count,
        c.summary,
        c.needs_rewrite,
        p.output_path
      FROM chapters c
      JOIN projects p ON p.id = c.project_id
      WHERE c.id = ?
    `
    )
    .get(chapterId);
}

async function readSidecarChapter(chapterId) {
  const sidecarDb = await ensureSidecarDb();
  try {
    return sidecarDb
      .prepare(
        `
        SELECT
          c.id,
          c.project_id,
          c.chapter_index,
          c.title,
          c.original_href,
          c.word_count,
          c.summary,
          c.needs_rewrite,
          p.output_path
        FROM chapters c
        JOIN projects p ON p.id = c.project_id
        WHERE c.id = ?
      `
      )
      .get(chapterId);
  } finally {
    sidecarDb.close();
  }
}

async function readAnyChapter(chapterId, db) {
  const sidecar = await readSidecarChapter(chapterId);
  if (sidecar) return { ...sidecar, source: "sidecar" };
  const original = readChapter(db, chapterId);
  return original ? { ...original, source: "original" } : null;
}

async function findChapterFile(project, chapter, dirName) {
  const dirPath = path.join(getWorkspacePath(project), dirName);
  const prefix = `${padIndex(chapter.chapter_index)}_`;
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const matched = entries.find((entry) => entry.isFile() && entry.name.startsWith(prefix));
    if (matched) return path.join(dirPath, matched.name);
    const hrefPath = path.join(dirPath, chapter.original_href);
    await fs.access(hrefPath);
    return hrefPath;
  } catch {
    return null;
  }
}

async function readChapterContent(project, chapter, sourceMode = "original") {
  const outputPath = sourceMode === "rewritten_preferred" ? await findChapterFile(project, chapter, "output") : null;
  const filePath = outputPath || (await findChapterFile(project, chapter, "chapters"));
  if (!filePath) {
    return { filePath: null, content: "" };
  }
  return { filePath, content: await fs.readFile(filePath, "utf8") };
}

function readModels(db) {
  const models = db
    .prepare(
      `
      SELECT id, name, provider, base_url, model, temperature, max_tokens, timeout, created_at, updated_at
      FROM ai_models
      ORDER BY created_at DESC
    `
    )
    .all();
  return models;
}

function readConfigValue(db, key) {
  const row = db.prepare("SELECT value FROM app_config WHERE key = ?").get(key);
  return row?.value ?? null;
}

function readOriginalDefaultModelId(db) {
  const raw = readConfigValue(db, "ai_settings");
  if (!raw) return null;
  try {
    return JSON.parse(raw).defaultModelId || null;
  } catch {
    return null;
  }
}

function readPromptTemplates(db) {
  const columns = db.prepare("PRAGMA table_info(prompt_templates)").all().map((column) => column.name);
  const continuationContext = columns.includes("continuation_context_template")
    ? "continuation_context_template"
    : "NULL AS continuation_context_template";
  const continuationOutline = columns.includes("continuation_outline_template")
    ? "continuation_outline_template"
    : "NULL AS continuation_outline_template";
  const continuationGenerate = columns.includes("continuation_generate_template")
    ? "continuation_generate_template"
    : "NULL AS continuation_generate_template";
  const continuationReview = columns.includes("continuation_review_template")
    ? "continuation_review_template"
    : "NULL AS continuation_review_template";

  return db
    .prepare(
      `
      SELECT
        id,
        name,
        summary_template,
        rewrite_template,
        breakthrough_template,
        identify_template,
        ${continuationContext},
        ${continuationOutline},
        ${continuationGenerate},
        ${continuationReview},
        created_at,
        updated_at
      FROM prompt_templates
      ORDER BY created_at DESC
    `
    )
    .all();
}

function readPromptTemplateForCall(db, templateId) {
  if (!templateId) return null;
  const rows = readPromptTemplates(db);
  return rows.find((item) => item.id === templateId) || null;
}

async function readPromptTemplateForCallAny(templateId) {
  const db = getDb();
  try {
    const original = readPromptTemplateForCall(db, templateId);
    if (original) return original;
  } finally {
    db.close();
  }

  const sidecarDb = await ensureSidecarDb();
  try {
    return readPromptTemplateForCall(sidecarDb, templateId);
  } finally {
    sidecarDb.close();
  }
}

async function readAllModels() {
  const db = getDb();
  const sidecarDb = await ensureSidecarDb();
  try {
    const defaultModelId = readConfigValue(sidecarDb, "default_model_id") || readOriginalDefaultModelId(db);
    const original = readModels(db).map((item) => ({ ...item, source: "original", is_default: item.id === defaultModelId }));
    const sidecar = readModels(sidecarDb).map((item) => ({ ...item, source: "sidecar", is_default: item.id === defaultModelId }));
    return [...sidecar, ...original];
  } finally {
    db.close();
    sidecarDb.close();
  }
}

async function readAllPromptTemplates() {
  const db = getDb();
  const sidecarDb = await ensureSidecarDb();
  try {
    const original = readPromptTemplates(db).map((item) => ({ ...item, source: "original" }));
    const sidecar = readPromptTemplates(sidecarDb).map((item) => ({ ...item, source: "sidecar" }));
    return [...sidecar, ...original];
  } finally {
    db.close();
    sidecarDb.close();
  }
}

async function readModelStatus() {
  const models = await readAllModels();
  const defaultModel = models.find((model) => model.is_default) || models[0] || null;
  const usableModels = models.filter((model) => {
    if (model.provider === "ollama") return Boolean(model.model);
    return Boolean(model.model && model.base_url);
  });
  return {
    total: models.length,
    usableCount: usableModels.length,
    hasDefault: Boolean(defaultModel),
    defaultModelId: defaultModel?.id || null,
    defaultModelName: defaultModel?.name || null,
    defaultModelProvider: defaultModel?.provider || null,
    models: models.map((model) => ({
      id: model.id,
      name: model.name,
      provider: model.provider,
      model: model.model,
      source: model.source,
      is_default: model.is_default,
      hasBaseUrl: Boolean(model.base_url),
      canCall: model.provider === "ollama" ? Boolean(model.model) : Boolean(model.model && model.base_url)
    }))
  };
}

async function createSidecarModel(input) {
  const sidecarDb = await ensureSidecarDb();
  try {
    const id = randomUUID();
    sidecarDb
      .prepare(
        `
        INSERT INTO ai_models (
          id, name, provider, api_key, base_url, model, temperature, max_tokens, timeout
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      )
      .run(
        id,
        input.name,
        input.provider,
        input.apiKey,
        input.baseUrl,
        input.model,
        Number(input.temperature ?? 0.7),
        Number(input.maxTokens ?? 4096),
        Number(input.timeout ?? 300)
      );
    return { ...sidecarDb.prepare("SELECT id, name, provider, base_url, model, temperature, max_tokens, timeout, created_at, updated_at FROM ai_models WHERE id = ?").get(id), source: "sidecar" };
  } finally {
    sidecarDb.close();
  }
}

async function updateSidecarModel(id, input) {
  const sidecarDb = await ensureSidecarDb();
  try {
    const existing = sidecarDb.prepare("SELECT id FROM ai_models WHERE id = ?").get(id);
    if (!existing) {
      throw new Error("SIDECAR_MODEL_NOT_FOUND");
    }
    sidecarDb
      .prepare(
        `
        UPDATE ai_models
        SET name = ?,
            provider = ?,
            api_key = ?,
            base_url = ?,
            model = ?,
            temperature = ?,
            max_tokens = ?,
            timeout = ?,
            updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `
      )
      .run(
        input.name,
        input.provider,
        input.apiKey,
        input.baseUrl,
        input.model,
        Number(input.temperature ?? 0.7),
        Number(input.maxTokens ?? 4096),
        Number(input.timeout ?? 300),
        id
      );
    return { ...sidecarDb.prepare("SELECT id, name, provider, base_url, model, temperature, max_tokens, timeout, created_at, updated_at FROM ai_models WHERE id = ?").get(id), source: "sidecar" };
  } finally {
    sidecarDb.close();
  }
}

async function deleteSidecarModel(id) {
  const sidecarDb = await ensureSidecarDb();
  try {
    const result = sidecarDb.prepare("DELETE FROM ai_models WHERE id = ?").run(id);
    if (!result.changes) {
      throw new Error("SIDECAR_MODEL_NOT_FOUND");
    }
    const defaultModelId = readConfigValue(sidecarDb, "default_model_id");
    if (defaultModelId === id) {
      sidecarDb.prepare("DELETE FROM app_config WHERE key = 'default_model_id'").run();
    }
    return { ok: true };
  } finally {
    sidecarDb.close();
  }
}

async function setDefaultModel(id) {
  const allModels = await readAllModels();
  if (!allModels.some((model) => model.id === id)) {
    throw new Error("MODEL_NOT_FOUND");
  }
  const sidecarDb = await ensureSidecarDb();
  try {
    sidecarDb
      .prepare(
        `
        INSERT INTO app_config (key, value, updated_at)
        VALUES ('default_model_id', ?, datetime('now', 'localtime'))
        ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
      `
      )
      .run(id);
    return { ok: true, defaultModelId: id };
  } finally {
    sidecarDb.close();
  }
}

function normalizePromptTemplateImport(raw) {
  if (!raw || typeof raw !== "object") {
    throw new Error("模板 JSON 必须是对象");
  }

  const name = raw.name || raw.templateName || raw.title;
  const rewriteTemplate = raw.rewriteTemplate ?? raw.rewrite_template;
  const identifyTemplate = raw.identifyTemplate ?? raw.identify_template;
  const breakthroughTemplate = raw.breakthroughTemplate ?? raw.breakthrough_template;
  const summaryTemplate = raw.summaryTemplate ?? raw.summary_template ?? null;
  const continuationContextTemplate = raw.continuationContextTemplate ?? raw.continuation_context_template ?? null;
  const continuationOutlineTemplate = raw.continuationOutlineTemplate ?? raw.continuation_outline_template ?? null;
  const continuationGenerateTemplate = raw.continuationGenerateTemplate ?? raw.continuation_generate_template ?? null;
  const continuationReviewTemplate = raw.continuationReviewTemplate ?? raw.continuation_review_template ?? null;

  const normalizedName = String(name ?? "").trim();
  const hasTemplateValue = (value) => value !== null && value !== undefined && (typeof value !== "string" || value.trim().length > 0);

  if (!normalizedName || !hasTemplateValue(rewriteTemplate) || !hasTemplateValue(identifyTemplate) || !hasTemplateValue(breakthroughTemplate)) {
    throw new Error("模板缺少必需字段：name, rewriteTemplate, identifyTemplate, breakthroughTemplate");
  }

  function normalizeOptionalTemplate(value) {
    if (value === null || value === undefined) return null;
    return typeof value === "string" ? value : JSON.stringify(value);
  }

  return {
    name: normalizedName,
    rewriteTemplate: typeof rewriteTemplate === "string" ? rewriteTemplate : JSON.stringify(rewriteTemplate),
    identifyTemplate: typeof identifyTemplate === "string" ? identifyTemplate : JSON.stringify(identifyTemplate),
    breakthroughTemplate: typeof breakthroughTemplate === "string" ? breakthroughTemplate : JSON.stringify(breakthroughTemplate),
    summaryTemplate: normalizeOptionalTemplate(summaryTemplate),
    continuationContextTemplate: normalizeOptionalTemplate(continuationContextTemplate),
    continuationOutlineTemplate: normalizeOptionalTemplate(continuationOutlineTemplate),
    continuationGenerateTemplate: normalizeOptionalTemplate(continuationGenerateTemplate),
    continuationReviewTemplate: normalizeOptionalTemplate(continuationReviewTemplate)
  };
}

function tryParseTemplateJson(value) {
  if (typeof value !== "string") {
    return { parsed: value && typeof value === "object" ? value : null, attempted: false, failed: false };
  }
  const text = value.trim();
  if (!text || !["{", "["].includes(text[0])) {
    return { parsed: null, attempted: false, failed: false };
  }
  try {
    return { parsed: JSON.parse(text), attempted: true, failed: false };
  } catch (error) {
    return { parsed: null, attempted: true, failed: true, message: error instanceof Error ? error.message : String(error) };
  }
}

function inspectPromptTemplateImport(raw) {
  const template = normalizePromptTemplateImport(raw);
  const warnings = [];
  const rewriteInner = tryParseTemplateJson(template.rewriteTemplate);
  const identifyInner = tryParseTemplateJson(template.identifyTemplate);

  let sceneCategoryCount = 0;
  let rewriteHasCommonPrompt = false;
  let rewriteHasCategoryPrompts = false;
  let identifyHasCategories = false;

  if (rewriteInner.failed) {
    warnings.push("rewriteTemplate 看起来是 JSON 字符串，但内部 JSON 无法解析；仍可导入为原始文本。");
  } else if (rewriteInner.parsed && typeof rewriteInner.parsed === "object" && !Array.isArray(rewriteInner.parsed)) {
    rewriteHasCommonPrompt = typeof rewriteInner.parsed.commonPrompt === "string" && rewriteInner.parsed.commonPrompt.trim().length > 0;
    rewriteHasCategoryPrompts =
      rewriteInner.parsed.categoryPrompts &&
      typeof rewriteInner.parsed.categoryPrompts === "object" &&
      !Array.isArray(rewriteInner.parsed.categoryPrompts) &&
      Object.keys(rewriteInner.parsed.categoryPrompts).length > 0;
    if (!rewriteHasCommonPrompt && !rewriteHasCategoryPrompts) {
      warnings.push("rewriteTemplate 内部 JSON 未发现 commonPrompt 或 categoryPrompts。");
    }
  }

  if (identifyInner.failed) {
    warnings.push("identifyTemplate 看起来是 JSON 字符串，但内部 JSON 无法解析；仍可导入为原始文本。");
  } else if (identifyInner.parsed && typeof identifyInner.parsed === "object" && !Array.isArray(identifyInner.parsed)) {
    identifyHasCategories = Array.isArray(identifyInner.parsed.categories);
    if (identifyHasCategories) {
      sceneCategoryCount = identifyInner.parsed.categories.length;
    } else {
      warnings.push("identifyTemplate 内部 JSON 未发现 categories 数组。");
    }
  }

  const hasContinuationTemplates = Boolean(
    template.continuationContextTemplate ||
      template.continuationOutlineTemplate ||
      template.continuationGenerateTemplate ||
      template.continuationReviewTemplate
  );

  return {
    template,
    warnings,
    preview: {
      name: template.name,
      sceneCategoryCount,
      hasBreakthroughTemplate: Boolean(template.breakthroughTemplate.trim()),
      hasIdentifyTemplate: Boolean(template.identifyTemplate.trim()),
      hasRewriteTemplate: Boolean(template.rewriteTemplate.trim()),
      hasContinuationTemplates,
      rewriteHasCommonPrompt,
      rewriteHasCategoryPrompts,
      identifyHasCategories
    }
  };
}

async function validateSidecarPromptTemplateImport(raw) {
  const inspection = inspectPromptTemplateImport(raw);
  const sidecarDb = await ensureSidecarDb();
  try {
    const duplicate = sidecarDb
      .prepare("SELECT id, name, created_at, updated_at FROM prompt_templates WHERE name = ? COLLATE NOCASE LIMIT 1")
      .get(inspection.template.name);
    return { preview: inspection.preview, warnings: inspection.warnings, duplicate: duplicate || null };
  } finally {
    sidecarDb.close();
  }
}

function insertSidecarPromptTemplate(sidecarDb, template) {
  const id = randomUUID();
  sidecarDb
    .prepare(
      `
      INSERT INTO prompt_templates (
        id, name, summary_template, rewrite_template, identify_template, breakthrough_template,
        continuation_context_template, continuation_outline_template, continuation_generate_template,
        continuation_review_template
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `
    )
    .run(
      id,
      template.name,
      template.summaryTemplate,
      template.rewriteTemplate,
      template.identifyTemplate,
      template.breakthroughTemplate,
      template.continuationContextTemplate,
      template.continuationOutlineTemplate,
      template.continuationGenerateTemplate,
      template.continuationReviewTemplate
    );
  return id;
}

function updateSidecarPromptTemplateById(sidecarDb, id, template) {
  sidecarDb
    .prepare(
      `
      UPDATE prompt_templates
      SET name = ?,
          summary_template = ?,
          rewrite_template = ?,
          identify_template = ?,
          breakthrough_template = ?,
          continuation_context_template = ?,
          continuation_outline_template = ?,
          continuation_generate_template = ?,
          continuation_review_template = ?,
          updated_at = datetime('now', 'localtime')
      WHERE id = ?
    `
    )
    .run(
      template.name,
      template.summaryTemplate,
      template.rewriteTemplate,
      template.identifyTemplate,
      template.breakthroughTemplate,
      template.continuationContextTemplate,
      template.continuationOutlineTemplate,
      template.continuationGenerateTemplate,
      template.continuationReviewTemplate,
      id
    );
}

function makeUniquePromptTemplateName(sidecarDb, name) {
  const base = `${name} (副本)`;
  let candidate = base;
  let index = 2;
  const exists = sidecarDb.prepare("SELECT id FROM prompt_templates WHERE name = ? COLLATE NOCASE LIMIT 1");
  while (exists.get(candidate)) {
    candidate = `${base} ${index}`;
    index += 1;
  }
  return candidate;
}

async function importSidecarPromptTemplate(raw, options = {}) {
  const inspection = inspectPromptTemplateImport(raw);
  const template = { ...inspection.template };
  const duplicateMode = options.duplicateMode || raw?.duplicateMode || "reject";
  const sidecarDb = await ensureSidecarDb();
  try {
    const duplicate = sidecarDb.prepare("SELECT id, name FROM prompt_templates WHERE name = ? COLLATE NOCASE LIMIT 1").get(template.name);
    let id;
    let importMode = "insert";

    if (duplicate) {
      if (duplicateMode === "overwrite") {
        id = duplicate.id;
        updateSidecarPromptTemplateById(sidecarDb, id, template);
        importMode = "overwrite";
      } else if (duplicateMode === "rename") {
        template.name = makeUniquePromptTemplateName(sidecarDb, template.name);
        id = insertSidecarPromptTemplate(sidecarDb, template);
        importMode = "rename";
      } else {
        const error = new Error("DUPLICATE_TEMPLATE_NAME");
        error.templateName = template.name;
        error.duplicate = duplicate;
        throw error;
      }
    } else {
      id = insertSidecarPromptTemplate(sidecarDb, template);
    }

    return {
      ...sidecarDb.prepare("SELECT * FROM prompt_templates WHERE id = ?").get(id),
      source: "sidecar",
      importMode,
      warnings: inspection.warnings
    };
  } finally {
    sidecarDb.close();
  }
}

async function updateSidecarPromptTemplate(id, input) {
  const sidecarDb = await ensureSidecarDb();
  try {
    const existing = sidecarDb.prepare("SELECT id FROM prompt_templates WHERE id = ?").get(id);
    if (!existing) {
      throw new Error("SIDECAR_TEMPLATE_NOT_FOUND");
    }
    sidecarDb
      .prepare(
        `
        UPDATE prompt_templates
        SET name = ?,
            summary_template = ?,
            rewrite_template = ?,
            identify_template = ?,
            breakthrough_template = ?,
            continuation_context_template = ?,
            continuation_outline_template = ?,
            continuation_generate_template = ?,
            continuation_review_template = ?,
            updated_at = datetime('now', 'localtime')
        WHERE id = ?
      `
      )
      .run(
        String(input.name || "").trim(),
        input.summary_template ?? null,
        input.rewrite_template ?? "",
        input.identify_template ?? "",
        input.breakthrough_template ?? "",
        input.continuation_context_template ?? null,
        input.continuation_outline_template ?? null,
        input.continuation_generate_template ?? null,
        input.continuation_review_template ?? null,
        id
      );
    return { ...sidecarDb.prepare("SELECT * FROM prompt_templates WHERE id = ?").get(id), source: "sidecar" };
  } finally {
    sidecarDb.close();
  }
}

async function deleteSidecarPromptTemplate(id) {
  const sidecarDb = await ensureSidecarDb();
  try {
    const result = sidecarDb.prepare("DELETE FROM prompt_templates WHERE id = ?").run(id);
    if (!result.changes) {
      throw new Error("SIDECAR_TEMPLATE_NOT_FOUND");
    }
    return { ok: true };
  } finally {
    sidecarDb.close();
  }
}

function readModelForCall(db, modelId) {
  return db
    .prepare(
      `
      SELECT id, name, provider, api_key, base_url, model, temperature, max_tokens, timeout
      FROM ai_models
      WHERE id = ?
    `
    )
    .get(modelId);
}

async function readModelForCallAny(modelId) {
  const db = getDb();
  try {
    const original = readModelForCall(db, modelId);
    if (original) return original;
  } finally {
    db.close();
  }

  const sidecarDb = await ensureSidecarDb();
  try {
    return readModelForCall(sidecarDb, modelId);
  } finally {
    sidecarDb.close();
  }
}

async function testModelConnection(input) {
  const provider = String(input.provider || "custom");
  const baseUrl = provider === "ollama" && !input.baseUrl ? "http://localhost:11434" : String(input.baseUrl || "");
  const apiKey = provider === "ollama" ? String(input.apiKey || "ollama") : String(input.apiKey || "");
  const modelConfig = {
    id: "test",
    name: String(input.name || "test"),
    provider,
    api_key: apiKey,
    base_url: baseUrl,
    model: String(input.model || ""),
    temperature: Number(input.temperature ?? 0.7),
    max_tokens: Math.min(Number(input.maxTokens ?? 512), 512),
    timeout: Number(input.timeout ?? 30)
  };

  if (!modelConfig.model) {
    throw new Error("模型 ID 不能为空");
  }

  const content = await callChatModel(
    modelConfig,
    [
      { role: "system", content: "你是连接测试助手。" },
      { role: "user", content: "请只回复 OK。" }
    ],
    { maxTokens: 32, timeoutSeconds: Math.min(modelConfig.timeout, 30) }
  );
  return { ok: true, content };
}

async function callChatModel(modelConfig, messages, options = {}) {
  if (!modelConfig) {
    throw new Error("MODEL_NOT_FOUND");
  }
  if (modelConfig.provider === "ollama") {
    return callOllamaModel(modelConfig, messages, options);
  }
  if (modelConfig.provider !== "custom" && modelConfig.provider !== "openai") {
    throw new Error(`暂不支持 provider: ${modelConfig.provider}`);
  }
  if (!modelConfig.base_url) {
    throw new Error("模型缺少 base_url");
  }
  if (!modelConfig.api_key) {
    throw new Error("模型缺少 api_key");
  }

  const baseUrl = modelConfig.base_url.replace(/\/+$/, "");
  const endpoint = baseUrl.endsWith("/v1") ? `${baseUrl}/chat/completions` : `${baseUrl}/v1/chat/completions`;
  const controller = new AbortController();
  const timeoutMs = Number(options.timeoutSeconds || modelConfig.timeout || 300) * 1000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${modelConfig.api_key}`
      },
      body: JSON.stringify({
        model: modelConfig.model,
        messages,
        temperature: Number(options.temperature ?? modelConfig.temperature ?? 0.7),
        max_tokens: Number(options.maxTokens ?? modelConfig.max_tokens ?? 4096),
        stream: false
      })
    });

    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw };
    }

    if (!response.ok) {
      throw new Error(data?.error?.message || data?.message || raw || `模型请求失败：${response.status}`);
    }

    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("模型响应中没有正文内容");
    }
    return content;
  } finally {
    clearTimeout(timer);
  }
}

async function callOllamaModel(modelConfig, messages, options = {}) {
  const baseUrl = String(modelConfig.base_url || "http://localhost:11434").replace(/\/+$/, "");
  const controller = new AbortController();
  const timeoutMs = Number(options.timeoutSeconds || modelConfig.timeout || 300) * 1000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: modelConfig.model,
        messages,
        stream: false,
        options: {
          temperature: Number(options.temperature ?? modelConfig.temperature ?? 0.7),
          num_predict: Number(options.maxTokens ?? modelConfig.max_tokens ?? 4096)
        }
      })
    });

    const raw = await response.text();
    let data;
    try {
      data = JSON.parse(raw);
    } catch {
      data = { raw };
    }

    if (!response.ok) {
      throw new Error(data?.error || data?.message || raw || `Ollama 请求失败：${response.status}`);
    }

    const content = data?.message?.content;
    if (!content) {
      throw new Error("Ollama 响应中没有正文内容");
    }
    return content;
  } finally {
    clearTimeout(timer);
  }
}

function summarizeChapterForContext(chapter) {
  let summary = chapter.summary || "";
  if (summary.length > 600) {
    summary = `${summary.slice(0, 600)}...`;
  }
  return `第${chapter.chapter_index}章 ${chapter.title}\n字数：${chapter.word_count}\n摘要：${summary || "无摘要"}`;
}

function readChaptersWithSummary(db, projectId) {
  return db
    .prepare(
      `
      SELECT id, project_id, "index" AS chapter_index, title, original_href, word_count, summary, needs_rewrite
      FROM chapters
      WHERE project_id = ?
      ORDER BY "index" ASC
    `
    )
    .all(projectId);
}

async function writeContextFile(project, fileName, payload) {
  const dirPath = path.join(getWorkspacePath(project), "_context");
  await fs.mkdir(dirPath, { recursive: true });
  const filePath = path.join(dirPath, fileName);
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), "utf8");
  return filePath;
}

async function writeAiInputFile(project, fileName, content) {
  const dirPath = path.join(getWorkspacePath(project), "ai-inputs");
  await fs.mkdir(dirPath, { recursive: true });
  const filePath = path.join(dirPath, fileName);
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
}

async function readContextText(project, fileName) {
  try {
    const filePath = path.join(getWorkspacePath(project), "_context", fileName);
    return await fs.readFile(filePath, "utf8");
  } catch {
    return "";
  }
}

function normalizeJsonList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item ?? "").trim()).filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return value
      .split(/\r?\n|[;；]/)
      .map((item) => item.replace(/^[-*]\s*/, "").trim())
      .filter(Boolean);
  }
  return [];
}

function normalizeMemorySnapshot(raw, chapter) {
  const snapshot = raw && typeof raw === "object" ? raw : {};
  return {
    chapterId: String(snapshot.chapterId || chapter.id),
    chapterNumber: Number(snapshot.chapterNumber || chapter.chapter_index),
    chapterTitle: String(snapshot.chapterTitle || chapter.title || ""),
    summary: String(snapshot.summary || ""),
    characters: normalizeJsonList(snapshot.characters),
    locations: normalizeJsonList(snapshot.locations),
    organizations: normalizeJsonList(snapshot.organizations),
    items: normalizeJsonList(snapshot.items),
    events: normalizeJsonList(snapshot.events),
    characterStateChanges: normalizeJsonList(snapshot.characterStateChanges),
    relationshipChanges: normalizeJsonList(snapshot.relationshipChanges),
    knowledgeChanges: normalizeJsonList(snapshot.knowledgeChanges),
    foreshadowingChanges: normalizeJsonList(snapshot.foreshadowingChanges),
    newCanonFacts: normalizeJsonList(snapshot.newCanonFacts || snapshot.canonFacts),
    timelineEvents: normalizeJsonList(snapshot.timelineEvents),
    conflicts: normalizeJsonList(snapshot.conflicts),
    endingHook: String(snapshot.endingHook || "")
  };
}

function extractJsonObject(raw) {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced?.match(/\{[\s\S]*\}/)?.[0] ?? raw.match(/\{[\s\S]*\}/)?.[0];
  if (!candidate) {
    throw new Error("模型没有返回可解析的 JSON");
  }
  return JSON.parse(candidate);
}

function jsonList(value) {
  return JSON.stringify(normalizeJsonList(value));
}

function parseJsonList(value) {
  if (!value) return [];
  try {
    return normalizeJsonList(JSON.parse(value));
  } catch {
    return normalizeJsonList(value);
  }
}

function snapshotRowToObject(row) {
  if (!row) return null;
  return {
    id: row.id,
    projectId: row.project_id,
    chapterId: row.chapter_id,
    chapterNumber: row.chapter_index,
    sourceMode: row.source_mode,
    summary: row.summary || "",
    characters: parseJsonList(row.characters_json),
    locations: parseJsonList(row.locations_json),
    organizations: parseJsonList(row.organizations_json),
    items: parseJsonList(row.items_json),
    events: parseJsonList(row.events_json),
    characterStateChanges: parseJsonList(row.character_state_changes_json),
    relationshipChanges: parseJsonList(row.relationship_changes_json),
    knowledgeChanges: parseJsonList(row.knowledge_changes_json),
    foreshadowingChanges: parseJsonList(row.foreshadowing_changes_json),
    newCanonFacts: parseJsonList(row.canon_facts_json),
    timelineEvents: parseJsonList(row.timeline_events_json),
    conflicts: parseJsonList(row.conflicts_json),
    endingHook: row.ending_hook || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function writeTextContextFile(project, relativePath, content) {
  const filePath = path.join(getWorkspacePath(project), "_context", relativePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
  return filePath;
}

async function writeMemorySnapshotFiles(project, snapshot) {
  const prefix = padIndex(snapshot.chapterNumber);
  const basePath = path.join("memory", "chapter_snapshots");
  const jsonPath = await writeTextContextFile(
    project,
    path.join(basePath, `${prefix}.snapshot.json`),
    JSON.stringify(snapshot, null, 2)
  );
  const md = [
    `# 第${snapshot.chapterNumber}章 记忆快照`,
    "",
    `## 摘要`,
    snapshot.summary || "无",
    "",
    `## 人物`,
    ...(snapshot.characters.length ? snapshot.characters.map((item) => `- ${item}`) : ["- 无"]),
    "",
    `## 人物状态变化`,
    ...(snapshot.characterStateChanges.length ? snapshot.characterStateChanges.map((item) => `- ${item}`) : ["- 无"]),
    "",
    `## 角色认知变化`,
    ...(snapshot.knowledgeChanges.length ? snapshot.knowledgeChanges.map((item) => `- ${item}`) : ["- 无"]),
    "",
    `## 伏笔变化`,
    ...(snapshot.foreshadowingChanges.length ? snapshot.foreshadowingChanges.map((item) => `- ${item}`) : ["- 无"]),
    "",
    `## 时间线`,
    ...(snapshot.timelineEvents.length ? snapshot.timelineEvents.map((item) => `- ${item}`) : ["- 无"]),
    "",
    `## 正史设定`,
    ...(snapshot.newCanonFacts.length ? snapshot.newCanonFacts.map((item) => `- ${item}`) : ["- 无"]),
    "",
    `## 结尾钩子`,
    snapshot.endingHook || "无",
    ""
  ].join("\n");
  const markdownPath = await writeTextContextFile(project, path.join(basePath, `${prefix}.snapshot.md`), md);
  return { jsonPath, markdownPath };
}

async function saveMemorySnapshot(project, chapter, sourceMode, snapshot) {
  const sidecarDb = await ensureSidecarDb();
  try {
    const id = randomUUID();
    sidecarDb
      .prepare(
        `
        INSERT INTO chapter_memory_snapshots (
          id, project_id, chapter_id, chapter_index, source_mode, summary,
          characters_json, locations_json, organizations_json, items_json, events_json,
          character_state_changes_json, relationship_changes_json, knowledge_changes_json,
          foreshadowing_changes_json, canon_facts_json, timeline_events_json, conflicts_json,
          ending_hook, raw_json
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(project_id, chapter_id, source_mode)
        DO UPDATE SET
          chapter_index = excluded.chapter_index,
          summary = excluded.summary,
          characters_json = excluded.characters_json,
          locations_json = excluded.locations_json,
          organizations_json = excluded.organizations_json,
          items_json = excluded.items_json,
          events_json = excluded.events_json,
          character_state_changes_json = excluded.character_state_changes_json,
          relationship_changes_json = excluded.relationship_changes_json,
          knowledge_changes_json = excluded.knowledge_changes_json,
          foreshadowing_changes_json = excluded.foreshadowing_changes_json,
          canon_facts_json = excluded.canon_facts_json,
          timeline_events_json = excluded.timeline_events_json,
          conflicts_json = excluded.conflicts_json,
          ending_hook = excluded.ending_hook,
          raw_json = excluded.raw_json,
          updated_at = datetime('now', 'localtime')
      `
      )
      .run(
        id,
        project.id,
        chapter.id,
        chapter.chapter_index,
        sourceMode,
        snapshot.summary,
        jsonList(snapshot.characters),
        jsonList(snapshot.locations),
        jsonList(snapshot.organizations),
        jsonList(snapshot.items),
        jsonList(snapshot.events),
        jsonList(snapshot.characterStateChanges),
        jsonList(snapshot.relationshipChanges),
        jsonList(snapshot.knowledgeChanges),
        jsonList(snapshot.foreshadowingChanges),
        jsonList(snapshot.newCanonFacts),
        jsonList(snapshot.timelineEvents),
        jsonList(snapshot.conflicts),
        snapshot.endingHook,
        JSON.stringify(snapshot)
      );
    const row = sidecarDb
      .prepare(
        `
        SELECT *
        FROM chapter_memory_snapshots
        WHERE project_id = ? AND chapter_id = ? AND source_mode = ?
      `
      )
      .get(project.id, chapter.id, sourceMode);
    return snapshotRowToObject(row);
  } finally {
    sidecarDb.close();
  }
}

async function extractChapterMemorySnapshot(project, chapter, modelId, sourceMode) {
  const modelConfig = await readModelForCallAny(modelId);
  const { content } = await readChapterContent(project, chapter, sourceMode);
  return extractMemorySnapshotFromContent(project, chapter, modelConfig, sourceMode, content);
}

async function extractMemorySnapshotFromContent(project, chapter, modelConfig, sourceMode, content) {
  if (!content.trim()) {
    throw new Error("章节正文为空，无法提取记忆");
  }
  const messages = [
    {
      role: "system",
      content:
        "你是长篇小说记忆提取助手。请从章节正文中提取结构化记忆，只输出 JSON，不要输出解释。字段缺失时使用空数组或空字符串。"
    },
    {
      role: "user",
      content:
        `章节：第${chapter.chapter_index}章 ${chapter.title}\n\n正文：\n${content.slice(0, 12000)}\n\n` +
        `请输出 JSON：\n` +
        `{"chapterId":"${chapter.id}","chapterNumber":${chapter.chapter_index},"chapterTitle":"${chapter.title}",` +
        `"summary":"200字以内摘要","characters":[],"locations":[],"organizations":[],"items":[],"events":[],` +
        `"characterStateChanges":[],"relationshipChanges":[],"knowledgeChanges":[],"foreshadowingChanges":[],` +
        `"newCanonFacts":[],"timelineEvents":[],"conflicts":[],"endingHook":"章节结尾钩子"}`
    }
  ];
  const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const aiInputPath = await writeAiInputFile(
    project,
    `memory_ingest_${chapter.chapter_index}_${timestamp}.md`,
    messages.map((item) => `## ${item.role}\n\n${item.content}`).join("\n\n")
  );
  const raw = await callChatModel(modelConfig, messages, { maxTokens: 4096 });
  const snapshot = normalizeMemorySnapshot(extractJsonObject(raw), chapter);
  const saved = await saveMemorySnapshot(project, chapter, sourceMode, snapshot);
  const files = await writeMemorySnapshotFiles(project, snapshot);
  await writeAggregateMemoryFile(project, sourceMode);
  return { snapshot: saved, raw, aiInputPath, ...files };
}

async function ingestRecentChapterMemory(project, modelId, sourceMode = "original", limit = 5) {
  const db = getDb();
  try {
    const chapters = (await readAnyChapters(project, db))
      .slice()
      .sort((a, b) => b.chapter_index - a.chapter_index)
      .slice(0, Math.max(1, Math.min(Number(limit || 5), 20)))
      .sort((a, b) => a.chapter_index - b.chapter_index);
    const results = [];
    for (const chapter of chapters) {
      try {
        const result = await extractChapterMemorySnapshot(project, chapter, modelId, sourceMode);
        results.push({
          chapterId: chapter.id,
          chapterIndex: chapter.chapter_index,
          title: chapter.title,
          status: "completed",
          snapshot: result.snapshot,
          markdownPath: result.markdownPath
        });
      } catch (error) {
        results.push({
          chapterId: chapter.id,
          chapterIndex: chapter.chapter_index,
          title: chapter.title,
          status: "failed",
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }
    const aggregate = await writeAggregateMemoryFile(project, sourceMode);
    return {
      total: chapters.length,
      completed: results.filter((item) => item.status === "completed").length,
      failed: results.filter((item) => item.status === "failed").length,
      results,
      aggregate
    };
  } finally {
    db.close();
  }
}

function readMemorySnapshots(sidecarDb, projectId, sourceMode = "original") {
  return sidecarDb
    .prepare(
      `
      SELECT *
      FROM chapter_memory_snapshots
      WHERE project_id = ? AND source_mode = ?
      ORDER BY chapter_index ASC
    `
    )
    .all(projectId, sourceMode)
    .map(snapshotRowToObject);
}

function latestBySubject(lines) {
  const map = new Map();
  for (const line of lines) {
    const value = String(line || "").trim();
    if (!value) continue;
    const index = value.search(/[：:]/);
    const subject = index > 0 ? value.slice(0, index).trim() : value.slice(0, 24);
    map.set(subject, value);
  }
  return Array.from(map.values());
}

function buildAggregateMemory(snapshots) {
  return {
    recentSummaries: snapshots.slice(-8).map((item) => `第${item.chapterNumber}章：${item.summary || "无摘要"}`),
    previousEndingHook: snapshots.at(-1)?.endingHook || "",
    characterStates: latestBySubject(snapshots.flatMap((item) => item.characterStateChanges)),
    characterCognition: latestBySubject(snapshots.flatMap((item) => item.knowledgeChanges)),
    foreshadowing: snapshots.flatMap((item) => item.foreshadowingChanges).filter(Boolean).slice(-30),
    timeline: snapshots.flatMap((item) => item.timelineEvents.map((event) => `第${item.chapterNumber}章：${event}`)).slice(-40),
    canonFacts: snapshots.flatMap((item) => item.newCanonFacts).filter(Boolean).slice(-40),
    conflicts: snapshots.flatMap((item) => item.conflicts).filter(Boolean).slice(-30)
  };
}

async function readMemoryOverview(project, sourceMode = "original") {
  const sidecarDb = await ensureSidecarDb();
  try {
    const snapshots = readMemorySnapshots(sidecarDb, project.id, sourceMode);
    const aggregate = buildAggregateMemory(snapshots);
    const latestContextPack = sidecarDb
      .prepare(
        `
        SELECT id, base_chapter_id, source_mode, user_requirement, content, created_at
        FROM memory_context_packs
        WHERE project_id = ? AND source_mode = ?
        ORDER BY created_at DESC
        LIMIT 1
      `
      )
      .get(project.id, sourceMode);
    return {
      snapshotCount: snapshots.length,
      latestSnapshot: snapshots.at(-1) || null,
      snapshots,
      aggregate,
      latestContextPack
    };
  } finally {
    sidecarDb.close();
  }
}

async function writeAggregateMemoryFile(project, sourceMode = "original") {
  const sidecarDb = await ensureSidecarDb();
  try {
    const snapshots = readMemorySnapshots(sidecarDb, project.id, sourceMode);
    const aggregate = buildAggregateMemory(snapshots);
    const filePath = await writeTextContextFile(
      project,
      path.join("memory", "aggregate_memory.json"),
      JSON.stringify({ projectId: project.id, sourceMode, ...aggregate, updatedAt: new Date().toISOString() }, null, 2)
    );
    return { aggregate, filePath, snapshotCount: snapshots.length };
  } finally {
    sidecarDb.close();
  }
}

function formatListSection(title, items) {
  const list = normalizeJsonList(items);
  if (!list.length) return "";
  return [`## ${title}`, ...list.map((item) => `- ${item}`), ""].join("\n");
}

function trimContextPack(content, budget) {
  const max = Number(budget || 0);
  if (!max || content.length <= max) return content;
  const head = Math.floor(max * 0.55);
  const tail = max - head;
  return `${content.slice(0, head)}\n\n[...上下文已按预算裁剪...]\n\n${content.slice(-tail)}`;
}

async function buildMemoryContextPack(project, chapter, input = {}) {
  const sourceMode = String(input.sourceMode || "original");
  const userRequirement = String(input.userRequirement || "");
  const targetWordCount = Number(input.targetWordCount || project.expand_word_count || 4000);
  const sidecarDb = await ensureSidecarDb();
  try {
    const allSnapshots = readMemorySnapshots(sidecarDb, project.id, sourceMode);
    const previousSnapshots = chapter
      ? allSnapshots.filter((item) => item.chapterNumber <= chapter.chapter_index)
      : allSnapshots;
    const aggregate = buildAggregateMemory(previousSnapshots);
    const projectContext = await readContextText(project, "continuation_project_context.json");
    const outlineText = await readContextText(project, "continuation_outline.json");
    const baseSection = chapter
      ? [`## 当前任务`, `基于第${chapter.chapter_index}章《${chapter.title}》续写下一章，目标字数约 ${targetWordCount}。`, ""].join("\n")
      : "";
    const sections = [
      `# AI续写记忆上下文包`,
      "",
      baseSection,
      userRequirement ? `## 用户续写需求\n${userRequirement}\n` : "",
      formatListSection("最近剧情摘要", aggregate.recentSummaries),
      aggregate.previousEndingHook ? `## 上一章结尾钩子\n${aggregate.previousEndingHook}\n` : "",
      formatListSection("当前人物状态", aggregate.characterStates),
      formatListSection("角色认知状态", aggregate.characterCognition),
      formatListSection("当前伏笔状态", aggregate.foreshadowing),
      formatListSection("时间线", aggregate.timeline),
      formatListSection("禁止违背/正史设定", aggregate.canonFacts),
      formatListSection("冲突记录", aggregate.conflicts),
      projectContext ? `## 全书上下文分析\n${projectContext.slice(0, 5000)}\n` : "",
      outlineText ? `## 续写大纲\n${outlineText.slice(0, 5000)}\n` : ""
    ].filter(Boolean);
    const content = trimContextPack(sections.join("\n"), input.contextBudgetChars || 24000);
    const filePath = await writeTextContextFile(project, path.join("memory", "context_pack_latest.md"), content);
    const id = randomUUID();
    sidecarDb
      .prepare(
        `
        INSERT INTO memory_context_packs (id, project_id, base_chapter_id, source_mode, user_requirement, content)
        VALUES (?, ?, ?, ?, ?, ?)
      `
      )
      .run(id, project.id, chapter?.id || null, sourceMode, userRequirement, content);
    return {
      id,
      content,
      contextPackPath: filePath,
      snapshotCount: previousSnapshots.length,
      aggregate
    };
  } finally {
    sidecarDb.close();
  }
}

async function analyzeContinuationContext(project, modelId, userRequirement) {
  const db = getDb();
  try {
    const modelConfig = (await readModelForCallAny(modelId)) || readModelForCall(db, modelId);
    const chapters = await readWorkflowChapters(project, db);
    const chapterDigest = chapters.map(summarizeChapterForContext).join("\n\n");
    const messages = [
      {
        role: "system",
        content:
          "你是长篇小说结构分析助手。请根据章节摘要整理适合后续续写使用的上下文，重点关注主线、人物关系、设定、当前剧情进度、未解决伏笔、叙事风格。只输出结构化中文内容。"
      },
      {
        role: "user",
        content: `书名：${project.name}\n用户续写需求：${userRequirement || "未填写"}\n\n章节摘要：\n${chapterDigest}`
      }
    ];
    const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
    const aiInputPath = await writeAiInputFile(
      project,
      `continuation_context_${timestamp}.md`,
      messages.map((item) => `## ${item.role}\n\n${item.content}`).join("\n\n")
    );
    const content = await callChatModel(modelConfig, messages, { maxTokens: 4096 });
    const contextPath = await writeContextFile(project, "continuation_project_context.json", {
      projectId: project.id,
      projectName: project.name,
      userRequirement,
      content,
      aiInputPath,
      modelId,
      createdAt: new Date().toISOString()
    });
    return { content, contextPath, aiInputPath };
  } finally {
    db.close();
  }
}

async function generateContinuationOutline(project, modelId, userRequirement, targetChapters) {
  const db = getDb();
  try {
    const modelConfig = (await readModelForCallAny(modelId)) || readModelForCall(db, modelId);
    const contextText = await readContextText(project, "continuation_project_context.json");
    const messages = [
      {
        role: "system",
        content:
          "你是长篇小说续写策划助手。请基于已有小说上下文和用户要求，规划后续章节大纲。每章给出标题、核心事件、人物推进、伏笔处理和结尾钩子。"
      },
      {
        role: "user",
        content: `书名：${project.name}\n计划续写章节数：${targetChapters || 1}\n用户续写需求：${userRequirement || "未填写"}\n\n已有上下文：\n${contextText || "暂无上下文分析，请根据现有信息保守规划。"}`
      }
    ];
    const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
    const aiInputPath = await writeAiInputFile(
      project,
      `continuation_outline_${timestamp}.md`,
      messages.map((item) => `## ${item.role}\n\n${item.content}`).join("\n\n")
    );
    const content = await callChatModel(modelConfig, messages, { maxTokens: 4096 });
    const outlinePath = await writeContextFile(project, "continuation_outline.json", {
      projectId: project.id,
      projectName: project.name,
      userRequirement,
      targetChapters,
      content,
      aiInputPath,
      modelId,
      createdAt: new Date().toISOString()
    });
    return { content, outlinePath, aiInputPath };
  } finally {
    db.close();
  }
}

async function generateContinuationContent(project, chapter, modelId, userRequirement, sourceMode, targetWordCount) {
  const db = getDb();
  try {
    const modelConfig = (await readModelForCallAny(modelId)) || readModelForCall(db, modelId);
    const { content: baseContent } = await readChapterContent(project, chapter, sourceMode);
    const memoryContextPack = await buildMemoryContextPack(project, chapter, {
      sourceMode,
      userRequirement,
      targetWordCount
    });
    const contextText = await readContextText(project, "continuation_project_context.json");
    const outlineText = await readContextText(project, "continuation_outline.json");
    const messages = [
      {
        role: "system",
        content:
          "你是长篇小说续写助手。请严格承接已有剧情、人物关系、叙事视角、语言风格和节奏。不要复述分析过程，直接输出续写章节正文。"
      },
      {
        role: "user",
        content:
          `书名：${project.name}\n基准章节：第${chapter.chapter_index}章 ${chapter.title}\n目标字数：${targetWordCount || project.expand_word_count || 4000}\n用户续写需求：${userRequirement || "自然承接上一章继续写"}\n\n` +
          `记忆上下文包：\n${memoryContextPack.content || "暂无结构化记忆。"}\n\n` +
          `全书上下文：\n${contextText || "暂无全书上下文分析。"}\n\n续写大纲：\n${outlineText || "暂无续写大纲。"}\n\n基准章节正文：\n${baseContent}\n\n请直接输出下一章正文。`
      }
    ];
    const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
    const aiInputPath = await writeAiInputFile(
      project,
      `continuation_generate_${chapter.chapter_index}_${timestamp}.md`,
      messages.map((item) => `## ${item.role}\n\n${item.content}`).join("\n\n")
    );
    const content = await callChatModel(modelConfig, messages, {
      maxTokens: Math.min(Number(modelConfig.max_tokens || 8192), 8192)
    });
    return { content, aiInputPath, contextPackPath: memoryContextPack.contextPackPath, snapshotCount: memoryContextPack.snapshotCount };
  } finally {
    db.close();
  }
}

async function updateWorkflowRewriteStatus(chapterId, status) {
  const sidecarDb = await ensureSidecarDb();
  try {
    sidecarDb
      .prepare("UPDATE chapters SET rewrite_status = ?, updated_at = datetime('now', 'localtime') WHERE id = ?")
      .run(status, chapterId);
  } finally {
    sidecarDb.close();
  }
}

async function rewriteChapterContent(project, chapter, input) {
  requireAiCallConfirmation(input);
  const modelId = String(input.modelId || project.model_id || "");
  const templateId = String(input.templateId || project.template_id || "");
  const sourceMode = String(input.sourceMode || "original");
  const userRequirement = String(input.userRequirement || project.user_requirement || "").trim();
  const targetWordCount = Number(input.targetWordCount || project.expand_word_count || 4000);

  const modelConfig = await readModelForCallAny(modelId);
  const template = (await readPromptTemplateForCallAny(templateId)) || (await readAllPromptTemplates())[0];
  if (!template) {
    throw new Error("PROMPT_TEMPLATE_NOT_FOUND");
  }

  const { filePath: sourcePath, content: chapterContent } = await readChapterContent(project, chapter, sourceMode);
  if (!chapterContent.trim()) {
    throw new Error("CHAPTER_CONTENT_EMPTY");
  }

  const systemTemplate =
    template.breakthrough_template ||
    "你是长篇小说改写助手。请严格保留原章节剧情、人物关系、视角和章节信息，在不改变核心事实的前提下改写正文。";
  const rewriteTemplate =
    template.rewrite_template ||
    "请根据用户要求对章节正文进行改写。直接输出改写后的章节正文，不要输出分析过程。";

  const messages = [
    {
      role: "system",
      content: systemTemplate
    },
    {
      role: "user",
      content:
        `书名：${project.name}\n章节：第${chapter.chapter_index}章 ${chapter.title}\n目标字数：${targetWordCount}\n用户补充要求：${userRequirement || "按当前改写规则处理"}\n\n` +
        `改写规则：\n${rewriteTemplate}\n\n原章节正文：\n${chapterContent}\n\n请直接输出改写后的章节正文。`
    }
  ];

  const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const aiInputPath = await writeAiInputFile(
    project,
    `rewrite_chapter_${chapter.chapter_index}_${timestamp}.md`,
    messages
      .map((item) => `## ${item.role}\n\n${item.content}`)
      .concat([
        `## meta\n\nmodelId: ${modelId}\ntemplateId: ${template.id}\nsourcePath: ${sourcePath || ""}\nsourceMode: ${sourceMode}`
      ])
      .join("\n\n")
  );

  const content = await callChatModel(modelConfig, messages, {
    maxTokens: Math.min(Number(modelConfig?.max_tokens || 8192), 8192)
  });

  const outputDir = path.join(getWorkspacePath(project), "output");
  await fs.mkdir(outputDir, { recursive: true });
  const outputFileName = `${padIndex(chapter.chapter_index)}_${sanitizeFilename(chapter.title || `chapter_${chapter.chapter_index}`)}.txt`;
  const outputPath = path.join(outputDir, outputFileName);
  await fs.writeFile(outputPath, content, "utf8");

  await ensureWorkflowChapters(project);
  await updateWorkflowRewriteStatus(chapter.id, "completed");
  await updateSidecarChapterStage(chapter.id, 4, "completed");

  return {
    content,
    outputPath,
    aiInputPath,
    sourcePath,
    wordCount: countWords(content),
    templateId: template.id
  };
}

function readContinuations(sidecarDb, projectId) {
  return sidecarDb
    .prepare(
      `
      SELECT *
      FROM continuation_chapters
      WHERE project_id = ?
      ORDER BY continuation_index ASC, version ASC, created_at ASC
    `
    )
    .all(projectId);
}

function getNextContinuationIndex(db, sidecarDb, projectId) {
  const maxChapter = db
    .prepare('SELECT COALESCE(MAX("index"), 0) AS max_index FROM chapters WHERE project_id = ?')
    .get(projectId).max_index;
  const maxContinuation = sidecarDb
    .prepare("SELECT COALESCE(MAX(continuation_index), 0) AS max_index FROM continuation_chapters WHERE project_id = ?")
    .get(projectId).max_index;
  return Math.max(maxChapter, maxContinuation) + 1;
}

async function saveContinuation({ project, chapter, title, content, sourceMode }) {
  const sidecarDb = await ensureSidecarDb();
  try {
    const db = getDb();
    try {
      const continuationIndex = getNextContinuationIndex(db, sidecarDb, project.id);
      const existingVersion = sidecarDb
        .prepare(
          "SELECT COALESCE(MAX(version), 0) AS max_version FROM continuation_chapters WHERE project_id = ? AND continuation_index = ?"
        )
        .get(project.id, continuationIndex).max_version;
      const version = existingVersion + 1;
      const safeTitle = sanitizeFilename(title || `续写_基于第${chapter.chapter_index}章`);
      const workspacePath = getWorkspacePath(project);
      const continuationsPath = path.join(workspacePath, "continuations");
      await fs.mkdir(continuationsPath, { recursive: true });
      const fileName = `${padIndex(continuationIndex)}_${safeTitle}_v${version}.txt`;
      const filePath = path.join(continuationsPath, fileName);
      await fs.writeFile(filePath, content, "utf8");

      const id = randomUUID();
      sidecarDb
        .prepare(
          `
          INSERT INTO continuation_chapters (
            id, project_id, base_chapter_id, base_chapter_index,
            continuation_index, title, file_path, status, word_count,
            source_mode, version
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, 'saved', ?, ?, ?)
        `
        )
        .run(
          id,
          project.id,
          chapter.id,
          chapter.chapter_index,
          continuationIndex,
          title,
          filePath,
          countWords(content),
          sourceMode,
          version
        );
      return sidecarDb.prepare("SELECT * FROM continuation_chapters WHERE id = ?").get(id);
    } finally {
      db.close();
    }
  } finally {
    sidecarDb.close();
  }
}

function continuationToChapter(continuation) {
  return {
    id: `continuation:${continuation.id}`,
    project_id: continuation.project_id,
    chapter_index: continuation.continuation_index,
    title: continuation.title,
    original_href: continuation.file_path,
    word_count: continuation.word_count || 0,
    summary: null,
    needs_rewrite: 0,
    source: "continuation"
  };
}

async function confirmContinuationOfficial(project, continuationId, modelId) {
  const sidecarDb = await ensureSidecarDb();
  try {
    const continuation = sidecarDb
      .prepare("SELECT * FROM continuation_chapters WHERE id = ? AND project_id = ?")
      .get(continuationId, project.id);
    if (!continuation) {
      throw new Error("CONTINUATION_NOT_FOUND");
    }
    if (continuation.status === "official") {
      const snapshots = readMemorySnapshots(sidecarDb, project.id, "original");
      return { continuation, snapshot: snapshots.find((item) => item.chapterId === `continuation:${continuation.id}`) || null };
    }

    const modelConfig = await readModelForCallAny(modelId);
    const content = await fs.readFile(continuation.file_path, "utf8");
    const chapter = continuationToChapter(continuation);
    const memory = await extractMemorySnapshotFromContent(project, chapter, modelConfig, "original", content);
    sidecarDb
      .prepare(
        `
        UPDATE continuation_chapters
        SET status = 'official',
            official_at = datetime('now', 'localtime'),
            updated_at = datetime('now', 'localtime')
        WHERE id = ? AND project_id = ?
      `
      )
      .run(continuationId, project.id);
    const updated = sidecarDb.prepare("SELECT * FROM continuation_chapters WHERE id = ?").get(continuationId);
    return { continuation: updated, ...memory };
  } finally {
    sidecarDb.close();
  }
}

async function reviewContinuationContent(project, modelId, input) {
  const modelConfig = await readModelForCallAny(modelId);
  let title = String(input.title || "未命名续写");
  let content = String(input.content || "");
  let continuationRow = null;
  if (input.continuationId && !content.trim()) {
    const sidecarDb = await ensureSidecarDb();
    try {
      continuationRow = sidecarDb
        .prepare("SELECT * FROM continuation_chapters WHERE id = ? AND project_id = ?")
        .get(String(input.continuationId), project.id);
      if (!continuationRow) {
        throw new Error("CONTINUATION_NOT_FOUND");
      }
      title = continuationRow.title;
      content = await fs.readFile(continuationRow.file_path, "utf8");
    } finally {
      sidecarDb.close();
    }
  }
  if (!content.trim()) {
    throw new Error("EMPTY_CONTENT");
  }
  const sourceMode = String(input.sourceMode || "original");
  const userRequirement = String(input.userRequirement || "");
  const baseChapterId = input.baseChapterId ? String(input.baseChapterId) : null;
  const memoryPack = baseChapterId
    ? await buildMemoryContextPack(project, { id: baseChapterId, chapter_index: Number(input.baseChapterIndex || 0), title: "基准章节" }, {
        sourceMode,
        userRequirement,
        targetWordCount: countWords(content),
        contextBudgetChars: 18000
      }).catch(() => null)
    : null;
  const messages = [
    {
      role: "system",
      content:
        "你是长篇小说续写审稿助手。请检查续写草稿的连贯性和可发布风险，输出结构化中文审查报告，不要改写全文。"
    },
    {
      role: "user",
      content:
        `书名：${project.name}\n续写标题：${title}\n用户续写需求：${userRequirement || "未填写"}\n\n` +
        `记忆上下文：\n${memoryPack?.content || "暂无记忆上下文。"}\n\n` +
        `续写正文：\n${content.slice(0, 18000)}\n\n` +
        `请按以下结构输出：\n` +
        `1. 总体判断：可用/需小修/需重写\n` +
        `2. 人设一致性\n3. 时间线与设定自洽\n4. 伏笔承接与新增风险\n5. 叙事衔接与节奏\n6. 具体修改建议\n7. 必须避免污染记忆库的问题`
    }
  ];
  const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
  const aiInputPath = await writeAiInputFile(
    project,
    `continuation_review_${timestamp}.md`,
    messages.map((item) => `## ${item.role}\n\n${item.content}`).join("\n\n")
  );
  const report = await callChatModel(modelConfig, messages, { maxTokens: 4096 });
  const reviewPath = await writeTextContextFile(project, path.join("reviews", `continuation_review_${timestamp}.md`), report);

  if (input.continuationId) {
    const sidecarDb = await ensureSidecarDb();
    try {
      sidecarDb
        .prepare(
          `
          UPDATE continuation_chapters
          SET review_report = ?,
              review_path = ?,
              updated_at = datetime('now', 'localtime')
          WHERE id = ? AND project_id = ?
        `
        )
        .run(report, reviewPath, String(input.continuationId), project.id);
    } finally {
      sidecarDb.close();
    }
  }

  return { report, reviewPath, aiInputPath, contextPackPath: memoryPack?.contextPackPath || null };
}

async function exportProjectWithContinuations(project, continuationIds, sourceMode) {
  const db = getDb();
  const sidecarDb = await ensureSidecarDb();
  try {
    const chapters = await readAnyChapters(project, db);
    const selectedContinuations = sidecarDb
      .prepare(
        `
        SELECT *
        FROM continuation_chapters
        WHERE project_id = ?
        ${continuationIds.length ? `AND id IN (${continuationIds.map(() => "?").join(",")})` : ""}
        ORDER BY continuation_index ASC, version ASC
      `
      )
      .all(project.id, ...continuationIds);

    const parts = [];
    for (const chapter of chapters) {
      const { content } = await readChapterContent(project, chapter, sourceMode);
      parts.push(chapter.title);
      parts.push("");
      parts.push(content.trim());
      parts.push("");
    }

    for (const continuation of selectedContinuations) {
      const content = await fs.readFile(continuation.file_path, "utf8");
      parts.push(continuation.title);
      parts.push("");
      parts.push(content.trim());
      parts.push("");
    }

    const exportsPath = path.join(getWorkspacePath(project), "exports");
    await fs.mkdir(exportsPath, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
    const fileName = `${sanitizeFilename(project.name)}_with_continuation_${timestamp}.txt`;
    const exportPath = path.join(exportsPath, fileName);
    await fs.writeFile(exportPath, parts.join("\r\n"), "utf8");

    if (selectedContinuations.length) {
      sidecarDb
        .prepare(
          `
          UPDATE continuation_chapters
          SET exported = 1, updated_at = datetime('now', 'localtime')
          WHERE id IN (${selectedContinuations.map(() => "?").join(",")})
        `
        )
        .run(...selectedContinuations.map((item) => item.id));
    }

    return { exportPath, continuationCount: selectedContinuations.length, chapterCount: chapters.length };
  } finally {
    db.close();
    sidecarDb.close();
  }
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (url.pathname === "/api/health") {
      json(res, 200, { ok: true, originalDb: getOriginalDbPathInfo(), sidecarDbPath });
      return;
    }

    if (url.pathname === "/api/settings") {
      if (req.method === "GET") {
        json(res, 200, await readSettings());
        return;
      }
      if (req.method === "PUT") {
        const body = await readJsonBody(req);
        json(res, 200, await saveSettings(body));
        return;
      }
      json(res, 405, { error: "METHOD_NOT_ALLOWED" });
      return;
    }

    if (url.pathname === "/api/projects") {
      try {
        const projects = await readAllProjects();
        const enriched = [];
        for (const project of projects) {
          enriched.push({ ...project, ...(await getWorkspaceStats(project)) });
        }
        json(res, 200, { projects: enriched });
      } catch (error) {
        throw error;
      }
      return;
    }

    if (url.pathname === "/api/projects/preview-txt" && req.method === "POST") {
      const body = await readJsonBody(req);
      json(res, 200, previewTxtProject(body));
      return;
    }

    if (url.pathname === "/api/projects/import-txt" && req.method === "POST") {
      const body = await readJsonBody(req);
      const project = await createSidecarTxtProject(body);
      const workspace = await getWorkspaceStats(project);
      json(res, 201, { project: { ...project, ...workspace } });
      return;
    }

    const stageRunMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/stages\/([1-5])\/run$/);
    if (stageRunMatch && req.method === "POST") {
      const projectId = decodeURIComponent(stageRunMatch[1]);
      const stage = Number(stageRunMatch[2]);
      const project = await readAnyProject(projectId);
      if (!project) {
        json(res, 404, { error: "PROJECT_NOT_FOUND" });
        return;
      }
      const body = await readJsonBody(req);
      const result = await runWorkflowProjectStage(project, stage, body);
      const refreshed = await readAnyProject(projectId);
      const workspace = await getWorkspaceStats(refreshed);
      json(res, 200, { result, project: { ...refreshed, ...workspace }, stageStats: await readWorkflowStageStats(projectId) });
      return;
    }

    const keepOriginalMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/chapters\/([^/]+)\/keep-original$/);
    if (keepOriginalMatch && req.method === "POST") {
      const projectId = decodeURIComponent(keepOriginalMatch[1]);
      const chapterId = decodeURIComponent(keepOriginalMatch[2]);
      const project = await readAnyProject(projectId);
      if (!project) {
        json(res, 404, { error: "PROJECT_NOT_FOUND" });
        return;
      }
      const result = await keepWorkflowChapterOriginal(project, chapterId);
      json(res, 200, result);
      return;
    }

    const projectMatch = url.pathname.match(/^\/api\/projects\/([^/]+)$/);
    if (projectMatch) {
      const projectId = decodeURIComponent(projectMatch[1]);

      if (req.method === "PUT") {
        const body = await readJsonBody(req);
        const project = await updateProjectDisplayName(projectId, body);
        const workspace = await getWorkspaceStats(project);
        json(res, 200, { project: { ...project, ...workspace } });
        return;
      }

      if (req.method === "DELETE") {
        json(res, 200, await deleteSidecarProject(projectId));
        return;
      }

      const db = getDb();
      try {
        const project = await readAnyProject(projectId);
        if (!project) {
          json(res, 404, { error: "PROJECT_NOT_FOUND" });
          return;
        }
        const chapters = await attachRewrittenWordCounts(project, await readAnyChapters(project, db));
        const stageStats = await readWorkflowStageStats(projectId);
        const workspace = await getWorkspaceStats(project);
        json(res, 200, { project: { ...project, ...workspace }, chapters, stageStats });
      } finally {
        db.close();
      }
      return;
    }

    const continuationsMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/continuations$/);
    if (continuationsMatch) {
      const projectId = decodeURIComponent(continuationsMatch[1]);
      const db = getDb();
      try {
        const project = await readAnyProject(projectId);
        if (!project) {
          json(res, 404, { error: "PROJECT_NOT_FOUND" });
          return;
        }

        if (req.method === "GET") {
          const sidecarDb = await ensureSidecarDb();
          try {
            json(res, 200, { continuations: readContinuations(sidecarDb, projectId) });
          } finally {
            sidecarDb.close();
          }
          return;
        }

        if (req.method === "POST") {
          const body = await readJsonBody(req);
          const chapter = await readAnyChapter(body.baseChapterId, db);
          if (!chapter || chapter.project_id !== projectId) {
            json(res, 404, { error: "CHAPTER_NOT_FOUND" });
            return;
          }
          if (!String(body.content || "").trim()) {
            json(res, 400, { error: "EMPTY_CONTENT" });
            return;
          }
          const continuation = await saveContinuation({
            project,
            chapter,
            title: String(body.title || `第${chapter.chapter_index + 1}章 续写`),
            content: String(body.content),
            sourceMode: String(body.sourceMode || "original")
          });
          const workspace = await getWorkspaceStats(project);
          json(res, 201, { continuation, workspace });
          return;
        }
      } finally {
        db.close();
      }
    }

    const continuationConfirmMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/continuations\/([^/]+)\/confirm$/);
    if (continuationConfirmMatch && req.method === "POST") {
      const projectId = decodeURIComponent(continuationConfirmMatch[1]);
      const continuationId = decodeURIComponent(continuationConfirmMatch[2]);
      const db = getDb();
      try {
        const project = await readAnyProject(projectId);
        if (!project) {
          json(res, 404, { error: "PROJECT_NOT_FOUND" });
          return;
        }
        const body = await readJsonBody(req);
        const result = await confirmContinuationOfficial(project, continuationId, String(body.modelId || ""));
        const workspace = await getWorkspaceStats(project);
        json(res, 200, { ...result, workspace });
      } finally {
        db.close();
      }
      return;
    }

    const exportMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/export$/);
    if (exportMatch && req.method === "POST") {
      const projectId = decodeURIComponent(exportMatch[1]);
      const db = getDb();
      try {
        const project = await readAnyProject(projectId);
        if (!project) {
          json(res, 404, { error: "PROJECT_NOT_FOUND" });
          return;
        }
        const body = await readJsonBody(req);
        const continuationIds = Array.isArray(body.continuationIds) ? body.continuationIds.map(String) : [];
        const result = await exportProjectWithContinuations(project, continuationIds, String(body.sourceMode || "original"));
        const workspace = await getWorkspaceStats(project);
        json(res, 200, { ...result, workspace });
      } finally {
        db.close();
      }
      return;
    }

    const reviewContinuationMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/continuation-review$/);
    if (reviewContinuationMatch && req.method === "POST") {
      const projectId = decodeURIComponent(reviewContinuationMatch[1]);
      const db = getDb();
      try {
        const project = await readAnyProject(projectId);
        if (!project) {
          json(res, 404, { error: "PROJECT_NOT_FOUND" });
          return;
        }
        const body = await readJsonBody(req);
        let baseChapterIndex = 0;
        if (body.baseChapterId) {
          const chapter = await readAnyChapter(body.baseChapterId, db);
          if (!chapter || chapter.project_id !== projectId) {
            json(res, 404, { error: "CHAPTER_NOT_FOUND" });
            return;
          }
          baseChapterIndex = chapter.chapter_index;
        }
        const result = await reviewContinuationContent(project, String(body.modelId || ""), {
          ...body,
          baseChapterIndex
        });
        json(res, 200, result);
      } finally {
        db.close();
      }
      return;
    }

    const chapterContentMatch = url.pathname.match(/^\/api\/chapters\/([^/]+)\/content$/);
    if (chapterContentMatch) {
      const chapterId = decodeURIComponent(chapterContentMatch[1]);
      const sourceMode = url.searchParams.get("source") || "original";
      const db = getDb();
      try {
        const chapter = await readAnyChapter(chapterId, db);
        if (!chapter) {
          json(res, 404, { error: "CHAPTER_NOT_FOUND" });
          return;
        }
        const project = await readAnyProject(chapter.project_id);
        if (!project) {
          json(res, 404, { error: "PROJECT_NOT_FOUND" });
          return;
        }
        const result = await readChapterContent(project, chapter, sourceMode);
        json(res, 200, { chapter, ...result });
      } finally {
        db.close();
      }
      return;
    }

    const rewriteChapterMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/rewrite-chapter$/);
    if (rewriteChapterMatch && req.method === "POST") {
      const projectId = decodeURIComponent(rewriteChapterMatch[1]);
      const db = getDb();
      try {
        const project = await readAnyProject(projectId);
        if (!project) {
          json(res, 404, { error: "PROJECT_NOT_FOUND" });
          return;
        }
        const body = await readJsonBody(req);
        await assertWorkflowStageAccessible(project, 4);
        const chapter = await readAnyChapter(body.chapterId, db);
        if (!chapter || chapter.project_id !== projectId) {
          json(res, 404, { error: "CHAPTER_NOT_FOUND" });
          return;
        }
        const result = await rewriteChapterContent(project, chapter, body);
        const workspace = await getWorkspaceStats(project);
        json(res, 200, { ...result, workspace });
      } finally {
        db.close();
      }
      return;
    }

    if (url.pathname === "/api/models") {
      if (req.method === "GET") {
        json(res, 200, { models: await readAllModels() });
        return;
      }

      if (req.method === "POST") {
        const body = await readJsonBody(req);
        const provider = String(body.provider || "custom");
        const name = String(body.name || "").trim();
        const model = String(body.model || "").trim();
        const apiKey = provider === "ollama" ? String(body.apiKey || "ollama") : String(body.apiKey || "").trim();
        const baseUrl = provider === "ollama" && !body.baseUrl ? "http://localhost:11434" : String(body.baseUrl || "").trim();

        if (!name || !provider || !model) {
          json(res, 400, { error: "INVALID_MODEL", message: "名称、服务提供商和模型 ID 为必填项" });
          return;
        }
        if (provider !== "ollama" && (!apiKey || !baseUrl)) {
          json(res, 400, { error: "INVALID_MODEL", message: "Custom 模型必须填写 API Key 和 Base URL" });
          return;
        }

        const modelRow = await createSidecarModel({
          name,
          provider,
          apiKey,
          baseUrl,
          model,
          temperature: body.temperature,
          maxTokens: body.maxTokens,
          timeout: body.timeout
        });
        json(res, 201, { model: modelRow });
        return;
      }
    }

    if (url.pathname === "/api/models/test" && req.method === "POST") {
      const body = await readJsonBody(req);
      const result = await testModelConnection(body);
      json(res, 200, result);
      return;
    }

    if (url.pathname === "/api/models/status" && req.method === "GET") {
      json(res, 200, await readModelStatus());
      return;
    }

    const modelItemMatch = url.pathname.match(/^\/api\/models\/([^/]+)$/);
    if (modelItemMatch) {
      const id = decodeURIComponent(modelItemMatch[1]);
      if (req.method === "PUT") {
        const body = await readJsonBody(req);
        const provider = String(body.provider || "custom");
        const name = String(body.name || "").trim();
        const model = String(body.model || "").trim();
        const apiKey = provider === "ollama" ? String(body.apiKey || "ollama") : String(body.apiKey || "").trim();
        const baseUrl = provider === "ollama" && !body.baseUrl ? "http://localhost:11434" : String(body.baseUrl || "").trim();
        if (!name || !provider || !model) {
          json(res, 400, { error: "INVALID_MODEL", message: "名称、服务提供商和模型 ID 为必填项" });
          return;
        }
        if (provider !== "ollama" && (!apiKey || !baseUrl)) {
          json(res, 400, { error: "INVALID_MODEL", message: "Custom 模型必须填写 API Key 和 Base URL" });
          return;
        }
        const modelRow = await updateSidecarModel(id, {
          name,
          provider,
          apiKey,
          baseUrl,
          model,
          temperature: body.temperature,
          maxTokens: body.maxTokens,
          timeout: body.timeout
        });
        json(res, 200, { model: modelRow });
        return;
      }

      if (req.method === "DELETE") {
        json(res, 200, await deleteSidecarModel(id));
        return;
      }
    }

    const defaultModelMatch = url.pathname.match(/^\/api\/models\/([^/]+)\/default$/);
    if (defaultModelMatch && req.method === "POST") {
      const id = decodeURIComponent(defaultModelMatch[1]);
      json(res, 200, await setDefaultModel(id));
      return;
    }

    if (url.pathname === "/api/prompt-templates") {
      json(res, 200, { templates: await readAllPromptTemplates() });
      return;
    }

    if (url.pathname === "/api/prompt-templates/validate-import" && req.method === "POST") {
      const body = await readJsonBody(req);
      json(res, 200, await validateSidecarPromptTemplateImport(body));
      return;
    }

    if (url.pathname === "/api/prompt-templates/import" && req.method === "POST") {
      const body = await readJsonBody(req);
      const template = await importSidecarPromptTemplate(body.template || body, {
        duplicateMode: body.duplicateMode
      });
      json(res, 201, { template });
      return;
    }

    const templateItemMatch = url.pathname.match(/^\/api\/prompt-templates\/([^/]+)$/);
    if (templateItemMatch) {
      const id = decodeURIComponent(templateItemMatch[1]);
      if (req.method === "PUT") {
        const body = await readJsonBody(req);
        if (!String(body.name || "").trim()) {
          json(res, 400, { error: "INVALID_TEMPLATE", message: "模板名称不能为空" });
          return;
        }
        const template = await updateSidecarPromptTemplate(id, body);
        json(res, 200, { template });
        return;
      }

      if (req.method === "DELETE") {
        json(res, 200, await deleteSidecarPromptTemplate(id));
        return;
      }
    }

    const memorySnapshotsMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/memory\/snapshots$/);
    if (memorySnapshotsMatch && req.method === "GET") {
      const projectId = decodeURIComponent(memorySnapshotsMatch[1]);
      const sourceMode = url.searchParams.get("sourceMode") || "original";
      const db = getDb();
      const sidecarDb = await ensureSidecarDb();
      try {
        const project = await readAnyProject(projectId);
        if (!project) {
          json(res, 404, { error: "PROJECT_NOT_FOUND" });
          return;
        }
        const snapshots = readMemorySnapshots(sidecarDb, projectId, sourceMode);
        const aggregateResult = await writeAggregateMemoryFile(project, sourceMode);
        json(res, 200, { snapshots, aggregate: aggregateResult.aggregate, aggregatePath: aggregateResult.filePath });
      } finally {
        db.close();
        sidecarDb.close();
      }
      return;
    }

    const memoryOverviewMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/memory\/overview$/);
    if (memoryOverviewMatch && req.method === "GET") {
      const projectId = decodeURIComponent(memoryOverviewMatch[1]);
      const sourceMode = url.searchParams.get("sourceMode") || "original";
      const db = getDb();
      try {
        const project = await readAnyProject(projectId);
        if (!project) {
          json(res, 404, { error: "PROJECT_NOT_FOUND" });
          return;
        }
        json(res, 200, await readMemoryOverview(project, sourceMode));
      } finally {
        db.close();
      }
      return;
    }

    const memoryIngestMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/memory\/ingest-chapter$/);
    if (memoryIngestMatch && req.method === "POST") {
      const projectId = decodeURIComponent(memoryIngestMatch[1]);
      const db = getDb();
      try {
        const project = await readAnyProject(projectId);
        if (!project) {
          json(res, 404, { error: "PROJECT_NOT_FOUND" });
          return;
        }
        const body = await readJsonBody(req);
        const chapter = await readAnyChapter(body.chapterId, db);
        if (!chapter || chapter.project_id !== projectId) {
          json(res, 404, { error: "CHAPTER_NOT_FOUND" });
          return;
        }
        const result = await extractChapterMemorySnapshot(
          project,
          chapter,
          String(body.modelId || ""),
          String(body.sourceMode || "original")
        );
        const workspace = await getWorkspaceStats(project);
        json(res, 200, { ...result, workspace });
      } finally {
        db.close();
      }
      return;
    }

    const memoryIngestRecentMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/memory\/ingest-recent$/);
    if (memoryIngestRecentMatch && req.method === "POST") {
      const projectId = decodeURIComponent(memoryIngestRecentMatch[1]);
      const db = getDb();
      try {
        const project = await readAnyProject(projectId);
        if (!project) {
          json(res, 404, { error: "PROJECT_NOT_FOUND" });
          return;
        }
        const body = await readJsonBody(req);
        const result = await ingestRecentChapterMemory(
          project,
          String(body.modelId || ""),
          String(body.sourceMode || "original"),
          Number(body.limit || 5)
        );
        const workspace = await getWorkspaceStats(project);
        json(res, 200, { ...result, workspace });
      } finally {
        db.close();
      }
      return;
    }

    const memoryContextPackMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/memory\/context-pack$/);
    if (memoryContextPackMatch) {
      const projectId = decodeURIComponent(memoryContextPackMatch[1]);
      const db = getDb();
      try {
        const project = await readAnyProject(projectId);
        if (!project) {
          json(res, 404, { error: "PROJECT_NOT_FOUND" });
          return;
        }
        const body = req.method === "POST" ? await readJsonBody(req) : {};
        const chapterId = req.method === "POST" ? body.baseChapterId : url.searchParams.get("baseChapterId");
        const chapter = chapterId ? await readAnyChapter(chapterId, db) : null;
        if (chapterId && (!chapter || chapter.project_id !== projectId)) {
          json(res, 404, { error: "CHAPTER_NOT_FOUND" });
          return;
        }
        const result = await buildMemoryContextPack(project, chapter, {
          sourceMode: req.method === "POST" ? body.sourceMode : url.searchParams.get("sourceMode") || "original",
          userRequirement: req.method === "POST" ? body.userRequirement : url.searchParams.get("userRequirement") || "",
          targetWordCount: req.method === "POST" ? body.targetWordCount : Number(url.searchParams.get("targetWordCount") || 0),
          contextBudgetChars: req.method === "POST" ? body.contextBudgetChars : Number(url.searchParams.get("contextBudgetChars") || 0)
        });
        json(res, 200, result);
      } finally {
        db.close();
      }
      return;
    }

    const analyzeMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/continuation-context$/);
    if (analyzeMatch && req.method === "POST") {
      const projectId = decodeURIComponent(analyzeMatch[1]);
      const db = getDb();
      try {
        const project = await readAnyProject(projectId);
        if (!project) {
          json(res, 404, { error: "PROJECT_NOT_FOUND" });
          return;
        }
        const body = await readJsonBody(req);
        const result = await analyzeContinuationContext(project, String(body.modelId), String(body.userRequirement || ""));
        const workspace = await getWorkspaceStats(project);
        json(res, 200, { ...result, workspace });
      } finally {
        db.close();
      }
      return;
    }

    const outlineMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/continuation-outline$/);
    if (outlineMatch && req.method === "POST") {
      const projectId = decodeURIComponent(outlineMatch[1]);
      const db = getDb();
      try {
        const project = await readAnyProject(projectId);
        if (!project) {
          json(res, 404, { error: "PROJECT_NOT_FOUND" });
          return;
        }
        const body = await readJsonBody(req);
        const result = await generateContinuationOutline(
          project,
          String(body.modelId),
          String(body.userRequirement || ""),
          Number(body.targetChapters || 1)
        );
        const workspace = await getWorkspaceStats(project);
        json(res, 200, { ...result, workspace });
      } finally {
        db.close();
      }
      return;
    }

    const generateMatch = url.pathname.match(/^\/api\/projects\/([^/]+)\/continuation-generate$/);
    if (generateMatch && req.method === "POST") {
      const projectId = decodeURIComponent(generateMatch[1]);
      const db = getDb();
      try {
        const project = await readAnyProject(projectId);
        if (!project) {
          json(res, 404, { error: "PROJECT_NOT_FOUND" });
          return;
        }
        const body = await readJsonBody(req);
        const chapter = await readAnyChapter(body.baseChapterId, db);
        if (!chapter || chapter.project_id !== projectId) {
          json(res, 404, { error: "CHAPTER_NOT_FOUND" });
          return;
        }
        const result = await generateContinuationContent(
          project,
          chapter,
          String(body.modelId),
          String(body.userRequirement || ""),
          String(body.sourceMode || "original"),
          Number(body.targetWordCount || project.expand_word_count || 4000)
        );
        json(res, 200, result);
      } finally {
        db.close();
      }
      return;
    }

    json(res, 404, { error: "NOT_FOUND" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message === "MODEL_NOT_FOUND") {
      json(res, 404, { error: "MODEL_NOT_FOUND", message: "没有找到可用模型，请先在模型管理中接入模型并设为默认。" });
      return;
    }
    if (message === "SIDECAR_MODEL_NOT_FOUND" || message === "SIDECAR_TEMPLATE_NOT_FOUND") {
      json(res, 404, { error: message, message: "只能编辑或删除 sidecar 来源的数据" });
      return;
    }
    if (message === "SIDECAR_PROJECT_NOT_FOUND") {
      json(res, 404, { error: message, message: "只能编辑或删除自建 sidecar 项目，原 FleshOut 项目保持只读。" });
      return;
    }
    if (message === "PROJECT_NAME_REQUIRED") {
      json(res, 400, { error: message, message: "项目名称不能为空。" });
      return;
    }
    if (message === "UNSAFE_PROJECT_DELETE_PATH") {
      json(res, 400, { error: message, message: "项目目录不在 data/user-projects 下，已阻止删除。" });
      return;
    }
    if (message === "INVALID_STAGE") {
      json(res, 400, { error: message, message: "无效阶段。" });
      return;
    }
    if (message === "WORKFLOW_STAGE_LOCKED") {
      json(res, 400, { error: message, message: "请先完成前置步骤后再继续。" });
      return;
    }
    if (message === "AI_CALL_CONFIRMATION_REQUIRED") {
      json(res, 400, { error: message, message: "该操作会触发真实 AI 调用，请从界面确认后执行。" });
      return;
    }
    if (message === "PROMPT_TEMPLATE_NOT_FOUND") {
      json(res, 404, { error: "PROMPT_TEMPLATE_NOT_FOUND", message: "没有找到可用提示词模板，请先在提示词管理中导入或选择模板。" });
      return;
    }
    if (message === "DUPLICATE_TEMPLATE_NAME") {
      json(res, 409, {
        error: "DUPLICATE_TEMPLATE_NAME",
        message: `sidecar DB 中已存在同名模板：${error.templateName || ""}`,
        duplicate: error.duplicate || null
      });
      return;
    }
    if (message.startsWith("模板 JSON") || message.startsWith("模板缺少必需字段")) {
      json(res, 400, { error: "INVALID_PROMPT_TEMPLATE_IMPORT", message });
      return;
    }
    if (message === "CHAPTER_CONTENT_EMPTY") {
      json(res, 400, { error: "CHAPTER_CONTENT_EMPTY", message: "章节正文为空，无法生成改写。" });
      return;
    }
    if (message === "ORIGINAL_DB_PATH_REQUIRED") {
      json(res, 400, { error: "ORIGINAL_DB_PATH_REQUIRED", message: "原 FleshOut 数据库路径不能为空。" });
      return;
    }
    if (message === "ORIGINAL_DB_PATH_NOT_FOUND") {
      json(res, 400, { error: "ORIGINAL_DB_PATH_NOT_FOUND", message: "没有找到该 fleshout.db 文件，请检查路径。" });
      return;
    }
    if (message.startsWith("CONFIG_READ_FAILED")) {
      json(res, 500, { error: "CONFIG_READ_FAILED", message: "配置文件读取失败，请检查 config.json 是否为合法 JSON。" });
      return;
    }
    if (message.includes("模型缺少 base_url")) {
      json(res, 400, { error: "MODEL_BASE_URL_MISSING", message: "模型缺少 Base URL，请在模型管理中补充 API 端点。" });
      return;
    }
    if (message.includes("模型缺少 api_key")) {
      json(res, 400, { error: "MODEL_API_KEY_MISSING", message: "模型缺少 API Key，请在模型管理中重新保存模型配置。" });
      return;
    }
    if (message.includes("aborted") || message.includes("AbortError")) {
      json(res, 504, { error: "MODEL_TIMEOUT", message: "模型请求超时，请检查网络、Base URL 或调大 Timeout。" });
      return;
    }
    if (message.includes("fetch failed") || message.includes("ECONNREFUSED") || message.includes("ENOTFOUND")) {
      json(res, 502, { error: "MODEL_NETWORK_ERROR", message: "模型连接失败，请检查 Base URL、代理或本地 Ollama 服务是否启动。" });
      return;
    }
    json(res, 500, {
      error: "INTERNAL_ERROR",
      message
    });
  }
}

async function main() {
  const vite = isDesktop
    ? null
    : await createViteServer({
        root,
        server: { middlewareMode: true },
        appType: "spa"
      });

  const server = http.createServer(async (req, res) => {
    if (req.url?.startsWith("/api/")) {
      await handleApi(req, res);
      return;
    }

    if (vite) {
      vite.middlewares(req, res);
      return;
    }

    await serveStatic(req, res);
  });

  server.listen(port, "127.0.0.1", () => {
    console.log(`FleshOut Compatible App running at http://127.0.0.1:${port}`);
    console.log(`Using database: ${getOriginalDbPathInfo().dbPath}`);
    console.log(`Using config: ${appConfigPath}`);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

