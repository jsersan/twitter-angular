import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { Tweet, User } from '../../models/models';
import { TweetService } from '../../services/tweet.service';
import { AuthService } from '../../services/auth.service';
import { ImageUploadService } from '../../services/image-upload.service';
import { ToastService } from '../../services/toast.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  tweets: Tweet[] = [];
  tweetContent = '';
  loading = true;
  posting = false;
  charCount = 0;
  maxChars = 280;
  replyingTo: Tweet | null = null;

  selectedFile: File | null = null;
  previewUrl: string | null = null;
  uploadProgress = 0;
  uploading = false;

  private userSub!: Subscription;
  private timelineSub!: Subscription;

  constructor(
    private tweetService: TweetService,
    private authService: AuthService,
    private imageUpload: ImageUploadService,
    private toast: ToastService,
    private notifService: NotificationService
  ) {}

  ngOnInit(): void {
    this.userSub = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.timelineSub?.unsubscribe();
        this.loadTimeline(user);
      } else {
        this.timelineSub?.unsubscribe();
        this.tweets = [];
        this.loading = false;
      }
    });
  }

  loadTimeline(user: User): void {
    this.loading = true;
    this.timelineSub = this.tweetService.getTimeline(user.following, user.uid).subscribe({
      next: tweets => { this.tweets = tweets; this.loading = false; },
      error: err => { if (err?.code !== 'permission-denied') console.error(err); this.loading = false; }
    });
  }

  onInput(): void { this.charCount = this.tweetContent.length; }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    const error = this.imageUpload.validateImage(file);
    if (error) { this.toast.error(error); return; }
    this.selectedFile = file;
    const reader = new FileReader();
    reader.onload = e => this.previewUrl = e.target?.result as string;
    reader.readAsDataURL(file);
  }

  removeImage(): void {
    this.selectedFile = null;
    this.previewUrl = null;
    this.uploadProgress = 0;
  }

  async postTweet(): Promise<void> {
    if ((!this.tweetContent.trim() && !this.selectedFile) || !this.currentUser || this.posting) return;
    this.posting = true;
    this.uploading = false;

    try {
      let imageUrl: string | undefined;

      if (this.selectedFile) {
        this.uploading = true;
        imageUrl = await new Promise<string>((resolve, reject) => {
          this.imageUpload.uploadTweetImage(this.currentUser!.uid, this.selectedFile!).subscribe({
            next: p => {
              this.uploadProgress = p.progress;
              if (p.url) resolve(p.url);
              if (p.error) reject(new Error(p.error));
            },
            error: reject
          });
        });
        this.uploading = false;
      }

      const tweetId = await this.tweetService.createTweet({
        userId: this.currentUser.uid,
        username: this.currentUser.username,
        displayName: this.currentUser.displayName,
        avatarUrl: this.currentUser.avatarUrl,
        content: this.tweetContent.trim(),
        imageUrl,
        likes: [],
        replyTo: this.replyingTo?.id,
        deleted: false
      });

      // Notificar a seguidores (solo posts raíz, no respuestas)
      if (!this.replyingTo && this.currentUser.followers?.length) {
        this.notifService.notifyNewPost({
          fromUserId: this.currentUser.uid,
          fromUsername: this.currentUser.username,
          fromDisplayName: this.currentUser.displayName,
          fromAvatarUrl: this.currentUser.avatarUrl,
          tweetId,
          tweetContent: this.tweetContent.trim(),
          tweetImageUrl: imageUrl,
          followers: this.currentUser.followers
        }).catch(() => {});
      }

      this.tweetContent = '';
      this.charCount = 0;
      this.replyingTo = null;
      this.removeImage();
    } catch (e: any) {
      this.toast.error('Error al publicar el tweet');
      this.uploading = false;
    } finally {
      this.posting = false;
    }
  }

  onReply(tweet: Tweet): void {
    this.replyingTo = tweet;
    document.getElementById('tweet-input')?.focus();
  }

  cancelReply(): void { this.replyingTo = null; }

  onTweetDeleted(id: string): void {
    this.tweets = this.tweets.filter(t => t.id !== id);
  }

  trackById(_: number, tweet: Tweet): string { return tweet.id || ''; }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    this.timelineSub?.unsubscribe();
  }
}