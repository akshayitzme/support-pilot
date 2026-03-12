export interface KnowledgeDocument {
  id: string;
  title: string;
  content: string;
  topics: string[];
  filePath: string;
}

export interface SearchResults {
  id: string;
  title: string;
  content: string;
  score: number;
  topics: string[];
  filePath: string;
}
