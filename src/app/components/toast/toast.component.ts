import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ToastService, ToastMessage } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  template: `
    <div class="toast-container">
      <div
        *ngFor="let t of toasts"
        class="toast"
        [class.success]="t.type === 'success'"
        [class.error]="t.type === 'error'"
        [class.info]="t.type === 'info'"
        (click)="remove(t)">
        <span class="toast-icon">
          {{ t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️' }}
        </span>
        <span class="toast-text">{{ t.text }}</span>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 32px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 10px;
      align-items: center;
      pointer-events: none;
    }
    .toast {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 13px 22px;
      border-radius: 50px;
      font-size: 0.95rem;
      font-weight: 600;
      color: white;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      pointer-events: all;
      cursor: pointer;
      animation: slideUp 0.3s ease;
      white-space: nowrap;

      &.success { background: #17bf63; }
      &.error    { background: #e0245e; }
      &.info     { background: #1da1f2; }
    }
    @keyframes slideUp {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `]
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: (ToastMessage & { id: number })[] = [];
  private sub!: Subscription;
  private counter = 0;

  constructor(private toastService: ToastService) {}

  ngOnInit(): void {
    this.sub = this.toastService.toast$.subscribe(msg => {
      const id = ++this.counter;
      this.toasts.push({ ...msg, id });
      setTimeout(() => this.removeById(id), msg.duration ?? 3000);
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  remove(t: any): void { this.removeById(t.id); }

  private removeById(id: number): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }
}