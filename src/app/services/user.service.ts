import { Injectable } from '@angular/core';
import {
  Firestore, doc, updateDoc, getDoc, getDocs, collection,
  query, where, orderBy, collectionData, arrayUnion, arrayRemove, increment
} from '@angular/fire/firestore';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { User } from '../models/models';

@Injectable({ providedIn: 'root' })
export class UserService {

  constructor(private firestore: Firestore) {}

  // ─── Obtener usuario por UID ─────────────────────────────────────────────────
  async getUserByUid(uid: string): Promise<User | null> {
    const snap = await getDoc(doc(this.firestore, 'users', uid));
    return snap.exists() ? { uid: snap.id, ...snap.data() } as User : null;
  }

  // ─── Obtener usuario por @username ──────────────────────────────────────────
  async getUserByUsername(username: string): Promise<User | null> {
    const usernamesSnap = await getDoc(doc(this.firestore, 'usernames', username.toLowerCase()));
    if (!usernamesSnap.exists()) return null;
    const { uid } = usernamesSnap.data() as { uid: string };
    return this.getUserByUid(uid);
  }

  // ─── Buscar usuarios por username Y por displayName ──────────────────────────
  searchUsers(term: string): Observable<User[]> {
    const usersRef = collection(this.firestore, 'users');
    const termLower = term.toLowerCase();
    const termUpper = termLower + '\uf8ff';

    const byUsername$ = collectionData(
      query(usersRef, where('username', '>=', termLower), where('username', '<=', termUpper), orderBy('username')),
      { idField: 'uid' }
    ) as Observable<User[]>;

    const byDisplayName$ = collectionData(
      query(usersRef, where('displayName', '>=', term), where('displayName', '<=', term + '\uf8ff'), orderBy('displayName')),
      { idField: 'uid' }
    ) as Observable<User[]>;

    return combineLatest([byUsername$, byDisplayName$]).pipe(
      map(([byUser, byDisplay]) => {
        const seen = new Set<string>();
        const merged: User[] = [];
        for (const u of [...byUser, ...byDisplay]) {
          if (!seen.has(u.uid)) { seen.add(u.uid); merged.push(u); }
        }
        return merged;
      })
    );
  }

  // ─── Listar todos los usuarios ───────────────────────────────────────────────
  getAllUsers(): Observable<User[]> {
    return collectionData(
      query(collection(this.firestore, 'users'), orderBy('createdAt', 'desc')),
      { idField: 'uid' }
    ) as Observable<User[]>;
  }

  // ─── Obtener varios usuarios por UIDs (tiempo real) ─────────────────────────
  getUsersByUids(uids: string[]): Observable<User[]> {
    if (!uids.length) return new Observable(o => { o.next([]); o.complete(); });
    const chunks = this.chunkArray(uids, 30);
    const obs = chunks.map(chunk =>
      collectionData(
        query(collection(this.firestore, 'users'), where('uid', 'in', chunk)),
        { idField: 'uid' }
      ) as Observable<User[]>
    );
    if (obs.length === 1) return obs[0];
    return combineLatest(obs).pipe(map((results: User[][]) => results.flat()));
  }

  // ─── Seguir usuario ──────────────────────────────────────────────────────────
  async followUser(currentUid: string, targetUid: string): Promise<void> {
    await Promise.all([
      updateDoc(doc(this.firestore, 'users', currentUid), {
        following: arrayUnion(targetUid),
        followingCount: increment(1)
      }),
      updateDoc(doc(this.firestore, 'users', targetUid), {
        followers: arrayUnion(currentUid),
        followersCount: increment(1)
      })
    ]);
  }

  // ─── Dejar de seguir ─────────────────────────────────────────────────────────
  async unfollowUser(currentUid: string, targetUid: string): Promise<void> {
    await Promise.all([
      updateDoc(doc(this.firestore, 'users', currentUid), {
        following: arrayRemove(targetUid),
        followingCount: increment(-1)
      }),
      updateDoc(doc(this.firestore, 'users', targetUid), {
        followers: arrayRemove(currentUid),
        followersCount: increment(-1)
      })
    ]);
  }

  // ─── Eliminar seguidor ───────────────────────────────────────────────────────
  async removeFollower(currentUid: string, followerUid: string): Promise<void> {
    await Promise.all([
      updateDoc(doc(this.firestore, 'users', currentUid), {
        followers: arrayRemove(followerUid),
        followersCount: increment(-1)
      }),
      updateDoc(doc(this.firestore, 'users', followerUid), {
        following: arrayRemove(currentUid),
        followingCount: increment(-1)
      })
    ]);
  }

  // ─── Bloquear/Desbloquear usuario (admin) ────────────────────────────────────
  async toggleBlockUser(uid: string, blocked: boolean): Promise<void> {
    await updateDoc(doc(this.firestore, 'users', uid), { blocked });
  }

  // ─── Cambiar rol (admin) ─────────────────────────────────────────────────────
  async setUserRole(uid: string, role: 'user' | 'admin'): Promise<void> {
    await updateDoc(doc(this.firestore, 'users', uid), { role });
  }

  // ─── Actualizar perfil ───────────────────────────────────────────────────────
  async updateProfile(uid: string, data: Partial<Pick<User, 'displayName' | 'bio' | 'avatarUrl'>>): Promise<void> {
    await updateDoc(doc(this.firestore, 'users', uid), data as any);
  }

  // ─── Seguidores de un usuario ────────────────────────────────────────────────
  async getFollowers(uids: string[]): Promise<User[]> {
    if (!uids.length) return [];
    const results: User[] = [];
    for (const chunk of this.chunkArray(uids, 10)) {
      const snap = await getDocs(
        query(collection(this.firestore, 'users'), where('uid', 'in', chunk))
      );
      snap.docs.forEach(d => results.push({ uid: d.id, ...d.data() } as User));
    }
    return results;
  }

  private chunkArray<T>(arr: T[], size: number): T[][] {
    return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
      arr.slice(i * size, i * size + size)
    );
  }
}