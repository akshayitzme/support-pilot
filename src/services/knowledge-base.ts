import { readdir, readFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";
import type { KnowledgeDocument, SearchResults } from "../types/knowledge-service";

const documents: Map<string, KnowledgeDocument> = new Map();
const topicMap: Map<string, Set<string>> = new Map();

let isInitialized = false;
let isBuilding = false;

export const initializeKnowledgeBase = async (docsDir = "./docs/kb"): Promise<void> => {
  if (isInitialized && !isBuilding) return;

  if (isBuilding) {
    console.debug("Index build in progress, skipping");
    return;
  }

  isBuilding = true;

  try {
    console.info("Building knowledge index", { docsDir });

    documents.clear();
    topicMap.clear();

    const files = await _scanMarkdownFiles(docsDir);
    console.debug(`Found ${files.length} markdown files`);

    for (const filePath of files) {
      const doc = await _parseDocument(filePath, docsDir);
      if (doc) {
        documents.set(doc.id, doc);
        _indexTopics(doc.id, doc.topics);
      }
    }

    isInitialized = true;
    console.info("Knowledge index ready", {
      documents: documents.size,
      topics: topicMap.size,
    });
  } catch (error) {
    console.error("Failed to build knowledge index", { error });
  } finally {
    isBuilding = false;
  }
};

export const search = async (query: string, topK = 5): Promise<SearchResults[]> => {
  if (!isInitialized) {
    await initializeKnowledgeBase();
  }

  if (documents.size === 0) {
    console.warn("Knowledge base is empty");
    return [];
  }

  const queryLower = query.toLowerCase();
  const queryTerms = queryLower.split(/\s+/).filter((t) => t.length > 2);

  const scores: Array<{ doc: KnowledgeDocument; score: number }> = [];

  for (const doc of documents.values()) {
    let score = 0;

    for (const topic of doc.topics) {
      if (queryLower.includes(topic)) {
        score += 3;
      }
    }

    for (const term of queryTerms) {
      if (doc.content.toLowerCase().includes(term)) {
        score += 1;
      }
      if (doc.title.toLowerCase().includes(term)) {
        score += 2;
      }
    }

    if (score > 0) {
      scores.push({ doc, score });
    }
  }

  scores.sort((a, b) => b.score - a.score);

  return scores.slice(0, topK).map(({ doc, score }) => ({
    id: doc.id,
    title: doc.title,
    content: doc.content.slice(0, 1000),
    topics: doc.topics,
    filePath: doc.filePath,
    score: score / 10,
  }));
};

// Internal Functions
const _scanMarkdownFiles = async (dir: string, files: string[] = []): Promise<string[]> => {
  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);

      if (entry.isDirectory() && !entry.name.startsWith(".")) {
        await _scanMarkdownFiles(fullPath, files);
      } else if (entry.isFile() && extname(entry.name) === ".md") {
        files.push(fullPath);
      }
    }
  } catch (error) {
    console.warn("Could not scan directory", { dir, error });
  }

  return files;
};

const _parseDocument = async (
  filePath: string,
  baseDir: string,
): Promise<KnowledgeDocument | null> => {
  try {
    const content = await readFile(filePath, "utf-8");
    const relativePath = filePath.replace(`${baseDir}/`, "");
    const id = basename(filePath, ".md");

    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch?.[1]?.trim() || id.replace(/[-_]/g, " ");

    const topics = _extractTopics(content, id);

    return {
      id,
      title,
      content,
      topics,
      filePath: relativePath,
    };
  } catch (error) {
    console.warn("Failed to parse document", { filePath, error });
    return null;
  }
};

const _extractTopics = (content: string, filename: string): string[] => {
  const topics = new Set<string>();

  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
  if (frontmatterMatch) {
    const topicsMatch = frontmatterMatch[1].match(/topics:\s*\[([^\]]+)\]/);
    if (topicsMatch) {
      const extracted = topicsMatch[1]
        .split(",")
        .map((t) => t.trim().replace(/['"]/g, ""))
        .filter((t) => t);
      for (const topic of extracted) {
        topics.add(topic.toLowerCase());
      }
    }
  }

  const headingMatches = content.match(/^##+\s+(.+)$/gm);
  if (headingMatches) {
    for (const heading of headingMatches) {
      const topic = heading
        .replace(/^##+\s+/, "")
        .toLowerCase()
        .replace(/[^\w\s-]/g, "")
        .trim();
      if (topic && topic.length > 2) {
        topics.add(topic);
      }
    }
  }

  const filenameKeywords = filename
    .split(/[-_]/)
    .map((k) => k.toLowerCase().trim())
    .filter((k) => k.length > 2 && !["readme", "index", "guide"].includes(k));
  for (const keyword of filenameKeywords) {
    topics.add(keyword);
  }

  const techKeywords = [
    "api",
    "authentication",
    "webhook",
    "error",
    "billing",
    "subscription",
    "integration",
    "troubleshooting",
    "setup",
    "configuration",
  ];

  const lowerContent = content.toLowerCase();
  for (const keyword of techKeywords) {
    if (lowerContent.includes(keyword)) {
      topics.add(keyword);
    }
  }

  return Array.from(topics);
};

const _indexTopics = (docId: string, topics: string[]): void => {
  for (const topic of topics) {
    if (!topicMap.has(topic)) {
      topicMap.set(topic, new Set());
    }
    const topicDocs = topicMap.get(topic);
    if (topicDocs) {
      topicDocs.add(docId);
    }
  }
};
