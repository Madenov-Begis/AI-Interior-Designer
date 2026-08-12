export type UserRole = "USER" | "ADMIN";
export type UserStatus = "ACTIVE" | "BLOCKED" | "DELETED";
export type GenerationStatus =
  | "QUEUED"
  | "PROCESSING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED"
  | "REJECTED";

export type PageInfo = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type Paged<T> = { items: T[]; pageInfo: PageInfo };
export type PlanSummary = { id: string; code: string; name: string };
export type AdminSession = {
  admin: {
    id: string;
    account: string;
    displayName: string | null;
    email: string | null;
    phone: string | null;
    role: UserRole;
    status: UserStatus;
  };
};

export type AdminStats = {
  period: { key: "today" | "7d" | "30d"; from: string; to: string; timeZone: string };
  totals: { users: number; projects: number; generations: number };
  activity: { activeUsers: number; generations: number; failed: number };
  queue: { queued: number; processing: number };
  statusBreakdown: Record<GenerationStatus, number>;
  dailySeries: Array<{ date: string; count: number }>;
};

export type AdminUser = {
  id: string;
  account: string;
  displayName: string | null;
  email: string | null;
  phone: string | null;
  role: UserRole;
  status: UserStatus;
  plan: PlanSummary | null;
  balance: number;
  maxParallelOverride: number | null;
  vipExpiresAt: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
  counts: { projects: number; generations: number; paymentOrders: number };
};

export type AdminUserDetail = AdminUser & {
  firstName: string | null;
  lastName: string | null;
  timezone: string;
  deletedAt: string | null;
  subscriptions: Array<{
    id: string;
    status: string;
    startsAt: string;
    endsAt: string | null;
    createdAt: string;
    plan: PlanSummary | null;
  }>;
};

export type AdminGeneration = {
  id: string;
  user: { id: string; account: string };
  project: { id: string; name: string };
  parentGenerationId: string | null;
  status: GenerationStatus;
  styleCode: string | null;
  aspectRatio: string;
  visualPromptUsed: boolean;
  attemptCount: number;
  durationMs: number | null;
  estimatedCost: string | null;
  error: { code: string | null; message: string | null } | null;
  queuedAt: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  canCancel: boolean;
};

export type MediaMetadata = {
  id: string;
  type: string;
  originalName: string | null;
  mimeType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
};

export type AdminGenerationDetail = AdminGeneration & {
  prompt: string;
  finalPrompt: string | null;
  providerRequestId: string | null;
  timeline: Array<{ status: string; at: string }>;
  usage: null | {
    id: string;
    status: string;
    creditAmount: number;
    reservedAt: string;
    consumedAt: string | null;
    refundedAt: string | null;
    expiresAt: string | null;
    reason: string | null;
  };
  media: {
    source: MediaMetadata;
    visualPrompt: MediaMetadata | null;
    resultOriginal: MediaMetadata | null;
    resultUser: MediaMetadata | null;
    references: Array<MediaMetadata & { position: number }>;
  };
};

export type PaymentOrder = {
  id: string;
  user: { id: string; account: string };
  provider: "MOCK" | "PAYME" | "CLICK";
  providerOrderId: string | null;
  status: "PENDING" | "PAID" | "FAILED" | "CANCELLED" | "EXPIRED";
  packageCode: string;
  packageName: string;
  credits: number;
  amountUzs: number;
  expiresAt: string;
  paidAt: string | null;
  creditedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreditTransaction = {
  id: string;
  user: { id: string; account: string };
  kind: string;
  amount: number;
  balanceAfter: number;
  reason: string | null;
  orderId: string | null;
  generationId: string | null;
  createdAt: string;
};

export type AdminPlan = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  maxParallelGenerations: number;
  maxReferenceImages: number;
  maxReferenceUrls: number;
  maxUploadSizeMb: number;
  maxOutputWidth: number | null;
  maxOutputHeight: number | null;
  priorityProcessing: boolean;
  active: boolean;
  sortOrder: number;
  userCount: number;
  createdAt: string;
  updatedAt: string;
};
