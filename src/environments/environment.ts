export const environment = {
  production: false,

  /** API Nest (gestión documental); el token OAuth se adjunta a estas URLs vía provideOAuthClient */
  backendBaseUrl: 'http://localhost:3000',

  /** Legacy / otros servicios (si aún se usan) */
  serviciosBaseUrl: 'https://serviciostest.bitwan.info/api/public',

  /** Servidor de autorización corporativo (pruebas) */
  AUTH_URL: 'https://pruebas.bitwan.info/apiauth/',
  ISSUER: 'https://pruebas.bitwan.info/apiauth',
  REDIRECT_URI: `${window.location.origin}/matriz`,
  POST_LOGOUT_REDIRECT_URI: `${window.location.origin}/login`,
  OICD_CLIENT: 'bit.mz-docs',
};
