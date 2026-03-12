export interface LinearState {
  id: string;
  name: string;
  type: "triage" | "backlog" | "unstarted" | "started" | "completed" | "canceled";
  color: string;
}

export interface LinearIssue {
  id: string;
  identifier: string;
  title: string;
  description?: string | null;
  priority: number | null;
  state: LinearState;
  comments: {
    nodes: LinearComment[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface LinearComment {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export type FetchRecentIssuesOptions = {
  createdAfter: Date;
};
