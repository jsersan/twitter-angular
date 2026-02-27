import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, combineLatest, of } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { User } from '../../models/models';
import { AuthService } from '../../services/auth.service';
import { UserService } from '../../services/user.service';

interface UserEntry {
  user: User;
  inProgress: boolean;
}

@Component({
  selector: 'app-followers',
  templateUrl: './followers.component.html',
  styleUrls: ['./followers.component.scss']
})
export class FollowersComponent implements OnInit, OnDestroy {
  currentUser: User | null = null;
  activeTab: 'followers' | 'following' = 'followers';

  followers: UserEntry[] = [];   // personas que ME siguen
  following: UserEntry[] = [];   // personas a las que YO sigo

  loading = true;
  searchTerm = '';

  private userSub!: Subscription;

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.userSub = this.authService.currentUser$.pipe(
      switchMap(user => {
        this.currentUser = user;
        if (!user) {
          this.followers = []; this.following = []; this.loading = false;
          return of([[], []] as [User[], User[]]);
        }
        this.loading = true;
        const followers$ = user.followers?.length
          ? this.userService.getUsersByUids(user.followers)
          : of([] as User[]);
        const following$ = user.following?.length
          ? this.userService.getUsersByUids(user.following)
          : of([] as User[]);
        return combineLatest([followers$, following$]);
      })
    ).subscribe({
      next: ([followerUsers, followingUsers]) => {
        // Preservar estado inProgress si ya existía
        const fersMap = new Map(this.followers.map(e => [e.user.uid, e.inProgress]));
        const fingMap = new Map(this.following.map(e => [e.user.uid, e.inProgress]));
        const userMap = new Map([...followerUsers, ...followingUsers].map(u => [u.uid, u]));

        // followers: ordenados por antigüedad inversa (más reciente primero)
        const followerUids = [...(this.currentUser?.followers || [])].reverse();
        this.followers = followerUids
          .map(uid => userMap.get(uid))
          .filter((u): u is User => !!u)
          .map(u => ({ user: u, inProgress: fersMap.get(u.uid) ?? false }));

        // following: ordenados por antigüedad inversa (más reciente primero)
        const followingUids = [...(this.currentUser?.following || [])].reverse();
        this.following = followingUids
          .map(uid => userMap.get(uid))
          .filter((u): u is User => !!u)
          .map(u => ({ user: u, inProgress: fingMap.get(u.uid) ?? false }));

        this.loading = false;
      },
      error: () => { this.loading = false; }
    });
  }

  ngOnDestroy(): void { this.userSub?.unsubscribe(); }

  get filteredFollowers(): UserEntry[] {
    return this.applyFilter(this.followers);
  }
  get filteredFollowing(): UserEntry[] {
    return this.applyFilter(this.following);
  }
  private applyFilter(list: UserEntry[]): UserEntry[] {
    if (!this.searchTerm.trim()) return list;
    const t = this.searchTerm.toLowerCase();
    return list.filter(e =>
      e.user.username.toLowerCase().includes(t) ||
      e.user.displayName.toLowerCase().includes(t)
    );
  }

  isFollowingUser(uid: string): boolean {
    return this.currentUser?.following?.includes(uid) || false;
  }

  // ── Seguir/dejar de seguir a alguien (desde pestaña seguidores) ──────────
  async toggleFollow(entry: UserEntry, event: Event): Promise<void> {
    event.stopPropagation();
    if (!this.currentUser || entry.inProgress) return;
    entry.inProgress = true;
    try {
      if (this.isFollowingUser(entry.user.uid)) {
        await this.userService.unfollowUser(this.currentUser.uid, entry.user.uid);
        this.currentUser.following = (this.currentUser.following || []).filter(id => id !== entry.user.uid);
      } else {
        await this.userService.followUser(this.currentUser.uid, entry.user.uid);
        this.currentUser.following = [...(this.currentUser.following || []), entry.user.uid];
      }
    } finally { entry.inProgress = false; }
  }

  // ── Dejar de seguir (desde pestaña siguiendo) ────────────────────────────
  async unfollowUser(entry: UserEntry, event: Event): Promise<void> {
    event.stopPropagation();
    if (!this.currentUser || entry.inProgress) return;
    if (!confirm('¿Dejar de seguir a @' + entry.user.username + '?')) return;
    entry.inProgress = true;
    try {
      await this.userService.unfollowUser(this.currentUser.uid, entry.user.uid);
      this.currentUser.following = (this.currentUser.following || []).filter(id => id !== entry.user.uid);
    } finally { entry.inProgress = false; }
  }

  // ── Eliminar seguidor (desde pestaña seguidores) ─────────────────────────
  async removeFollower(entry: UserEntry, event: Event): Promise<void> {
    event.stopPropagation();
    if (!this.currentUser || entry.inProgress) return;
    if (!confirm('¿Eliminar a @' + entry.user.username + ' de tus seguidores?')) return;
    entry.inProgress = true;
    try {
      await this.userService.removeFollower(this.currentUser.uid, entry.user.uid);
    } catch { entry.inProgress = false; }
  }

  goToProfile(username: string): void {
    this.router.navigate(['/profile', username]);
  }
}