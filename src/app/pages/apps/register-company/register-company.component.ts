import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatStepper, MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { NgxStripeModule, StripeCardComponent, StripeService } from 'ngx-stripe';
import { StripeCardElementOptions, StripeElementsOptions } from '@stripe/stripe-js';
import { CoreService } from 'src/app/services/core.service';
import { CompanyService } from 'src/app/services/company.service';
import { MaterialModule } from 'src/app/material.module';
import { lastValueFrom } from 'rxjs';
import { tr } from 'date-fns/locale';
import { Router } from '@angular/router';

@Component({
  selector: 'app-register-company',
  standalone: true,
  templateUrl: './register-company.component.html',
  imports: [
    CommonModule,
    FormsModule,            // ✅ Para [(ngModel)]
    ReactiveFormsModule,    // ✅ Para formGroup y formControlName
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    NgxStripeModule,         // ✅ Para <ngx-stripe-card>
    MaterialModule,
  ]
})
export class RegisterCompanyComponent {
  @ViewChild(StripeCardComponent) card!: StripeCardComponent;

  loading: boolean = false;
  firstFormGroup: FormGroup;
  secondFormGroup: FormGroup;
  logoFile?: File;
  termsAccepted = false;
  userId: any;
  logoPreview: string | ArrayBuffer | null = null;
  logoError: string = '';

  ngOnInit(): void {
    this.userId = this.setting.getUserInfoFromToken()
  }

  cardOptions: StripeCardElementOptions = {
    style: {
      base: {
        color: '#31325F',
        fontSize: '18px',

        '::placeholder': { color: '#afc2d8ff' }
      }
    }
  };


  elementsOptions: StripeElementsOptions = { locale: 'en' };

  constructor(private fb: FormBuilder, private stripeService: StripeService, private setting: CoreService, private companyService: CompanyService, private router: Router) {
    this.firstFormGroup = this.fb.group({
      CompanyName: ['', Validators.required],
      CompanyEmail: ['', [Validators.required, Validators.email]],
      Address: ['', Validators.required],
      PhoneNumber: ['', Validators.required],
      Logo: [null, Validators.required]
    });

    this.secondFormGroup = this.fb.group({});
  }

  onLogoSelected(event: Event) {
    const input = event.target as HTMLInputElement;

    if (input.files && input.files.length > 0) {
      const file = input.files[0];

      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        if (img.width > 150 || img.height > 150) {
          this.logoError = 'El logo no puede exceder de 150x150 píxeles.';
          this.logoPreview = null;
          this.firstFormGroup.patchValue({ Logo: null });
        } else {
          this.logoError = '';
          this.logoFile = file;
          this.firstFormGroup.patchValue({ Logo: file });

          // Mostrar vista previa
          const reader = new FileReader();
          reader.onload = () => {
            this.logoPreview = reader.result;
          };
          reader.readAsDataURL(file);
        }
        URL.revokeObjectURL(objectUrl);
      };

      img.src = objectUrl;
    }
  }



  async handleSavePayment(stepper: MatStepper) {
    this.loading = true;
    try {
      // 1️⃣ Crear el PaymentMethod en Stripe
      const result = await lastValueFrom(
        this.stripeService.createPaymentMethod({
          type: 'card',
          card: this.card.element,
          billing_details: { name: this.firstFormGroup.value.CompanyName }
        })
      );

      if (result.error) {
        console.error('❌ Error en Stripe:', result.error.message);
        return;
      }

      console.log('✅ PaymentMethod creado:', result.paymentMethod.id);

      // 2️⃣ Crear Customer si no existe
      await lastValueFrom(this.companyService.createStripeCustomer());

      // 3️⃣ Asociar PaymentMethod al Customer en backend
      await lastValueFrom(this.companyService.attachPaymentMethod(result.paymentMethod.id));

      console.log("✅ PaymentMethod asociado y Customer creado");

      // 4️⃣ Avanzar al siguiente paso
      stepper.next();
      this.loading = false;

    } catch (err) {
      console.error('⚠️ Error inesperado:', err);
    }
  }


  submitCompany() {

    if (this.firstFormGroup.invalid) {
      this.firstFormGroup.markAllAsTouched();
      return;
    }
    this.loading = true;

    const formData = new FormData();

    // ✅ Agregar todos los campos del formulario
    Object.keys(this.firstFormGroup.controls).forEach((key) => {
      const value = this.firstFormGroup.get(key)?.value;
      if (value !== null && value !== undefined) {
        formData.append(key, value);
      }
    });

    // ✅ Llamar a tu servicio para enviar la compañía
    this.companyService.createCompany(formData).subscribe({
      next: (res) => {
        this.firstFormGroup.reset();
        this.secondFormGroup.reset();

        // 🔹 Redirigir al dashboard
        this.router.navigate(['/dashboards/dashboard2']);
        this.loading = false;
        console.log('✅ Compañía creada correctamente', res);

      },
      error: (err) => {
        console.error('❌ Error al crear compañía', err);
      },
    });
  }

}
