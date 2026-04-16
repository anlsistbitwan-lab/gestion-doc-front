import { Component, EventEmitter, Input, OnInit, Output, HostListener, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiDocumentalService } from '../../services/api-documental.service';
import { Documento, MatrizDoc, CrearDocumentoDto } from '../../models/matriz.model';
import { AuthService } from '../../auth/auth.service';
import { PERMISOS } from '../../auth/permisos';

type CargoDto = {
  idCargo: number;
  nombre: string;
  descripcion?: string;
};

type AsignacionDto = {
  idasignacion: number;
  idmatriz: number;
  idCargo: number;
  cargo?: CargoDto; // si el backend hace join
};

@Component({
  selector: 'app-modal-documentos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-documentos.html',
})
export class ModalDocumentosComponent implements OnInit {
  @Input() celda!: MatrizDoc;
  @Output() cerrar = new EventEmitter<void>();

  // ✅ documentos visibles (filtrados por nivel)
  documentos: Documento[] = [];
  // ✅ documentos originales (sin filtrar) para saber cuántos quedaron ocultos
  documentosAll: Documento[] = [];

  cargando = false;
  errorMsg: string | null = null;

  // ==========================
  // ✅ NIVEL ACCESO USUARIO
  // ==========================
  cargandoNivel = false;
  nivelAccesoUsuario: number | null = null; // null = no cargado / no se pudo obtener

  // Crear documento
  creando = false;

  form: CrearDocumentoDto = {
    idMatrizTipoDoc: 1,
    idMatrizNivelAcceso: 1,
    idMatrizConfiguracion: 0,
    codigo: '',
    nombre: '',
    urlDoc: '',
    urlPdf: '',
  };

  // ✅ Editar metadata
  modoEditarPdf = false;
  docEditando: Documento | null = null;

  // ✅ ahora editamos 3 campos
  codigoEdit = '';
  urlDocEdit = '';
  urlPdfEdit = '';

  guardando = false;

  // ✅ Asignar documento existente
  modoAsignar = false;
  documentosCatalogo: Documento[] = [];
  idDocumentoSeleccionado = 0;
  asignando = false;

  // ==========================
  // ✅ GESTIONAR CARGOS (asignacion)
  // ==========================
  modoCargos = false;
  cargosCatalogo: CargoDto[] = [];
  asignaciones: AsignacionDto[] = [];
  idCargoSeleccionado = 0;
  cargandoCargos = false;
  guardandoCargo = false;
  eliminandoAsignacionId: number | null = null;

  // ==========================
  // ✅ BUSCADORES (Combobox UI)
  // ==========================
  busquedaDocumento = '';
  dropdownDocumentoAbierto = false;
  private cerrarDocTimeout: any = null;

  busquedaCargo = '';
  dropdownCargoAbierto = false;
  private cerrarCargoTimeout: any = null;

  // Límite visual para evitar render pesado en listas gigantes
  private readonly LIMITE_ITEMS_DROPDOWN = 80;

  constructor(
    private api: ApiDocumentalService,
    public auth: AuthService,
    private elementRef: ElementRef,
  ) {}

  // ✅ Permisos
  get puedeVerDoc(): boolean {
    //return this.auth.hasPermiso('apps.gestiondoc.ver');
    return this.auth.hasPermiso(PERMISOS.PERM_DOCUMENTOS.VER_DOC);
  }
  get puedeVerPdf(): boolean {
    //return this.auth.hasPermiso('apps.gestiondoc.verpdf');
    return this.auth.hasPermiso(PERMISOS.PERM_DOCUMENTOS.VER_PDF);
  }
  get puedeEditar(): boolean {
    //return this.auth.hasPermiso('apps.gestiondoc.editarpdf');
    return this.auth.hasPermiso(PERMISOS.PERM_DOCUMENTOS.EDITAR);
  }
  get puedeCrear(): boolean {
    //return this.auth.hasPermiso('apps.gestiondoc.crear');
    return this.auth.hasPermiso(PERMISOS.PERM_DOCUMENTOS.CREAR);
  }
  get puedeGestionarCargos(): boolean {
    //return this.auth.hasPermiso('apps.gestiondoc.crear');
    return this.auth.hasPermiso(PERMISOS.PERM_MATRIZ.GESTIONAR_CARGOS);
  }
  get puedeAsignarDocumentos(): boolean {
    //return this.auth.hasPermiso('apps.gestiondoc.crear');
    return this.auth.hasPermiso(PERMISOS.PERM_MATRIZ.ASIGNAR_DOC);
  }

  ngOnInit(): void {
    this.form.idMatrizConfiguracion = this.celda?.idMatrizConfiguracion ?? 0;

    // ✅ 1) cargar nivel del usuario
    // ✅ 2) luego cargar documentos (y filtrar)
    this.cargarNivelAccesoUsuario(() => {
      this.cargarDocumentos();
    });
  }

  // ==========================
  // ✅ helpers contexto
  // ==========================
  private esModoTituloH(): boolean {
    const idmatriz = this.celda?.idMatrizConfiguracion ?? 0;
    const idTituloH = this.celda?.tituloH?.idMatrizTituloH ?? 0;
    return idmatriz <= 0 && idTituloH > 0;
  }

  private getIdTituloH(): number {
    return this.celda?.tituloH?.idMatrizTituloH ?? 0;
  }

  private getIdMatriz(): number {
    return this.celda?.idMatrizConfiguracion ?? 0;
  }

  /*get puedeGestionarCargos(): boolean {
    // Por ahora lo amarro al mismo permiso de ver, y solo si es celda real (idmatriz > 0).
    return this.puedeVerDoc && this.getIdMatriz() > 0;
  }*/

  private getIdUsuarioSesion(): number {
    const raw = localStorage.getItem('idusuario');
    const id = raw ? Number(raw) : 0;
    return Number.isFinite(id) ? id : 0;
  }

  // ==========================
  // ✅ NIVEL ACCESO (usuario -> cargo -> nivel)
  // ==========================
  private cargarNivelAccesoUsuario(done?: () => void) {
    const idUsuario = this.getIdUsuarioSesion();
    if (!idUsuario) {
      // sin usuario, no mostramos nada por seguridad
      this.nivelAccesoUsuario = null;
      done?.();
      return;
    }

    this.cargandoNivel = true;
    this.api.obtenerNivelAccesoUsuario(idUsuario).subscribe({
      next: (nivel) => {
        const n = Number(nivel);
        this.nivelAccesoUsuario = Number.isFinite(n) ? n : null;
        this.cargandoNivel = false;
        done?.();
      },
      error: () => {
        // por seguridad: si falla, no mostramos docs
        this.nivelAccesoUsuario = null;
        this.cargandoNivel = false;
        done?.();
      }
    });
  }

  private getNivelAccesoDoc(doc: Documento): number {
    // soporta ambos formatos: join nivelAcceso o campo plano idMatrizNivelAcceso
    const fromJoin = Number((doc as any)?.nivelAcceso?.idMatrizNivelAcceso ?? 0);
    if (fromJoin && Number.isFinite(fromJoin)) return fromJoin;

    const fromFlat = Number((doc as any)?.idMatrizNivelAcceso ?? 0);
    if (fromFlat && Number.isFinite(fromFlat)) return fromFlat;

    return 0;
  }

  private puedeVerDocumentoPorNivel(doc: Documento): boolean {
    // regla: usuario puede ver si nivelCargo >= nivelDocumento
    const nivelUser = Number(this.nivelAccesoUsuario ?? 0);
    const nivelDoc = this.getNivelAccesoDoc(doc);

    // si no pudimos obtener nivel del usuario => NO ver (seguridad)
    if (!this.nivelAccesoUsuario) return false;

    // si doc no tiene nivel, lo tratamos como NO visible (más seguro)
    if (!nivelDoc) return false;

    return nivelUser >= nivelDoc;
  }

  private aplicarFiltroNivel(docs: Documento[]) {
    this.documentosAll = docs ?? [];
    this.documentos = (docs ?? []).filter(d => this.puedeVerDocumentoPorNivel(d));
  }

  get totalOcultosPorNivel(): number {
    const total = this.documentosAll?.length ?? 0;
    const visibles = this.documentos?.length ?? 0;
    return Math.max(0, total - visibles);
  }

  // ==========================
  // ✅ cargar docs (y filtrar)
  // ==========================
  cargarDocumentos() {
    this.cargando = true;
    this.errorMsg = null;

    if (this.esModoTituloH()) {
      const idTituloH = this.getIdTituloH();
      this.api.obtenerDocumentosPorTituloH(idTituloH).subscribe({
        next: (docs) => {
          this.aplicarFiltroNivel(docs ?? []);
          this.cargando = false;
        },
        error: () => {
          this.errorMsg = 'No se pudieron cargar los documentos del proceso.';
          this.cargando = false;
        },
      });
      return;
    }

    const idmatriz = this.getIdMatriz();
    if (!idmatriz || idmatriz <= 0) {
      this.documentos = [];
      this.documentosAll = [];
      this.cargando = false;
      this.errorMsg = 'Contexto inválido para cargar documentos.';
      return;
    }

    this.api.obtenerDocumentosPorCelda(idmatriz).subscribe({
      next: (docs) => {
        this.aplicarFiltroNivel(docs ?? []);
        this.cargando = false;
      },
      error: () => {
        this.errorMsg = 'No se pudieron cargar los documentos de la celda.';
        this.cargando = false;
      },
    });
  }

  cerrarModal() {
    this.cerrar.emit();
  }

  getUrlDoc(doc: Documento): string | undefined {
    return (doc as any).urlDoc || (doc as any).urlDoc || undefined;
  }

  getUrlPdf(doc: Documento): string | undefined {
    return (doc as any).urlPdf || (doc as any).urlPdf || undefined;
  }

  abrirUrl(url?: string) {
    if (!url) return;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  // ==========================
  // ✅ CREAR
  // ==========================
  toggleCrear() {
    this.creando = !this.creando;
    if (this.creando) {
      this.modoAsignar = false;
      this.modoCargos = false;
      this.cerrarDropdowns();
    }
  }

  crearDocumento() {
    this.errorMsg = null;

    // modo titulo_h: crear + link doc_titulo_h
    if (this.esModoTituloH()) {
      const idTituloH = this.getIdTituloH();
      if (!idTituloH || idTituloH <= 0) {
        this.errorMsg = 'Contexto inválido: no hay idtitulo_h.';
        return;
      }

      const payload: any = {
        ...this.form,
        idmatriz: undefined,
        idMatrizTituloH: idTituloH,
      };

      this.api.crearDocumento(payload).subscribe({
        next: () => {
          this.creando = false;
          this.form.codigo = '';
          this.form.nombre = '';
          this.form.urlDoc = '';
          this.form.urlPdf = '';
          this.cargarDocumentos();
        },
        error: () => {
          this.errorMsg = 'No se pudo crear el documento.';
        },
      });

      return;
    }

    // modo celda: crear + link asigna_doc
    const idmatriz = this.getIdMatriz();
    if (!idmatriz || idmatriz <= 0) {
      this.errorMsg = 'Crear documento requiere una celda válida.';
      return;
    }

    this.form.idMatrizConfiguracion = idmatriz;

    this.api.crearDocumento(this.form).subscribe({
      next: () => {
        this.creando = false;
        this.form.codigo = '';
        this.form.nombre = '';
        this.form.urlDoc = '';
        this.form.urlPdf = '';
        this.cargarDocumentos();
      },
      error: () => {
        this.errorMsg = 'No se pudo crear el documento.';
      },
    });
  }

  // ==========================
  // ✅ ASIGNAR EXISTENTE
  // ==========================
  toggleAsignar() {
    this.modoAsignar = !this.modoAsignar;
    if (this.modoAsignar) {
      this.creando = false;
      this.modoCargos = false;
      this.cargarCatalogoDocumentos();
    } else {
      this.resetBuscadorDocumento();
    }
  }

  private cargarCatalogoDocumentos() {
    this.api.listarDocumentos().subscribe({
      next: (docs) => {
        // ✅ filtramos catálogo también por nivel (para que no pueda seleccionar uno que no verá)
        const base = docs ?? [];
        this.documentosCatalogo = base.filter(d => this.puedeVerDocumentoPorNivel(d));

        this.idDocumentoSeleccionado = 0;
        this.resetBuscadorDocumento();
        this.abrirDropdownDocumento();
      },
      error: () => {
        this.errorMsg = 'No se pudieron cargar los documentos para asignar.';
      },
    });
  }

  asignarDocumento() {
    if (!this.idDocumentoSeleccionado) return;

    this.asignando = true;
    this.errorMsg = null;

    // modo titulo_h → doc_titulo_h
    if (this.esModoTituloH()) {
      const idTituloH = this.getIdTituloH();
      this.api.asignarDocumentoATituloH(idTituloH, this.idDocumentoSeleccionado).subscribe({
        next: () => {
          this.asignando = false;
          this.modoAsignar = false;
          this.resetBuscadorDocumento();
          this.cargarDocumentos();
        },
        error: () => {
          this.asignando = false;
          this.errorMsg = 'No se pudo asignar el documento al proceso.';
        },
      });
      return;
    }

    // modo celda → asigna_doc
    const idmatriz = this.getIdMatriz();
    this.api.asignarDocumentoACelda(idmatriz, this.idDocumentoSeleccionado).subscribe({
      next: () => {
        this.asignando = false;
        this.modoAsignar = false;
        this.resetBuscadorDocumento();
        this.cargarDocumentos();
      },
      error: () => {
        this.asignando = false;
        this.errorMsg = 'No se pudo asignar el documento a la celda.';
      },
    });
  }

  // ==========================
  // ✅ GESTIONAR CARGOS
  // ==========================
  toggleCargos() {
    this.modoCargos = !this.modoCargos;

    if (this.modoCargos) {
      this.creando = false;
      this.modoAsignar = false;
      this.cargarCargosYAsignaciones();
    } else {
      this.resetBuscadorCargo();
    }
  }

  private cargarCargosYAsignaciones() {
    const idmatriz = this.getIdMatriz();
    if (!idmatriz || idmatriz <= 0) {
      this.errorMsg = 'Gestionar cargos requiere una celda válida.';
      this.modoCargos = false;
      return;
    }

    this.cargandoCargos = true;
    this.errorMsg = null;

    this.api.listarCargos().subscribe({
      next: (cargos) => {
        this.cargosCatalogo = (cargos ?? []) as CargoDto[];
        this.idCargoSeleccionado = 0;
        this.resetBuscadorCargo();

        this.api.listarAsignacionesPorMatriz(idmatriz).subscribe({
          next: (asigs) => {
            this.asignaciones = (asigs ?? []) as AsignacionDto[];
            this.cargandoCargos = false;

            // abre el dropdown solo si hay búsqueda
            this.abrirDropdownCargo();
          },
          error: () => {
            this.cargandoCargos = false;
            this.errorMsg = 'No se pudieron cargar las asignaciones de cargos.';
          },
        });
      },
      error: () => {
        this.cargandoCargos = false;
        this.errorMsg = 'No se pudieron cargar los cargos.';
      },
    });
  }

  asignarCargo() {
    const idmatriz = this.getIdMatriz();
    const idCargo = this.idCargoSeleccionado;

    if (!idmatriz || idmatriz <= 0) {
      this.errorMsg = 'Gestionar cargos requiere una celda válida.';
      return;
    }
    if (!idCargo || idCargo <= 0) return;

    this.guardandoCargo = true;
    this.errorMsg = null;

    this.api.asignarCargo(idmatriz, idCargo).subscribe({
      next: () => {
        this.guardandoCargo = false;
        this.idCargoSeleccionado = 0;
        this.resetBuscadorCargo();
        this.cargarCargosYAsignaciones();
      },
      error: () => {
        this.guardandoCargo = false;
        this.errorMsg = 'No se pudo asignar el cargo a la celda.';
      },
    });
  }

  desasignarCargo(idasignacion: number) {
    if (!idasignacion) return;

    this.eliminandoAsignacionId = idasignacion;
    this.errorMsg = null;

    this.api.eliminarAsignacion(idasignacion).subscribe({
      next: () => {
        this.eliminandoAsignacionId = null;
        this.cargarCargosYAsignaciones();
      },
      error: () => {
        this.eliminandoAsignacionId = null;
        this.errorMsg = 'No se pudo eliminar la asignación del cargo.';
      },
    });
  }

  // ==========================
  // ✅ EDITAR METADATA (codigo, urlDoc, urlPdf)
  // ==========================
  editarUrlPdf(doc: Documento) {
    this.errorMsg = null;
    this.modoEditarPdf = true;
    this.docEditando = doc;

    // precargar valores actuales
    this.codigoEdit = String((doc as any).codigo ?? '');
    this.urlDocEdit = this.getUrlDoc(doc) ?? '';
    this.urlPdfEdit = this.getUrlPdf(doc) ?? '';
  }

  cancelarEditarPdf() {
    this.modoEditarPdf = false;
    this.docEditando = null;

    this.codigoEdit = '';
    this.urlDocEdit = '';
    this.urlPdfEdit = '';

    this.guardando = false;
  }

  guardarUrlPdf() {
    if (!this.docEditando) return;

    this.guardando = true;
    this.errorMsg = null;

    const payload: any = {
      codigo: this.codigoEdit ?? '',
      urlDoc: this.urlDocEdit ?? '',
      urlPdf: this.urlPdfEdit ?? '',
    };

    this.api.actualizarDocumento(this.docEditando.idMatrizDocumento, payload).subscribe({
      next: () => {
        this.guardando = false;
        this.cancelarEditarPdf();
        this.cargarDocumentos();
      },
      error: () => {
        this.guardando = false;
        this.errorMsg = 'No se pudo actualizar la metadata del documento.';
      },
    });
  }

  // ==========================
  // ✅ COMBOBOX: DOCUMENTOS
  // ==========================
  get documentosFiltrados(): Documento[] {
    const term = (this.busquedaDocumento ?? '').trim().toLowerCase();
    const base = this.documentosCatalogo ?? [];

    if (!term) return [];

    const res = base.filter(d => {
      const id = String((d as any).idMatrizDocumento ?? '');
      const nombre = String((d as any).nombre ?? '').toLowerCase();
      const codigo = String((d as any).codigo ?? '').toLowerCase();
      return id.includes(term) || nombre.includes(term) || codigo.includes(term);
    });

    return res.slice(0, this.LIMITE_ITEMS_DROPDOWN);
  }

  abrirDropdownDocumento() {
    if (this.cerrarDocTimeout) {
      clearTimeout(this.cerrarDocTimeout);
      this.cerrarDocTimeout = null;
    }
    const term = (this.busquedaDocumento ?? '').trim();
    this.dropdownDocumentoAbierto = term.length > 0;
  }

  programarCerrarDropdownDocumento() {
    this.cerrarDocTimeout = setTimeout(() => {
      this.dropdownDocumentoAbierto = false;
      this.cerrarDocTimeout = null;
    }, 120);
  }

  seleccionarDocumento(d: Documento) {
    this.idDocumentoSeleccionado = (d as any).idMatrizDocumento ?? 0;
    this.busquedaDocumento = this.getDocumentoLabel(d);
    this.dropdownDocumentoAbierto = false;
  }

  limpiarDocumentoSeleccion() {
    this.idDocumentoSeleccionado = 0;
    this.busquedaDocumento = '';
    this.dropdownDocumentoAbierto = true;
  }

  limpiarBusquedaDocumento() {
    this.busquedaDocumento = '';
    this.dropdownDocumentoAbierto = true;
  }

  getDocumentoSeleccionadoLabel(): string {
    const idSel = this.idDocumentoSeleccionado;
    const d = (this.documentosCatalogo ?? []).find(x => (x as any).idMatrizDocumento === idSel);
    return d ? this.getDocumentoLabel(d) : `ID ${idSel}`;
  }

  private getDocumentoLabel(d: Documento): string {
    const id = (d as any).idMatrizDocumento ?? '';
    const nombre = (d as any).nombre || '(Sin nombre)';
    return `${nombre} — ID ${id}`;
  }

  private resetBuscadorDocumento() {
    this.busquedaDocumento = '';
    this.dropdownDocumentoAbierto = false;
    if (this.cerrarDocTimeout) {
      clearTimeout(this.cerrarDocTimeout);
      this.cerrarDocTimeout = null;
    }
  }

  // ==========================
  // ✅ COMBOBOX: CARGOS
  // ==========================
  get cargosFiltrados(): CargoDto[] {
    const term = (this.busquedaCargo ?? '').trim().toLowerCase();
    const base = this.cargosCatalogo ?? [];

    if (!term) return [];

    const res = base.filter(c => {
      const id = String(c.idCargo ?? '');
      const nombre = String(c.nombre ?? '').toLowerCase();
      return id.includes(term) || nombre.includes(term);
    });

    return res.slice(0, this.LIMITE_ITEMS_DROPDOWN);
  }

  abrirDropdownCargo() {
    if (this.cerrarCargoTimeout) {
      clearTimeout(this.cerrarCargoTimeout);
      this.cerrarCargoTimeout = null;
    }
    const term = (this.busquedaCargo ?? '').trim();
    this.dropdownCargoAbierto = term.length > 0;
  }

  programarCerrarDropdownCargo() {
    this.cerrarCargoTimeout = setTimeout(() => {
      this.dropdownCargoAbierto = false;
      this.cerrarCargoTimeout = null;
    }, 120);
  }

  seleccionarCargo(c: CargoDto) {
    this.idCargoSeleccionado = c.idCargo ?? 0;
    this.busquedaCargo = this.getCargoLabel(c);
    this.dropdownCargoAbierto = false;
  }

  limpiarCargoSeleccion() {
    this.idCargoSeleccionado = 0;
    this.busquedaCargo = '';
    this.dropdownCargoAbierto = true;
  }

  limpiarBusquedaCargo() {
    this.busquedaCargo = '';
    this.dropdownCargoAbierto = true;
  }

  getCargoSeleccionadoLabel(): string {
    const idSel = this.idCargoSeleccionado;
    const c = (this.cargosCatalogo ?? []).find(x => x.idCargo === idSel);
    return c ? this.getCargoLabel(c) : `ID ${idSel}`;
  }

  private getCargoLabel(c: CargoDto): string {
    const id = c.idCargo ?? '';
    const nombre = c.nombre || '(Sin nombre)';
    return `${nombre} (ID ${id})`;
  }

  private resetBuscadorCargo() {
    this.busquedaCargo = '';
    this.dropdownCargoAbierto = false;
    if (this.cerrarCargoTimeout) {
      clearTimeout(this.cerrarCargoTimeout);
      this.cerrarCargoTimeout = null;
    }
  }

  private cerrarDropdowns() {
    this.dropdownDocumentoAbierto = false;
    this.dropdownCargoAbierto = false;
  }

  // CERRAR DROPDOWN AL HACER CLICK FUERA
  @HostListener('document:click', ['$event'])
  onClickFuera(event: MouseEvent) {
    const clickedInside = this.elementRef.nativeElement.contains(event.target);
    if (!clickedInside) {
      this.dropdownDocumentoAbierto = false;
      this.dropdownCargoAbierto = false;
    }
  }

  @HostListener('document:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape' || event.key === 'Esc') {
      this.dropdownDocumentoAbierto = false;
      this.dropdownCargoAbierto = false;
    }
  }
}
