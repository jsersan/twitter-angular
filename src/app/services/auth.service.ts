import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {
  Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword,
  signOut, authState
} from '@angular/fire/auth';
import {
  Firestore, doc, setDoc, getDoc, updateDoc, serverTimestamp, docData
} from '@angular/fire/firestore';
import { Observable, switchMap, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { User } from '../models/models';

@Injectable({ providedIn: 'root' })
export class AuthService {

  // ─── currentUser$ es un listener EN TIEMPO REAL ───────────────────────────
  // Usa docData() (onSnapshot internamente), así cualquier cambio en Firestore
  // (avatarUrl, displayName, bio…) se propaga automáticamente a TODOS los
  // componentes suscritos: navbar, perfil, home, etc.
  currentUser$: Observable<User | null>;

  constructor(private auth: Auth, private firestore: Firestore, private router: Router) {
    this.currentUser$ = authState(this.auth).pipe(
      switchMap(firebaseUser => {
        if (!firebaseUser) return of(null);
        // docData emite cada vez que cambia el documento en Firestore
        return (docData(doc(this.firestore, 'users', firebaseUser.uid), { idField: 'uid' }) as Observable<User>).pipe(
          map(user => user ?? null)
        );
      })
    );
  }

  // ─── Registro ────────────────────────────────────────────────────────────────
  async register(email: string, password: string, username: string, displayName: string): Promise<void> {
    const usernameDoc = await getDoc(doc(this.firestore, 'usernames', username.toLowerCase()));
    if (usernameDoc.exists()) throw new Error('El nombre de usuario ya está en uso');

    const cred = await createUserWithEmailAndPassword(this.auth, email, password);
    const uid = cred.user.uid;

    const newUser: User = {
      uid, email,
      username: username.toLowerCase(),
      displayName,
      bio: '',
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      role: 'user',
      blocked: false,
      followers: [],
      following: [],
      tweetsCount: 0,
      followersCount: 0,
      followingCount: 0,
      createdAt: new Date()
    };

    await setDoc(doc(this.firestore, 'users', uid), { ...newUser, createdAt: serverTimestamp() });
    await setDoc(doc(this.firestore, 'usernames', username.toLowerCase()), { uid });
  }

  // ─── Login ───────────────────────────────────────────────────────────────────
  async login(email: string, password: string): Promise<void> {
    const cred = await signInWithEmailAndPassword(this.auth, email, password);
    const userSnap = await getDoc(doc(this.firestore, 'users', cred.user.uid));
    const userData = userSnap.data() as User;
    if (userData?.blocked) {
      await signOut(this.auth);
      throw new Error('Tu cuenta ha sido bloqueada por un administrador.');
    }
    this.router.navigate(['/home']);
  }

  // ─── Logout ──────────────────────────────────────────────────────────────────
  async logout(): Promise<void> {
    await signOut(this.auth);
    this.router.navigate(['/login']);
  }

  // ─── getUserProfile (tiempo real, para el perfil de otros usuarios) ──────────
  getUserProfile(uid: string): Observable<User | null> {
    return (docData(doc(this.firestore, 'users', uid), { idField: 'uid' }) as Observable<User>).pipe(
      map(user => user ?? null)
    );
  }

  // ─── Actualizar perfil ───────────────────────────────────────────────────────
  async updateProfile(uid: string, data: Partial<User>): Promise<void> {
    await updateDoc(doc(this.firestore, 'users', uid), data as any);
  }
}