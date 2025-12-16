import { Component, Input, Output, EventEmitter, OnInit, OnChanges, SimpleChanges, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonIcon,
  IonInput,
  IonChip,
  IonLabel,
  ModalController
} from '@ionic/angular/standalone';
import { WorkDayDetails } from '../../services/schedule.service';
import { WorkAssignmentsModalComponent } from '../work-assignments-modal/work-assignments-modal.component';

@Component({
  selector: 'app-daily-view-controls',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonIcon,
    IonInput,
    IonChip,
    IonLabel
  ],
  templateUrl: './daily-view-controls.component.html',
  styleUrls: ['./daily-view-controls.component.scss']
})
export class DailyViewControlsComponent implements OnInit, OnChanges {
  @Input() selectedDate: string = '';
  @Input() isSaving: boolean = false;
  @Input() hasCheckedAssignments: boolean = false;
  @Input() checkedCount: number = 0;
  @Input() isTodaySelected: boolean = false;
  @Input() isTomorrowSelected: boolean = false;
  @Input() workAssignments: Array<WorkDayDetails & { userId: string }> = [];

  @Output() dateChange = new EventEmitter<string>();
  @Output() selectToday = new EventEmitter<void>();
  @Output() selectTomorrow = new EventEmitter<void>();
  @Output() openDatePicker = new EventEmitter<void>();
  @Output() submitChecked = new EventEmitter<void>();

  private elementRef = inject(ElementRef);
  private modalCtrl = inject(ModalController);

  @ViewChild('dateInput', { static: false }) dateInput?: ElementRef<HTMLInputElement>;

  totalAssigned: number = 0;
  roleBreakdown: { role: string; count: number }[] = [];

  ngOnInit() {
    this.updateCounts();
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['workAssignments'] || changes['selectedDate']) {
      this.updateCounts();
    }
  }

  updateCounts() {
    if (!this.workAssignments || this.workAssignments.length === 0) {
      this.totalAssigned = 0;
      this.roleBreakdown = [];
      return;
    }

    this.totalAssigned = this.workAssignments.length;
    
    // Count by role
    const roleCounts: Record<string, number> = {};
    this.workAssignments.forEach(assignment => {
      const role = assignment.role || 'Unassigned';
      roleCounts[role] = (roleCounts[role] || 0) + 1;
    });

    // Convert to array and sort
    this.roleBreakdown = Object.entries(roleCounts)
      .map(([role, count]) => ({ role, count }))
      .sort((a, b) => {
        // Sort: Driver, Dispatch, Extra, then Unassigned
        const order: Record<string, number> = { 'Driver': 1, 'Dispatch': 2, 'Extra': 3, 'Unassigned': 4 };
        return (order[a.role] || 99) - (order[b.role] || 99);
      });
  }

  getDayOfMonth(): number {
    if (!this.selectedDate) return 0;
    // Parse date string (YYYY-MM-DD) to avoid timezone issues
    const [year, month, day] = this.selectedDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
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

  onSubmitChecked(): void {
    this.submitChecked.emit();
  }

  getTooltipText(): string {
    if (this.roleBreakdown.length === 0) return '';
    return this.roleBreakdown.map(item => `${item.role}: ${item.count}`).join(', ');
  }

  async openWorkAssignmentsModal(): Promise<void> {
    if (this.workAssignments.length === 0) return;

    const modal = await this.modalCtrl.create({
      component: WorkAssignmentsModalComponent,
      componentProps: {
        workAssignments: this.workAssignments,
        selectedDate: this.selectedDate
      },
      cssClass: 'work-assignments-modal'
    });

    await modal.present();
  }
}

