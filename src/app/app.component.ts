import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  template: `
    <div class="app-container" [class.auth-layout]="isAuthPage">
      <app-navbar *ngIf="!isAuthPage"></app-navbar>

      <main class="main-content" [class.with-sidebar]="!isAuthPage">
        <router-outlet></router-outlet>
      </main>
    </div>

    <!-- Toast global (fuera del layout para no verse afectado por el overflow) -->
    <app-toast></app-toast>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
      background: #15202b;
      display: flex;
    }

    .main-content {
      flex: 1;

      &.with-sidebar {
        margin-left: 260px;
        /* Sin padding lateral: cada página gestiona su propio ancho */
        max-width: calc(100vw - 260px);

        @media (max-width: 1024px) {
          margin-left: 80px;
          max-width: calc(100vw - 80px);
        }
        @media (max-width: 600px) {
          margin-left: 0;
          max-width: 100vw;
          margin-bottom: 60px;
        }
      }
    }
  `]
})
export class AppComponent implements OnInit {
  isAuthPage = false;

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      this.isAuthPage = ['/login', '/register'].some(p => e.url.startsWith(p));
    });
  }
}