import { Component, Input, OnInit, OnDestroy, inject, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonButton, 
  IonIcon, 
  IonSpinner
} from '@ionic/angular/standalone';
import { ScheduleService } from '../../services/schedule.service';
import { AuthService } from '../../services/auth.service';
import { Subscription, firstValueFrom } from 'rxjs';

interface CalendarDay {
  date: Date;
  dayOfMonth: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWorkDay: boolean;
  dateString: string;
}

@Component({
  selector: 'app-user-schedule-calendar',
  standalone: true,
  imports: [CommonModule, IonButton, IonIcon, IonSpinner],
  templateUrl: './user-schedule-calendar.component.html',
  styleUrls: ['./user-schedule-calendar.component.scss']
})
export class UserScheduleCalendarComponent implements OnInit, OnDestroy {
  @Input() userId: string = '';
  
  private scheduleService = inject(ScheduleService);
  private authService = inject(AuthService);
  private subscription?: Subscription;
  
  currentDate = new Date();
  currentMonth = this.currentDate.getMonth();
  currentYear = this.currentDate.getFullYear();
  
  calendarDays: CalendarDay[] = [];
  workDays: string[] = [];
  isLoading = false;
  selectedDay: CalendarDay | null = null;
  dropdownPosition: { top: number; left: number } | null = null;
  
  weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  ngOnInit() {
    if (this.userId) {
      this.loadSchedule();
    }
  }

  ngOnDestroy() {
    if (this.subscription) {
      this.subscription.unsubscribe();
    }
  }

  async loadSchedule() {
    if (!this.userId) return;
    
    this.isLoading = true;
    try {
      this.workDays = await this.scheduleService.getWorkDaysForMonth(
        this.userId,
        this.currentYear,
        this.currentMonth + 1
      );
      this.generateCalendar();
    } catch (error) {
      console.error('[UserScheduleCalendar] Error loading schedule:', error);
    } finally {
      this.isLoading = false;
    }
  }

  generateCalendar() {
    this.calendarDays = [];
    
    // Get first day of month and last day of month
    const firstDay = new Date(this.currentYear, this.currentMonth, 1);
    const lastDay = new Date(this.currentYear, this.currentMonth + 1, 0);
    
    // Get first day of week for the first day of month (0 = Sunday, 6 = Saturday)
    const startDay = firstDay.getDay();
    
    // Get last day of previous month to fill in the calendar
    const prevMonthLastDay = new Date(this.currentYear, this.currentMonth, 0).getDate();
    
    // Add days from previous month
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(this.currentYear, this.currentMonth - 1, prevMonthLastDay - i);
      const dateString = this.formatDateString(date);
      this.calendarDays.push({
        date,
        dayOfMonth: date.getDate(),
        isCurrentMonth: false,
        isToday: this.isToday(date),
        isWorkDay: this.workDays.includes(dateString),
        dateString
      });
    }
    
    // Add days from current month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(this.currentYear, this.currentMonth, day);
      const dateString = this.formatDateString(date);
      this.calendarDays.push({
        date,
        dayOfMonth: day,
        isCurrentMonth: true,
        isToday: this.isToday(date),
        isWorkDay: this.workDays.includes(dateString),
        dateString
      });
    }
    
    // Add days from next month to fill the last week
    const remainingDays = 42 - this.calendarDays.length; // 6 weeks * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(this.currentYear, this.currentMonth + 1, day);
      const dateString = this.formatDateString(date);
      this.calendarDays.push({
        date,
        dayOfMonth: day,
        isCurrentMonth: false,
        isToday: this.isToday(date),
        isWorkDay: this.workDays.includes(dateString),
        dateString
      });
    }
  }

  isToday(date: Date): boolean {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  }

  formatDateString(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  previousMonth() {
    if (this.currentMonth === 0) {
      this.currentMonth = 11;
      this.currentYear--;
    } else {
      this.currentMonth--;
    }
    this.loadSchedule();
  }

  nextMonth() {
    if (this.currentMonth === 11) {
      this.currentMonth = 0;
      this.currentYear++;
    } else {
      this.currentMonth++;
    }
    this.loadSchedule();
  }

  goToToday() {
    this.currentDate = new Date();
    this.currentMonth = this.currentDate.getMonth();
    this.currentYear = this.currentDate.getFullYear();
    this.loadSchedule();
  }

  getMonthYearLabel(): string {
    return `${this.monthNames[this.currentMonth]} ${this.currentYear}`;
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.day-dropdown') && !target.closest('.calendar-day.clickable')) {
      this.closeDropdown();
    }
  }

  onDayClick(event: Event, day: CalendarDay) {
    // Only allow clicks on current month days
    if (!day.isCurrentMonth) return;
    
    event.stopPropagation();
    
    // If clicking the same day, toggle dropdown
    if (this.selectedDay?.dateString === day.dateString) {
      this.closeDropdown();
      return;
    }
    
    this.selectedDay = day;
    
    // Calculate dropdown position relative to the clicked day
    const target = event.target as HTMLElement;
    const dayElement = target.closest('.calendar-day') as HTMLElement;
    const containerElement = target.closest('.calendar-container') as HTMLElement;
    
    if (dayElement && containerElement) {
      const rect = dayElement.getBoundingClientRect();
      const containerRect = containerElement.getBoundingClientRect();
      
      // Position dropdown below the day, aligned to left edge
      let left = rect.left - containerRect.left;
      let top = rect.bottom - containerRect.top + 5;
      
      // Adjust if dropdown would go off right edge (220px min-width)
      const dropdownWidth = 220;
      if (left + dropdownWidth > containerRect.width) {
        left = containerRect.width - dropdownWidth - 10;
      }
      
      // Adjust if dropdown would go off left edge
      if (left < 10) {
        left = 10;
      }
      
      this.dropdownPosition = { top, left };
    }
  }

  closeDropdown() {
    this.selectedDay = null;
    this.dropdownPosition = null;
  }

  async handleAssignWork() {
    if (!this.selectedDay) return;
    await this.assignWorkDay(this.selectedDay.dateString);
    this.closeDropdown();
  }

  async handleRemoveWork() {
    if (!this.selectedDay) return;
    await this.removeWorkDay(this.selectedDay.dateString);
    this.closeDropdown();
  }

  getFormattedDate(dateString: string): string {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return date.toLocaleDateString('en-US', options);
  }

  async assignWorkDay(dateString: string) {
    if (!this.userId) return;
    
    try {
      // Get current schedule
      const schedule = await firstValueFrom(this.scheduleService.getUserSchedule(this.userId));
      const currentWorkDays = schedule?.workDays || [];
      
      // Add the date if not already present
      if (!currentWorkDays.includes(dateString)) {
        const updatedWorkDays = [...currentWorkDays, dateString].sort();
        const currentUser = this.authService.currentUser$.value;
        await this.scheduleService.setWorkDays(
          this.userId,
          updatedWorkDays,
          currentUser?.uid
        );
        
        // Reload schedule to get updated work days for the month
        await this.loadSchedule();
      }
    } catch (error) {
      console.error('[UserScheduleCalendar] Error assigning work day:', error);
    }
  }

  async removeWorkDay(dateString: string) {
    if (!this.userId) return;
    
    try {
      // Get current schedule
      const schedule = await firstValueFrom(this.scheduleService.getUserSchedule(this.userId));
      const currentWorkDays = schedule?.workDays || [];
      
      // Remove the date
      const updatedWorkDays = currentWorkDays.filter(day => day !== dateString);
      const currentUser = this.authService.currentUser$.value;
      await this.scheduleService.setWorkDays(
        this.userId,
        updatedWorkDays,
        currentUser?.uid
      );
      
      // Reload schedule to get updated work days for the month
      await this.loadSchedule();
    } catch (error) {
      console.error('[UserScheduleCalendar] Error removing work day:', error);
    }
  }
}

