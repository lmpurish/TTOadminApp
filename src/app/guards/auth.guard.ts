import { core } from '@angular/compiler';
import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { CoreService } from '../services/core.service';
import { ToastrService } from 'ngx-toastr';

@Injectable({
  providedIn: "root"
})

export class AuthGuard implements CanActivate {
  constructor(private setting: CoreService, private router: Router, private toastr: ToastrService) { }

  getHasCompany(): boolean {
    return localStorage.getItem("hasCompany") === "true";
  }

  getHasBankInfo(): boolean {
    return localStorage.getItem("hasBankInfo") === "true";
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean | UrlTree {
    if (!this.setting.isLoggedIn()) {
      this.toastr.info('Please log in again.');
      return this.router.createUrlTree(['authentication/login']);
    }
    if (this.setting.isTokenExpired()) {
      this.toastr.warning('Your session has expired. Please log in again.');
      this.setting.logout(true);
      return this.router.createUrlTree(['authentication/login'], { queryParams: { redirect: state.url, reason: 'expired' } });
    }

    // (Opcional) reprograma el auto-logout en cada navegación protegida
    this.setting.scheduleAutoLogout();

    const role = this.setting.getRole();
    const firstLogin = this.setting.getIsFirstLogin();
    const hasCompany = this.setting.getHasCompany();
    const currentUrl = state.url;

    // 🔒 Si es CompanyOwner sin compañía
    if (role === 'CompanyOwner' && !hasCompany) {
      if (currentUrl !== '/apps/register-company-owner') {
        return this.router.createUrlTree(['/apps/register-company-owner']);
      }
    }
    if (role == 'Applicant' && firstLogin) {
      if (currentUrl !== '/apps/complete-profile') {
        return this.router.createUrlTree(['/apps/complete-profile'])
      }
    }
    else if (role == 'Applicant' && !firstLogin) {
      if (currentUrl !== '/apps/account-setting') {
        return this.router.createUrlTree(['/apps/account-setting'])
      }
    }

    // 🔒 Si es Driver y está intentando acceder a una ruta no permitida
    if (role === 'Driver') {
      const allowedRoutes = [
        '/dashboards/dashboard1',
        '/dashboards/dashboard2'
      ];

      if (!allowedRoutes.includes(currentUrl)) {
        return this.router.createUrlTree(['/dashboards/dashboard1']);
      }
    }

    return true;
  }




}
