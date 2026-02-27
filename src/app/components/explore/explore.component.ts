import { Component } from '@angular/core';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs/operators';
import { UserService } from '../../services/user.service';
import { AuthService } from '../../services/auth.service';
import { User } from '../../models/models';

@Component({
  selector: 'app-explore',
  template: `
  <div class="explore-page">
    <div class="search-header">
      <h2>Explorar</h2>
      <div class="search-box">
        <span class="icon">🔍</span>
        <input
          type="text"
          placeholder="Buscar por nombre o &#64;usuario..."
          [(ngModel)]="searchTerm"
          (input)="onSearch()"
        />
      </div>
    </div>

    <div class="results">
      <div *ngFor="let user of results" class="user-card">
        <a [routerLink]="['/profile', user.username]">
          <img [src]="user.avatarUrl" [alt]="user.displayName" class="avatar" />
        </a>
        <div class="user-info">
          <a [routerLink]="['/profile', user.username]" class="display-name">
            {{ user.displayName }}
            <span class="blocked-tag" *ngIf="user.blocked">🚫</span>
          </a>
          <p class="username">&#64;{{ user.username }}</p>
          <p class="bio" *ngIf="user.bio">{{ user.bio }}</p>
          <p class="stats">{{ user.followersCount || 0 }} seguidores</p>
        </div>
        <button
          *ngIf="currentUser && currentUser.uid !== user.uid"
          class="btn-follow"
          [class.following]="isFollowing(user.uid)"
          (click)="toggleFollow(user)">
          {{ isFollowing(user.uid) ? 'Siguiendo' : 'Seguir' }}
        </button>
      </div>

      <div class="empty" *ngIf="results.length === 0 && searched && !searching">
        <p>No se encontraron usuarios para "{{ searchTerm }}"</p>
      </div>
    </div>
  </div>
  `,
  styles: [`
    .explore-page {
      max-width: 600px;
      margin: 0;
      border-left: 1px solid #38444d;
      border-right: 1px solid #38444d;
      min-height: 100vh;
    }
    .search-header {
      padding: 16px;
      border-bottom: 1px solid #38444d;
      position: sticky;
      top: 0;
      background: #15202b;
      z-index: 10;
      h2 { color: white; margin: 0 0 12px; font-size: 1.1rem; }
    }
    .search-box {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #253341;
      border-radius: 50px;
      padding: 10px 16px;
      input {
        background: none;
        border: none;
        outline: none;
        color: white;
        font-size: 0.95rem;
        width: 100%;
        &::placeholder { color: #4a5568; }
      }
      .icon { color: #8899a6; }
    }
    .user-card {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 16px;
      border-bottom: 1px solid #38444d;
      transition: background 0.15s;
      &:hover { background: rgba(255,255,255,0.03); }
      .avatar { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; }
      .user-info {
        flex: 1;
        .display-name { color: white; font-weight: 700; text-decoration: none; &:hover { text-decoration: underline; } }
        .username, .bio, .stats { color: #8899a6; font-size: 0.85rem; margin: 2px 0; }
        .blocked-tag { font-size: 0.8rem; }
      }
      .btn-follow {
        padding: 7px 16px;
        border-radius: 50px;
        font-weight: 700;
        font-size: 0.85rem;
        cursor: pointer;
        background: #1da1f2;
        border: none;
        color: white;
        white-space: nowrap;
        &.following { background: transparent; border: 1px solid #536471; color: white; }
        &:hover:not(.following) { background: #1a91da; }
      }
    }
    .empty { padding: 40px; text-align: center; color: #8899a6; }
  `]
})
export class ExploreComponent {
  searchTerm = '';
  results: User[] = [];
  currentUser: User | null = null;
  searched = false;
  searching = false;
  private searchSubject = new Subject<string>();

  constructor(private userService: UserService, private authService: AuthService) {
    this.authService.currentUser$.subscribe(u => this.currentUser = u);

    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      switchMap(term => {
        if (term.length < 2) {
          this.results = [];
          this.searching = false;
          return [];
        }
        this.searching = true;
        // Buscamos con el término tal cual Y con la primera letra en mayúscula
        // para cubrir displayNames como "Sara" cuando el usuario escribe "sara"
        return this.userService.searchUsers(term);
      })
    ).subscribe(users => {
      this.results = users;
      this.searching = false;
    });
  }

  onSearch(): void {
    this.searched = true;
    this.searchSubject.next(this.searchTerm.trim());
  }

  isFollowing(uid: string): boolean {
    return this.currentUser?.following?.includes(uid) || false;
  }

  async toggleFollow(user: User): Promise<void> {
    if (!this.currentUser) return;
    if (this.isFollowing(user.uid)) {
      await this.userService.unfollowUser(this.currentUser.uid, user.uid);
      this.currentUser.following = this.currentUser.following.filter(id => id !== user.uid);
    } else {
      await this.userService.followUser(this.currentUser.uid, user.uid);
      this.currentUser.following = [...(this.currentUser.following || []), user.uid];
    }
  }
}