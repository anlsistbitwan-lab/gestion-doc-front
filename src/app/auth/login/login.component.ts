import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SecurityService } from '../../security/security.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private readonly security = inject(SecurityService);

  iniciarSesion(): void {
    this.security.login();
  }
}
