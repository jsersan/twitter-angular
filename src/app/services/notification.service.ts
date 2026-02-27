import { Injectable } from '@angular/core';
import {
  Firestore, collection, collectionData, addDoc, query,
  where, orderBy, limit, getDocs, writeBatch, doc, serverTimestamp
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { Notification } from '../models/models';

@Injectable({ providedIn: 'root' })
export class NotificationService {

  constructor(private firestore: Firestore) {}

  // ─── Obtener notificaciones del usuario (tiempo real) ─────────────────────
  getNotifications(userId: string): Observable<Notification[]> {
    const q = query(
      collection(this.firestore, 'notifications'),
      where('toUserId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(60)
    );
    return collectionData(q, { idField: 'id' }) as Observable<Notification[]>;
  }

  // ─── Contador de no leídas (para el badge del navbar) ────────────────────
  getUnreadCount(userId: string): Observable<number> {
    return this.getNotifications(userId).pipe(
      map(notifs => notifs.filter(n => !n.read).length)
    );
  }

  // ─── Notificar like ────────────────────────────────────────────────────────
  // Llamar cuando alguien da like a un tweet ajeno
  async notifyLike(params: {
    fromUserId: string;
    fromUsername: string;
    fromDisplayName: string;
    fromAvatarUrl?: string;
    toUserId: string;           // dueño del tweet
    tweetId: string;
    tweetContent: string;
  }): Promise<void> {
    // No notificar likes propios
    if (params.fromUserId === params.toUserId) return;

    // Evitar duplicados: si ya hay una notif de like del mismo usuario al mismo tweet, no crear otra
    const existing = await getDocs(query(
      collection(this.firestore, 'notifications'),
      where('toUserId', '==', params.toUserId),
      where('fromUserId', '==', params.fromUserId),
      where('type', '==', 'like'),
      where('tweetId', '==', params.tweetId)
    ));
    if (!existing.empty) return;

    await addDoc(collection(this.firestore, 'notifications'), {
      toUserId: params.toUserId,
      fromUserId: params.fromUserId,
      fromUsername: params.fromUsername,
      fromDisplayName: params.fromDisplayName,
      fromAvatarUrl: params.fromAvatarUrl || null,
      type: 'like',
      tweetId: params.tweetId,
      tweetContent: params.tweetContent.substring(0, 100),
      read: false,
      createdAt: serverTimestamp()
    });
  }

  // ─── Notificar nuevo post a seguidores ────────────────────────────────────
  async notifyNewPost(params: {
    fromUserId: string;
    fromUsername: string;
    fromDisplayName: string;
    fromAvatarUrl?: string;
    tweetId: string;
    tweetContent: string;
    tweetImageUrl?: string;
    followers: string[];        // UIDs de seguidores que recibirán la notif
  }): Promise<void> {
    if (!params.followers.length) return;

    // Limitar a 50 seguidores por escritura (evitar abusos)
    const targets = params.followers.slice(0, 50);
    const batch = writeBatch(this.firestore);

    targets.forEach(followerId => {
      const ref = doc(collection(this.firestore, 'notifications'));
      batch.set(ref, {
        toUserId: followerId,
        fromUserId: params.fromUserId,
        fromUsername: params.fromUsername,
        fromDisplayName: params.fromDisplayName,
        fromAvatarUrl: params.fromAvatarUrl || null,
        type: 'new_post',
        tweetId: params.tweetId,
        tweetContent: params.tweetContent.substring(0, 120),
        tweetImageUrl: params.tweetImageUrl || null,
        read: false,
        createdAt: serverTimestamp()
      });
    });

    await batch.commit();
  }

  // ─── Marcar todas como leídas ─────────────────────────────────────────────
  async markAllRead(userId: string): Promise<void> {
    const unread = await getDocs(query(
      collection(this.firestore, 'notifications'),
      where('toUserId', '==', userId),
      where('read', '==', false)
    ));
    if (unread.empty) return;
    const batch = writeBatch(this.firestore);
    unread.docs.forEach(d => batch.update(d.ref, { read: true }));
    await batch.commit();
  }
}