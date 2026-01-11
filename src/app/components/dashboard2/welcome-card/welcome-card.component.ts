import { Component } from '@angular/core';
import { MaterialModule } from '../../../material.module';
import { CoreService } from 'src/app/services/core.service';

@Component({
  selector: 'app-welcome-card',
  imports: [MaterialModule],
  templateUrl: './welcome-card.component.html',
})
export class AppWelcomeCardComponent {



  constructor(private core: CoreService) { }
  userInfo: any;
  role: string;

  ngOnInit(): void {
    
   this.userInfo = this.core.getUserInfoFromToken();
   this.role = this.core.getRole();
  }


}
