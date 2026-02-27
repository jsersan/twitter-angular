import { Injectable } from '@angular/core';
import {
  Firestore, collection, collectionData, doc, addDoc, updateDoc,
  query, where, orderBy, limit, getDocs, serverTimestamp,
  arrayUnion, arrayRemove, getDoc
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Tweet } from '../models/models';

@Injectable({ providedIn: 'root' })
export class TweetService {

  constructor(private firestore: Firestore) {}

  // ─── Timeline propio + seguidos ──────────────────────────────────────────────
  getTimeline(followingIds: string[], currentUserId: string): Observable<Tweet[]> {
    const ids = [...(followingIds || []), currentUserId].slice(0, 10);
    const tweetsRef = collection(this.firestore, 'tweets');
    const q = query(
      tweetsRef,
      where('userId', 'in', ids),
      where('deleted', '==', false),
      where('replyTo', '==', null),   // Solo tweets raíz
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    return (collectionData(q, { idField: 'id' }) as Observable<Tweet[]>).pipe(
      // Doble filtro por si hay docs sin campo replyTo (tweets legacy)
      map(tweets => tweets.filter(t => !t.replyTo))
    );
  }

  // ─── Tweets de un usuario ────────────────────────────────────────────────────
  getUserTweets(userId: string): Observable<Tweet[]> {
    const tweetsRef = collection(this.firestore, 'tweets');
    const q = query(
      tweetsRef,
      where('userId', '==', userId),
      where('deleted', '==', false),
      where('replyTo', '==', null),
      orderBy('createdAt', 'desc')
    );
    return (collectionData(q, { idField: 'id' }) as Observable<Tweet[]>).pipe(
      map(tweets => tweets.filter(t => !t.replyTo))
    );
  }

  // ─── Respuestas de un tweet ──────────────────────────────────────────────────
  getReplies(tweetId: string): Observable<Tweet[]> {
    const tweetsRef = collection(this.firestore, 'tweets');
    const q = query(
      tweetsRef,
      where('replyTo', '==', tweetId),
      where('deleted', '==', false),
      orderBy('createdAt', 'asc')
    );
    return collectionData(q, { idField: 'id' }) as Observable<Tweet[]>;
  }

  // ─── Todos los tweets (admin) ────────────────────────────────────────────────
  getAllTweets(): Observable<Tweet[]> {
    const tweetsRef = collection(this.firestore, 'tweets');
    const q = query(tweetsRef, orderBy('createdAt', 'desc'), limit(100));
    return collectionData(q, { idField: 'id' }) as Observable<Tweet[]>;
  }

  // ─── Publicar tweet ──────────────────────────────────────────────────────────
  async createTweet(tweet: Omit<Tweet, 'id' | 'createdAt'>): Promise<string> {
    const tweetsRef = collection(this.firestore, 'tweets');
    const docRef = await addDoc(tweetsRef, {
      ...tweet,
      replyTo: tweet.replyTo || null,   // Siempre guardar null explícito
      createdAt: serverTimestamp()
    });
    // Incrementar contador solo en tweets raíz
    if (!tweet.replyTo) {
      await updateDoc(doc(this.firestore, 'users', tweet.userId), {
        tweetsCount: await this.incrementField('users', tweet.userId, 'tweetsCount')
      });
    }
    return docRef.id;
  }

  // ─── Like / Unlike ───────────────────────────────────────────────────────────
  async toggleLike(tweetId: string, userId: string, liked: boolean): Promise<void> {
    const tweetRef = doc(this.firestore, 'tweets', tweetId);
    await updateDoc(tweetRef, {
      likes: liked ? arrayRemove(userId) : arrayUnion(userId)
    });
  }

  // ─── Eliminar tweet (soft delete) ────────────────────────────────────────────
  async deleteTweet(tweetId: string, deletedBy: string): Promise<void> {
    await updateDoc(doc(this.firestore, 'tweets', tweetId), {
      deleted: true,
      deletedBy
    });
  }

  // ─── Eliminar hilo completo (admin) ──────────────────────────────────────────
  async deleteThread(tweetId: string, adminUid: string): Promise<void> {
    await this.deleteTweet(tweetId, adminUid);
    const repliesSnap = await getDocs(
      query(collection(this.firestore, 'tweets'), where('replyTo', '==', tweetId))
    );
    await Promise.all(
      repliesSnap.docs.map(d =>
        updateDoc(doc(this.firestore, 'tweets', d.id), { deleted: true, deletedBy: adminUid })
      )
    );
  }

  // ─── Helper: incrementar campo ──────────────────────────────────────────────
  private async incrementField(col: string, docId: string, field: string): Promise<number> {
    const snap = await getDoc(doc(this.firestore, col, docId));
    const current = (snap.data() as any)?.[field] || 0;
    return current + 1;
  }
}