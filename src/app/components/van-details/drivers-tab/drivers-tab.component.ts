import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

interface DriverRecord {
  id: string;
  date: Date;
  driverName: string | null;
  driverId?: string;
}

@Component({
  selector: 'app-drivers-tab',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './drivers-tab.component.html',
  styleUrls: ['./drivers-tab.component.scss']
})
export class DriversTabComponent implements OnInit {
  @Input() vanId!: string;

  driverRecords: DriverRecord[] = [];

  ngOnInit() {
    this.loadDriverRecords();
  }

  private loadDriverRecords() {
    // TODO: Load from Firestore when you add driver tracking
    // For now, generating sample data for the last 2 weeks
    this.driverRecords = this.generateSampleDriverData();
  }

  private generateSampleDriverData(): DriverRecord[] {
    const records: DriverRecord[] = [];
    const drivers = ['Admin User', 'John Doe', 'Jane Smith'];
    
    // Generate last 14 days of data
    for (let i = 0; i < 14; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Skip some days (no driver assigned)
      const hasDriver = Math.random() > 0.2; // 80% chance of having a driver
      const driverName = hasDriver ? drivers[Math.floor(Math.random() * drivers.length)] : null;
      
      records.push({
        id: `record_${i}`,
        date: date,
        driverName: driverName,
        driverId: driverName ? `driver_${Math.floor(Math.random() * 3)}` : undefined
      });
    }
    
    return records;
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getDayName(date: Date): string {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }
}