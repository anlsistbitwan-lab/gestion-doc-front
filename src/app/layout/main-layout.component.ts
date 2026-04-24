import { Component, ElementRef, HostListener, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterOutlet, ActivatedRoute, NavigationEnd } from '@angular/router';
import { filter, Subscription } from 'rxjs';
import { AuthService } from '../auth/auth.service'; // ajusta ruta si tu auth está en otro nivel
import { PERMISOS } from '../auth/permisos';

type LayoutTitle = { small: string; large: string };

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  templateUrl: './main-layout.component.html',
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  menuAbierto = false;

  titulo: LayoutTitle = {
    small: 'Gestión Documental',
    large: 'Gestión Documental',
  };

  private sub?: Subscription;

  constructor(
    public auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private elementRef: ElementRef,
  ) {}

  ngOnInit(): void {
    // Set título al iniciar y en cada navegación
    this.actualizarTituloDesdeRuta();

    this.sub = this.router.events
      .pipe(filter(e => e instanceof NavigationEnd))
      .subscribe(() => this.actualizarTituloDesdeRuta());
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  // ==========================
  // MENU
  // ==========================
  toggleMenu() {
    this.menuAbierto = !this.menuAbierto;
  }

  cerrarMenu() {
    this.menuAbierto = false;
  }

  ir(ruta: string) {
    this.cerrarMenu();
    this.router.navigate([ruta]);
  }

  logout() {
    this.auth.logout();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    if (!this.menuAbierto) return;

    const clickedInside = this.elementRef.nativeElement.contains(event.target);
    if (!clickedInside) this.menuAbierto = false;
  }

  // ==========================
  // TITULO DINÁMICO POR RUTA
  // ==========================
  private actualizarTituloDesdeRuta() {
    // buscamos la ruta más profunda activa
    let r = this.route;
    while (r.firstChild) r = r.firstChild;

    const data = r.snapshot.data as any;

    const small = String(data?.titleSmall ?? data?.title ?? 'Gestión Documental');
    const large = String(data?.titleLarge ?? data?.title ?? 'Gestión Documental');

    this.titulo = { small, large };
  }

  // helper visual
  get sesionActivaTexto(): string {
    return this.auth.getPermisos().length > 0 ? 'Sesión activa' : '';
  }

  // permisos
  get puedeVerMatriz(): boolean {
    // return this.auth.hasPermiso('apps.gestiondoc.matriz_doc'); // real
    return this.auth.hasPermiso(PERMISOS.PERM_MATRIZ.VER); // temporal
  }

  get puedeVerDocumentos(): boolean {
    return this.auth.hasPermiso(PERMISOS.PERM_DOCUMENTOS.VER);
  }

  get puedeVerTitulosH(): boolean {
    return this.auth.hasPermiso(PERMISOS.PERM_TITULOS_H.VER);
  }

  get puedeVerTitulosV(): boolean {
    return this.auth.hasPermiso(PERMISOS.PERM_TITULOS_V.VER);
  }

  get puedeVerCargos(): boolean {
    return this.auth.hasPermiso(PERMISOS.PERM_CARGOS.VER);
  }

  get puedeVerCeldas(): boolean {
    return this.auth.hasPermiso(PERMISOS.PERM_CELDAS.VER);
  }
}
