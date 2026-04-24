import { Injectable, inject } from '@angular/core';
import { SecurityService } from '../security/security.service';

/**
 * Fachada sobre OAuth + permisos expuestos por {@link SecurityService}
 * para no romper componentes que ya usan `AuthService`.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  static readonly PERM_VER = 'apps.gestiondoc.ver';
  static readonly PERM_EDITAR = 'apps.gestiondoc.editar';
  static readonly PERM_CREAR = 'apps.gestiondoc.crear';

  /** Permisos que aún no vienen del API; quitar cuando el backend los envíe. */
  private static readonly PERMISOS_TEMPORALES_API: readonly string[] = [
    'gestiondoc.matriz.listar',
    'gestiondoc.matriz.crear',
    'gestiondoc.matriz.gestioncargos',
    'gestiondoc.matriz.asignardocumentos',
    'gestiondoc.matriz.MatrizFullAccess',
    'gestiondoc.documentos.listar',
    'gestiondoc.documentos.crear',
    'gestiondoc.documentos.editar',
    'gestiondoc.documentos.verdoc',
    'gestiondoc.documentos.verpdf',
    'gestiondoc.cargos.listar',
    'gestiondoc.cargos.crear',
    'gestiondoc.cargos.editar',
    'gestiondoc.celdas.listar',
    'gestiondoc.celdas.crear',
    'gestiondoc.celdas.editar',
    'gestiondoc.titulosh.listar',
    'gestiondoc.titulosh.crear',
    'gestiondoc.titulosh.editar',
    'gestiondoc.titulosv.listar',
    'gestiondoc.titulosv.crear',
    'gestiondoc.titulosv.editar',
  ];

  private readonly security = inject(SecurityService);

  getToken(): string | null {
    return this.security.getAccessToken();
  }

  getIdTercero(): string | null {
    return localStorage.getItem('idtercero');
  }

  getPermisos(): string[] {
    return [...this.security.userPermissions(), ...AuthService.PERMISOS_TEMPORALES_API];
  }

  hasPermiso(permiso: string): boolean {
    return this.getPermisos().includes(permiso);
  }

  isLoggedIn(): boolean {
    return this.security.hasValidAccessToken();
  }

  getIdUsuario(): number {
    const raw = localStorage.getItem('idusuario');
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }

  logout(): void {
    this.security.logout();
  }
}
