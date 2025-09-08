// src/app/guards/auth.guard.ts
import { inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
// You can use either rxfire or AngularFire's authState.
// If you prefer rxfire, keep the next import and remove the AngularFire one.
// import { authState } from 'rxfire/auth';
import { authState } from '@angular/fire/auth';
import { catchError, map, take } from 'rxjs/operators';
import { of } from 'rxjs';

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
