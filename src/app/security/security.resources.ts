import { environment } from '../../environments/environment';

const authBase = environment.AUTH_URL;

/** Endpoints del servidor de auth (no son la API Nest). */
export const SECURITY_RESOURCES = {
  logout: `${authBase}auth/logout`,
  getInfo: `${authBase}security/get-info`,
};
