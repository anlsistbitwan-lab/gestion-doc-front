import { Routes } from '@angular/router';
import { authGuard } from './security/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'matriz' },

  {
    path: 'login',
    loadComponent: () => import('./auth/login/login.component').then((m) => m.LoginComponent),
  },

  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      {
        path: 'matriz',
        loadComponent: () =>
          import('./features/matriz/matriz.component').then((m) => m.MatrizComponent),
        data: { titleSmall: 'Matriz', titleLarge: 'Matriz Servicios vs Procesos' },
      },
      {
        path: 'documentos',
        loadComponent: () =>
          import('./features/documentos/documentos.component').then((m) => m.DocumentosComponent),
        data: { titleSmall: 'Documentos', titleLarge: 'Maestro de Documentos' },
      },
      {
        path: 'titulos-h',
        loadComponent: () =>
          import('./features/titulo-h/titulo-h.component').then((m) => m.TituloHComponent),
        data: { titleSmall: 'Títulos H', titleLarge: 'Crear filas (Títulos Horizontales)' },
      },
      {
        path: 'titulos-v',
        loadComponent: () =>
          import('./features/titulo-v/titulo-v.component').then((m) => m.TituloVComponent),
        data: { titleSmall: 'Títulos V', titleLarge: 'Crear columnas (Títulos Verticales)' },
      },
      {
        path: 'cargos',
        loadComponent: () =>
          import('./features/cargos/cargos.component').then((m) => m.CargosComponent),
        data: { titleSmall: 'Cargos', titleLarge: 'Gestión de Cargos' },
      },
      {
        path: 'crear-celdas',
        loadComponent: () =>
          import('./features/crear-celdas/crear-celdas.component').then((m) => m.CrearCeldasComponent),
        data: { titleSmall: 'Celdas', titleLarge: 'Crear Celdas' },
      },
    ],
  },

  { path: '**', redirectTo: 'matriz' },
];
