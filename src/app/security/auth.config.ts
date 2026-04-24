import { AuthConfig } from 'angular-oauth2-oidc';
import { environment } from '../../environments/environment';

export const oauthConfig: AuthConfig = {
  responseType: 'code',
  scope: 'offline_access gestiondoc',
  redirectUri: environment.REDIRECT_URI,
  oidc: false,
  showDebugInformation: !environment.production,
  strictDiscoveryDocumentValidation: true,
  useSilentRefresh: false,
  issuer: environment.ISSUER,
  postLogoutRedirectUri: environment.POST_LOGOUT_REDIRECT_URI,
  clientId: environment.OICD_CLIENT,
  tokenEndpoint: `${environment.AUTH_URL}oauth/token`,
};
