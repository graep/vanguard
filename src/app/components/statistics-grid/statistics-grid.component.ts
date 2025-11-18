import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { 
  IonCard, 
  IonCardHeader, 
  IonCardTitle, 
  IonCardContent,
  IonIcon,
  IonButton
} from '@ionic/angular/standalone';

export interface StatCard {
  id: string;
  sectionId: string;
  type: 'card' | 'compact';
  title: string;
  icon: string;
  iconClass?: string;
  cardClass?: string;
  value: string | number;
  label: string;
  valueType: 'number' | 'percentage' | 'custom';
  order: number;
  size: '1x1' | '2x1' | '2x2';
  customColor?: string; // Hex color for custom tile background
}

@Component({
  selector: 'app-statistics-grid',
  standalone: true,
  imports: [
    CommonModule,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonIcon,
    IonButton
  ],
  templateUrl: './statistics-grid.component.html',
  styleUrls: ['./statistics-grid.component.scss']
})
export class StatisticsGridComponent {
  @Input() cards: StatCard[] = [];
  @Input() isEditMode: boolean = false;
  @Input() vanStats: any;
  @Input() inspectionStats: any;
  @Input() driverStats: any;
  @Input() userStats: any;
  @Input() operationalHealth: any;
  @Output() cardMoved = new EventEmitter<{ cardId: string; direction: 'up' | 'down' | 'left' | 'right' }>();
  @Output() cardColorChanged = new EventEmitter<{ cardId: string; color: string }>();
  @Output() cardClicked = new EventEmitter<{ cardId: string }>();
  
  selectedCardId: string | null = null;
  showColorPicker: boolean = false;
  colorPickerCardId: string | null = null;
  
  // Predefined color options
  colorOptions = [
    { name: 'Default', value: null },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Green', value: '#10b981' },
    { name: 'Red', value: '#ef4444' },
    { name: 'Yellow', value: '#f59e0b' },
    { name: 'Purple', value: '#8b5cf6' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Orange', value: '#f97316' },
  ];

  trackByCardId(index: number, card: StatCard): string {
    return card.id;
  }

  formatNumber(num: number): string {
    return num.toLocaleString();
  }

  formatPercentage(num: number): string {
    return `${Math.round(num)}%`;
  }

  getCardValue(card: StatCard): string {
    if (card.valueType === 'percentage' && typeof card.value === 'number') {
      return this.formatPercentage(card.value);
    } else if (card.valueType === 'number' && typeof card.value === 'number') {
      return this.formatNumber(card.value);
    }
    return String(card.value);
  }

  onCardClick(card: StatCard, event: Event): void {
    if (this.isEditMode) {
      // Edit mode: handle selection
      event.stopPropagation();
      
      if (this.selectedCardId === card.id) {
        // Deselect if clicking the same card
        this.selectedCardId = null;
      } else {
        // Select the clicked card
        this.selectedCardId = card.id;
      }
    } else {
      // Normal mode: emit click event
      event.stopPropagation();
      this.cardClicked.emit({ cardId: card.id });
    }
  }

  onArrowClick(direction: 'up' | 'down' | 'left' | 'right', event: Event): void {
    if (!this.selectedCardId) return;
    event.stopPropagation();
    this.cardMoved.emit({ cardId: this.selectedCardId, direction });
    // Keep the card selected after movement
  }

  isCardSelected(cardId: string): boolean {
    return this.selectedCardId === cardId;
  }

  onClickOutside(): void {
    this.selectedCardId = null;
    this.showColorPicker = false;
    this.colorPickerCardId = null;
  }
  
  onColorButtonClick(card: StatCard, event: Event): void {
    event.stopPropagation();
    if (this.colorPickerCardId === card.id && this.showColorPicker) {
      // Close color picker if clicking the same card's color button
      this.showColorPicker = false;
      this.colorPickerCardId = null;
    } else {
      // Open color picker for this card
      this.showColorPicker = true;
      this.colorPickerCardId = card.id;
    }
  }
  
  onColorSelect(card: StatCard, color: string | null): void {
    this.cardColorChanged.emit({ cardId: card.id, color: color || '' });
    this.showColorPicker = false;
    this.colorPickerCardId = null;
  }
  
  getCardColor(card: StatCard): string {
    if (card.customColor) {
      return card.customColor;
    }
    return ''; // Return empty string for default styling
  }
}

