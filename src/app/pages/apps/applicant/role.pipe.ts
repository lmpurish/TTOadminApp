import { Pipe, PipeTransform, Injectable } from '@angular/core';

@Pipe({
  name: 'rolePipe',
  standalone: true, // Para Angular 15+
})
@Injectable({ providedIn: 'root' })
export class RolePipe implements PipeTransform {
  transform(value: number): string {
    const rolesMap: { [key: number]: string } = {
      0: 'Administrator',
      1: 'Manager',
      2: 'Assistant',
      3: 'Driver',
      4: 'Rsp',
      5: 'Applicant'
    };

    return rolesMap[value] || 'Unknown Role';
  }
}