import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiDocumentalService } from '../../../services/api-documental.service';

type CargoDto = {
  idCargo: number;
  nombre: string;
  descripcion?: string;
};

@Component({
  selector: 'app-modal-copiar-cargo',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-copiar-cargo.component.html',
})
export class ModalCopiarCargoComponent implements OnInit {
  @Input() cargosCatalogo: CargoDto[] = [];

  @Output() cerrar = new EventEmitter<void>();
  @Output() copiado = new EventEmitter<void>();

  busquedaCargoOrigen = '';
  dropdownOrigenAbierto = false;
  cargoOrigen: CargoDto | null = null;

  busquedaCargoDestino = '';
  dropdownDestinoAbierto = false;
  cargoDestino: CargoDto | null = null;

  guardando = false;
  errorMsg: string | null = null;

  constructor(
    private api: ApiDocumentalService,
    private elementRef: ElementRef,
  ) {}

  ngOnInit(): void {
    this.dropdownOrigenAbierto = false;
    this.dropdownDestinoAbierto = false;
  }

  cerrarModal() {
    this.cerrar.emit();
  }

  private filtrarCargos(term: string, excluirId?: number): CargoDto[] {
    const t = (term ?? '').trim().toLowerCase();
    const base = this.cargosCatalogo ?? [];
    if (!t) return [];

    return base
      .filter((c) => {
        if (excluirId != null && c.idCargo === excluirId) return false;
        const id = String(c.idCargo ?? '').toLowerCase();
        const nombre = String(c.nombre ?? '').toLowerCase();
        const desc = String(c.descripcion ?? '').toLowerCase();
        return id.includes(t) || nombre.includes(t) || desc.includes(t);
      })
      .slice(0, 12);
  }

  get cargosFiltradosOrigen(): CargoDto[] {
    return this.filtrarCargos(this.busquedaCargoOrigen, this.cargoDestino?.idCargo);
  }

  get cargosFiltradosDestino(): CargoDto[] {
    return this.filtrarCargos(this.busquedaCargoDestino, this.cargoOrigen?.idCargo);
  }

  onFocusBuscadorOrigen() {
    this.dropdownOrigenAbierto = !!this.busquedaCargoOrigen.trim();
  }

  onChangeBuscadorOrigen() {
    const term = this.busquedaCargoOrigen.trim();
    this.dropdownOrigenAbierto = term.length > 0;
    this.cargoOrigen = null;
  }

  onFocusBuscadorDestino() {
    this.dropdownDestinoAbierto = !!this.busquedaCargoDestino.trim();
  }

  onChangeBuscadorDestino() {
    const term = this.busquedaCargoDestino.trim();
    this.dropdownDestinoAbierto = term.length > 0;
    this.cargoDestino = null;
  }

  seleccionarCargoOrigen(c: CargoDto) {
    this.cargoOrigen = c;
    this.busquedaCargoOrigen = `${c.nombre} (ID ${c.idCargo})`;
    this.dropdownOrigenAbierto = false;
    if (this.cargoDestino?.idCargo === c.idCargo) {
      this.limpiarSeleccionDestino();
    }
  }

  seleccionarCargoDestino(c: CargoDto) {
    this.cargoDestino = c;
    this.busquedaCargoDestino = `${c.nombre} (ID ${c.idCargo})`;
    this.dropdownDestinoAbierto = false;
    if (this.cargoOrigen?.idCargo === c.idCargo) {
      this.limpiarSeleccionOrigen();
    }
  }

  limpiarSeleccionOrigen() {
    this.cargoOrigen = null;
    this.busquedaCargoOrigen = '';
    this.dropdownOrigenAbierto = false;
  }

  limpiarSeleccionDestino() {
    this.cargoDestino = null;
    this.busquedaCargoDestino = '';
    this.dropdownDestinoAbierto = false;
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (!this.dropdownOrigenAbierto && !this.dropdownDestinoAbierto) return;

    const target = e.target as Node;
    const root: HTMLElement = this.elementRef.nativeElement;
    if (!root.contains(target)) {
      this.dropdownOrigenAbierto = false;
      this.dropdownDestinoAbierto = false;
      return;
    }

    const el = target as HTMLElement;
    const dentroOrigen = el.closest?.('[data-role="buscador-cargo-origen"]');
    const dentroDest = el.closest?.('[data-role="buscador-cargo-destino"]');
    if (this.dropdownOrigenAbierto && !dentroOrigen) this.dropdownOrigenAbierto = false;
    if (this.dropdownDestinoAbierto && !dentroDest) this.dropdownDestinoAbierto = false;
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEsc(ev: Event) {
    const kev = ev as KeyboardEvent;
    kev.preventDefault();

    if (this.dropdownOrigenAbierto) {
      this.dropdownOrigenAbierto = false;
      return;
    }
    if (this.dropdownDestinoAbierto) {
      this.dropdownDestinoAbierto = false;
      return;
    }

    this.cerrarModal();
  }

  guardarCopia() {
    if (this.guardando) return;

    if (!this.cargoOrigen?.idCargo) {
      this.errorMsg = 'Debes seleccionar el cargo origen.';
      return;
    }
    if (!this.cargoDestino?.idCargo) {
      this.errorMsg = 'Debes seleccionar el cargo destino (ya existente).';
      return;
    }
    if (this.cargoOrigen.idCargo === this.cargoDestino.idCargo) {
      this.errorMsg = 'El cargo origen y el destino no pueden ser el mismo.';
      return;
    }

    this.guardando = true;
    this.errorMsg = null;

    this.api
      .copiarAsignacionesCargos({
        idCargoOrigen: this.cargoOrigen.idCargo,
        idCargoDestino: this.cargoDestino.idCargo,
      })
      .subscribe({
        next: () => {
          this.guardando = false;
          this.copiado.emit();
        },
        error: () => {
          this.guardando = false;
          this.errorMsg = 'No se pudieron copiar las asignaciones.';
        },
      });
  }
}
