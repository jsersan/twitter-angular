import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  template: `
    <div class="app-container" [class.auth-layout]="isAuthPage">
      <app-navbar *ngIf="!isAuthPage"></app-navbar>

      <div class="content-area" [class.no-sidebar]="!showSidebar" *ngIf="!isAuthPage">
        <main class="main-content">
          <router-outlet></router-outlet>
        </main>
        <!-- Tercera columna solo en páginas principales -->
        <app-right-sidebar *ngIf="showSidebar" class="sidebar-col"></app-right-sidebar>
      </div>

      <!-- Auth pages sin sidebar -->
      <main *ngIf="isAuthPage" class="main-content auth-main">
        <router-outlet></router-outlet>
      </main>
    </div>

    <app-toast></app-toast>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
      background: #15202b;
      display: flex;
    }

    /* Área con navbar fijo a la izquierda */
    .content-area {
      margin-left: 260px;
      flex: 1;
      display: flex;
      justify-content: flex-start;
      min-height: 100vh;
    }

    .main-content {
      flex: 0 0 600px;
      min-height: 100vh;
    }

    .no-sidebar .main-content {
      flex: 1;
      max-width: 600px;
      min-height: 100vh;
    }

    .sidebar-col {
      flex: 0 0 320px;
      min-height: 100vh;
    }

    .auth-main {
      flex: 1;
      margin-left: 0;
    }

    @media (max-width: 1280px) {
      .sidebar-col { display: none; }
      .content-area { justify-content: flex-start; }
      .main-content { flex: 1; }
    }

    @media (max-width: 1024px) {
      .content-area { margin-left: 80px; }
    }

    @media (max-width: 600px) {
      .content-area {
        margin-left: 0;
        margin-bottom: 60px;
        flex-direction: column;
      }
      .main-content { flex: 1; }
    }
  `]
})
export class AppComponent implements OnInit {
  isAuthPage = false;
  showSidebar = false;

  // Rutas donde aparece el sidebar derecho
  private sidebarRoutes = ['/home', '/notifications', '/explore', '/profile'];

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd)
    ).subscribe((e: any) => {
      this.isAuthPage = ['/login', '/register'].some(p => e.url.startsWith(p));
      this.showSidebar = this.sidebarRoutes.some(p => e.url.startsWith(p));
    });
  }
}