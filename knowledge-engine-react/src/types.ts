export type PrimaryType =
  | "disease"
  | "drug"
  | "anatomy"
  | "microbe"
  | "molecule"
  | "physiology"
  | "finding"
  | "concept";

export interface Connection {
  type: string;
  to: string;
}

export interface Topic {
  id: string;
  title: string;
  primaryType: PrimaryType | string; // Allow string for backward compatibility or looser typing during migration, but prefer PrimaryType
  tags?: string[];
  classificationPath?: string[];
  content: {
    definition?: string;
    atAGlance?: string;
    takeAway?: string;
    [key: string]: unknown;
  };
  connections?: Connection[];
}

export interface KnowledgeBase {
  [id: string]: Topic;
}

// 新增类型
export interface FileSelection {
  name: string;
  selected: boolean;
}

export interface ToastNotification {
  id: number;
  message: string;
  type: "info" | "success" | "error";
}

export interface DataHealthSummary {
  totalTopics: number;
  selectedFiles: number;
  invalidFiles: number;
  invalidTopics: number;
  fileErrors: Record<string, string[]>;
}
