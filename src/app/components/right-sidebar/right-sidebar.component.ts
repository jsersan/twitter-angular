import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Tweet, User } from '../../models/models';
import { TweetService } from '../../services/tweet.service';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-right-sidebar',
  templateUrl: './right-sidebar.component.html',
  styleUrls: ['./right-sidebar.component.scss']
})
export class RightSidebarComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  searchQuery = '';
  searchResults: Tweet[] = [];
  isSearching = false;
  hasSearched = false;

  suggestedUsers: User[] = [];
  followingInProgress = new Set<string>();

  private allTweets: Tweet[] = [];
  private searchSubject = new Subject<string>();
  private userSub!: Subscription;
  private tweetsSub!: Subscription;
  private usersSub!: Subscription;

  constructor(
    private tweetService: TweetService,
    private userService: UserService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userSub = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      if (user) {
        this.loadRecentTweets();
        this.loadSuggestedUsers(user);
      }
    });

    // Búsqueda con debounce
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(term => this.doSearch(term));
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    this.tweetsSub?.unsubscribe();
    this.usersSub?.unsubscribe();
  }

  // ── Cargar tweets recientes para búsqueda ──────────────────────────────
  loadRecentTweets(): void {
    this.tweetsSub?.unsubscribe();
    this.tweetsSub = this.tweetService.getRecentTweets(200).subscribe(tweets => {
      this.allTweets = tweets;
      // Re-ejecutar búsqueda si hay término activo
      if (this.searchQuery.trim().length >= 2) {
        this.doSearch(this.searchQuery.trim());
      }
    });
  }

  // ── Búsqueda ───────────────────────────────────────────────────────────
  onSearchInput(): void {
    const term = this.searchQuery.trim();
    if (!term) {
      this.searchResults = [];
      this.hasSearched = false;
      return;
    }
    this.isSearching = true;
    this.searchSubject.next(term);
  }

  doSearch(term: string): void {
    if (term.length < 2) {
      this.searchResults = [];
      this.isSearching = false;
      this.hasSearched = false;
      return;
    }
    const lower = term.toLowerCase();
    this.searchResults = this.allTweets
      .filter(t =>
        t.content?.toLowerCase().includes(lower) ||
        t.username?.toLowerCase().includes(lower) ||
        t.displayName?.toLowerCase().includes(lower)
      )
      .slice(0, 10);
    this.isSearching = false;
    this.hasSearched = true;
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.searchResults = [];
    this.hasSearched = false;
    this.isSearching = false;
  }

  goToTweet(tweet: Tweet): void {
    this.router.navigate(['/profile', tweet.username]);
  }

  highlightMatch(content: string): string {
    if (!this.searchQuery.trim()) return content;
    const term = this.searchQuery.trim();
    const regex = new RegExp(`(${term})`, 'gi');
    return content.replace(regex, '<mark>$1</mark>');
  }

  // ── Sugerencias de a quién seguir ──────────────────────────────────────
  loadSuggestedUsers(currentUser: User): void {
    this.usersSub?.unsubscribe();
    this.usersSub = this.userService.getAllUsers().subscribe(users => {
      const following = new Set(currentUser.following || []);
      this.suggestedUsers = users
        .filter(u =>
          u.uid !== currentUser.uid &&
          !following.has(u.uid) &&
          !u.blocked
        )
        .slice(0, 5);
    });
  }

  isFollowing(uid: string): boolean {
    return this.currentUser?.following?.includes(uid) || false;
  }

  async followUser(user: User, event: Event): Promise<void> {
    event.stopPropagation();
    if (!this.currentUser || this.followingInProgress.has(user.uid)) return;

    this.followingInProgress.add(user.uid);
    try {
      if (this.isFollowing(user.uid)) {
        await this.userService.unfollowUser(this.currentUser.uid, user.uid);
        this.currentUser.following = this.currentUser.following.filter(id => id !== user.uid);
      } else {
        await this.userService.followUser(this.currentUser.uid, user.uid);
        this.currentUser.following = [...(this.currentUser.following || []), user.uid];
        // Quitar de sugerencias tras seguir
        setTimeout(() => {
          this.suggestedUsers = this.suggestedUsers.filter(u => u.uid !== user.uid);
        }, 600);
      }
    } finally {
      this.followingInProgress.delete(user.uid);
    }
  }

  goToProfile(username: string): void {
    this.router.navigate(['/profile', username]);
  }

  getTimestamp(tweet: Tweet): Date {
    const ts = tweet.createdAt as any;
    return ts?.toDate ? ts.toDate() : new Date(ts);
  }
}