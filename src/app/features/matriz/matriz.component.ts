import { Component, HostListener, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

import { ApiDocumentalService } from '../../services/api-documental.service';
import { MatrizResponse, TituloH, TituloV, MatrizDoc, Canal } from '../../models/matriz.model';
import { ModalDocumentosComponent } from '../modal-documentos/modal-documentos';
import { AuthService } from '../../auth/auth.service';
import { PERMISOS } from '../../auth/permisos';

type GrupoColumnas = {
  tituloH: TituloH;
  canales: Canal[];
};

type SubColumna = {
  tituloH: TituloH;
  canal: Canal;
};

@Component({
  selector: 'app-matriz',
  standalone: true,
  imports: [CommonModule, ModalDocumentosComponent],
  templateUrl: './matriz.component.html'
})
export class MatrizComponent implements OnInit {

  filas: TituloV[] = [];
  columnas: TituloH[] = [];
  canales: Canal[] = [];
  celdas: MatrizDoc[] = [];

  // Header en 2 niveles (original)
  gruposColumnas: GrupoColumnas[] = [];
  subColumnas: SubColumna[] = [];
  totalSubColumnas = 0;

  // Header/filas VISIBLES (nuevo)
  gruposColumnasVisibles: GrupoColumnas[] = [];
  subColumnasVisibles: SubColumna[] = [];
  filasVisibles: TituloV[] = [];
  totalSubColumnasVisibles = 0;

  mostrarModal = false;
  celdaSeleccionada: MatrizDoc | null = null;
  menuAbierto = false;

  // ACCESOS

  accesos = new Set<number>();
  cargandoAccesos = false;

  // índice rápido de celdas (evita .find en cada celda)
  private celdaIndex = new Map<string, MatrizDoc>();

  //validar superusuario
  esSuperUsuario = false;

  constructor(
    private api: ApiDocumentalService,
    public auth: AuthService,
    private router: Router,
  ) {}

  ngOnInit() {
    //this.esSuperUsuario = this.auth.hasPermiso('apps.gestiondoc.MatrizFullAccess');
    this.esSuperUsuario = this.auth.hasPermiso(PERMISOS.PERM_MATRIZ.FULL_ACCESS);

    this.api.obtenerMatriz().subscribe((res: MatrizResponse) => {
      this.filas = res.filas ?? [];
      this.columnas = res.columnas ?? [];
      this.canales = res.canales ?? [];
      this.celdas = res.celdas ?? [];

      // construir header completo (sin filtro)
      const { grupos, subCols, total } = this.construirHeader2Niveles();
      this.gruposColumnas = grupos;
      this.subColumnas = subCols;
      this.totalSubColumnas = total;

      // construir índice rápido de celdas
      this.construirIndiceCeldas();

      // por defecto, antes de accesos, mostramos todo (para no romper render)
      // luego de cargar accesos, filtramos visualmente
      this.gruposColumnasVisibles = this.gruposColumnas;
      this.subColumnasVisibles = this.subColumnas;
      this.totalSubColumnasVisibles = this.totalSubColumnas;
      this.filasVisibles = this.filas;

      // cargar accesos y aplicar filtro visual
      this.cargarAccesos();
    });
  }

  // ACCESOS helpers

  private getIdUsuarioSesion(): number {
    const raw = localStorage.getItem('idusuario');
    const id = raw ? Number(raw) : 0;
    return Number.isFinite(id) ? id : 0;
  }

  private cargarAccesos() {
    const idUsuario = this.getIdUsuarioSesion();

    // Si no hay sesión, no hay acceso => ocultar todo
    if (!idUsuario) {
      this.accesos = new Set<number>();
      this.aplicarFiltrosVisibilidad();
      return;
    }

    this.cargandoAccesos = true;

    // Backend: GET /matriz/accesos/usuario/:idUsuario
    this.api.obtenerAccesosUsuario(idUsuario).subscribe({
      next: (ids) => {
        this.accesos = new Set((ids ?? []).map(Number).filter(n => Number.isFinite(n)));
        this.cargandoAccesos = false;

        // aplicar filtro visual una vez cargado
        this.aplicarFiltrosVisibilidad();
      },
      error: () => {
        // por seguridad, bloqueamos todo si falla
        this.accesos = new Set<number>();
        this.cargandoAccesos = false;

        // aplicar filtro visual (quedará vacío)
        this.aplicarFiltrosVisibilidad();
      }
    });
  }

  private tieneAccesoMatriz(idmatriz: number): boolean {
    if (this.esSuperUsuario) return true;
    return this.accesos.has(Number(idmatriz));
  }

  private mostrarSinAcceso() {
    alert('No tienes acceso a esta sección.');
  }

  // opcional para usar desde HTML
  celdaTieneAcceso(celda: MatrizDoc | null): boolean {
    const idmatriz = Number(celda?.idMatrizConfiguracion ?? 0);
    if (!idmatriz) return false;
    return this.tieneAccesoMatriz(idmatriz);
  }

  // CONSTRUCCIÓN HEADER

  private construirHeader2Niveles() {
    const map = new Map<number, { tituloH: TituloH; canales: Map<number, Canal> }>();

    for (const celda of this.celdas) {
      const th = celda.tituloH;
      const ca = celda.canal;
      if (!th || !ca) continue;

      const idH = th.idMatrizTituloH;
      const idC = ca.idMatrizCanal;

      if (!map.has(idH)) {
        map.set(idH, { tituloH: th, canales: new Map<number, Canal>() });
      }

      map.get(idH)!.canales.set(idC, ca);
    }

    const ordenProcesos = new Map<number, number>();
    this.columnas.forEach((c, idx) => {
      ordenProcesos.set(c.idMatrizTituloH, idx);
    });

    const grupos = Array.from(map.values())
      .sort((a, b) => {
        const oa = ordenProcesos.get(a.tituloH.idMatrizTituloH) ?? 9999;
        const ob = ordenProcesos.get(b.tituloH.idMatrizTituloH) ?? 9999;
        return oa - ob;
      })
      .map(g => ({
        tituloH: g.tituloH,
        canales: Array.from(g.canales.values()),
      }));

    const subCols: SubColumna[] = [];
    for (const g of grupos) {
      for (const canal of g.canales) {
        subCols.push({ tituloH: g.tituloH, canal });
      }
    }

    return { grupos, subCols, total: subCols.length };
  }

  // ÍNDICE + FILTRO VISUAL POR ACCESO

  private keyCelda(idV: number, idH: number, idC: number): string {
    return `${idV}-${idH}-${idC}`;
  }

  private keySubCol(idH: number, idC: number): string {
    return `${idH}-${idC}`;
  }

  private construirIndiceCeldas() {
    this.celdaIndex.clear();

    for (const c of this.celdas) {
      const idV = c.tituloV?.idMatrizTituloV ?? 0;
      const idH = c.tituloH?.idMatrizTituloH ?? 0;
      const idC = c.canal?.idMatrizCanal ?? 0;

      if (!idV || !idH || !idC) continue;

      this.celdaIndex.set(this.keyCelda(idV, idH, idC), c);
    }
  }

  /**
   * Reglas:
   * - subcolumna (tituloH + canal) visible si existe AL MENOS 1 celda con acceso en cualquier fila
   * - fila (tituloV) visible si existe AL MENOS 1 celda con acceso en cualquier subcolumna visible
   */
  private aplicarFiltrosVisibilidad() {
    // SUPER USER VE TODO
    if (this.esSuperUsuario) {
      this.gruposColumnasVisibles = this.gruposColumnas;
      this.subColumnasVisibles = this.subColumnas;
      this.totalSubColumnasVisibles = this.totalSubColumnas;
      this.filasVisibles = this.filas;
      return;
    }

    const subVisibles = new Set<string>();

    for (const c of this.celdas) {
      const idM = Number(c.idMatrizConfiguracion ?? 0);
      if (!idM || !this.tieneAccesoMatriz(idM)) continue;

      const idH = c.tituloH?.idMatrizTituloH ?? 0;
      const idC = c.canal?.idMatrizCanal ?? 0;

      if (!idH || !idC) continue;

      subVisibles.add(this.keySubCol(idH, idC));
    }

    const subColumnasVisibles = this.subColumnas.filter(sub =>
      subVisibles.has(this.keySubCol(
        sub.tituloH.idMatrizTituloH,
        sub.canal.idMatrizCanal
      ))
    );

    const gruposVisibles = this.gruposColumnas
      .map(g => ({
        tituloH: g.tituloH,
        canales: g.canales.filter(ca =>
          subVisibles.has(this.keySubCol(
            g.tituloH.idMatrizTituloH,
            ca.idMatrizCanal
          ))
        ),
      }))
      .filter(g => g.canales.length > 0);

    const filasVisiblesIds = new Set<number>();

    for (const c of this.celdas) {
      const idM = Number(c.idMatrizConfiguracion ?? 0);
      if (!idM || !this.tieneAccesoMatriz(idM)) continue;

      const idV = c.tituloV?.idMatrizTituloV ?? 0;
      const idH = c.tituloH?.idMatrizTituloH ?? 0;
      const idC = c.canal?.idMatrizCanal ?? 0;

      if (!idV || !idH || !idC) continue;

      if (!subVisibles.has(this.keySubCol(idH, idC))) continue;

      filasVisiblesIds.add(idV);
    }

    const filasVisibles = this.filas.filter(f =>
      filasVisiblesIds.has(f.idMatrizTituloV)
    );

    this.gruposColumnasVisibles = gruposVisibles;
    this.subColumnasVisibles = subColumnasVisibles;
    this.totalSubColumnasVisibles = subColumnasVisibles.length;
    this.filasVisibles = filasVisibles;
  }

  // APERTURAS con validación

  abrirModal(celda: MatrizDoc) {
    const idmatriz = Number(celda?.idMatrizConfiguracion ?? 0);

    if (!idmatriz || !this.tieneAccesoMatriz(idmatriz)) {
      this.mostrarSinAcceso();
      return;
    }

    this.celdaSeleccionada = celda;
    this.mostrarModal = true;
  }

  abrirModalColumna(sub: SubColumna) {
    this.api.obtenerMatrizColumna(sub.tituloH.idMatrizTituloH, sub.canal.idMatrizCanal).subscribe({
      next: (md) => {
        const idmatriz = Number(md?.idMatrizConfiguracion ?? 0);

        if (!idmatriz || !this.tieneAccesoMatriz(idmatriz)) {
          this.mostrarSinAcceso();
          return;
        }

        this.celdaSeleccionada = md;
        this.mostrarModal = true;
      },
      error: () => {
        console.error('No se pudo obtener la matriz de columna (titulo_h + canal)');
      }
    });
  }

  abrirModalFila(fila: TituloV) {
    const canalTodos = this.canales.find(c => (c.nombre || '').toLowerCase() === 'todos');

    if (!canalTodos) {
      console.error('No existe canal "Todos" en catálogo de canales');
      return;
    }

    this.api.obtenerMatrizFila(fila.idMatrizTituloV, canalTodos.idMatrizCanal).subscribe({
      next: (md) => {
        const idmatriz = Number(md?.idMatrizConfiguracion ?? 0);

        if (!idmatriz || !this.tieneAccesoMatriz(idmatriz)) {
          this.mostrarSinAcceso();
          return;
        }

        this.celdaSeleccionada = md;
        this.mostrarModal = true;
      },
      error: () => {
        console.error('No se pudo obtener la matriz de fila (titulo_v + canal)');
      }
    });
  }

  abrirModalTituloH(tituloH: TituloH) {
    this.abrirModalTituloH_SinValidar(tituloH);
  }

  private abrirModalTituloH_SinValidar(tituloH: TituloH) {
    const tituloVPlaceholder: TituloV = { id: 0, nombre: 'Proceso' } as any;
    const canalPlaceholder: Canal = { id: 0, nombre: 'Todos' } as any;

    this.celdaSeleccionada = {
      idMatrizConfiguracion: 0,
      tituloH,
      tituloV: tituloVPlaceholder,
      canal: canalPlaceholder,
    } as MatrizDoc;

    this.mostrarModal = true;
  }

  cerrarModal() {
    this.mostrarModal = false;
    this.celdaSeleccionada = null;
  }

  getCelda(fila: TituloV, sub: SubColumna): MatrizDoc | null {
    const key = this.keyCelda(
      fila.idMatrizTituloV,
      sub.tituloH.idMatrizTituloH,
      sub.canal.idMatrizCanal
    );
    return this.celdaIndex.get(key) ?? null;
  }

  logout() {
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
