import { NgModule } from '@angular/core';
import { PreloadAllModules, RouterModule, Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },  
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then((m) => m.LoginPage),
  },
  {
    path: 'van-selection',
    loadComponent: () =>
      import('./pages/van-selection/van-selection.page').then((m) => m.VanSelectionPage),
    canActivate:[authGuard],
  },
  {
    path: 'photo-capture/:vanType/:vanNumber',
    loadComponent: () =>
      import('./pages/photo-capture/photo-capture.page').then((m) => m.PhotoCapturePage),
    canActivate:[authGuard],
  },
  {
    path: 'user-review',
  loadComponent: () =>
    import('./pages/user-review/user-review.page').then(m => m.UserReviewPage),
  canActivate: [authGuard]
  },

];

@NgModule({
  imports: [RouterModule.forRoot(routes, { preloadingStrategy: PreloadAllModules })],
  exports: [RouterModule],
})
export class AppRoutingModule {}
