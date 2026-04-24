import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { from, of, switchMap } from 'rxjs';
import { SecurityService } from './security.service';

export const authGuard: CanActivateFn = (route, state) => {
  const security = inject(SecurityService);
  const router = inject(Router);
  const requiredPermissions = route.data['actions'] as string[] | undefined;
  const permissionsMethod = (route.data['permissionsMethod'] as 'some' | 'every') || 'every';

  const denyPermission = () => {
    void router.navigateByUrl('/matriz');
    return of(false);
  };

  return security.canActivateProtectedRoutes$.pipe(
    switchMap((can) => {
      if (!can) {
        void router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
        return of(false);
      }

      if (!requiredPermissions?.length) {
        return of(true);
      }

      if (!security.user()) {
        return from(security.initializeSecurity()).pipe(
          switchMap(() => {
            if (!security.hasAccess(requiredPermissions, permissionsMethod)) {
              return denyPermission();
            }
            return of(true);
          }),
        );
      }

      if (!security.hasAccess(requiredPermissions, permissionsMethod)) {
        return denyPermission();
      }

      return of(true);
    }),
  );
};
