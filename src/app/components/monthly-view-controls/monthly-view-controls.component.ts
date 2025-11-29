import { Component, Input, Output, EventEmitter, OnInit, ViewChild, ElementRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonButton,
  IonIcon,
  ModalController
} from '@ionic/angular/standalone';
import { WorkBlockManagerComponent } from '../work-block-manager/work-block-manager.component';

@Component({
  selector: 'app-monthly-view-controls',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    IonButton,
    IonIcon
  ],
  templateUrl: './monthly-view-controls.component.html',
  styleUrls: ['./monthly-view-controls.component.scss']
})
export class MonthlyViewControlsComponent implements OnInit {
  @Input() selectedDate: string = '';
  @Input() isTodaySelected: boolean = false;

  @Output() dateChange = new EventEmitter<string>();
  @Output() selectToday = new EventEmitter<void>();
  @Output() openDatePicker = new EventEmitter<void>();

  private modalCtrl = inject(ModalController);

  @ViewChild('dateInput', { static: false }) dateInput?: ElementRef<HTMLInputElement>;

  ngOnInit() {}

  getMonthOfYear(): number {
    if (!this.selectedDate) return 0;
    const date = new Date(this.selectedDate);
    // getMonth() returns 0-11, so add 1 to get 1-12
    return date.getMonth() + 1;
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

  async openWorkBlockManager(): Promise<void> {
    const modal = await this.modalCtrl.create({
      component: WorkBlockManagerComponent,
      componentProps: {
        compact: false
      },
      cssClass: 'work-block-modal'
    });
    
    await modal.present();
  }
}

