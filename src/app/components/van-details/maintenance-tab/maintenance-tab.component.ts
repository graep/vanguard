import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

interface MaintenanceRecord {
  id: string;
  type: 'routine' | 'repair' | 'inspection';
  description: string;
  date: Date;
  mileage?: number;
  cost?: number;
  status: 'completed' | 'scheduled' | 'overdue';
  performedBy: string;
  notes?: string;
}

@Component({
  selector: 'app-maintenance-tab',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './maintenance-tab.component.html',
  styleUrls: ['./maintenance-tab.component.scss']
})
export class MaintenanceTabComponent implements OnInit {
  @Input() vanId!: string;

  maintenanceRecords: MaintenanceRecord[] = [];

  ngOnInit() {
    this.loadMaintenanceRecords();
  }

  private loadMaintenanceRecords() {
    // TODO: Load from Firestore when you add maintenance collection
    // Placeholder data for now
    this.maintenanceRecords = [
      {
        id: '1',
        type: 'routine',
        description: 'Oil Change & Filter Replacement',
        date: new Date('2024-12-10'),
        mileage: 25000,
        cost: 89.99,
        status: 'completed',
        performedBy: 'Fleet Maintenance Team',
        notes: 'Used synthetic oil. Next service due at 28,000 miles.'
      },
      {
        id: '2',
        type: 'inspection',
        description: 'Annual Safety Inspection',
        date: new Date('2024-11-15'),
        mileage: 24500,
        status: 'completed',
        performedBy: 'Certified Inspector',
        notes: 'All safety systems passed. Certificate valid until November 2025.'
      },
      {
        id: '3',
        type: 'repair',
        description: 'Brake Pad Replacement',
        date: new Date('2025-01-15'),
        status: 'scheduled',
        performedBy: 'TBD',
        notes: 'Front brake pads showing wear. Replacement scheduled for mid-January.'
      },
      {
        id: '4',
        type: 'routine',
        description: 'Tire Rotation & Alignment',
        date: new Date('2024-10-20'),
        mileage: 23000,
        cost: 125.50,
        status: 'completed',
        performedBy: 'Tire Service Center',
        notes: 'Tires rotated and aligned. Tire pressure adjusted to specifications.'
      },
      {
        id: '5',
        type: 'inspection',
        description: 'Battery Performance Check',
        date: new Date('2024-12-05'),
        mileage: 24800,
        status: 'completed',
        performedBy: 'Electric Vehicle Specialist',
        notes: 'Battery health excellent at 95% capacity. Charging system optimal.'
      }
    ];
  }

  getMaintenanceIcon(type: string): string {
    switch (type) {
      case 'routine': return 'refresh';
      case 'repair': return 'hammer';
      case 'inspection': return 'search';
      default: return 'build';
    }
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'completed': return 'success';
      case 'scheduled': return 'warning';
      case 'overdue': return 'danger';
      default: return 'medium';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'completed': return 'Completed';
      case 'scheduled': return 'Scheduled';
      case 'overdue': return 'Overdue';
      default: return 'Unknown';
    }
  }

  getCompletedCount(): number {
    return this.maintenanceRecords.filter(r => r.status === 'completed').length;
  }

  getScheduledCount(): number {
    return this.maintenanceRecords.filter(r => r.status === 'scheduled').length;
  }

  getOverdueCount(): number {
    return this.maintenanceRecords.filter(r => r.status === 'overdue').length;
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
}