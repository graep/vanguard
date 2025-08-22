import { inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { CanActivateFn, Router } from '@angular/router';
import { authState } from 'rxfire/auth';
import { map, take } from 'rxjs/operators';

export const authGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  return authState(auth).pipe(
    take(1),
    map(user => {
      if (user) {
        return true;
      } else {
        router.navigate(['/login']);
        return false;
      }
    })
  );
};
