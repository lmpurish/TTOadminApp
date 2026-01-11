import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { TablerIconsModule } from 'angular-tabler-icons';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { EmployeeService } from 'src/app/services/apps/employee/employee.service';
import { CoreService } from 'src/app/services/core.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-upload-avatar',
  imports: [CommonModule, ReactiveFormsModule, MatCardModule, MatIconModule, TablerIconsModule, MatTabsModule, MatFormFieldModule, MatSlideToggleModule,
    MatSelectModule, MatInputModule, MatButtonModule, MatDividerModule,],
  templateUrl: './upload-avatar.component.html',
  styleUrl: './upload-avatar.component.scss'
})
export class UploadAvatarComponent {
  avatarUrl: string = '';
  selectedFile: File | null = null;
  userInfo: any;
  form!: FormGroup;
  loading = false;
  constructor(private service: CoreService, private userService: EmployeeService, private http: HttpClient, private snackBar: MatSnackBar, private fb: FormBuilder, private toastr: ToastrService) {

  }

  ngOnInit(): void {
    this.form = this.fb.group({
      // puedes agregar campos aquí si necesitas
    });
    const id = this.service.getUserInfoFromToken()?.id;
    if (id) {
      this.userService.getUserInfo().subscribe({
        next: (res) => {
          this.userInfo = res;
          if (this.userInfo.avatar) {
            this.service.getAvatar(this.userInfo.avatar).subscribe(url => {
              this.avatarUrl = url;
            });
          }
        },
        error: (err) => {
          console.error('Error getting user information: ', err);
        }
      });
    } else {
      console.warn('The user ID could not be obtained from the token.');
    }
  }


  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files || input.files.length === 0) return;

    const file = input.files[0];

    // Validación de tamaño
    if (file.size > 2 * 1024 * 1024) {
      alert('El archivo excede el tamaño máximo de 2MB.');
      return;
    }

    // Validación de tipo
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      alert('Formato de archivo no permitido.');
      return;
    }

    this.selectedFile = file;

    // Mostrar vista previa
    const reader = new FileReader();
    reader.onload = () => {
      this.avatarUrl = reader.result as string;
    };
    reader.readAsDataURL(file);
  }

  submit(): void {
    if (this.form.invalid) return;

    this.loading = true;

    const tasks: Promise<any>[] = [];

    // Subida de avatar si hay un archivo seleccionado
    if (this.selectedFile) {
      const formData = new FormData();
      formData.append('avatar', this.selectedFile);

      const uploadTask = this.userService.uploadAvatar(formData).toPromise().then((res: any) => {
        this.userInfo.avatar = res.avatar;
        this.service.getAvatar(res.avatar); // refresca la imagen si la usas desde un backend con auth
      });

      tasks.push(uploadTask);
    }

    // Aquí puedes agregar otras tareas si lo deseas (ej: actualizar nombre, email, etc.)

    Promise.all(tasks)
      .then(() => {
        this.snackBar.open('Perfil actualizado correctamente.', 'Cerrar', { duration: 3000 });
        this.selectedFile = null; // limpia el archivo
      })
      .catch((err) => {
        console.error('Error durante actualización:', err);
        this.snackBar.open('Ocurrió un error al actualizar.', 'Cerrar', { duration: 3000 });
      })
      .finally(() => {
        this.loading = false;
      });
  }



  resetAvatar() {
    this.avatarUrl = '/assets/images/profile/user-1.jpg';
    this.selectedFile = null;
  }

}
