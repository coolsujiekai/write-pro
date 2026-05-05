export type LibraryCategory = '精读摘录' | '风格手册' | '金句' | '故事';

export interface LibraryIndex {
  id: string;
  category: LibraryCategory;
  title: string;
  author: string;
  filePath: string;
}

export interface LibraryRecommendItem {
  index: LibraryIndex;
  reason: string;
  preview?: string;
}
