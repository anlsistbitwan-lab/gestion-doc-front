import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { inject } from '@angular/core';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (): any => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (!auth.isLoggedIn()) {
    return router.createUrlTree(['/login']);
  }

  // valida sesión + refresca permisos
  return auth.validarSesion().pipe(
    map((res) => {
      if (res?.code === 200) {
        auth.actualizarPermisosDesdeApi(res);
        return true;
      }
      auth.logout();
      return router.createUrlTree(['/login']);
    }),
    catchError(() => {
      auth.logout();
      return of(router.createUrlTree(['/login']) as UrlTree);
    })
  );
};
