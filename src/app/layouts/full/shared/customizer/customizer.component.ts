import {
  Component,
  Output,
  EventEmitter,
  ViewEncapsulation,
  signal,
} from '@angular/core';
import { AppSettings } from 'src/app/config';
import { CoreService } from 'src/app/services/core.service';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MaterialModule } from 'src/app/material.module';
import { FormsModule } from '@angular/forms';
import { NgScrollbarModule } from 'ngx-scrollbar';

@Component({
  selector: 'app-customizer',
  imports: [
    TablerIconsModule,
    MaterialModule,
    FormsModule,
    NgScrollbarModule,
  ],
  templateUrl: './customizer.component.html',
  styleUrls: ['./customizer.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class CustomizerComponent {
  options = this.settings.getOptions();

  @Output() optionsChange = new EventEmitter<AppSettings>();
  hideSingleSelectionIndicator = signal(true);

  constructor(private settings: CoreService) {}

  // ⬇️ Usa el valor seleccionado, no fuerces 'dark'
  setTheme(theme: 'light' | 'dark') {
    this.settings.setOptions({ theme }, true);
    this.refresh();
  }

  setColor(color: string) {
    this.settings.setOptions({ activeTheme: color }, true);
    this.refresh();
  }

  setHorizontal(value: boolean) {
    this.settings.setOptions({ horizontal: value }, true);
    this.refresh();
  }

  setCardBorder(value: boolean) {
    this.settings.setOptions({ cardBorder: value }, true);
    this.refresh();
  }

  setBoxed(value: boolean) {
    this.settings.setOptions({ boxed: value }, true);
    this.refresh();
  }

  // (opcional) si aún usas estos:
  setDir(dir: 'ltr' | 'rtl') {
    this.settings.setOptions({ dir }, true);
    this.refresh();
  }
  setSidebar(sidenavOpened: boolean) {
    this.settings.setOptions({ sidenavOpened }, true);
    this.refresh();
  }

  private refresh() {
    // re-lee por si el servicio normaliza/mergea antes de emitir
    this.options = this.settings.getOptions();
    this.optionsChange.emit(this.options);
  }
}


