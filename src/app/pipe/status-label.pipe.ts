import { Pipe, PipeTransform } from "@angular/core";
import { StatusKey } from "../pages/apps/applicant/applicant.component";

@Pipe({ name: 'statusLabel', standalone: true })
export class StatusLabelPipe implements PipeTransform {
  transform(value: StatusKey): string {
    switch (value) {
      case 'InitialContact':   return 'Initial Contact';
      case 'AwaitingResponse': return 'Awaiting Response';
      case 'PreOnboarding':    return 'Pre-Onboarding';
      default:                 return 'Applicant';
    }
  }
}