import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { map } from 'rxjs/operators';

export const authGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  return auth.currentUser$.pipe(
    map(user => {
      if (user) {
        return true;     // allow navigation
      }
      router.navigate(['/login'], { replaceUrl: true });
      return false;      // block it
    })
  );
};
