/**
 * @fileoverview Barrel export for all application types.
 *
 * Import from `@/types` (or `../types`) to access:
 * - **backend** — Shared types that mirror Rust structs (single source of truth for Tauri IPC)
 * - **content** — Frontend-specific content display types
 * - **user**    — Frontend-specific user/auth types
 * - **search**  — Search UI state types
 *
 * @module types
 */

// Backend types — mirrors Rust structs (Phase 7.3: shared FE↔BE types)
export type {
  UserRole,
  BackendUser,
  BackendHighRankingOfficer,
  CreateDocumentArgs,
  OwnerUnit,
  BackendDocument,
  UpdateDocumentArgs,
  UpdateDocumentAppliedToArgs,
  UpdateDocumentAppliedToResult,
  DocumentHierarchy,
  DocumentStats,
  DocumentBranch,
  BackendSection,
  CreateSectionRequest,
  UpdateSectionArgs,
  QuestionType,
  BackendQuestion,
  BackendQuestionChoice,
  BackendQuestionReferenceDetail,
  BackendQuestionDetail,
  CreateQuestionArgs,
  UpdateQuestionArgs,
  ReferenceResourceType,
  BackendDocumentReference,
  CreateReferenceRequest,
  UpdateReferenceArgs,
  BackendSectionReferenceDetail,
  OccupationBranch,
  OccupationSubBranch,
  OccupationSubQuestion,
  CareerBranchUsageReport,
  BranchUsageReport,
  CareerBranchResetReport,
  UserProgress,
  UpsertUserProgressArgs,
  ClearAnswersDatabaseResult,
  AttachmentCleanupFailure,
  AttachmentCleanupResult,
  ClearAnswersResult,
  DeleteAnswerDatabaseResult,
  ProgressRecalculationResult,
  DeleteAnswerResult,
  UpdateQuestionScoreArgs,
  QuestionSectionLink,
  SectionRefChild,
  RequiredCountChild,
  BackendUserAnswer,
  SaveTraineeAnswerArgs,
  SaveQualifierAssessmentArgs,
  AnswerKey,
  ReplaceAnswerKeyItem,
  DevSectionMetrics,
  SubQuestionUsageResponse,
} from './backend';

// Frontend-specific types
export type {
  Question,
  QuestionChoice,
  QuestionReference,
  QuestionDetail,
  QuestionReferenceDetail,
  UserAnswer,
  SectionReferenceDetail,
} from './content';

export type {
  User,
  CreateUserData,
  LoginCredentials,
  AuthResult,
} from './user';

export type {
  SearchResult,
  SearchState,
  SearchContextType,
} from './search';
