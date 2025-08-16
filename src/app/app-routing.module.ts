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
  {
    path: 'van-report/:id',
    loadComponent: () =>
      import('./pages/admin-portal/van-report/van-report.component').then(
        (m) => m.VanReportComponent
      ),
    canActivate: [authGuard], // optional but recommended
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
        path: 'van-report/:vanId',
        loadComponent: () =>
          import('./pages/admin-portal/van-report/van-report.component').then(
            (m) => m.VanReportComponent
          ),
        canActivate: [authGuard],
      },
    ],
  },
];

@NgModule({
  imports: [
    RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules }),
  ],
  exports: [RouterModule],
})
export class AppRoutingModule {}
