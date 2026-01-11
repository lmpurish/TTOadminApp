import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'htmlToPlainText'
})
export class HtmlToPlainTextPipe implements PipeTransform {
  transform(value: string): string {
    if (!value) return '';
    const div = document.createElement('div');
    div.innerHTML = value;
    return div.textContent || div.innerText || '';
  }
}