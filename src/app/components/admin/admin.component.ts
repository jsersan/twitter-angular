import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { User, Tweet, Report, AdminAction } from '../../models/models';
import { UserService } from '../../services/user.service';
import { TweetService } from '../../services/tweet.service';
import { AuthService } from '../../services/auth.service';
import { ReportService } from '../../services/report.service';

type AdminTab = 'users' | 'tweets' | 'reports' | 'log';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit, OnDestroy {
  activeTab: AdminTab = 'reports';   // Empieza en reportes (más urgente)
  isAdminPage = false; // ← añadir junto a isAuthPage
  users: User[] = [];
  tweets: Tweet[] = [];
  reports: Report[] = [];
  adminLog: AdminAction[] = [];
  currentUser: User | null = null;
  loading = false;
  searchTerm = '';
  reportFilter: 'pending' | 'all' = 'pending';

  private subs: Subscription[] = [];

  constructor(
    private userService: UserService,
    private tweetService: TweetService,
    private authService: AuthService,
    private reportService: ReportService
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.authService.currentUser$.subscribe(u => this.currentUser = u)
    );
    // Cargar reportes por defecto (tab inicial)
    this.loadReports();
    // Cargar usuarios en background
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  // ─── Tabs ─────────────────────────────────────────────────────────────────
  switchTab(tab: AdminTab): void {
    this.activeTab = tab;
    this.searchTerm = '';
    if (tab === 'tweets' && this.tweets.length === 0) this.loadTweets();
    if (tab === 'reports') this.loadReports();
    if (tab === 'log' && this.adminLog.length === 0) this.loadLog();
  }

  // ─── Carga de datos ───────────────────────────────────────────────────────
  loadUsers(): void {
    this.subs.push(
      this.userService.getAllUsers().subscribe(u => this.users = u)
    );
  }

  loadTweets(): void {
    this.loading = true;
    this.subs.push(
      this.tweetService.getAllTweets().subscribe(t => {
        this.tweets = t;
        this.loading = false;
      })
    );
  }

  loadReports(): void {
    this.loading = true;
    const obs$ = this.reportFilter === 'pending'
      ? this.reportService.getPendingReports()
      : this.reportService.getAllReports();
    this.subs.push(
      obs$.subscribe(r => {
        this.reports = r;
        this.loading = false;
      })
    );
  }

  loadLog(): void {
    this.loading = true;
    this.subs.push(
      this.reportService.getAdminLog().subscribe(log => {
        this.adminLog = log;
        this.loading = false;
      })
    );
  }

  // ─── Gestión de usuarios ──────────────────────────────────────────────────
  async toggleBlock(user: User): Promise<void> {
    const action = user.blocked ? 'desbloquear' : 'bloquear';
    if (!confirm(`¿${action} a @${user.username}?`)) return;
    await this.userService.toggleBlockUser(user.uid, !user.blocked);
    await this.reportService.logAction({
      adminUid: this.currentUser!.uid,
      adminUsername: this.currentUser!.username,
      action: user.blocked ? 'unblock' : 'block',
      targetType: 'user',
      targetId: user.uid,
      targetDescription: `@${user.username}`
    });
    user.blocked = !user.blocked;
  }

  async toggleAdmin(user: User): Promise<void> {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    if (!confirm(`¿Cambiar rol de @${user.username} a "${newRole}"?`)) return;
    await this.userService.setUserRole(user.uid, newRole);
    await this.reportService.logAction({
      adminUid: this.currentUser!.uid,
      adminUsername: this.currentUser!.username,
      action: newRole === 'admin' ? 'promote' : 'demote',
      targetType: 'user',
      targetId: user.uid,
      targetDescription: `@${user.username}`
    });
    user.role = newRole;
  }

  // ─── Gestión de tweets ────────────────────────────────────────────────────
  async deleteThread(tweet: Tweet): Promise<void> {
    if (!confirm(`¿Eliminar hilo completo de @${tweet.username}?`)) return;
    if (!this.currentUser) return;
    await this.tweetService.deleteThread(tweet.id!, this.currentUser.uid);
    await this.reportService.logAction({
      adminUid: this.currentUser.uid,
      adminUsername: this.currentUser.username,
      action: 'delete_tweet',
      targetType: 'tweet',
      targetId: tweet.id!,
      targetDescription: `Tweet de @${tweet.username}: "${tweet.content.slice(0, 50)}"`
    });
    tweet.deleted = true;
  }

  // ─── Gestión de reportes ──────────────────────────────────────────────────
  async resolveReport(report: Report): Promise<void> {
    if (!this.currentUser) return;
    // Eliminar el tweet reportado
    await this.tweetService.deleteThread(report.tweetId, this.currentUser.uid);
    await this.reportService.resolveReport(report.id!, this.currentUser.uid);
    await this.reportService.logAction({
      adminUid: this.currentUser.uid,
      adminUsername: this.currentUser.username,
      action: 'resolve_report',
      targetType: 'report',
      targetId: report.id!,
      targetDescription: `Reporte de @${report.reportedByUsername} contra @${report.tweetUsername}`
    });
    report.status = 'resolved';
  }

  async dismissReport(report: Report): Promise<void> {
    if (!this.currentUser) return;
    await this.reportService.dismissReport(report.id!, this.currentUser.uid);
    await this.reportService.logAction({
      adminUid: this.currentUser.uid,
      adminUsername: this.currentUser.username,
      action: 'dismiss_report',
      targetType: 'report',
      targetId: report.id!,
      targetDescription: `Reporte de @${report.reportedByUsername} contra @${report.tweetUsername}`
    });
    report.status = 'dismissed';
  }

  onReportFilterChange(): void {
    this.loadReports();
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────
  get blockedCount(): number { return this.users.filter(u => u.blocked).length; }
  get pendingReportsCount(): number { return this.reports.filter(r => r.status === 'pending').length; }
  get adminCount(): number { return this.users.filter(u => u.role === 'admin').length; }

  get filteredUsers(): User[] {
    if (!this.searchTerm) return this.users;
    const t = this.searchTerm.toLowerCase();
    return this.users.filter(u =>
      u.username.includes(t) || u.displayName.toLowerCase().includes(t) || u.email?.includes(t)
    );
  }

  get filteredTweets(): Tweet[] {
    if (!this.searchTerm) return this.tweets;
    const t = this.searchTerm.toLowerCase();
    return this.tweets.filter(tw =>
      tw.username.includes(t) || tw.content.toLowerCase().includes(t)
    );
  }

  reasonLabel(reason: string): string {
    const labels: Record<string, string> = {
      spam: '🔁 Spam',
      hate_speech: '😡 Discurso de odio',
      harassment: '👊 Acoso',
      misinformation: '❌ Desinformación',
      inappropriate: '🔞 Contenido inapropiado',
      other: '💬 Otro'
    };
    return labels[reason] || reason;
  }

  actionLabel(action: string): string {
    const labels: Record<string, string> = {
      block: '🚫 Bloqueó',
      unblock: '✅ Desbloqueó',
      delete_tweet: '🗑️ Eliminó tweet',
      promote: '⬆️ Promovió a admin',
      demote: '⬇️ Quitó admin',
      resolve_report: '⚖️ Resolvió reporte',
      dismiss_report: '🗂️ Desestimó reporte'
    };
    return labels[action] || action;
  }
}