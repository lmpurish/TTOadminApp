import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'truncateWords'
})
export class TruncateWordsPipe implements PipeTransform {

  transform(value: string, limit: number = 8): string {
    if (!value) return '';
    
    const words = value.trim().split(/\s+/);
    const truncated = words.slice(0, limit).join(' ');

    return words.length > limit ? `${truncated}...` : value;
  }

}
