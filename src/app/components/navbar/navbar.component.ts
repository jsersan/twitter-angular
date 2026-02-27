import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { NotificationService } from '../../services/notification.service';
import { User } from '../../models/models';

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss']
})
export class NavbarComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  unreadCount = 0;
  followersCount = 0;

  private userSub!: Subscription;
  private notifSub!: Subscription;

  constructor(
    public authService: AuthService,
    private notifService: NotificationService
  ) {}

  ngOnInit(): void {
    this.userSub = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.followersCount = user?.followers?.length || 0;
      this.notifSub?.unsubscribe();
      if (user) {
        this.notifSub = this.notifService.getUnreadCount(user.uid).subscribe(count => {
          this.unreadCount = count;
        });
      } else {
        this.unreadCount = 0;
        this.followersCount = 0;
      }
    });
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    this.notifSub?.unsubscribe();
  }

  logout(): void { this.authService.logout(); }
}