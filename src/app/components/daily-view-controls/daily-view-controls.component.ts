import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonIcon,
  IonInput,
  IonChip,
  IonLabel
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-daily-view-controls',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonIcon,
    IonInput
  ],
  templateUrl: './daily-view-controls.component.html',
  styleUrls: ['./daily-view-controls.component.scss']
})
export class DailyViewControlsComponent implements OnInit {
  @Input() selectedDate: string = '';
  @Input() numberOfRoutes: number = 0;
  @Input() isSaving: boolean = false;
  @Input() hasCheckedAssignments: boolean = false;
  @Input() checkedCount: number = 0;
  @Input() isTodaySelected: boolean = false;
  @Input() isTomorrowSelected: boolean = false;

  @Output() dateChange = new EventEmitter<string>();
  @Output() selectToday = new EventEmitter<void>();
  @Output() selectTomorrow = new EventEmitter<void>();
  @Output() openDatePicker = new EventEmitter<void>();
  @Output() generateRoutes = new EventEmitter<void>();
  @Output() submitChecked = new EventEmitter<void>();
  @Output() numberOfRoutesChange = new EventEmitter<number>();

  private elementRef = inject(ElementRef);

  @ViewChild('dateInput', { static: false }) dateInput?: ElementRef<HTMLInputElement>;

  ngOnInit() {}

  getDayOfMonth(): number {
    if (!this.selectedDate) return 0;
    const date = new Date(this.selectedDate);
    return date.getDate();
  }

  onDateChange(event: any): void {
    this.dateChange.emit(event.target.value);
  }

  onSelectToday(): void {
    this.selectToday.emit();
  }

  onSelectTomorrow(): void {
    this.selectTomorrow.emit();
  }

  onOpenDatePicker(): void {
    // Trigger the date picker to open
    if (this.dateInput?.nativeElement) {
      const input = this.dateInput.nativeElement;
      if (input.showPicker) {
        input.showPicker();
      } else {
        input.click();
      }
    }
    this.openDatePicker.emit();
  }

  onGenerateRoutes(): void {
    this.generateRoutes.emit();
  }

  onSubmitChecked(): void {
    this.submitChecked.emit();
  }

  onNumberOfRoutesChange(value: number): void {
    this.numberOfRoutesChange.emit(value);
  }
}

