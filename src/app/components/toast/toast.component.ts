import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ToastService, ToastMessage } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  template: `
    <!-- OVERLAY + CONFIRM — fuera del contenedor -->
    <ng-container *ngFor="let t of confirms">
      <div class="toast-overlay" (click)="cancelAll()"></div>
      <div class="toast-confirm-box">
        <span class="toast-icon">{{ getIcon(t) }}</span>
        <span class="toast-text">{{ t.text }}</span>
        <div class="toast-actions">
          <button class="btn-cancel" (click)="cancel(t)">Cancelar</button>
          <button class="btn-confirm" (click)="confirm(t)">Aceptar</button>
        </div>
      </div>
    </ng-container>

    <!-- TOASTS NORMALES -->
    <div class="toast-container">
      <div *ngFor="let t of normalToasts"
        class="toast"
        [class.success]="t.type === 'success'"
        [class.error]="t.type === 'error'"
        [class.info]="t.type === 'info'"
        (click)="remove(t)">
        <span class="toast-icon">{{ getIcon(t) }}</span>
        <span class="toast-text">{{ t.text }}</span>
      </div>
    </div>
  `,
  styles: [`
    .toast-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.6);
      z-index: 9998;
      backdrop-filter: blur(3px);
      animation: fadeIn 0.2s ease;
    }

    .toast-confirm-box {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 9999;
      background: linear-gradient(135deg, #1e2732, #2d3f50);
      border: 1px solid #38444d;
      border-radius: 20px;
      padding: 28px 32px;
      width: 340px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      color: white;
      box-shadow: 0 20px 60px rgba(0,0,0,0.8);
      animation: fadeInCenter 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);

      .toast-icon { font-size: 1.4rem; }
      .toast-text { font-size: 1rem; font-weight: 600; line-height: 1.5; }
    }

    .toast-container {
      position: fixed;
      bottom: 32px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9997;
      display: flex;
      flex-direction: column;
      gap: 12px;
      align-items: center;
      pointer-events: none;
    }

    .toast {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 14px 24px;
      border-radius: 50px;
      font-size: 0.9rem;
      font-weight: 600;
      color: white;
      box-shadow: 0 8px 30px rgba(0,0,0,0.5);
      pointer-events: all;
      cursor: pointer;
      animation: slideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      white-space: nowrap;

      &.success { background: linear-gradient(135deg, #17bf63, #0d9f52); }
      &.error    { background: linear-gradient(135deg, #e0245e, #b81d4e); }
      &.info     { background: linear-gradient(135deg, #1da1f2, #0d8fd9); }
    }

    .toast-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      margin-top: 8px;

      button {
        padding: 9px 22px;
        border: none;
        border-radius: 50px;
        font-size: 0.85rem;
        font-weight: 700;
        cursor: pointer;
        transition: opacity 0.15s, transform 0.1s;
        &:hover { opacity: 0.85; transform: scale(1.03); }
        &:active { transform: scale(0.97); }
      }

      .btn-cancel {
        background: rgba(255,255,255,0.08);
        color: #aab8c2;
        border: 1px solid #38444d;
      }
      .btn-confirm {
        background: linear-gradient(135deg, #1da1f2, #0d8fd9);
        color: white;
      }
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px) scale(0.95); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes fadeInCenter {
      from { opacity: 0; transform: translate(-50%, -46%) scale(0.92); }
      to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
    }
  `]
})
export class ToastComponent implements OnInit, OnDestroy {
  toasts: (ToastMessage & { id: number })[] = [];
  private sub!: Subscription;
  private counter = 0;

  constructor(private toastService: ToastService) {}

  get normalToasts() { return this.toasts.filter(t => t.type !== 'confirm'); }
  get confirms()     { return this.toasts.filter(t => t.type === 'confirm'); }

  ngOnInit(): void {
    this.sub = this.toastService.toast$.subscribe(msg => {
      const id = ++this.counter;
      this.toasts.push({ ...msg, id });
      if (msg.type !== 'confirm') {
        setTimeout(() => this.removeById(id), msg.duration ?? 3000);
      }
    });
  }

  ngOnDestroy(): void { this.sub?.unsubscribe(); }

  getIcon(t: ToastMessage): string {
    if (t.icon) return t.icon;
    if (t.type === 'success') return '✅';
    if (t.type === 'error') return '❌';
    if (t.type === 'confirm') return '⚠️';
    return 'ℹ️';
  }

  cancelAll(): void {
    this.confirms.forEach(t => this.cancel(t));
  }

  remove(t: any): void { this.removeById(t.id); }

  confirm(t: any): void {
    t.onConfirm?.();
    this.removeById(t.id);
  }

  cancel(t: any): void {
    t.onCancel?.();
    this.removeById(t.id);
  }

  private removeById(id: number): void {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }
}