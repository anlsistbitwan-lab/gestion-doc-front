import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

import {
  MatrizResponse,
  Documento,
  CrearDocumentoDto,
  ActualizarDocumentoDto,
  MatrizDoc,
  TituloHConTipo,
  TituloVConTipo,
} from '../models/matriz.model';

@Injectable({
  providedIn: 'root',
})
export class ApiDocumentalService {
  //private baseUrl = 'http://localhost:3000';
  private baseUrl = environment.backendBaseUrl;

  constructor(private http: HttpClient) {}

  // Obtener toda la matriz (filas + columnas + canales + celdas)
  obtenerMatriz(): Observable<MatrizResponse> {
    return this.http.get<MatrizResponse>(`${this.baseUrl}/matriz`);
  }

  //  obtener matriz_doc "columna" (titulo_h + canal)
  obtenerMatrizColumna(idtitulo_h: number, idcanal: number): Observable<MatrizDoc> {
    return this.http.get<MatrizDoc>(`${this.baseUrl}/matriz/columna/${idtitulo_h}/${idcanal}`);
  }

  //  obtener matriz_doc "fila" (titulo_v + canal)
  obtenerMatrizFila(idtitulo_v: number, idcanal: number): Observable<MatrizDoc> {
    return this.http.get<MatrizDoc>(`${this.baseUrl}/matriz/fila/${idtitulo_v}/${idcanal}`);
  }

  // ACCESOS


  //Devuelve arreglo de idmatriz permitidos para el usuario (por asignacion->cargo).
  obtenerAccesosUsuario(idUsuario: number): Observable<number[]> {
    return this.http.get<number[]>(`${this.baseUrl}/matriz/accesos/usuario/${idUsuario}`);
  }


  // True/False si puede abrir una celda concreta.
  validarAccesoCelda(idUsuario: number, idmatriz: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.baseUrl}/matriz/acceso/usuario/${idUsuario}/celda/${idmatriz}`);
  }

  //True/False si puede abrir un titulo_h (proceso).
  validarAccesoTituloH(idUsuario: number, idtitulo_h: number): Observable<boolean> {
    return this.http.get<boolean>(`${this.baseUrl}/matriz/acceso/usuario/${idUsuario}/titulo-h/${idtitulo_h}`);
  }


  // DOCUMENTOS

  // Listar documentos por celda
  obtenerDocumentosPorCelda(idmatriz: number): Observable<Documento[]> {
    return this.http.get<Documento[]>(`${this.baseUrl}/documentos/celda/${idmatriz}`);
  }

  // Listar documentos por titulo_h (doc_titulo_h)
  obtenerDocumentosPorTituloH(idtitulo_h: number): Observable<Documento[]> {
    return this.http.get<Documento[]>(`${this.baseUrl}/documentos/titulo-h/${idtitulo_h}`);
  }

  // Crear documento (backend soporta idmatriz o idtitulo_h)
  crearDocumento(dto: CrearDocumentoDto | any): Observable<Documento> {
    return this.http.post<Documento>(`${this.baseUrl}/documentos`, dto);
  }

  // Actualizar documento
  actualizarDocumento(id: number, dto: ActualizarDocumentoDto): Observable<Documento> {
    return this.http.put<Documento>(`${this.baseUrl}/documentos/${id}`, dto);
  }

  obtenerPdfDocumento(id: number): Observable<Blob> {
    return this.http.get(`${this.baseUrl}/documentos/${id}/pdf`, {
      responseType: 'blob',
    });
  }

  // Listar todos los documentos (para selector "Asignar")
  listarDocumentos(): Observable<Documento[]> {
    return this.http.get<Documento[]>(`${this.baseUrl}/documentos`);
  }

  // Asignar documento existente a celda
  asignarDocumentoACelda(idmatriz: number, iddocumento: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/documentos/celda/${idmatriz}/asignar/${iddocumento}`, {});
  }

  // Asignar documento existente a titulo_h
  asignarDocumentoATituloH(idtitulo_h: number, iddocumento: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/documentos/titulo-h/${idtitulo_h}/asignar/${iddocumento}`, {});
  }


  // CARGOS / ASIGNACIONES

  // Listar cargos disponibles
  listarCargos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/cargos`);
  }

  // Listar cargos asignados a una celda (idmatriz)
  listarAsignacionesPorMatriz(idmatriz: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/asignaciones/matriz/${idmatriz}`);
  }

  // Asignar cargo a matriz
  asignarCargo(idmatriz: number, idCargo: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/asignaciones`, {
      idmatriz,
      idCargo,
    });
  }

  // Eliminar asignación
  eliminarAsignacion(idasignacion: number): Observable<any> {
    return this.http.delete(`${this.baseUrl}/asignaciones/${idasignacion}`);
  }


  // TITULOS H / V (MAESTROS)

  listarTitulosH(): Observable<TituloHConTipo[]> {
    return this.http.get<TituloHConTipo[]>(`${this.baseUrl}/titulo-h`);
  }

  crearTituloH(payload: { idtipo_titulo_h: number; nombre: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/titulo-h`, payload);
  }

  listarTiposTituloH(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/tipos-titulo-h`);
  }

  listarTitulosV(): Observable<TituloVConTipo[]> {
    return this.http.get<TituloVConTipo[]>(`${this.baseUrl}/titulo-v`);
  }

  crearTituloV(payload: { idtipo_titulo_v: number; nombre: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/titulo-v`, payload);
  }

  listarTiposTituloV(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/tipos-titulo-v`);
  }


  // NIVELES ACCESO

  listarTiposDocumento(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/tipos-documento`);
  }

  listarNivelesAcceso(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/niveles-acceso`);
  }

  // CARGOS

  crearCargo(dto: { nombre: string; descripcion?: string | null; idNivelAcceso: number }): Observable<any> {
    return this.http.post(`${this.baseUrl}/cargos`, dto);
  }

  // USUARIOS (para asignación de cargos)

  listarUsuarios(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/usuarios`);
  }

  /** Usuarios activos que aún no tienen fila en terceroscargos para este idCargo (ver ruta en Nest). */
  listarUsuariosSinCargo(idCargo: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/usuarios/sin-cargo/${idCargo}`);
  }

  /** Cargos asignados al usuario (terceroscargos + datos de cargo). Ver implementación en Nest. */
  listarCargosPorUsuario(idUsuario: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/usuarios/${idUsuario}/cargos`);
  }

  asignarUsuariosACargo(idCargo: number, idsUsuarios: number[]): Observable<any> {
    return this.http.put(`${this.baseUrl}/usuarios/asignar-cargo`, {
      idCargo,
      idsUsuarios,
    });
  }

  copiarCargo(dto: { idCargoOrigen: number; nombre: string; descripcion?: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/cargos/copiar`, dto);
  }

  copiarAsignacionesCargos(dto: { idCargoOrigen: number; idCargoDestino: number; modo?: string }): Observable<any> {
    return this.http.post(`${this.baseUrl}/cargos/copiar-asignaciones`, dto);
  }

  // nivel de acceso del usuario (por cargo)
  obtenerNivelAccesoUsuario(idUsuario: number) {
    return this.http.get<number>(`${this.baseUrl}/matriz/nivel-acceso/usuario/${idUsuario}`);
  }

  // CELDAS (Crear celdas)

  listarCeldasPlano(q: string = ''): Observable<any[]> {
    const qs = q ? `?q=${encodeURIComponent(q)}` : '';
    return this.http.get<any[]>(`${this.baseUrl}/matriz/celdas${qs}`);
  }

  // endpoint existente - DTO real usa idCanal
  crearMatrizDoc(payload: { idtitulo_h: number; idtitulo_v: number; idCanal: number }): Observable<any> {
    return this.http.post(`${this.baseUrl}/matriz`, payload);
  }

  // endpoint nuevo recomendado
  crearCeldasBulk(payload: { idtitulo_h: number; idtitulo_v: number; idCanales: number[] }): Observable<any> {
    return this.http.post(`${this.baseUrl}/matriz/celdas/bulk`, payload);
  }

}
