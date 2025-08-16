// src/app/components/image-viewer/image-viewer.component.ts
import { Component, Input, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, ModalController } from '@ionic/angular';

@Component({
  selector: 'app-image-viewer',
  standalone: true,
  imports: [CommonModule, IonicModule],
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>Image Viewer</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="reset()">Reset</ion-button>
          <ion-button (click)="close()">Close</ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content fullscreen class="viewer-content" [scrollY]="false">
      <div class="stage"
           (mousedown)="startPan($event)"
           (mousemove)="onPan($event)"
           (mouseup)="endPan()"
           (mouseleave)="endPan()"
           (dblclick)="zoomAtCenter(1.25)">
        <img [src]="imageUrl"
             [style.transform]="transform"
             draggable="false"
             alt="Full size" />
      </div>
    </ion-content>
  `,
  styles: [`
    .viewer-content { --background: #000; }
    .stage {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;           /* keep panning inside */
      cursor: grab;
    }
    .stage.dragging { cursor: grabbing; }
    img {
      user-select: none;
      -webkit-user-drag: none;
      max-width: none;            /* allow scaling beyond container size */
      max-height: none;
      will-change: transform;
      transform-origin: 0 0;      /* we manage origin by translating */
    }
  `]
})
export class ImageViewerComponent {
  @Input() imageUrl!: string;

  // transform state
  scale = 1;
  tx = 0;
  ty = 0;

  // panning state
  private dragging = false;
  private startX = 0;
  private startY = 0;
  private startTx = 0;
  private startTy = 0;

  constructor(private modalCtrl: ModalController) {}

  get transform() {
    return `translate3d(${this.tx}px, ${this.ty}px, 0) scale(${this.scale})`;
  }

  close() { this.modalCtrl.dismiss(); }
  reset() { this.scale = 1; this.tx = 0; this.ty = 0; }

  // Desktop scroll zoom (Ctrl+wheel is not required here)
  @HostListener('wheel', ['$event'])
  onWheel(ev: WheelEvent) {
    ev.preventDefault(); // important so the page doesn't scroll
    const rect = (ev.currentTarget as HTMLElement).getBoundingClientRect();
    const mouseX = ev.clientX - rect.left;
    const mouseY = ev.clientY - rect.top;

    const zoom = ev.deltaY < 0 ? 1.1 : 0.9;         // in / out
    const newScale = this.clamp(this.scale * zoom, 0.25, 8);

    // Zoom towards the mouse position (keep that point stable)
    const k = newScale / this.scale;
    this.tx = mouseX - k * (mouseX - this.tx);
    this.ty = mouseY - k * (mouseY - this.ty);
    this.scale = newScale;
  }

  zoomAtCenter(factor: number) {
    const el = document.querySelector('.stage') as HTMLElement;
    const rect = el.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;

    const newScale = this.clamp(this.scale * factor, 0.25, 8);
    const k = newScale / this.scale;
    this.tx = cx - k * (cx - this.tx);
    this.ty = cy - k * (cy - this.ty);
    this.scale = newScale;
  }

  startPan(e: MouseEvent) {
    this.dragging = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.startTx = this.tx;
    this.startTy = this.ty;
    (e.currentTarget as HTMLElement).classList.add('dragging');
  }
  onPan(e: MouseEvent) {
    if (!this.dragging) return;
    this.tx = this.startTx + (e.clientX - this.startX);
    this.ty = this.startTy + (e.clientY - this.startY);
  }
  endPan() {
    this.dragging = false;
    document.querySelector('.stage')?.classList.remove('dragging');
  }

  private clamp(v: number, a: number, b: number) {
    return Math.max(a, Math.min(b, v));
  }
}
