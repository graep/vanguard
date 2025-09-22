// src/app/app-routing.module.ts
import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },

  // Legacy alias (only if you had old links to /admin-layout)
  { path: 'admin', redirectTo: 'admin', pathMatch: 'full' },

  // Authless pages
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then(m => m.LoginPage),
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./pages/signup/signup.page').then(m => m.SignupPage),
  },

  // Driver flow (guarded)
  {
    path: 'van-selection',
    loadComponent: () =>
      import('./pages/van-selection/van-selection.page').then(m => m.VanSelectionPage),
    canActivate: [authGuard],
  },
  {
    path: 'photo-capture/:vanType/:vanNumber',
    loadComponent: () =>
      import('./pages/photo-capture/photo-capture.page').then(m => m.PhotoCapturePage),
    canActivate: [authGuard],
  },
  {
    path: 'user-review',
    loadComponent: () =>
      import('./pages/user-review/user-review.page').then(m => m.UserReviewPage),
    canActivate: [authGuard],
  },

  // ADMIN SHELL (single source of truth for admin routes)
  {
    path: 'admin',
    loadComponent: () =>
      import('./pages/admin/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
    canActivate: [authGuard, adminGuard], // ✅ Both authentication AND authorization check
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/admin/dashboard/dashboard.page').then(m => m.DashboardPage),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./pages/admin/users/users.page').then(m => m.UsersPage),
      },
      {
        path: 'van-report/:id',
        loadComponent: () =>
          import('./pages/admin/van-report/van-report.component').then(m => m.VanReportComponent),
      },
      {
        path: 'van/:id',
        loadComponent: () =>
          import('./pages/admin/van-details/van-details.page').then(m => m.VanDetailsPage),
      }
    ],
  },

  // Optional: keep a single alias for old deep links to /van-report/:id
  // This simply forwards to the canonical admin route.
  { 
    path: 'van-report/:id', 
    redirectTo: 'admin/van-report/:id', 
    pathMatch: 'full',
    canActivate: [authGuard, adminGuard] // ✅ Protect the alias route too
  },

  // Catch-all
  { path: '**', redirectTo: 'login' },
];


@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
