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

  // buscador tipo dropdown
  busquedaCargo = '';
  dropdownAbierto = false;

  cargoSeleccionado: CargoDto | null = null;

  // nuevos datos
  nombreNuevo = '';
  descripcionNueva = '';

  guardando = false;
  errorMsg: string | null = null;

  constructor(
    private api: ApiDocumentalService,
    private elementRef: ElementRef,
  ) {}

  ngOnInit(): void {
    // dropdown inicia cerrado (requisito)
    this.dropdownAbierto = false;
  }

  cerrarModal() {
    this.cerrar.emit();
  }

  // ==========================
  // ✅ DROPDOWN (buscador)
  // ==========================
  onFocusBuscador() {
    // solo abre si hay texto
    this.dropdownAbierto = !!this.busquedaCargo.trim();
  }

  onChangeBuscador() {
    // requisito: no abrir si no hay búsqueda
    const term = this.busquedaCargo.trim();
    this.dropdownAbierto = term.length > 0;
    // al escribir, se invalida selección previa (para evitar confusiones)
    this.cargoSeleccionado = null;
  }

  seleccionarCargo(c: CargoDto) {
    this.cargoSeleccionado = c;
    this.busquedaCargo = `${c.nombre} (ID ${c.idCargo})`;
    this.dropdownAbierto = false;
  }

  limpiarSeleccion() {
    this.cargoSeleccionado = null;
    this.busquedaCargo = '';
    this.dropdownAbierto = false;
  }

  get cargosFiltrados(): CargoDto[] {
    const term = (this.busquedaCargo ?? '').trim().toLowerCase();
    const base = this.cargosCatalogo ?? [];

    if (!term) return [];

    return base
      .filter(c => {
        const id = String(c.idCargo ?? '').toLowerCase();
        const nombre = String(c.nombre ?? '').toLowerCase();
        const desc = String(c.descripcion ?? '').toLowerCase();
        return id.includes(term) || nombre.includes(term) || desc.includes(term);
      })
      .slice(0, 12); // UX: lista corta
  }

  // click fuera del dropdown lo cierra
  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (!this.dropdownAbierto) return;

    const target = e.target as any;
    const root: HTMLElement = this.elementRef.nativeElement;
    if (!root.contains(target)) {
      this.dropdownAbierto = false;
      return;
    }

    // si clic fue dentro del modal pero fuera del bloque del buscador (lo marcamos con data-role)
    const el = target as HTMLElement;
    const dentroBuscador = el.closest?.('[data-role="buscador-cargo"]');
    if (!dentroBuscador) this.dropdownAbierto = false;
  }

  // ESC: cierra dropdown; si ya estaba cerrado, cierra modal
  @HostListener('document:keydown.escape', ['$event'])
onEsc(ev: Event) {
  // Angular puede tipar el evento como Event
  const kev = ev as KeyboardEvent;
  kev.preventDefault();

  if (this.dropdownAbierto) {
    this.dropdownAbierto = false;
    return;
  }

  this.cerrarModal();
}


  // ==========================
  // ✅ GUARDAR (copiar)
  // ==========================
  guardarCopia() {
    if (this.guardando) return;

    if (!this.cargoSeleccionado?.idCargo) {
      this.errorMsg = 'Debes seleccionar un cargo para copiar.';
      return;
    }

    if (!this.nombreNuevo?.trim()) {
      this.errorMsg = 'El nombre del cargo nuevo es obligatorio.';
      return;
    }

    this.guardando = true;
    this.errorMsg = null;

    const payload = {
      idCargoOrigen: this.cargoSeleccionado.idCargo,
      nombre: this.nombreNuevo.trim(),
      descripcion: this.descripcionNueva?.trim() || undefined,
    };

    this.api.copiarCargo(payload).subscribe({
      next: () => {
        this.guardando = false;
        this.copiado.emit();
      },
      error: () => {
        this.guardando = false;
        this.errorMsg = 'No se pudo copiar el cargo.';
      },
    });
  }
}
