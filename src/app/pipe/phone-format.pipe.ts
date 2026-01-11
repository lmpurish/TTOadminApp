import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'phoneFormat'
})
export class PhoneFormatPipe implements PipeTransform {

  transform(value: string | number): string {
    if (!value) return '';

    // Convertir a string y eliminar caracteres no numéricos
    const phoneNumber = value.toString().replace(/\D/g, '');

    // Validar que tenga 10 dígitos
    if (phoneNumber.length !== 10) return value.toString();

    // Aplicar el formato (xxx) xxx-xxxx
    return `(${phoneNumber.slice(0, 3)}) ${phoneNumber.slice(3, 6)}-${phoneNumber.slice(6)}`;
  }

}
