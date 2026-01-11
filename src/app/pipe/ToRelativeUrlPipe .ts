import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'toRelativeUrl' })
export class ToRelativeUrlPipe implements PipeTransform {
  transform(url: string): string {
    if (!url) return '';
    try {
      const parsed = new URL(url);
      return parsed.pathname; // solo devuelve "/storage/companies/1/...pdf"
    } catch {
      return url; // si ya es relativo
    }
  }
}
