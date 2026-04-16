import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiDocumentalService } from '../../../services/api-documental.service';

type CargoDto = {
  idCargo: number;
  nombre: string;
  descripcion?: string;
};

type UsuarioDto = {
  idUsuario: number;
  alias: string;
  idCargo?: number | null;
};

@Component({
  selector: 'app-modal-asignar-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-asignar-usuarios.component.html',
})
export class ModalAsignarUsuariosComponent implements OnInit {
  @Input() cargo!: CargoDto;

  @Output() cerrar = new EventEmitter<void>();
  @Output() asignados = new EventEmitter<void>();

  usuarios: UsuarioDto[] = [];
  cargando = false;
  errorMsg: string | null = null;

  // búsqueda + paginación
  busqueda = '';
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  pageIndex = 1;

  // selección
  seleccion = new Set<number>();
  seleccionandoTodoPagina = false;

  // guardar
  guardando = false;

  constructor(private api: ApiDocumentalService) {}

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cerrarModal() {
    this.cerrar.emit();
  }

  cargarUsuarios() {
    this.cargando = true;
    this.errorMsg = null;

    this.api.listarUsuarios().subscribe({
      next: (data) => {
        this.usuarios = (data ?? []) as UsuarioDto[];
        this.cargando = false;
        this.pageIndex = 1;
        this.seleccion.clear();
      },
      error: () => {
        this.cargando = false;
        this.errorMsg = 'No se pudieron cargar los usuarios.';
      }
    });
  }

  // ==========================
  // ✅ BUSCADOR + PAGINACIÓN
  // ==========================
  onChangeBusqueda() {
    this.pageIndex = 1;
    this.seleccionandoTodoPagina = false;
  }

  limpiarBusqueda() {
    this.busqueda = '';
    this.pageIndex = 1;
    this.seleccionandoTodoPagina = false;
  }

  get usuariosFiltrados(): UsuarioDto[] {
    const term = (this.busqueda ?? '').trim().toLowerCase();
    const base = this.usuarios ?? [];
    if (!term) return base;

    return base.filter(u => {
      const id = String(u.idUsuario ?? '').toLowerCase();
      const alias = String(u.alias ?? '').toLowerCase();
      return id.includes(term) || alias.includes(term);
    });
  }

  get totalFiltrados(): number {
    return this.usuariosFiltrados.length;
  }

  get totalPaginas(): number {
    const total = this.totalFiltrados;
    return Math.max(1, Math.ceil(total / this.pageSize));
  }

  get usuariosPagina(): UsuarioDto[] {
    const start = (this.pageIndex - 1) * this.pageSize;
    return this.usuariosFiltrados.slice(start, start + this.pageSize);
  }

  setPageSize(value: number) {
    this.pageSize = Number(value) || 20;
    this.pageIndex = 1;
    this.seleccionandoTodoPagina = false;
  }

  irAPagina(p: number) {
    const total = this.totalPaginas;
    this.pageIndex = Math.min(Math.max(1, p), total);
    this.seleccionandoTodoPagina = false;
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

    if (total <= max) return Array.from({ length: total }, (_, i) => i + 1);

    let start = Math.max(1, current - 2);
    let end = Math.min(total, start + (max - 1));
    start = Math.max(1, end - (max - 1));

    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  // ==========================
  // ✅ SELECCIÓN
  // ==========================
  toggleUsuario(idUsuario: number, checked: boolean) {
    if (checked) this.seleccion.add(idUsuario);
    else this.seleccion.delete(idUsuario);
  }

  esSeleccionado(idUsuario: number): boolean {
    return this.seleccion.has(idUsuario);
  }

  toggleSeleccionarTodoPagina(checked: boolean) {
    this.seleccionandoTodoPagina = checked;
    if (checked) {
      for (const u of this.usuariosPagina) this.seleccion.add(u.idUsuario);
    } else {
      for (const u of this.usuariosPagina) this.seleccion.delete(u.idUsuario);
    }
  }

  get totalSeleccionados(): number {
    return this.seleccion.size;
  }

  // ==========================
  // ✅ ASIGNAR
  // ==========================
  asignarSeleccionados() {
    if (!this.cargo?.idCargo) return;
    if (this.guardando) return;

    const idsUsuarios = Array.from(this.seleccion);
    if (idsUsuarios.length === 0) {
      this.errorMsg = 'Selecciona al menos un usuario.';
      return;
    }

    this.guardando = true;
    this.errorMsg = null;

    this.api.asignarUsuariosACargo(this.cargo.idCargo, idsUsuarios).subscribe({
      next: () => {
        this.guardando = false;
        this.asignados.emit();
      },
      error: () => {
        this.guardando = false;
        this.errorMsg = 'No se pudo asignar el cargo a los usuarios.';
      }
    });
  }
}
