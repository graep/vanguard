// src/app/guards/auth.guard.ts
import { inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
// You can use either rxfire or AngularFire's authState.
// If you prefer rxfire, keep the next import and remove the AngularFire one.
// import { authState } from 'rxfire/auth';
import { authState } from '@angular/fire/auth';
import { catchError, map, take, switchMap, filter } from 'rxjs/operators';
import { of } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const router = inject(Router);

  return authState(auth).pipe(
    take(1),
    map(user => {
      console.log('[authGuard] attempting:', state.url, 'uid:', user?.uid ?? null);
      if (user) return true;

      console.warn('[authGuard] no user → redirecting to /login');
      // Return a UrlTree (no side-effects) and preserve the intended URL
      return router.createUrlTree(['/login'], {
        queryParams: { redirectTo: state.url }
      });
    }),
    catchError(err => {
      console.error('[authGuard] error:', err);
      return of(
        router.createUrlTree(['/login'], { queryParams: { redirectTo: state.url } })
      );
    })
  );
};

export const adminGuard: CanActivateFn = (route, state) => {
  const auth = inject(Auth);
  const authService = inject(AuthService);
  const router = inject(Router);
  
  return authState(auth).pipe(
    take(1),
    switchMap(user => {
      console.log('[adminGuard] attempting:', state.url, 'uid:', user?.uid ?? null);
      
      // First check if user is authenticated at all
      if (!user) {
        console.warn('[adminGuard] no user → redirecting to /login');
        return of(router.createUrlTree(['/login'], {
          queryParams: { redirectTo: state.url }
        }));
      }
      
      // Wait for user profile to load, then check roles
      // Use timeout to prevent infinite waiting
      return authService.currentUserProfile$.pipe(
        filter(profile => profile !== null), // Wait until profile is loaded
        take(1),
        map(userProfile => {
          console.log('[adminGuard] user profile:', userProfile?.roles);
          
          const hasAdminRole = userProfile?.roles?.includes('admin') || userProfile?.roles?.includes('owner') || false;
          
          if (!hasAdminRole) {
            console.warn('[adminGuard] user lacks admin role → redirecting to /van-selection');
            // Use replaceUrl to prevent back navigation to admin
            return router.createUrlTree(['/van-selection'], { 
              queryParams: { unauthorized: 'true' },
              fragment: 'replaced'
            });
          }
          
          console.log('[adminGuard] admin access granted');
          return true;
        })
      );
    }),
    catchError(err => {
      console.error('[adminGuard] error:', err);
      return of(
        router.createUrlTree(['/login'], { queryParams: { redirectTo: state.url } })
      );
    })
  );
};
