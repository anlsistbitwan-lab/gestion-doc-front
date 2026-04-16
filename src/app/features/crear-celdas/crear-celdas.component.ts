import { Component, ElementRef, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ApiDocumentalService } from '../../services/api-documental.service';
import { AuthService } from '../../auth/auth.service';
import { PERMISOS } from '../../auth/permisos';

type TituloItem = { id: number; nombre?: string };
type CanalItem = { id: number; nombre?: string };

type CeldaRow = {
  idmatriz: number;
  idtitulo_h: number;
  titulo_h: string;
  idtitulo_v: number;
  titulo_v: string;
  idCanal: number;
  canal: string;
};

@Component({
  selector: 'app-crear-celdas',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './crear-celdas.component.html',
})
export class CrearCeldasComponent implements OnInit {
  // Header + drawer
  menuAbierto = false;

  // Estado
  cargando = false;
  errorMsg: string | null = null;

  // Listado
  celdas: CeldaRow[] = [];

  // Buscador + paginación
  busqueda = '';
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  pageIndex = 1;

  // Crear
  creando = false;
  guardando = false;

  titulosH: TituloItem[] = [];
  titulosV: TituloItem[] = [];
  canales: CanalItem[] = [];

  // Combobox H
  termH = '';
  dropdownH = false;
  selectedH: TituloItem | null = null;

  // Combobox V
  termV = '';
  dropdownV = false;
  selectedV: TituloItem | null = null;

  // Multi canal
  canalesSeleccionados = new Set<number>();

  constructor(
    private api: ApiDocumentalService,
    public auth: AuthService,
    private router: Router,
    private elementRef: ElementRef,
  ) {}

  ngOnInit(): void {
    this.cargarPantalla();
  }

  logout() {
    (this.auth as any)?.logout?.();
    this.router.navigate(['/login']);
  }

  @HostListener('document:click', ['$event'])
  onDocClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target?.closest?.('[data-dd="h"]')) this.dropdownH = false;
    if (!target?.closest?.('[data-dd="v"]')) this.dropdownV = false;
  }

  // CARGA
  async cargarPantalla() {
    this.cargando = true;
    this.errorMsg = null;

    try {
      const [th, tv, matriz, celdasPlano] = await Promise.all([
        firstValueFrom(this.api.listarTitulosH()),
        firstValueFrom(this.api.listarTitulosV()),
        firstValueFrom(this.api.obtenerMatriz()),
        firstValueFrom(this.api.listarCeldasPlano()),
      ]);

      // títulos
      this.titulosH = (th ?? []).map((x: any) => ({ id: Number(x.idMatrizTituloH), nombre: x.nombre }));
      this.titulosV = (tv ?? []).map((x: any) => ({ id: Number(x.idMatrizTituloV), nombre: x.nombre }));

      // canales desde GET /matriz (service backend lo devuelve)
      this.canales = ((matriz as any)?.canales ?? []).map((c: any) => ({
        id: Number(c.idMatrizCanal),
        nombre: c.nombre,
      }));

      // listado plano
      this.celdas = (celdasPlano ?? []) as any;

      this.pageIndex = 1;
      this.cargando = false;
    } catch {
      this.errorMsg = 'No se pudo cargar la información de crear celdas.';
      this.cargando = false;
    }
  }

  // LISTADO + PAGINACIÓN
  onChangeBusqueda() { this.pageIndex = 1; }
  limpiarBusqueda() { this.busqueda = ''; this.pageIndex = 1; }

  get celdasFiltradas(): CeldaRow[] {
    const term = (this.busqueda ?? '').trim().toLowerCase();
    if (!term) return this.celdas ?? [];

    return (this.celdas ?? []).filter(c => {
      const id = String(c.idmatriz ?? '').toLowerCase();
      const h = String(c.titulo_h ?? '').toLowerCase();
      const v = String(c.titulo_v ?? '').toLowerCase();
      const canal = String(c.canal ?? '').toLowerCase();
      return id.includes(term) || h.includes(term) || v.includes(term) || canal.includes(term);
    });
  }

  get totalFiltrados() { return this.celdasFiltradas.length; }
  get totalPaginas() { return Math.max(1, Math.ceil(this.totalFiltrados / this.pageSize)); }

  get celdasPagina(): CeldaRow[] {
    const start = (this.pageIndex - 1) * this.pageSize;
    return this.celdasFiltradas.slice(start, start + this.pageSize);
  }

  setPageSize(v: number) { this.pageSize = Number(v) || 20; this.pageIndex = 1; }
  irAPagina(p: number) { this.pageIndex = Math.min(Math.max(1, p), this.totalPaginas); }
  anterior() { this.irAPagina(this.pageIndex - 1); }
  siguiente() { this.irAPagina(this.pageIndex + 1); }

  get paginasVisibles(): number[] {
    const total = this.totalPaginas;
    const current = this.pageIndex;
    const max = 7;

    if (total <= max) return Array.from({ length: total }, (_, i) => i + 1);

    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + (max - 1));
    start = Math.max(1, end - (max - 1));

    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  // CREAR UI
  toggleCrear() {
    this.creando = !this.creando;
    this.errorMsg = null;
    if (!this.creando) this.resetCrear();
  }

  resetCrear() {
    this.termH = '';
    this.termV = '';
    this.dropdownH = false;
    this.dropdownV = false;
    this.selectedH = null;
    this.selectedV = null;
    this.canalesSeleccionados.clear();
  }

  // Combobox H
  openH() { this.dropdownH = true; }
  setH(it: TituloItem) { this.selectedH = it; this.termH = it.nombre ?? ''; this.dropdownH = false; }

  get titulosHFiltrados(): TituloItem[] {
    const t = (this.termH ?? '').trim().toLowerCase();
    const base = this.titulosH ?? [];
    if (!t) return base.slice(0, 20);
    return base.filter(x => String(x?.nombre ?? '').toLowerCase().includes(t)).slice(0, 20);
  }

  // Combobox V
  openV() { this.dropdownV = true; }
  setV(it: TituloItem) { this.selectedV = it; this.termV = it.nombre ?? ''; this.dropdownV = false; }

  get titulosVFiltrados(): TituloItem[] {
    const t = (this.termV ?? '').trim().toLowerCase();
    const base = this.titulosV ?? [];
    if (!t) return base.slice(0, 20);
    return base.filter(x => String(x?.nombre ?? '').toLowerCase().includes(t)).slice(0, 20);
  }

  // Canales multi
  toggleCanal(id: number) {
    if (this.canalesSeleccionados.has(id)) this.canalesSeleccionados.delete(id);
    else this.canalesSeleccionados.add(id);
  }

  crearCeldas() {
    if (this.guardando) return;

    if (!this.selectedH?.id) { this.errorMsg = 'Debes seleccionar un Título H.'; return; }
    if (!this.selectedV?.id) { this.errorMsg = 'Debes seleccionar un Título V.'; return; }

    const idCanales = Array.from(this.canalesSeleccionados.values());
    if (!idCanales.length) { this.errorMsg = 'Selecciona al menos un canal.'; return; }

    this.guardando = true;
    this.errorMsg = null;

    // bulk: 1 request
    this.api.crearCeldasBulk({
      idtitulo_h: this.selectedH.id,
      idtitulo_v: this.selectedV.id,
      idCanales,
    }).subscribe({
      next: () => {
        this.guardando = false;
        this.creando = false;
        this.resetCrear();
        this.cargarPantalla();
      },
      error: () => {
        this.guardando = false;
        this.errorMsg = 'No se pudieron crear las celdas.';
      },
    });
  }

  get puedeCrearCeldas(): boolean {
    //return this.auth.hasPermiso('apps.gestiondoc.crear');
    return this.auth.hasPermiso(PERMISOS.PERM_CELDAS.CREAR);
  }

}
