import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html'
})
export class LoginComponent {

  loading = false;
  errorMsg = '';
  form!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private auth: AuthService,
    private router: Router
  ) {
    this.form = this.fb.group({
      alias: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

  submit() {
    this.errorMsg = '';

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { alias, password } = this.form.getRawValue();
    this.loading = true;

    this.auth.login(alias, password).subscribe({
      next: (res) => {
        if (res.code === 200) {
          this.auth.guardarSesion(res);
          this.router.navigate(['/matriz']);
        } else {
          this.errorMsg = 'Usuario o contraseña inválidos';
        }
        this.loading = false;
      },
      error: () => {
        this.errorMsg = 'No fue posible iniciar sesión';
        this.loading = false;
      }
    });
  }
}
