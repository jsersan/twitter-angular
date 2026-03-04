import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Tweet, User } from '../../models/models';
import { TweetService } from '../../services/tweet.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-tweet-detail',
  templateUrl: './tweet-detail.component.html',
  styleUrls: ['./tweet-detail.component.scss']
})
export class TweetDetailComponent implements OnInit, OnDestroy {
  tweet: Tweet | null = null;
  replies: Tweet[] = [];
  currentUser: User | null = null;
  loading = true;
  replyText = '';
  posting = false;

  private subs: Subscription[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private tweetService: TweetService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.authService.currentUser$.subscribe(u => this.currentUser = u)
    );

    const tweetId = this.route.snapshot.paramMap.get('id');
    if (!tweetId) { this.router.navigate(['/home']); return; }

    // Cargar tweet principal
    this.tweetService.getTweetById(tweetId).then(t => {
      this.tweet = t;
      this.loading = false;
    });

    // Cargar respuestas en tiempo real
    this.subs.push(
      this.tweetService.getReplies(tweetId).subscribe(r => this.replies = r)
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  async postReply(): Promise<void> {
    if (!this.replyText.trim() || !this.currentUser || !this.tweet) return;
    this.posting = true;
    await this.tweetService.createTweet({
      userId: this.currentUser.uid,
      username: this.currentUser.username,
      displayName: this.currentUser.displayName,
      avatarUrl: this.currentUser.avatarUrl || undefined,
      content: this.replyText.trim(),
      imageUrl: null,
      replyTo: this.tweet.id!,
      likes: [],
      reposts: [],
      deleted: false
    });
    this.replyText = '';
    this.posting = false;
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }

  onTweetDeleted(): void {
    this.router.navigate(['/home']);
  }

  onReplyDeleted(id: string): void {
    this.replies = this.replies.filter(r => r.id !== id);
  }
}