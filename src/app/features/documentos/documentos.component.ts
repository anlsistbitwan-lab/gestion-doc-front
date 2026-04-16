import {
  Component,
  HostListener,
  ElementRef,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ApiDocumentalService } from '../../services/api-documental.service';
import { Documento } from '../../models/matriz.model';
import { AuthService } from '../../auth/auth.service';
import { PERMISOS } from '../../auth/permisos';

type CrearDocForm = {
  idMatrizTipoDoc: number;
  idMatrizNivelAcceso: number;
  codigo: string;
  nombre: string;
  urlDoc: string;
  urlPdf: string;
};

@Component({
  selector: 'app-documentos',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './documentos.component.html',
})
export class DocumentosComponent implements OnInit {
  documentos: Documento[] = [];
  cargando = false;
  errorMsg: string | null = null;

  // UI crear
  creando = false;
  guardandoCrear = false;

  // ✅ Form para crear SIN asignación (no idmatriz, no idtitulo_h)
  form: CrearDocForm = {
    idMatrizTipoDoc: 1,
    idMatrizNivelAcceso: 1,
    codigo: '',
    nombre: '',
    urlDoc: '',
    urlPdf: '',
  };

  // ==========================
  // ✅ EDITAR METADATA (codigo, urlDoc, urlPdf)
  // ==========================
  modoEditarMeta = false;
  docEditando: Documento | null = null;

  codigoEdit = '';
  urlDocEdit = '';
  urlPdfEdit = '';

  guardandoEdicion = false;

  // ==========================
  // ✅ BUSCADOR + PAGINACIÓN
  // ==========================
  busqueda = '';
  pageSize = 20; // default requerido
  pageSizeOptions = [10, 20, 50, 100];
  pageIndex = 1; // 1-based

  // ==========================
  // ✅ HEADER + MENU (Drawer)
  // ==========================
  menuAbierto = false;

  constructor(
    private api: ApiDocumentalService,
    public auth: AuthService,
    private router: Router,
    private elementRef: ElementRef,
  ) {}

  ngOnInit(): void {
    this.cargarListado();
  }

  logout() {
    (this.auth as any)?.logout?.();
    this.router.navigate(['/login']);
  }

  // LISTADO DOCUMENTOS

  cargarListado() {
    this.cargando = true;
    this.errorMsg = null;

    this.api.listarDocumentos().subscribe({
      next: (docs) => {
        this.documentos = docs ?? [];
        this.cargando = false;

        // Reset paginación al recargar
        this.pageIndex = 1;
      },
      error: () => {
        this.errorMsg = 'No se pudieron cargar los documentos.';
        this.cargando = false;
      }
    });
  }

  toggleCrear() {
    this.creando = !this.creando;
    this.errorMsg = null;

    if (this.creando) {
      // si abres crear, cierro edición
      this.cancelarEditarMeta();
    }

    if (!this.creando) {
      this.resetForm();
    }
  }

  resetForm() {
    this.form = {
      idMatrizTipoDoc: 1,
      idMatrizNivelAcceso: 1,
      codigo: '',
      nombre: '',
      urlDoc: '',
      urlPdf: '',
    };
  }

  crearDocumentoMaestro() {
    if (this.guardandoCrear) return;

    if (!this.form.nombre?.trim()) {
      this.errorMsg = 'El nombre es obligatorio.';
      return;
    }

    this.guardandoCrear = true;
    this.errorMsg = null;

    const payload = {
      idMatrizTipoDoc: this.form.idMatrizTipoDoc,
      idMatrizNivelAcceso: this.form.idMatrizNivelAcceso,
      codigo: this.form.codigo,
      nombre: this.form.nombre,
      urlDoc: this.form.urlDoc,
      urlPdf: this.form.urlPdf,
    };

    this.api.crearDocumento(payload).subscribe({
      next: () => {
        this.guardandoCrear = false;
        this.creando = false;
        this.resetForm();
        this.cargarListado();
      },
      error: () => {
        this.guardandoCrear = false;
        this.errorMsg = 'No se pudo crear el documento.';
      }
    });
  }

  // Helpers urls
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
  // ✅ EDITAR METADATA (codigo, urlDoc, urlPdf)
  // ==========================
  editarMetadata(doc: Documento) {
    this.errorMsg = null;
    this.modoEditarMeta = true;
    this.docEditando = doc;

    this.codigoEdit = String((doc as any).codigo ?? '');
    this.urlDocEdit = this.getUrlDoc(doc) ?? '';
    this.urlPdfEdit = this.getUrlPdf(doc) ?? '';

    // cierro crear si estaba abierto
    this.creando = false;
  }

  cancelarEditarMeta() {
    this.modoEditarMeta = false;
    this.docEditando = null;
    this.codigoEdit = '';
    this.urlDocEdit = '';
    this.urlPdfEdit = '';
    this.guardandoEdicion = false;
  }

  guardarMetadata() {
    if (!this.docEditando) return;
    if (this.guardandoEdicion) return;

    this.guardandoEdicion = true;
    this.errorMsg = null;

    const payload: any = {
      codigo: this.codigoEdit,
      urlDoc: this.urlDocEdit,
      urlPdf: this.urlPdfEdit,
    };

    this.api.actualizarDocumento(this.docEditando.idMatrizDocumento, payload).subscribe({
      next: () => {
        this.guardandoEdicion = false;
        this.cancelarEditarMeta();
        this.cargarListado();
      },
      error: () => {
        this.guardandoEdicion = false;
        this.errorMsg = 'No se pudo actualizar la metadata del documento.';
      },
    });
  }

  // Botón visual (no funcional por ahora)
  inactivarDocumentoFake(doc: Documento) {
    console.log('Inactivar (pendiente backend):', doc.idMatrizDocumento);
  }

  // Permisos
  get puedeVerDoc(): boolean {
    //return this.auth.hasPermiso('apps.gestiondoc.ver');
    return this.auth.hasPermiso(PERMISOS.PERM_DOCUMENTOS.VER_DOC);
  }
  get puedeVerPdf(): boolean {
    //return this.auth.hasPermiso('apps.gestiondoc.verpdf');
    return this.auth.hasPermiso(PERMISOS.PERM_DOCUMENTOS.VER_PDF);
  }
  get puedeCrear(): boolean {
    //return this.auth.hasPermiso('apps.gestiondoc.crear');
    return this.auth.hasPermiso(PERMISOS.PERM_DOCUMENTOS.CREAR);
  }
  get puedeEditar(): boolean {
    //return this.auth.hasPermiso('apps.gestiondoc.crear');
    return this.auth.hasPermiso(PERMISOS.PERM_DOCUMENTOS.EDITAR);
  }

  // ==========================
  // ✅ BUSCADOR + PAGINACIÓN (CLIENTE)
  // ==========================
  onChangeBusqueda() {
    this.pageIndex = 1;
  }

  limpiarBusqueda() {
    this.busqueda = '';
    this.pageIndex = 1;
  }

  get documentosFiltrados(): Documento[] {
    const term = (this.busqueda ?? '').trim().toLowerCase();
    const base = this.documentos ?? [];

    if (!term) return base;

    return base.filter(d => {
      const id = String((d as any).idMatrizDocumento ?? '').toLowerCase();
      const nombre = String((d as any).nombre ?? '').toLowerCase();
      const codigo = String((d as any).codigo ?? '').toLowerCase();

      return id.includes(term) || nombre.includes(term) || codigo.includes(term);
    });
  }

  get totalFiltrados(): number {
    return this.documentosFiltrados.length;
  }

  get totalPaginas(): number {
    const total = this.totalFiltrados;
    return Math.max(1, Math.ceil(total / this.pageSize));
  }

  get documentosPagina(): Documento[] {
    const start = (this.pageIndex - 1) * this.pageSize;
    return this.documentosFiltrados.slice(start, start + this.pageSize);
  }

  setPageSize(value: number) {
    this.pageSize = Number(value) || 20;
    this.pageIndex = 1;
  }

  irAPagina(p: number) {
    const total = this.totalPaginas;
    const next = Math.min(Math.max(1, p), total);
    this.pageIndex = next;
  }

  anterior() {
    this.irAPagina(this.pageIndex - 1);
  }

  siguiente() {
    this.irAPagina(this.pageIndex + 1);
  }

  get paginasVisibles(): number[] {
    const total = this.totalPaginas;
    const current = this.pageIndex;
    const max = 7;

    if (total <= max) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + (max - 1));
    start = Math.max(1, end - (max - 1));

    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }
}
