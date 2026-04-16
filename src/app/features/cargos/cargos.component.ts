import {
  Component,
  ElementRef,
  HostListener,
  OnInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ApiDocumentalService } from '../../services/api-documental.service';
import { AuthService } from '../../auth/auth.service';
import { PERMISOS } from '../../auth/permisos';


import { ModalAsignarUsuariosComponent } from './modal-asignar-usuarios/modal-asignar-usuarios.component';
import { ModalCopiarCargoComponent } from './modal-copiar-cargo/modal-copiar-cargo.component';

// MODELO NUEVO
type NivelAccesoDto = {
  idMatrizNivelAcceso: number;
  nombre?: string;
};

type CargoDto = {
  idCargo: number;
  nombre: string;
  descripcion?: string;
  matrizNivelAcceso?: NivelAccesoDto;
};

type CrearCargoForm = {
  nombre: string;
  descripcion: string;
  idNivelAcceso: number;
};

@Component({
  selector: 'app-cargos',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalAsignarUsuariosComponent, ModalCopiarCargoComponent],
  templateUrl: './cargos.component.html',
})
export class CargosComponent implements OnInit {
  menuAbierto = false;

  cargos: CargoDto[] = [];
  nivelesAcceso: NivelAccesoDto[] = [];

  cargando = false;
  errorMsg: string | null = null;

  creando = false;
  guardando = false;

  form: CrearCargoForm = {
    nombre: '',
    descripcion: '',
    idNivelAcceso: 1,
  };

  busqueda = '';
  pageSize = 20;
  pageSizeOptions = [10, 20, 50, 100];
  pageIndex = 1;

  mostrarModalUsuarios = false;
  cargoSeleccionado: CargoDto | null = null;

  mostrarModalCopiar = false;

  constructor(
    private api: ApiDocumentalService,
    public auth: AuthService,
    private router: Router,
    private elementRef: ElementRef,
  ) {}

  ngOnInit(): void {
    this.cargarNivelesAcceso();
    this.cargarCargos();
  }

  logout() {
    (this.auth as any)?.logout?.();
    this.router.navigate(['/login']);
  }

  // CARGA CARGOS
  cargarCargos() {
    this.cargando = true;
    this.errorMsg = null;

    this.api.listarCargos().subscribe({
      next: (data) => {
        this.cargos = (data ?? []) as CargoDto[];
        this.cargando = false;
        this.pageIndex = 1;
      },
      error: () => {
        this.errorMsg = 'No se pudieron cargar los cargos.';
        this.cargando = false;
      }
    });
  }

  // CARGA NIVELES
  cargarNivelesAcceso() {
    this.api.listarNivelesAcceso().subscribe({
      next: (data) => {
        this.nivelesAcceso = (data ?? []) as NivelAccesoDto[];

        if (!this.form.idNivelAcceso && this.nivelesAcceso.length > 0) {
          this.form.idNivelAcceso = this.nivelesAcceso[0].idMatrizNivelAcceso;
        }
      },
      error: () => {
        this.errorMsg = 'No se pudieron cargar los niveles de acceso.';
      }
    });
  }

  toggleCrear() {
    this.creando = !this.creando;
    this.errorMsg = null;

    if (!this.creando) {
      this.resetForm();
    }
  }

  resetForm() {
    this.form = {
      nombre: '',
      descripcion: '',
      idNivelAcceso: this.form.idNivelAcceso || 1,
    };
  }

  crearCargo() {
    if (this.guardando) return;

    if (!this.form.nombre?.trim()) {
      this.errorMsg = 'El nombre del cargo es obligatorio.';
      return;
    }
    if (!this.form.idNivelAcceso || this.form.idNivelAcceso <= 0) {
      this.errorMsg = 'Debe seleccionar un nivel de acceso.';
      return;
    }

    this.guardando = true;
    this.errorMsg = null;

    const payload = {
      nombre: this.form.nombre.trim(),
      descripcion: this.form.descripcion?.trim() || undefined,
      idNivelAcceso: this.form.idNivelAcceso,
    };

    this.api.crearCargo(payload).subscribe({
      next: () => {
        this.guardando = false;
        this.creando = false;
        this.resetForm();
        this.cargarCargos();
      },
      error: () => {
        this.guardando = false;
        this.errorMsg = 'No se pudo crear el cargo.';
      }
    });
  }

  abrirCopiarCargo() {
    this.errorMsg = null;
    this.mostrarModalCopiar = true;
  }

  cerrarModalCopiar() {
    this.mostrarModalCopiar = false;
  }

  onCargoCopiado() {
    this.mostrarModalCopiar = false;
    this.cargarCargos();
  }

  inactivarCargoFake(c: CargoDto) {
    console.log('Inactivar (pendiente backend/BD):', c.idCargo);
  }

  onChangeBusqueda() {
    this.pageIndex = 1;
  }

  limpiarBusqueda() {
    this.busqueda = '';
    this.pageIndex = 1;
  }

  get cargosFiltrados(): CargoDto[] {
    const term = (this.busqueda ?? '').trim().toLowerCase();
    const base = this.cargos ?? [];
    if (!term) return base;

    return base.filter(c => {
      const id = String(c.idCargo ?? '').toLowerCase();
      const nombre = String(c.nombre ?? '').toLowerCase();
      const desc = String(c.descripcion ?? '').toLowerCase();
      return id.includes(term) || nombre.includes(term) || desc.includes(term);
    });
  }

  get totalFiltrados(): number {
    return this.cargosFiltrados.length;
  }

  get totalPaginas(): number {
    const total = this.totalFiltrados;
    return Math.max(1, Math.ceil(total / this.pageSize));
  }

  get cargosPagina(): CargoDto[] {
    const start = (this.pageIndex - 1) * this.pageSize;
    return this.cargosFiltrados.slice(start, start + this.pageSize);
  }

  setPageSize(value: number) {
    this.pageSize = Number(value) || 20;
    this.pageIndex = 1;
  }

  irAPagina(p: number) {
    const total = this.totalPaginas;
    this.pageIndex = Math.min(Math.max(1, p), total);
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

  abrirAsignarUsuarios(c: CargoDto) {
    this.cargoSeleccionado = c;
    this.mostrarModalUsuarios = true;
  }

  cerrarModalUsuarios() {
    this.mostrarModalUsuarios = false;
    this.cargoSeleccionado = null;
  }

  onUsuariosAsignados() {
    this.cerrarModalUsuarios();
  }

  get puedeCrear(): boolean {
    //return this.auth.hasPermiso('apps.gestiondoc.crear');
    return this.auth.hasPermiso(PERMISOS.PERM_CARGOS.CREAR);
  }

}
