import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { Notification, User } from '../../models/models';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-notifications',
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss']
})
export class NotificationsComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  notifications: Notification[] = [];
  loading = true;
  activeTab: 'all' | 'likes' | 'posts' = 'all';

  private userSub!: Subscription;
  private notifSub!: Subscription;

  constructor(
    private authService: AuthService,
    private notifService: NotificationService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userSub = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) this.loadNotifications(user.uid);
    });
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    this.notifSub?.unsubscribe();
  }

  loadNotifications(uid: string): void {
    this.loading = true;
    this.notifSub?.unsubscribe();
    this.notifSub = this.notifService.getNotifications(uid).subscribe(notifs => {
      this.notifications = notifs;
      this.loading = false;
    });
  }

  get filtered(): Notification[] {
    if (this.activeTab === 'likes') return this.notifications.filter(n => n.type === 'like');
    if (this.activeTab === 'posts') return this.notifications.filter(n => n.type === 'new_post');
    return this.notifications;
  }

  get likesCount(): number   { return this.notifications.filter(n => n.type === 'like').length; }
  get postsCount(): number   { return this.notifications.filter(n => n.type === 'new_post').length; }
  get unreadCount(): number  { return this.notifications.filter(n => !n.read).length; }

  async markAllRead(): Promise<void> {
    if (!this.currentUser) return;
    await this.notifService.markAllRead(this.currentUser.uid);
  }

  goToTweet(n: Notification): void {
    if (n.tweetId) {
      // Ir al perfil del autor; en futuro podría ir al tweet individual
      this.router.navigate(['/profile', n.fromUsername]);
    }
  }

  goToProfile(username: string): void {
    this.router.navigate(['/profile', username]);
  }

  getTimestamp(n: Notification): Date {
    const ts = n.createdAt as any;
    return ts?.toDate ? ts.toDate() : new Date(ts);
  }
}