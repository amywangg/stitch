// Stitch Shared Types
// These types mirror the database schema and are shared between frontend and backend

// ============================================================================
// ENUMS
// ============================================================================

export type UserRole = 'user' | 'designer' | 'admin';
export type ProjectStatus = 'planned' | 'in_progress' | 'frogged' | 'completed' | 'hibernating';
export type SectionType = 'body' | 'sleeve' | 'collar' | 'cuff' | 'hem' | 'yoke' | 'pocket' | 'hood' | 'other';
export type Visibility = 'private' | 'followers' | 'public';
export type PatternDifficulty = 'beginner' | 'easy' | 'intermediate' | 'advanced' | 'expert';
export type CraftType = 'knitting' | 'crochet' | 'both';
export type GarmentType = 
  | 'sweater' | 'cardigan' | 'vest' | 'hat' | 'scarf' | 'cowl' | 'shawl'
  | 'socks' | 'mittens' | 'gloves' | 'blanket' | 'toy' | 'bag' | 'accessory' | 'other';
export type UnitSystem = 'metric' | 'imperial';
export type ListingStatus = 'draft' | 'pending_review' | 'active' | 'paused' | 'archived';
export type PurchaseStatus = 'pending' | 'completed' | 'refunded' | 'disputed';
export type NotificationType = 
  | 'follow' | 'like' | 'comment' | 'mention' | 'pattern_update'
  | 'purchase' | 'sale' | 'system';

// Row instruction types for smart pattern display
export type RowInstructionType = 'counted' | 'measured' | 'repeat' | 'marker';
export type CounterInputType = 'click' | 'voice' | 'gesture' | 'auto';

// ============================================================================
// USERS
// ============================================================================

export interface User {
  id: string;
  email: string;
  username: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  websiteUrl?: string;
  location?: string;
  role: UserRole;
  preferredUnit: UnitSystem;
  isVerified: boolean;
  isDesigner: boolean;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSettings {
  userId: string;
  emailNotifications: boolean;
  pushNotifications: boolean;
  newsletterSubscribed: boolean;
  showOnlineStatus: boolean;
  allowMessagesFrom: 'everyone' | 'followers' | 'none';
  defaultProjectVisibility: Visibility;
}

export interface UserStats {
  userId: string;
  followerCount: number;
  followingCount: number;
  projectCount: number;
  patternCount: number;
  postCount: number;
}

// ============================================================================
// PATTERNS
// ============================================================================

export interface Pattern {
  id: string;
  authorId: string;
  title: string;
  slug: string;
  description?: string;
  craftType: CraftType;
  garmentType?: GarmentType;
  difficulty?: PatternDifficulty;
  publishedAt?: Date;
  isPublished: boolean;
  isFree: boolean;
  coverImageUrl?: string;
  
  // Gauge info
  gaugeStitches?: number;
  gaugeRows?: number;
  gaugeSizeCm: number;
  gaugeNeedleMm?: number;
  gaugeHookMm?: number;
  gaugeNotes?: string;
  
  // Yarn requirements
  recommendedYarnWeightId?: number;
  yarnAmountMeters?: number;
  
  // Stats
  viewCount: number;
  favoriteCount: number;
  projectCount: number;
  
  // AI processing
  sourceType?: 'manual' | 'pdf_import' | 'ai_generated';
  originalPdfUrl?: string;
  aiParsedData?: Record<string, unknown>;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface PatternSize {
  id: string;
  patternId: string;
  name: string;
  displayOrder: number;
  
  // Body measurements (cm)
  bustCm?: number;
  waistCm?: number;
  hipCm?: number;
  lengthCm?: number;
  sleeveLengthCm?: number;
  
  // Finished measurements (cm)
  finishedBustCm?: number;
  finishedLengthCm?: number;
  finishedSleeveCm?: number;
  
  yarnMeters?: number;
}

export interface PatternSection {
  id: string;
  patternId: string;
  sectionType?: SectionType;
  name: string;
  displayOrder: number;
  instructions?: string;
  notes?: string;
}

export interface PatternRow {
  id: string;
  sectionId: string;
  sizeId?: string;
  rowNumber: number;
  rowLabel?: string;
  instruction: string;
  stitchCount?: number;
  notes?: string;
  
  // Instruction type for smart display
  instructionType: RowInstructionType;
  
  // For measured instructions
  targetMeasurementCm?: number;
  estimatedRows?: number;
  measureEveryNRows?: number;
  measurementNotes?: string;
  
  // For repeat instructions
  repeatFromRow?: number;
  repeatUntilCondition?: string;
  repeatCount?: number;
  
  // Checkpoints
  isCheckpoint: boolean;
  checkpointMessage?: string;
}

// ============================================================================
// PROJECTS
// ============================================================================

export interface Project {
  id: string;
  userId: string;
  patternId?: string;
  sizeId?: string;
  title: string;
  slug: string;
  description?: string;
  status: ProjectStatus;
  visibility: Visibility;
  progressPercent: number;
  startedAt?: Date;
  completedAt?: Date;
  
  // Custom gauge
  customGaugeStitches?: number;
  customGaugeRows?: number;
  
  // Needle/Hook
  needleSizeMm?: number;
  hookSizeMm?: number;
  
  notes?: string;
  coverImageUrl?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectSection {
  id: string;
  projectId: string;
  patternSectionId?: string;
  name: string;
  sectionType?: SectionType;
  displayOrder: number;
  
  // Row tracking
  currentRow: number;
  totalRows?: number;
  isEstimatedTotal: boolean;
  
  // Measurement tracking
  targetMeasurementCm?: number;
  currentMeasurementCm?: number;
  lastMeasuredAtRow?: number;
  nextMeasureAtRow?: number;
  
  // Status
  isActive: boolean;
  isCompleted: boolean;
  completedAt?: Date;
  
  // Counter settings
  counterHapticFeedback: boolean;
  counterSoundEnabled: boolean;
  counterVoiceEnabled: boolean;
  
  notes?: string;
}

export interface RowCounterHistory {
  id: string;
  projectSectionId: string;
  rowNumber: number;
  action: 'increment' | 'decrement' | 'set' | 'reset';
  previousValue?: number;
  inputType: CounterInputType;
  voiceTranscript?: string;
  notes?: string;
  createdAt: Date;
}

export interface ProjectMeasurement {
  id: string;
  projectSectionId: string;
  measuredAtRow: number;
  measurementCm: number;
  targetCm?: number;
  notes?: string;
  createdAt: Date;
}

export interface ProjectGauge {
  id: string;
  projectId: string;
  
  // Measured gauge
  stitchesPer10cm?: number;
  rowsPer10cm?: number;
  
  // Swatch details
  swatchWidthCm?: number;
  swatchHeightCm?: number;
  swatchStitches?: number;
  swatchRows?: number;
  
  // Needle/Hook
  needleMm?: number;
  hookMm?: number;
  
  // After blocking
  blocked: boolean;
  blockedStitchesPer10cm?: number;
  blockedRowsPer10cm?: number;
  
  notes?: string;
}

// ============================================================================
// YARN
// ============================================================================

export interface YarnWeight {
  id: number;
  name: string;
  plyRange?: string;
  wrapsPerInchMin?: number;
  wrapsPerInchMax?: number;
  recommendedNeedleMmMin?: number;
  recommendedNeedleMmMax?: number;
}

export interface Yarn {
  id: string;
  brandId?: string;
  name: string;
  weightId?: number;
  fiberContent?: string;
  metersPerSkein?: number;
  gramsPerSkein?: number;
  recommendedNeedleMm?: number;
  recommendedHookMm?: number;
  isDiscontinued: boolean;
}

// ============================================================================
// SOCIAL
// ============================================================================

export interface Post {
  id: string;
  userId: string;
  projectId?: string;
  content?: string;
  visibility: Visibility;
  likeCount: number;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Comment {
  id: string;
  userId: string;
  postId?: string;
  projectId?: string;
  patternId?: string;
  parentCommentId?: string;
  content: string;
  likeCount: number;
  replyCount: number;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// COUNTER & VOICE COMMANDS
// ============================================================================

export interface CounterState {
  sectionId: string;
  currentRow: number;
  totalRows?: number;
  isActive: boolean;
  currentInstruction?: PatternRow;
  nextInstruction?: PatternRow;
  needsMeasurement: boolean;
  measurementReminder?: string;
}

export interface VoiceCommand {
  command: 'next' | 'back' | 'undo' | 'repeat' | 'where_am_i' | 'mark_complete';
  transcript: string;
  confidence: number;
}

// Voice command phrases that map to actions
export const VOICE_COMMANDS: Record<string, VoiceCommand['command']> = {
  'next': 'next',
  'done': 'next',
  'finished': 'next',
  'complete': 'next',
  'next row': 'next',
  'back': 'back',
  'go back': 'back',
  'previous': 'back',
  'undo': 'undo',
  'oops': 'undo',
  'mistake': 'undo',
  'repeat': 'repeat',
  'read again': 'repeat',
  'what row': 'where_am_i',
  'where am i': 'where_am_i',
  'current row': 'where_am_i',
  'mark complete': 'mark_complete',
  'section done': 'mark_complete',
};

// ============================================================================
// GAUGE CALCULATIONS
// ============================================================================

/**
 * Calculate estimated rows needed for a given measurement
 */
export function calculateRowsForMeasurement(
  targetCm: number,
  rowsPer10cm: number
): number {
  return Math.round((targetCm / 10) * rowsPer10cm);
}

/**
 * Calculate when to suggest measurement checks
 * Returns array of row numbers to measure at
 */
export function calculateMeasurementCheckpoints(
  totalEstimatedRows: number,
  targetCm: number,
  rowsPer10cm: number
): number[] {
  // Measure more frequently for shorter sections
  const checkFrequency = targetCm <= 5 ? 5 : targetCm <= 10 ? 10 : 15;
  const rowsPerCheck = calculateRowsForMeasurement(checkFrequency, rowsPer10cm);
  
  const checkpoints: number[] = [];
  for (let row = rowsPerCheck; row < totalEstimatedRows; row += rowsPerCheck) {
    checkpoints.push(row);
  }
  
  // Always add a checkpoint near the end (80% of estimated)
  const nearEndRow = Math.round(totalEstimatedRows * 0.8);
  if (!checkpoints.includes(nearEndRow)) {
    checkpoints.push(nearEndRow);
    checkpoints.sort((a, b) => a - b);
  }
  
  return checkpoints;
}

/**
 * Convert imperial to metric
 */
export function inchesToCm(inches: number): number {
  return inches * 2.54;
}

/**
 * Convert metric to imperial
 */
export function cmToInches(cm: number): number {
  return cm / 2.54;
}

// ============================================================================
// API TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

// Counter action request
export interface CounterActionRequest {
  sectionId: string;
  action: 'increment' | 'decrement' | 'set' | 'reset';
  value?: number; // For 'set' action
  inputType: CounterInputType;
  voiceTranscript?: string;
}

// Counter action response
export interface CounterActionResponse {
  success: boolean;
  newRow: number;
  previousRow: number;
  currentInstruction?: PatternRow;
  needsMeasurement: boolean;
  measurementMessage?: string;
  sectionCompleted: boolean;
}


