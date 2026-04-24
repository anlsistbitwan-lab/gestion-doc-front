import {
  HttpErrorResponse,
  HttpEvent,
  HttpHandler,
  HttpInterceptor,
  HttpRequest,
} from '@angular/common/http';
import { Injectable, Injector, inject } from '@angular/core';
import { OAuthService } from 'angular-oauth2-oidc';
import { Observable, from, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { SecurityService } from './security.service';

const AUTH_RETRY = 'X-Auth-Retry';

/**
 * 401 en la API (Nest): intenta una renovación de access token y reintenta la petición.
 * No inyecta SecurityService en el constructor (evita dependencia circular con HttpClient).
 */
@Injectable()
export class ApiUnauthorizedInterceptor implements HttpInterceptor {
  private readonly oauth = inject(OAuthService);
  private readonly injector = inject(Injector);

  private readonly backend = environment.backendBaseUrl.toLowerCase();

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    if (!this.isBackendApi(req)) {
      return next.handle(req);
    }

    return next.handle(req).pipe(
      catchError((err: unknown) => {
        if (!(err instanceof HttpErrorResponse) || err.status !== 401) {
          return throwError(() => err);
        }

        if (req.headers.get(AUTH_RETRY)) {
          this.injector.get(SecurityService).logout();
          return throwError(() => err);
        }

        return from(this.oauth.refreshToken()).pipe(
          switchMap(() => {
            if (!this.oauth.getAccessToken()) {
              this.injector.get(SecurityService).logout();
              return throwError(() => err);
            }

            queueMicrotask(() => {
              this.injector.get(SecurityService).reconcileSessionAfterTokenRefresh();
            });

            const retry = req.clone({
              setHeaders: { [AUTH_RETRY]: '1' },
            });
            return next.handle(retry).pipe(
              catchError((e) => {
                this.injector.get(SecurityService).logout();
                return throwError(() => e);
              }),
            );
          }),
          catchError(() => {
            this.injector.get(SecurityService).logout();
            return throwError(() => err);
          }),
        );
      }),
    );
  }

  private isBackendApi(req: HttpRequest<unknown>): boolean {
    return req.url.toLowerCase().startsWith(this.backend);
  }
}
