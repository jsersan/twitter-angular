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
  replyTo?: string;
  replies?: Tweet[];
  deleted: boolean;
  deletedBy?: string;
  createdAt: Date;
  reportCount?: number;
}

export interface Notification {
  id?: string;
  toUserId: string;           // quién la recibe
  fromUserId: string;         // quién la genera
  fromUsername: string;
  fromDisplayName: string;
  fromAvatarUrl?: string;
  type: 'like' | 'new_post';  // like en mi tweet | post nuevo de alguien que sigo
  tweetId?: string;
  tweetContent?: string;      // preview del tweet
  tweetImageUrl?: string;     // si el post nuevo tiene imagen
  read: boolean;
  createdAt: Date;
}

export type ReportReason = 'spam' | 'hate_speech' | 'harassment' | 'misinformation' | 'inappropriate' | 'other';

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
  action: 'block' | 'unblock' | 'delete_tweet' | 'promote' | 'demote' | 'resolve_report' | 'dismiss_report';
  targetType: 'user' | 'tweet' | 'report';
  targetId: string;
  targetDescription: string;
  createdAt: Date;
}