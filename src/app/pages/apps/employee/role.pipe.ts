import { Pipe, PipeTransform, Injectable } from '@angular/core';

@Pipe({
  name: 'rolePipe',
  standalone: true, // Para Angular 15+
})
@Injectable({ providedIn: 'root' })
export class RolePipe implements PipeTransform {
  transform(value: number): string {
    const rolesMap: { [key: string]: string } = {
      'Admin': 'Administrator',
      'Manager': 'Manager',
      'Assistant': 'Assistant',
      'Driver': 'Driver',
      'Rsp': 'Rsp',
      'Applicant': 'Applicant',
      'Recruiter' : 'Recruiter'
    };

    return rolesMap[value] || 'Unknown Role';
  }
}