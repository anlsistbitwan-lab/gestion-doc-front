import { ApplicationConfig, inject, provideAppInitializer } from '@angular/core';
import { provideRouter } from '@angular/router';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideOAuthClient } from 'angular-oauth2-oidc';
import { routes } from './app.routes';
import { environment } from '../environments/environment';
import { SecurityService } from './security/security.service';
import { ApiUnauthorizedInterceptor } from './security/api-unauthorized.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAppInitializer(() => inject(SecurityService).initConfiguration()),
    provideRouter(routes),
    provideOAuthClient({
      resourceServer: {
        sendAccessToken: true,
        allowedUrls: [environment.backendBaseUrl],
      },
    }),
    // DefaultOAuthInterceptor se registra como HTTP_INTERCEPTORS; hace falta esto en HttpClient standalone.
    provideHttpClient(withInterceptorsFromDi()),
    { provide: HTTP_INTERCEPTORS, useClass: ApiUnauthorizedInterceptor, multi: true },
  ],
};
