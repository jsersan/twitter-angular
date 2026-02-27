import { Component, Input, Output, EventEmitter, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Tweet, User, ReportReason } from '../../models/models';
import { TweetService } from '../../services/tweet.service';
import { AuthService } from '../../services/auth.service';
import { ReportService } from '../../services/report.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-tweet-card',
  templateUrl: './tweet-card.component.html',
  styleUrls: ['./tweet-card.component.scss']
})
export class TweetCardComponent implements OnInit, OnDestroy {
  @Input() tweet!: Tweet;
  @Input() isAdmin = false;
  @Input() isReply = false;
  @Output() deleted = new EventEmitter<string>();
  @Output() reply = new EventEmitter<Tweet>();

  currentUser: User | null = null;
  isLiked = false;
  showReplies = true;
  replies: Tweet[] = [];
  loadingReplies = false;
  replyText = '';
  postingReply = false;
  lightboxUrl: string | null = null;

  showReportModal = false;
  selectedReason: ReportReason | '' = '';
  reportDetails = '';
  submittingReport = false;
  reportSent = false;

  readonly reportOptions = [
    { value: 'spam' as ReportReason,           icon: '🔁', label: 'Spam o contenido repetitivo' },
    { value: 'hate_speech' as ReportReason,    icon: '😡', label: 'Discurso de odio' },
    { value: 'harassment' as ReportReason,     icon: '👊', label: 'Acoso o intimidación' },
    { value: 'misinformation' as ReportReason, icon: '❌', label: 'Desinformación' },
    { value: 'inappropriate' as ReportReason,  icon: '🔞', label: 'Contenido inapropiado' },
    { value: 'other' as ReportReason,          icon: '💬', label: 'Otro motivo' }
  ];

  private userSub!: Subscription;
  private repliesSub!: Subscription;

  constructor(
    private tweetService: TweetService,
    private authService: AuthService,
    private reportService: ReportService,
    private notifService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userSub = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isLiked = user ? (this.tweet.likes?.includes(user.uid) ?? false) : false;
    });
    this.loadReplies();
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    this.repliesSub?.unsubscribe();
  }

  get likesCount(): number { return this.tweet.likes?.length || 0; }
  get replyCount(): number { return this.replies.length; }

  toggleReplies(): void { this.showReplies = !this.showReplies; }

  loadReplies(): void {
    if (!this.tweet.id) return;
    this.loadingReplies = true;
    this.repliesSub?.unsubscribe();
    this.repliesSub = this.tweetService.getReplies(this.tweet.id).subscribe({
      next: r => { this.replies = r; this.loadingReplies = false; },
      error: err => { if (err?.code !== 'permission-denied') console.error(err); this.loadingReplies = false; }
    });
  }

  async postReply(): Promise<void> {
    if (!this.replyText.trim() || !this.currentUser || this.postingReply) return;
    this.postingReply = true;
    try {
      await this.tweetService.createTweet({
        userId: this.currentUser.uid,
        username: this.currentUser.username,
        displayName: this.currentUser.displayName,
        avatarUrl: this.currentUser.avatarUrl,
        content: this.replyText.trim(),
        likes: [],
        replyTo: this.tweet.id,
        deleted: false
      });
      this.replyText = '';
    } finally { this.postingReply = false; }
  }

  async toggleLike(): Promise<void> {
    if (!this.currentUser) return;
    const wasLiked = this.isLiked;
    await this.tweetService.toggleLike(this.tweet.id!, this.currentUser.uid, wasLiked);
    this.isLiked = !wasLiked;
    this.tweet.likes = this.isLiked
      ? [...(this.tweet.likes || []), this.currentUser.uid]
      : (this.tweet.likes || []).filter(id => id !== this.currentUser!.uid);

    // Notificar like (solo al dar like, no al quitarlo)
    if (!wasLiked && this.tweet.userId !== this.currentUser.uid) {
      this.notifService.notifyLike({
        fromUserId: this.currentUser.uid,
        fromUsername: this.currentUser.username,
        fromDisplayName: this.currentUser.displayName,
        fromAvatarUrl: this.currentUser.avatarUrl,
        toUserId: this.tweet.userId,
        tweetId: this.tweet.id!,
        tweetContent: this.tweet.content
      }).catch(() => {}); // silencioso
    }
  }

  isReplyLiked(r: Tweet): boolean {
    return this.currentUser ? (r.likes?.includes(this.currentUser.uid) ?? false) : false;
  }

  async toggleReplyLike(r: Tweet): Promise<void> {
    if (!this.currentUser || !r.id) return;
    const liked = this.isReplyLiked(r);
    await this.tweetService.toggleLike(r.id, this.currentUser.uid, liked);
    r.likes = liked
      ? (r.likes || []).filter(id => id !== this.currentUser!.uid)
      : [...(r.likes || []), this.currentUser.uid];

    if (!liked && r.userId !== this.currentUser.uid) {
      this.notifService.notifyLike({
        fromUserId: this.currentUser.uid,
        fromUsername: this.currentUser.username,
        fromDisplayName: this.currentUser.displayName,
        fromAvatarUrl: this.currentUser.avatarUrl,
        toUserId: r.userId,
        tweetId: r.id!,
        tweetContent: r.content
      }).catch(() => {});
    }
  }

  canDelete(): boolean { return this.isAdmin || this.currentUser?.uid === this.tweet.userId; }
  canDeleteReply(r: Tweet): boolean { return this.isAdmin || this.currentUser?.uid === r.userId; }

  async deleteThisThread(): Promise<void> {
    if (!confirm('¿Eliminar este tweet?') || !this.currentUser) return;
    if (this.isAdmin) {
      await this.tweetService.deleteThread(this.tweet.id!, this.currentUser.uid);
    } else {
      await this.tweetService.deleteTweet(this.tweet.id!, this.currentUser.uid);
    }
    this.deleted.emit(this.tweet.id);
  }

  async deleteReply(r: Tweet): Promise<void> {
    if (!confirm('¿Eliminar esta respuesta?') || !this.currentUser) return;
    await this.tweetService.deleteTweet(r.id!, this.currentUser.uid);
    this.replies = this.replies.filter(x => x.id !== r.id);
  }

  openImage(url: string): void { this.lightboxUrl = url; }

  openReportModal(): void {
    this.showReportModal = true;
    this.selectedReason = '';
    this.reportDetails = '';
    this.reportSent = false;
  }

  closeReportModal(): void { this.showReportModal = false; }

  async submitReport(): Promise<void> {
    if (!this.selectedReason || !this.currentUser || this.submittingReport) return;
    this.submittingReport = true;
    try {
      await this.reportService.createReport({
        tweetId: this.tweet.id!,
        tweetContent: this.tweet.content,
        tweetUsername: this.tweet.username,
        reportedBy: this.currentUser.uid,
        reportedByUsername: this.currentUser.username,
        reason: this.selectedReason as ReportReason,
        details: this.reportDetails || undefined
      });
      this.reportSent = true;
      setTimeout(() => this.closeReportModal(), 2000);
    } catch (err) {
      console.error('Error al reportar:', err);
    } finally { this.submittingReport = false; }
  }

  goToProfile(): void { this.router.navigate(['/profile', this.tweet.username]); }
  navigateToProfile(username: string): void { this.router.navigate(['/profile', username]); }
}