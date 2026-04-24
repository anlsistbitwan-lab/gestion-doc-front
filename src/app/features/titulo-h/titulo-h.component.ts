import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiDocumentalService } from '../../services/api-documental.service';
import { TituloHConTipo } from '../../models/matriz.model';
import { AuthService } from '../../auth/auth.service';
import { PERMISOS } from '../../auth/permisos';

type CrearTituloHForm = {
  idtipo_titulo_h: number;
  nombre: string;
};

type TituloHUI = TituloHConTipo & { inactivoUI?: boolean };
type TipoTituloHDto = { idtipo_titulo_h: number; nombre: string };

@Component({
  selector: 'app-titulo-h',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './titulo-h.component.html',
})
export class TituloHComponent implements OnInit {
  items: TituloHUI[] = [];
  cargando = false;
  errorMsg: string | null = null;

  creando = false;
  guardando = false;
  tiposTituloH: TipoTituloHDto[] = [];

  form: CrearTituloHForm = {
    idtipo_titulo_h: 1,
    nombre: '',
  };

  constructor(
    private api: ApiDocumentalService,
    public auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.cargarTiposTituloH();
    this.cargarListado();
  }

  private normalizarTipoTituloH(raw: unknown): TipoTituloHDto | null {
    const o = raw as Record<string, unknown>;
    const id = Number(
      o?.['idtipo_titulo_h'] ?? o?.['idMatrizTipoTituloH'] ?? o?.['id'] ?? 0,
    );
    if (!Number.isFinite(id) || id <= 0) return null;
    return { idtipo_titulo_h: id, nombre: String(o?.['nombre'] ?? '') };
  }

  private cargarTiposTituloH() {
    this.api.listarTiposTituloH().subscribe({
      next: (res) => {
        this.tiposTituloH = (res ?? [])
          .map((r) => this.normalizarTipoTituloH(r))
          .filter((x): x is TipoTituloHDto => x != null);
        if (this.tiposTituloH.length === 0) return;
        const ok = this.tiposTituloH.some((t) => t.idtipo_titulo_h === this.form.idtipo_titulo_h);
        if (!ok) {
          this.form.idtipo_titulo_h = this.tiposTituloH[0].idtipo_titulo_h;
        }
      },
      error: () => {
        this.errorMsg = this.errorMsg || 'No se pudieron cargar los tipos de título H.';
      },
    });
  }

  cargarListado() {
    this.cargando = true;
    this.errorMsg = null;

    this.api.listarTitulosH().subscribe({
      next: (res) => {
        this.items = (res ?? []).map(r => ({ ...r, inactivoUI: false }));
        this.cargando = false;
      },
      error: () => {
        this.errorMsg = 'No se pudieron cargar los títulos H.';
        this.cargando = false;
      }
    });
  }

  toggleCrear() {
    this.creando = !this.creando;
    this.errorMsg = null;

    if (!this.creando) this.resetForm();
  }

  resetForm() {
    this.form = {
      idtipo_titulo_h: 1,
      nombre: '',
    };
  }

  crear() {
    if (this.guardando) return;

    if (!this.form.nombre?.trim()) {
      this.errorMsg = 'El nombre es obligatorio.';
      return;
    }

    this.guardando = true;
    this.errorMsg = null;

    const payload = {
      idtipo_titulo_h: Number(this.form.idtipo_titulo_h),
      nombre: this.form.nombre.trim(),
    };

    this.api.crearTituloH(payload).subscribe({
      next: () => {
        this.guardando = false;
        this.creando = false;
        this.resetForm();
        this.cargarListado();
      },
      error: () => {
        this.guardando = false;
        this.errorMsg = 'No se pudo crear el título H.';
      }
    });
  }

  inactivarFake(item: TituloHUI) {
    item.inactivoUI = !item.inactivoUI;
  }

  get puedeCrear(): boolean {
    //return this.auth.hasPermiso('apps.gestiondoc.ver');
    return this.auth.hasPermiso(PERMISOS.PERM_TITULOS_H.CREAR);
  }
}
