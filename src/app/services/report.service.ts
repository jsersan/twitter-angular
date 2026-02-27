import { Injectable } from '@angular/core';
import {
  Firestore, collection, collectionData, doc, addDoc, updateDoc,
  query, where, orderBy, limit, serverTimestamp, increment
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { Report, ReportReason, AdminAction } from '../models/models';

@Injectable({ providedIn: 'root' })
export class ReportService {

  constructor(private firestore: Firestore) {}

  // ─── Crear reporte ────────────────────────────────────────────────────────
  async createReport(data: {
    tweetId: string;
    tweetContent: string;
    tweetUsername: string;
    reportedBy: string;
    reportedByUsername: string;
    reason: ReportReason;
    details?: string;
  }): Promise<void> {
    // Incrementar contador de reportes en el tweet
    await updateDoc(doc(this.firestore, 'tweets', data.tweetId), {
      reportCount: increment(1)
    });
    await addDoc(collection(this.firestore, 'reports'), {
      ...data,
      status: 'pending',
      createdAt: serverTimestamp()
    });
  }

  // ─── Obtener reportes pendientes ──────────────────────────────────────────
  getPendingReports(): Observable<Report[]> {
    return collectionData(
      query(
        collection(this.firestore, 'reports'),
        where('status', '==', 'pending'),
        orderBy('createdAt', 'asc')
      ),
      { idField: 'id' }
    ) as Observable<Report[]>;
  }

  // ─── Obtener todos los reportes ───────────────────────────────────────────
  getAllReports(): Observable<Report[]> {
    return collectionData(
      query(
        collection(this.firestore, 'reports'),
        orderBy('createdAt', 'desc'),
        limit(100)
      ),
      { idField: 'id' }
    ) as Observable<Report[]>;
  }

  // ─── Resolver reporte ─────────────────────────────────────────────────────
  async resolveReport(reportId: string, adminUid: string): Promise<void> {
    await updateDoc(doc(this.firestore, 'reports', reportId), {
      status: 'resolved',
      resolvedBy: adminUid,
      resolvedAt: serverTimestamp()
    });
  }

  // ─── Desestimar reporte ───────────────────────────────────────────────────
  async dismissReport(reportId: string, adminUid: string): Promise<void> {
    await updateDoc(doc(this.firestore, 'reports', reportId), {
      status: 'dismissed',
      resolvedBy: adminUid,
      resolvedAt: serverTimestamp()
    });
  }

  // ─── Log de acciones admin ────────────────────────────────────────────────
  async logAction(action: Omit<AdminAction, 'id' | 'createdAt'>): Promise<void> {
    await addDoc(collection(this.firestore, 'admin_actions'), {
      ...action,
      createdAt: serverTimestamp()
    });
  }

  getAdminLog(): Observable<AdminAction[]> {
    return collectionData(
      query(
        collection(this.firestore, 'admin_actions'),
        orderBy('createdAt', 'desc'),
        limit(50)
      ),
      { idField: 'id' }
    ) as Observable<AdminAction[]>;
  }
}