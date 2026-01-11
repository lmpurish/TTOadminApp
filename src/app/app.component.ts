import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CoreService } from './services/core.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html'
})
export class AppComponent {
  title = 'TTo Logistics Admin';


  constructor(
    private core: CoreService,

  ) { }
  ngOnInit(): void {
    if (this.core.isLoggedIn()) {
      this.core.loadUserSettings().subscribe({
        error: () => { /* opcional: manejar error */ }
      });
    }
  }
  optionsSig = this.core.options$(); // <-- expone el signal del servicio
}
