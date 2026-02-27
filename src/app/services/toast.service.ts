import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ToastMessage {
  text: string;
  type: 'success' | 'error' | 'info';
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private toastSubject = new Subject<ToastMessage>();
  toast$ = this.toastSubject.asObservable();

  show(text: string, type: ToastMessage['type'] = 'info', duration = 3000): void {
    this.toastSubject.next({ text, type, duration });
  }

  success(text: string): void { this.show(text, 'success'); }
  error(text: string): void   { this.show(text, 'error', 4000); }
  info(text: string): void    { this.show(text, 'info'); }
}