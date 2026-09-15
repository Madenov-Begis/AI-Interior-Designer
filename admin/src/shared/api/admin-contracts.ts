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

export type AdminLoginSession = {
  token: string;
  expiresAt: string;
  expiresIn: number;
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
  balance: number;
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
};

export type AdminGeneration = {
  id: string;
  user: { id: string; account: string };
  project: { id: string; name: string };
  parentGenerationId: string | null;
  status: GenerationStatus;
  styleCode: string | null;
  room: { code: string; name: string } | null;
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

export type CreditPackage = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  credits: number;
  priceUzs: number;
  popular: boolean;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

export type RoomType = {
  id: string;
  code: string;
  name: string;
  promptModifier: string;
  active: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};
