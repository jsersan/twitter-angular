import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  email = '';
  password = '';
  confirmPassword = '';
  username = '';
  displayName = '';
  loading = false;
  error = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private toast: ToastService
  ) {}

  async onRegister(): Promise<void> {
    if (!this.email || !this.password || !this.username || !this.displayName) {
      this.error = 'Todos los campos son obligatorios';
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.error = 'Las contraseñas no coinciden';
      return;
    }
    if (this.password.length < 6) {
      this.error = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(this.username)) {
      this.error = 'El username solo puede contener letras, números y guiones bajos (3-20 caracteres)';
      return;
    }
    this.loading = true;
    this.error = '';
    try {
      await this.authService.register(this.email, this.password, this.username, this.displayName);
      this.toast.success(`¡Bienvenido/a, @${this.username}! Cuenta creada con éxito 🎉`);
      setTimeout(() => this.router.navigate(['/home']), 1500);
    } catch (e: any) {
      this.error = this.mapError(e.code || e.message);
    } finally {
      this.loading = false;
    }
  }

  private mapError(code: string): string {
    const errors: Record<string, string> = {
      'auth/email-already-in-use': 'Ya existe una cuenta con ese correo',
      'auth/invalid-email': 'Correo inválido',
      'auth/weak-password': 'La contraseña es muy débil',
      'El nombre de usuario ya está en uso': 'Ese nombre de usuario ya está en uso'
    };
    return errors[code] || code;
  }
}