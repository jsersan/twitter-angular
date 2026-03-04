import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ToastMessage {
  text: string;
  type: 'success' | 'error' | 'info' | 'confirm';
  duration?: number;
  icon?: string;
  onConfirm?: () => void;
  onCancel?: () => void;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toastSubject = new Subject<ToastMessage>();
  toast$ = this.toastSubject.asObservable();

  show(text: string, type: ToastMessage['type'] = 'info', duration = 3000, icon?: string): void {
    this.toastSubject.next({ text, type, duration, icon });
  }

  success(text: string, icon?: string): void { this.show(text, 'success', 3000, icon); }
  error(text: string, icon?: string): void   { this.show(text, 'error', 4000, icon); }
  info(text: string, icon?: string): void    { this.show(text, 'info', 3000, icon); }

  confirm(text: string, onConfirm: () => void, onCancel?: () => void): void {
    this.toastSubject.next({ text, type: 'confirm', onConfirm, onCancel });
  }
}