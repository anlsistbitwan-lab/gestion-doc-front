import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export type LoginResponse = {
  code: number;
  data: {
    idusuario: number;
    idtercero: number;
    numerotercero: number;
    alias: string;
    nombres: string;
    supervisor: any;
    token: string;
  };
  permisos: string; // string JSON: "[\"apps.gestiondoc.ver\", ...]"
};

export type PermisosByTerceroResponse = {
  code: number;
  msg?: string;
  data: {
    idusuario: number;
    permisos: string; // string JSON
    supervisor: any;
  };
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly LOGIN_URL = `${environment.serviciosBaseUrl}/login`;
  private readonly PERMISOS_URL = `${environment.serviciosBaseUrl}/usuarios/getpermisosbytercero`;

  // Ajusta estos nombres si en “servicios” usan otros permisos
  static readonly PERM_VER = 'apps.gestiondoc.ver';
  static readonly PERM_EDITAR = 'apps.gestiondoc.editar';
  static readonly PERM_CREAR = 'apps.gestiondoc.crear';

  constructor(private http: HttpClient) {}

  login(alias: string, password: string) {
    const body = new HttpParams().set('json', JSON.stringify({ alias, password }));

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    return this.http.post<LoginResponse>(this.LOGIN_URL, body.toString(), { headers });
  }

  guardarSesion(res: LoginResponse) {
    localStorage.setItem('token', res.data.token);
    localStorage.setItem('idtercero', String(res.data.idtercero));
    localStorage.setItem('idusuario', String(res.data.idusuario));
    localStorage.setItem('alias', res.data.alias);
    localStorage.setItem('nombres', res.data.nombres);
    localStorage.setItem('permisos', res.permisos); // string JSON
  }

  actualizarPermisosDesdeApi(res: PermisosByTerceroResponse) {
    localStorage.setItem('permisos', res.data.permisos);
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getIdTercero(): string | null {
    return localStorage.getItem('idtercero');
  }

  /*getPermisos(): string[] {
    const raw = localStorage.getItem('permisos');
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  }*/

  getPermisos(): string[] {
  const raw = localStorage.getItem('permisos');
  if (!raw) return [];

  try {
    const permisos = JSON.parse(raw);

    // SIMULACIÓN TEMPORAL
    if (
      permisos.includes('apps.gestiondoc.ventas') &&
      permisos.includes('apps.gestiondoc.ver')
    ) {
      return [
        ...permisos,
        'gestiondoc.matriz.listar',
        'gestiondoc.matriz.crear',
        'gestiondoc.matriz.editar',
        'gestiondoc.matriz.editar',
        'gestiondoc.matriz.verdoc',
        'gestiondoc.matriz.verpdf',
        'gestiondoc.matriz.gestioncargos',
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
        //'apps.gestiondoc.MatrizFullAccess',
      ];
    }
      console.log(permisos);
      return permisos;
    } catch {
      return [];
    }
  }

  hasPermiso(permiso: string): boolean {
    return this.getPermisos().includes(permiso);
  }

  isLoggedIn(): boolean {
    return !!this.getToken();
  }

  validarSesion() {
    const idtercero = localStorage.getItem('idtercero');
    const token = localStorage.getItem('token');

    const body = new HttpParams().set(
      'authorization',
      token || ''
    );

    const headers = new HttpHeaders({
      'Content-Type': 'application/x-www-form-urlencoded'
    });

    return this.http.post<any>(
      `${this.PERMISOS_URL}/${idtercero}`,
      body.toString(),
      { headers }
    );
  }

  getIdUsuario(): number {
    const raw = localStorage.getItem('idusuario');
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }

  logout() {
    localStorage.clear();
  }
}
