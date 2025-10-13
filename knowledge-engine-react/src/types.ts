// src/types.ts

export interface Connection {
  /** 连接类型，例如 "associated_with"、"causes" 等 */
  type: string;
  /** 指向的主题 id（出边） */
  to: string;
}

export interface Topic {
  id: string;
  title: string;
  primaryType: string;          // disease / structure / process / substance / finding / concept ...
  tags?: string[];
  classificationPath?: string[]; // 用于左侧层级导航（可选）
  content: {
    definition?: string;
    atAGlance?: string;
    takeAway?: string;
    [key: string]: unknown;     // 其他任意命名的小节
  };
  connections?: Connection[];   // 出边列表
}

export interface KnowledgeBase {
  [id: string]: Topic;
}
