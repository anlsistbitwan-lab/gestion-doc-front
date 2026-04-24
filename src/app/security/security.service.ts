import { HttpClient } from '@angular/common/http';
import { DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { OAuthErrorEvent, OAuthService } from 'angular-oauth2-oidc';
import {
  BehaviorSubject,
  combineLatest,
  finalize,
  first,
  firstValueFrom,
  from,
  map,
  Observable,
  ReplaySubject,
} from 'rxjs';
import { environment } from '../../environments/environment';
import { oauthConfig } from './auth.config';
import { SECURITY_RESOURCES } from './security.resources';

@Injectable({ providedIn: 'root' })
export class SecurityService {
  private readonly api = inject(HttpClient);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly oauthService = inject(OAuthService);

  private refreshSessionInProgress: ReplaySubject<void> | null = null;
  private readonly isAuthenticatedSubject$ = new BehaviorSubject<boolean>(false);
  readonly isAuthenticated$ = this.isAuthenticatedSubject$.asObservable();
  private readonly isDoneLoadingSubject$ = new BehaviorSubject<boolean>(false);
  readonly isDoneLoading$ = this.isDoneLoadingSubject$.asObservable();

  readonly canActivateProtectedRoutes$: Observable<boolean> = combineLatest([
    this.isAuthenticated$,
    this.isDoneLoading$,
  ]).pipe(map((values) => values.every((b) => b)));

  private startingSession: ReplaySubject<void> | null = null;
  private readonly prefix = 'keep';

  user = signal<Record<string, unknown> | null>(null);
  userPermissions = signal<string[]>([]);
  userPermissionsChange = toObservable(this.userPermissions);

  constructor() {
    this.oauthService.events.subscribe((event) => {
      if (event instanceof OAuthErrorEvent) {
        if (
          ['silent_refresh_error', 'silent_refresh_timeout', 'login_required', 'token_error'].includes(
            event.type,
          )
        ) {
          this.logout();
        }
        console.error('OAuthErrorEvent:', event);
      }
      this.isAuthenticatedSubject$.next(this.oauthService.hasValidAccessToken());
      if (event.type === 'token_received') {
        this.verifyProfile();
      }
    });

    this.oauthService.configure(oauthConfig);
    this.oauthService.setupAutomaticSilentRefresh();

    try {
      const raw = localStorage.getItem('userPermissions');
      this.userPermissions.set(raw ? JSON.parse(raw) : []);
    } catch {
      this.userPermissions.set([]);
    }
  }

  async initConfiguration(): Promise<void> {
    return this.oauthService
      .loadDiscoveryDocument(`${environment.AUTH_URL}.well-known/oauth-authorization-server`)
      .then(() =>
        this.oauthService.tryLoginCodeFlow({
          disableNonceCheck: true,
        }),
      )
      .then(() => {
        this.verifyProfile();
        this.isDoneLoadingSubject$.next(true);
      })
      .catch((err) => {
        console.error('Error cargando documento de descubrimiento OAuth', err);
        this.isDoneLoadingSubject$.next(true);
      });
  }

  private verifyProfile(): void {
    if (this.oauthService.hasValidAccessToken()) {
      void this.initializeSecurity();
    }
  }

  logout(): void {
    const token = this.oauthService.getAccessToken()?.trim();

    const clearLocal = (): void => {
      this.oauthService.logOut();
      this.user.set(null);
      this.userPermissions.set([]);
      this.clearStorage();
      void this.router.navigate(['/login']);
    };

    if (!token) {
      clearLocal();
      return;
    }

    this.api
      .post(SECURITY_RESOURCES.logout, {
        client_id: environment.OICD_CLIENT,
        access_token: token,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => clearLocal()),
      )
      .subscribe();
  }

  login(): void {
    this.oauthService.initCodeFlow();
    const returnUrl = this.route.snapshot.queryParams['returnUrl'];
    if (returnUrl) {
      localStorage.setItem('returnUrl', returnUrl);
    }
  }

  initializeSecurity(): Promise<void> {
    if (!this.startingSession) {
      this.startingSession = new ReplaySubject<void>(1);

      if (!this.oauthService.hasValidAccessToken()) {
        this.completeInitializeSession();
        return firstValueFrom(this.startingSession.pipe(first()));
      }

      this.api
        .get<Record<string, unknown>>(SECURITY_RESOURCES.getInfo, {
          headers: {
            Authorization: `Bearer ${this.oauthService.getAccessToken()}`,
          },
        })
        .subscribe({
          next: (res) => {
            this.updatePermisos(res);
            this.completeInitializeSession();

            const stored = localStorage.getItem('returnUrl');
            if (stored) {
              void this.router.navigate([decodeURIComponent(stored)]);
              localStorage.removeItem('returnUrl');
            }
          },
          error: () => {
            this.completeInitializeSession();
          },
        });
    }

    return firstValueFrom(this.startingSession.pipe(first()));
  }

  private updatePermisos(res: Record<string, unknown> & { permisos?: string[] }): void {
    const idusuario = res['idUsuario'];
    console.log('idusuario', idusuario);
    const idtercero = res['idTercero'];
    const alias = res['alias'];
    const nombres = res['nombres'];
    if (idusuario != null) localStorage.setItem('idusuario', String(idusuario));
    if (idtercero != null) localStorage.setItem('idtercero', String(idtercero));
    if (alias != null) localStorage.setItem('alias', String(alias));
    if (nombres != null) localStorage.setItem('nombres', String(nombres));

    if (res.permisos) {
      this.guardarPermisos(res.permisos);
      delete res.permisos;
    }

    this.user.set(res);
  }

  private completeInitializeSession(): void {
    this.startingSession?.next();
    this.startingSession?.complete();
    this.startingSession = null;
  }

  getAccessToken(): string | null {
    return this.oauthService.getAccessToken();
  }

  hasValidAccessToken(): boolean {
    return this.oauthService.hasValidAccessToken();
  }

  clearStorage(): void {
    const total = localStorage.length;
    const keysToRemove: string[] = [];
    for (let i = 0; i < total; i++) {
      const key = localStorage.key(i);
      if (key && !key.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  }

  updateSession(): Promise<void> {
    if (!this.refreshSessionInProgress) {
      this.refreshSessionInProgress = new ReplaySubject<void>(1);

      from(this.oauthService.refreshToken())
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: () => {
            void this.initializeSecurity();
            this.refreshSessionInProgress?.next();
            this.refreshSessionInProgress?.complete();
            this.refreshSessionInProgress = null;
          },
          error: () => {
            this.refreshSessionInProgress?.next();
            this.refreshSessionInProgress?.complete();
            this.refreshSessionInProgress = null;
            this.logout();
          },
        });
    }

    return firstValueFrom(this.refreshSessionInProgress.pipe(first()));
  }

  guardarPermisos(permisos: string[]): void {
    this.userPermissions.set(permisos);
    localStorage.setItem('userPermissions', JSON.stringify(permisos));
  }

  hasAccess(action: string[], method: 'some' | 'every' = 'every'): boolean {
    const perms = this.userPermissions();
    if (method === 'some') {
      return action.some((permission) => perms.includes(permission));
    }
    return action.every((permission) => perms.includes(permission));
  }

  /**
   * Tras renovar el access token fuera de este servicio (p. ej. interceptor),
   * vuelve a cargar perfil y permisos para alinear la UI.
   */
  reconcileSessionAfterTokenRefresh(): void {
    this.isAuthenticatedSubject$.next(this.oauthService.hasValidAccessToken());
    if (this.oauthService.hasValidAccessToken()) {
      void this.initializeSecurity();
    }
  }
}
