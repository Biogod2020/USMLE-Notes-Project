// src/types.ts

export interface Connection {
  type: string;
  to: string;
}

export interface Topic {
  id: string;
  title: string;
  primaryType: string;
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
  type: 'info' | 'success' | 'error';
}