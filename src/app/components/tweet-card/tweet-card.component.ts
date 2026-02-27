import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { Tweet, User } from '../../models/models';
import { TweetService } from '../../services/tweet.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-tweet-card',
  templateUrl: './tweet-card.component.html',
  styleUrls: ['./tweet-card.component.scss']
})
export class TweetCardComponent implements OnInit {
  @Input() tweet!: Tweet;
  @Input() isAdmin = false;
  @Output() deleted = new EventEmitter<string>();
  @Output() reply = new EventEmitter<Tweet>();

  currentUser: User | null = null;
  isLiked = false;
  isReposted = false;
  reposting = false;
  showRepostMenu = false;

  constructor(
    private tweetService: TweetService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        // Para el like: usa el tweet original si es repost
        const sourceTweet = this.tweet.isRepost ? this.getOriginalAsTweet() : this.tweet;
        this.isLiked = sourceTweet.likes?.includes(user.uid) || false;
        // Para repost: revisar en el tweet original
        this.isReposted = this.tweet.isRepost
          ? false  // no se puede re-repostear
          : (this.tweet.reposts?.includes(user.uid) || false);
      }
    });
  }

  // Construye un objeto Tweet con los datos del original (para likes en reposts)
  getOriginalAsTweet(): Tweet {
    return {
      id: this.tweet.originalTweetId,
      userId: this.tweet.originalUserId!,
      username: this.tweet.originalUsername!,
      displayName: this.tweet.originalDisplayName!,
      avatarUrl: this.tweet.originalAvatarUrl,
      content: this.tweet.originalContent!,
      imageUrl: this.tweet.originalImageUrl,
      likes: this.tweet.likes,
      reposts: this.tweet.reposts || [],
      deleted: false,
      createdAt: this.tweet.originalCreatedAt
    };
  }

  get likesCount(): number { return this.tweet.likes?.length || 0; }
  get repostsCount(): number {
    // Si es repost, el contador está en el tweet raíz (no disponible aquí, omitir)
    if (this.tweet.isRepost) return 0;
    return this.tweet.reposts?.length || 0;
  }

  async toggleLike(): Promise<void> {
    if (!this.currentUser) return;
    // El like se aplica al tweet real (si es repost, al tweet original)
    const tweetId = this.tweet.isRepost ? this.tweet.originalTweetId! : this.tweet.id!;
    await this.tweetService.toggleLike(tweetId, this.currentUser.uid, this.isLiked);
    this.isLiked = !this.isLiked;
  }

  async toggleRepost(): Promise<void> {
    if (!this.currentUser || this.reposting || this.tweet.isRepost) return;
    this.reposting = true;
    this.showRepostMenu = false;
    try {
      if (this.isReposted) {
        await this.tweetService.undoRepost(this.tweet.id!, this.currentUser.uid);
        this.isReposted = false;
      } else {
        await this.tweetService.repostTweet(this.tweet, this.currentUser);
        this.isReposted = true;
      }
    } finally {
      this.reposting = false;
    }
  }

  async deleteThisThread(): Promise<void> {
    if (!confirm('¿Eliminar este hilo completo?')) return;
    if (this.isAdmin && this.currentUser) {
      await this.tweetService.deleteThread(this.tweet.id!, this.currentUser.uid);
    } else if (this.currentUser?.uid === this.tweet.userId) {
      await this.tweetService.deleteTweet(this.tweet.id!, this.currentUser.uid);
    }
    this.deleted.emit(this.tweet.id);
  }

  goToProfile(username?: string): void {
    this.router.navigate(['/profile', username || this.tweet.username]);
  }

  canDelete(): boolean {
    return this.isAdmin || this.currentUser?.uid === this.tweet.userId;
  }

  emitReply(): void {
    // Si es repost, responder al tweet original
    if (this.tweet.isRepost) {
      this.reply.emit(this.getOriginalAsTweet());
    } else {
      this.reply.emit(this.tweet);
    }
  }
}