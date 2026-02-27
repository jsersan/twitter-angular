import { Injectable } from '@angular/core';
import {
  Firestore, collection, collectionData, doc, addDoc, updateDoc,
  deleteDoc, query, where, orderBy, limit, getDocs, serverTimestamp,
  arrayUnion, arrayRemove, getDoc
} from '@angular/fire/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Tweet, User } from '../models/models';

@Injectable({ providedIn: 'root' })
export class TweetService {

  constructor(private firestore: Firestore) {}

  // ─── Timeline propio + seguidos ──────────────────────────────────────────────
  getTimeline(followingIds: string[], currentUserId: string): Observable<Tweet[]> {
    const ids = [...followingIds, currentUserId].slice(0, 10);
    const tweetsRef = collection(this.firestore, 'tweets');
    const q = query(
      tweetsRef,
      where('userId', 'in', ids),
      where('deleted', '==', false),
      where('replyTo', '==', null),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    return collectionData(q, { idField: 'id' }) as Observable<Tweet[]>;
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
    return collectionData(q, { idField: 'id' }) as Observable<Tweet[]>;
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

  // ─── Tweets recientes para búsqueda en sidebar ───────────────────────────────
  getRecentTweets(maxItems = 200): Observable<Tweet[]> {
    const q = query(
      collection(this.firestore, 'tweets'),
      where('deleted', '==', false),
      orderBy('createdAt', 'desc'),
      limit(maxItems)
    );
    return collectionData(q, { idField: 'id' }) as Observable<Tweet[]>;
  }

  // ─── Publicar tweet ──────────────────────────────────────────────────────────
  async createTweet(tweet: Omit<Tweet, 'id' | 'createdAt'>): Promise<string> {
    const tweetsRef = collection(this.firestore, 'tweets');
    const docRef = await addDoc(tweetsRef, {
      ...tweet,
      replyTo: tweet.replyTo || null,
      reposts: tweet.reposts || [],
      createdAt: serverTimestamp()
    });
    // Incrementar contador sin bloquear (no lanza error si falla)
    this.incrementField('users', tweet.userId, 'tweetsCount').then(count =>
      updateDoc(doc(this.firestore, 'users', tweet.userId), { tweetsCount: count })
    ).catch(() => {});
    return docRef.id;
  }

  // ─── Like / Unlike ───────────────────────────────────────────────────────────
  async toggleLike(tweetId: string, userId: string, liked: boolean): Promise<void> {
    const tweetRef = doc(this.firestore, 'tweets', tweetId);
    await updateDoc(tweetRef, {
      likes: liked ? arrayRemove(userId) : arrayUnion(userId)
    });
  }

  // ─── Repostear ───────────────────────────────────────────────────────────────
  async repostTweet(originalTweet: Tweet, reposter: User): Promise<string> {
    const tweetsRef = collection(this.firestore, 'tweets');
    const docRef = await addDoc(tweetsRef, {
      userId: reposter.uid,
      username: reposter.username,
      displayName: reposter.displayName,
      avatarUrl: reposter.avatarUrl || null,
      content: originalTweet.content,
      imageUrl: originalTweet.imageUrl || null,
      likes: [],
      reposts: [],
      replyTo: null,
      deleted: false,
      isRepost: true,
      repostedByUserId: reposter.uid,
      repostedByUsername: reposter.username,
      repostedByDisplayName: reposter.displayName,
      originalTweetId: originalTweet.id,
      originalUserId: originalTweet.userId,
      originalUsername: originalTweet.username,
      originalDisplayName: originalTweet.displayName,
      originalAvatarUrl: originalTweet.avatarUrl || null,
      originalContent: originalTweet.content,
      originalImageUrl: originalTweet.imageUrl || null,
      originalCreatedAt: originalTweet.createdAt,
      createdAt: serverTimestamp()
    });
    await updateDoc(doc(this.firestore, 'tweets', originalTweet.id!), {
      reposts: arrayUnion(reposter.uid)
    });
    return docRef.id;
  }

  // ─── Deshacer repost ─────────────────────────────────────────────────────────
  async undoRepost(originalTweetId: string, reposterUid: string): Promise<void> {
    const q = query(
      collection(this.firestore, 'tweets'),
      where('isRepost', '==', true),
      where('repostedByUserId', '==', reposterUid),
      where('originalTweetId', '==', originalTweetId)
    );
    const snap = await getDocs(q);
    const deletions = snap.docs.map(d => deleteDoc(doc(this.firestore, 'tweets', d.id)));
    await Promise.all(deletions);
    await updateDoc(doc(this.firestore, 'tweets', originalTweetId), {
      reposts: arrayRemove(reposterUid)
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
    const promises = repliesSnap.docs.map(d =>
      updateDoc(doc(this.firestore, 'tweets', d.id), { deleted: true, deletedBy: adminUid })
    );
    await Promise.all(promises);
  }

  // ─── Helper: incrementar campo ───────────────────────────────────────────────
  private async incrementField(col: string, docId: string, field: string): Promise<number> {
    const snap = await getDoc(doc(this.firestore, col, docId));
    const current = (snap.data() as any)?.[field] || 0;
    return current + 1;
  }
}