import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { Tweet, User } from '../../models/models';
import { UserService } from '../../services/user.service';
import { TweetService } from '../../services/tweet.service';
import { AuthService } from '../../services/auth.service';
import { ImageUploadService } from '../../services/image-upload.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit, OnDestroy {
  profileUser: User | null = null;
  currentUser: User | null = null;
  tweets: Tweet[] = [];
  loading = true;
  isFollowing = false;
  isOwnProfile = false;
  editMode = false;
  editDisplayName = '';
  editBio = '';
  saving = false;

  // Avatar upload
  avatarUploading = false;
  avatarProgress = 0;

  private userSub!: Subscription;
  private profileSub!: Subscription;
  private tweetsSub!: Subscription;

  constructor(
    private route: ActivatedRoute,
    private userService: UserService,
    private tweetService: TweetService,
    private authService: AuthService,
    private imageUpload: ImageUploadService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    // currentUser$ ya es tiempo real → navbar y perfil se actualizan solos
    this.userSub = this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
    });

    this.route.params.subscribe(params => {
      this.loadProfile(params['username']);
    });
  }

  ngOnDestroy(): void {
    this.userSub?.unsubscribe();
    this.profileSub?.unsubscribe();
    this.tweetsSub?.unsubscribe();
  }

  get joinDate(): Date | null {
    if (!this.profileUser?.createdAt) return null;
    const ts = this.profileUser.createdAt as any;
    return ts?.toDate ? ts.toDate() : new Date(ts);
  }

  async loadProfile(username: string): Promise<void> {
    this.loading = true;
    this.profileSub?.unsubscribe();
    this.tweetsSub?.unsubscribe();

    // Obtener uid por username (solo una vez)
    const user = await this.userService.getUserByUsername(username);
    if (!user) { this.loading = false; return; }

    // Suscribirse en tiempo real al perfil visitado
    // → si cambia avatarUrl en Firestore, profileUser se actualiza automáticamente
    this.profileSub = this.authService.getUserProfile(user.uid).subscribe(freshUser => {
      this.profileUser = freshUser;
      if (freshUser) {
        this.isOwnProfile = this.currentUser?.uid === freshUser.uid;
        this.isFollowing = this.currentUser?.following?.includes(freshUser.uid) || false;
      }
      this.loading = false;
    });

    // Tweets del usuario
    this.tweetsSub = this.tweetService.getUserTweets(user.uid).subscribe(tweets => {
      this.tweets = tweets;
    });
  }

  async toggleFollow(): Promise<void> {
    if (!this.currentUser || !this.profileUser) return;
    if (this.isFollowing) {
      await this.userService.unfollowUser(this.currentUser.uid, this.profileUser.uid);
    } else {
      await this.userService.followUser(this.currentUser.uid, this.profileUser.uid);
    }
    this.isFollowing = !this.isFollowing;
    if (this.profileUser) {
      this.profileUser.followersCount += this.isFollowing ? 1 : -1;
    }
  }

  startEdit(): void {
    this.editDisplayName = this.profileUser?.displayName || '';
    this.editBio = this.profileUser?.bio || '';
    this.editMode = true;
  }

  async saveEdit(): Promise<void> {
    if (!this.currentUser || !this.profileUser) return;
    this.saving = true;
    await this.authService.updateProfile(this.currentUser.uid, {
      displayName: this.editDisplayName,
      bio: this.editBio
    });
    // No hace falta actualizar manualmente: docData() emitirá el cambio solo
    this.editMode = false;
    this.saving = false;
    this.toast.success('Perfil actualizado');
  }

  // ── Cambiar avatar ────────────────────────────────────────────────────────
  onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Limpiar el input para permitir seleccionar la misma imagen de nuevo
    input.value = '';
    if (!file || !this.currentUser) return;

    const error = this.imageUpload.validateImage(file);
    if (error) { this.toast.error(error); return; }

    this.avatarUploading = true;
    this.avatarProgress = 0;

    this.imageUpload.uploadAvatar(this.currentUser.uid, file).subscribe({
      next: async p => {
        this.avatarProgress = p.progress;
        if (p.error) {
          this.toast.error('Error al subir la imagen');
          this.avatarUploading = false;
          return;
        }
        if (p.url) {
          // Solo actualizamos Firestore → docData() propagará el cambio
          // automáticamente a currentUser$ (navbar) y profileUser (perfil)
          await this.authService.updateProfile(this.currentUser!.uid, { avatarUrl: p.url });
          this.avatarUploading = false;
          this.toast.success('Avatar actualizado ✅');
        }
      },
      error: () => {
        this.toast.error('Error al subir el avatar');
        this.avatarUploading = false;
      }
    });
  }

  onTweetDeleted(id: string): void {
    this.tweets = this.tweets.filter(t => t.id !== id);
  }
}