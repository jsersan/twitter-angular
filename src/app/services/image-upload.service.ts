import { Injectable } from '@angular/core';
import { Storage, ref, uploadBytesResumable, getDownloadURL, deleteObject } from '@angular/fire/storage';
import { Observable } from 'rxjs';

export interface UploadProgress {
  progress: number;       // 0-100
  url?: string;           // Solo disponible al completar
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class ImageUploadService {

  constructor(private storage: Storage) {}

  // ─── Subir imagen con progreso ────────────────────────────────────────────
  uploadImage(file: File, path: string): Observable<UploadProgress> {
    return new Observable(observer => {
      const storageRef = ref(this.storage, path);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on(
        'state_changed',
        snapshot => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          observer.next({ progress });
        },
        error => {
          observer.next({ progress: 0, error: error.message });
          observer.complete();
        },
        async () => {
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          observer.next({ progress: 100, url });
          observer.complete();
        }
      );
    });
  }

  // ─── Subir avatar ─────────────────────────────────────────────────────────
  uploadAvatar(uid: string, file: File): Observable<UploadProgress> {
    const ext = file.name.split('.').pop() || 'jpg';
    return this.uploadImage(file, `avatars/${uid}/avatar.${ext}`);
  }

  // ─── Subir imagen de tweet ────────────────────────────────────────────────
  uploadTweetImage(uid: string, file: File): Observable<UploadProgress> {
    const ext = file.name.split('.').pop() || 'jpg';
    const timestamp = Date.now();
    return this.uploadImage(file, `tweets/${uid}/${timestamp}.${ext}`);
  }

  // ─── Validar imagen ───────────────────────────────────────────────────────
  validateImage(file: File): string | null {
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic'];
    if (!allowed.includes(file.type)) {
      return 'Solo se permiten imágenes (JPG, PNG, GIF, WEBP)';
    }
    if (file.size > 5 * 1024 * 1024) {
      return 'La imagen no puede superar los 5 MB';
    }
    return null;
  }

  // ─── Eliminar imagen por URL ──────────────────────────────────────────────
  async deleteByUrl(url: string): Promise<void> {
    try {
      const storageRef = ref(this.storage, url);
      await deleteObject(storageRef);
    } catch { /* ignorar si no existe */ }
  }
}