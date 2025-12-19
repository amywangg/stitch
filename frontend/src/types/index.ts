// User types
export interface User {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  createdAt: string;
}

export interface UserSettings {
  hapticEnabled: boolean;
  soundEnabled: boolean;
  voiceEnabled: boolean;
  theme: 'light' | 'dark' | 'system';
  measurementUnit: 'metric' | 'imperial';
}

// Project types
export type ProjectStatus = 'planning' | 'in_progress' | 'hibernating' | 'frogged' | 'completed';

export interface Project {
  id: string;
  userId: string;
  title: string;
  patternId?: string;
  patternName?: string;
  status: ProjectStatus;
  progress: number;
  startDate?: string;
  endDate?: string;
  notes?: string;
  imageUrl?: string;
  yarn?: ProjectYarn[];
  needles?: ProjectNeedle[];
  sections: ProjectSection[];
  photos: ProjectPhoto[];
  createdAt: string;
  updatedAt: string;
}

export interface ProjectSection {
  id: string;
  projectId: string;
  name: string;
  sortOrder: number;
  currentRow: number;
  totalRows?: number;
  isComplete: boolean;
  instructions?: SectionInstruction[];
}

export interface SectionInstruction {
  id: string;
  sectionId: string;
  rowNumber: number;
  instruction: string;
  isMeasurement?: boolean;
  measurementValue?: number;
  measurementUnit?: 'cm' | 'in';
  estimatedRows?: number;
}

export interface ProjectYarn {
  id: string;
  yarnId?: string;
  colorway?: string;
  yardageUsed?: number;
}

export interface ProjectNeedle {
  id: string;
  needleId?: string;
  size: string;
  type: string;
}

export interface ProjectPhoto {
  id: string;
  url: string;
  caption?: string;
  takenAt: string;
}

// Pattern types
export type PatternDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface Pattern {
  id: string;
  title: string;
  designerId?: string;
  designerName: string;
  description?: string;
  difficulty: PatternDifficulty;
  category: string;
  imageUrl?: string;
  pdfUrl?: string;
  sizes: string[];
  gauge?: PatternGauge;
  yarn?: PatternYarn;
  needles?: string[];
  sections: PatternSection[];
  isParsed: boolean;
  createdAt: string;
}

export interface PatternGauge {
  stitches: number;
  rows: number;
  over: string;
  needleSize: string;
}

export interface PatternYarn {
  weight: string;
  fiber?: string;
  yardage: string;
}

export interface PatternSection {
  id: string;
  name: string;
  rowCount: number;
  instructions?: string[];
}

// Counter types
export interface CounterState {
  projectId: string;
  sectionId: string;
  currentRow: number;
  totalRows?: number;
  instruction?: string;
  nextInstruction?: string;
  needsMeasurement?: boolean;
  measurementReminder?: string;
}

// Social types
export interface Post {
  id: string;
  userId: string;
  user: User;
  projectId?: string;
  content?: string;
  imageUrls: string[];
  likesCount: number;
  commentsCount: number;
  isLiked: boolean;
  createdAt: string;
}

export interface Comment {
  id: string;
  postId: string;
  userId: string;
  user: User;
  content: string;
  createdAt: string;
}

// API response types
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}


