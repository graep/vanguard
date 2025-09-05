// src/app/app-routing.module.ts
import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'admin-portal', redirectTo: 'admin', pathMatch: 'full' },

  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./pages/signup/signup.page').then((m) => m.SignupPage),
  },
  {
    path: 'van-selection',
    loadComponent: () =>
      import('./pages/van-selection/van-selection.page').then(
        (m) => m.VanSelectionPage
      ),
    canActivate: [authGuard],
  },
  {
    path: 'photo-capture/:vanType/:vanNumber',
    loadComponent: () =>
      import('./pages/photo-capture/photo-capture.page').then(
        (m) => m.PhotoCapturePage
      ),
    canActivate: [authGuard],
  },
  {
    path: 'user-review',
    loadComponent: () =>
      import('./pages/user-review/user-review.page').then(
        (m) => m.UserReviewPage
      ),
    canActivate: [authGuard],
  },

  // Dynamic van detail page - accessible via /van/:id
  {
    path: 'van/:id',
    loadComponent: () =>
      import('./pages/van-details/van-details.page').then(
        (m) => m.VanDetailPage
      ),
    canActivate: [authGuard],
  },

  // Support direct links from the modal (top-level route)
  {
    path: 'van-report/:id',
    loadComponent: () =>
      import('./pages/admin-portal/van-report/van-report.component').then(
        (m) => m.VanReportComponent
      ),
    canActivate: [authGuard],
  },

  {
    path: 'admin',
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/admin-portal/admin-portal.page').then(
            (m) => m.AdminPortalPage
          ),
        canActivate: [authGuard],
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./pages/admin-portal/users/users.page').then(
            (m) => m.UsersPage
          ),
        canActivate: [authGuard],
      },
      {
        path: 'van-report/:id',
        loadComponent: () =>
          import('./pages/admin-portal/van-report/van-report.component').then(
            (m) => m.VanReportComponent
          ),
        canActivate: [authGuard],
      },
    ],
  },

  // ✅ Catch-all route for unknown paths
  { path: '**', redirectTo: 'login' },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
