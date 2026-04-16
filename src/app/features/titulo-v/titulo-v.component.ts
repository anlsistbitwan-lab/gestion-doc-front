import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ApiDocumentalService } from '../../services/api-documental.service';
import { TituloVConTipo } from '../../models/matriz.model';
import { AuthService } from '../../auth/auth.service';

type CrearTituloVForm = {
  idtipo_titulo_v: number;
  nombre: string;
};

type TituloVUI = TituloVConTipo & { inactivoUI?: boolean };

@Component({
  selector: 'app-titulo-v',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './titulo-v.component.html',
})
export class TituloVComponent implements OnInit {
  items: TituloVUI[] = [];
  cargando = false;
  errorMsg: string | null = null;

  creando = false;
  guardando = false;

  form: CrearTituloVForm = {
    idtipo_titulo_v: 1,
    nombre: '',
  };

  constructor(
    private api: ApiDocumentalService,
    public auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.cargarListado();
  }

  cargarListado() {
    this.cargando = true;
    this.errorMsg = null;

    this.api.listarTitulosV().subscribe({
      next: (res) => {
        this.items = (res ?? []).map(r => ({ ...r, inactivoUI: false }));
        this.cargando = false;
      },
      error: () => {
        this.errorMsg = 'No se pudieron cargar los títulos V.';
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
      idtipo_titulo_v: 1,
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
      idtipo_titulo_v: Number(this.form.idtipo_titulo_v),
      nombre: this.form.nombre.trim(),
    };

    this.api.crearTituloV(payload).subscribe({
      next: () => {
        this.guardando = false;
        this.creando = false;
        this.resetForm();
        this.cargarListado();
      },
      error: () => {
        this.guardando = false;
        this.errorMsg = 'No se pudo crear el título V.';
      }
    });
  }

  inactivarFake(item: TituloVUI) {
    item.inactivoUI = !item.inactivoUI;
  }

  get puedeCrear(): boolean {
    //return this.auth.hasPermiso('apps.gestiondoc.crear');
    return this.auth.hasPermiso('apps.gestiondoc.ver');
  }
}
