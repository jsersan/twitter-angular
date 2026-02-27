// =====================
//  MODELOS DE DATOS
// =====================

export interface User {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  bio?: string;
  avatarUrl?: string;
  role: 'user' | 'admin';
  blocked: boolean;
  followers: string[];
  following: string[];
  tweetsCount: number;
  followersCount: number;
  followingCount: number;
  createdAt: Date;
}

export interface Tweet {
  id?: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  content: string;
  imageUrl?: string;
  likes: string[];
  reposts: string[];
  replyTo?: string;
  replies?: Tweet[];
  deleted: boolean;
  deletedBy?: string;
  createdAt: Date;

  // ── Campos de repost ──────────────────────────────────────
  isRepost?: boolean;
  repostedByUserId?: string;
  repostedByUsername?: string;
  repostedByDisplayName?: string;
  originalTweetId?: string;
  originalUserId?: string;
  originalUsername?: string;
  originalDisplayName?: string;
  originalAvatarUrl?: string;
  originalContent?: string;
  originalImageUrl?: string;
  originalCreatedAt?: any;
}

export interface Notification {
  id?: string;
  toUserId: string;
  fromUserId: string;
  fromUsername: string;
  fromDisplayName?: string;
  fromAvatarUrl?: string;
  type: 'like' | 'new_post' | 'repost';
  tweetId?: string;
  tweetContent?: string;
  tweetImageUrl?: string;
  read: boolean;
  createdAt: Date;
}

// ── Admin / Reportes ─────────────────────────────────────────────────────────

export type ReportReason =
  | 'spam'
  | 'hate_speech'
  | 'harassment'
  | 'misinformation'
  | 'violence'
  | 'other';

export interface Report {
  id?: string;
  tweetId: string;
  tweetContent: string;
  tweetUsername: string;
  reportedBy: string;
  reportedByUsername: string;
  reason: ReportReason;
  details?: string;
  status: 'pending' | 'resolved' | 'dismissed';
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
}

export interface AdminAction {
  id?: string;
  adminUid: string;
  adminUsername: string;
  action: string;
  targetType?: 'user' | 'tweet' | 'report';
  targetId?: string;
  targetDescription?: string;
  targetUserId?: string;
  targetTweetId?: string;
  details?: string;
  createdAt: Date;
}