import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, Router } from '@angular/router';
import { CoreService } from '../services/core.service';

@Injectable({
  providedIn: 'root'
})
export class RoleGuard implements CanActivate {
  constructor(private authService: CoreService, private router: Router) { }

  canActivate(route: ActivatedRouteSnapshot): boolean {
    const expectedRoles = route.data['role']; // Puede ser string o array
    const user = this.authService.getUserInfoFromToken(); // Decodifica el token

    if (!user) {
      this.router.navigate(['/unauthorized']);
      return false;
    }

    // Normaliza expectedRoles a array
    const rolesAllowed = Array.isArray(expectedRoles) ? expectedRoles : [expectedRoles];

    // Verifica si el usuario tiene alguno de los roles permitidos
    const hasAccess = rolesAllowed.includes(user.role);

    if (!hasAccess) {
      this.router.navigate(['/unauthorized']);
      return false;
    }

    return true;
  }
}