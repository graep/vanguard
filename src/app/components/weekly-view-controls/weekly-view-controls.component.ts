import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonIcon
} from '@ionic/angular/standalone';

@Component({
  selector: 'app-weekly-view-controls',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonIcon
  ],
  templateUrl: './weekly-view-controls.component.html',
  styleUrls: ['./weekly-view-controls.component.scss']
})
export class WeeklyViewControlsComponent implements OnInit {
  @Input() selectedDate: string = '';
  @Input() isTodaySelected: boolean = false;

  @Output() dateChange = new EventEmitter<string>();
  @Output() selectToday = new EventEmitter<void>();
  @Output() openDatePicker = new EventEmitter<void>();


  @ViewChild('dateInput', { static: false }) dateInput?: ElementRef<HTMLInputElement>;

  ngOnInit() {}

  getWeekOfYear(): number {
    if (!this.selectedDate) return 0;
    const date = new Date(this.selectedDate);
    // Set to nearest Thursday: current date + 4 - current day number
    // Make Sunday's day number 7
    const dayOfWeek = date.getDay() || 7;
    date.setDate(date.getDate() + 4 - dayOfWeek);
    // Get first day of year
    const yearStart = new Date(date.getFullYear(), 0, 1);
    // Calculate full weeks to nearest Thursday
    const weekNumber = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return weekNumber;
  }

  onDateChange(event: any): void {
    this.dateChange.emit(event.target.value);
  }

  onSelectToday(): void {
    this.selectToday.emit();
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
}

