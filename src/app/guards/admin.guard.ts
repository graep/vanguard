// src/app/guards/admin.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map, take } from 'rxjs/operators';

/**
 * Admin Guard - Verifies user has admin or owner role
 * This guard should be used AFTER authGuard to ensure user is both:
 * 1. Authenticated (checked by authGuard)
 * 2. Has admin privileges (checked by this guard)
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.currentUserProfile$.pipe(
    take(1),
    map(userProfile => {
      console.log('[adminGuard] attempting:', state.url, 'user roles:', userProfile?.roles ?? 'no profile');
      
      // If no user profile, redirect to login
      if (!userProfile) {
        console.warn('[adminGuard] no user profile → redirecting to /login');
        return router.createUrlTree(['/login'], {
          queryParams: { redirectTo: state.url }
        });
      }

      // Check if user has admin or owner role
      const hasAdminAccess = userProfile.roles.includes('admin') || userProfile.roles.includes('owner');
      
      if (hasAdminAccess) {
        console.log('[adminGuard] user has admin access → allowing');
        return true;
      }

      // User doesn't have admin privileges - redirect to driver area
      console.warn('[adminGuard] user lacks admin privileges → redirecting to /van-selection');
      return router.createUrlTree(['/van-selection'], {
        queryParams: { 
          error: 'admin_access_denied',
          message: 'You do not have admin privileges'
        }
      });
    })
  );
};