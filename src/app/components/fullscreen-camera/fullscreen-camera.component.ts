import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef, OnChanges, SimpleChanges, AfterViewInit } from '@angular/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { CommonModule } from '@angular/common';
import {
  IonButton,
  IonIcon
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { camera, close, refresh } from 'ionicons/icons';

@Component({
  selector: 'app-fullscreen-camera',
  templateUrl: './fullscreen-camera.component.html',
  styleUrls: ['./fullscreen-camera.component.scss'],
  standalone: true,
  imports: [
    IonButton,
    IonIcon,
    CommonModule
  ],
})
export class FullscreenCameraComponent implements OnInit, OnDestroy, OnChanges, AfterViewInit {
  @Input() sideName: string = '';
  @Output() photoCaptured = new EventEmitter<string>();
  @Output() cancelled = new EventEmitter<void>();

  @ViewChild('videoElement', { static: false }) videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement', { static: false }) canvasElement!: ElementRef<HTMLCanvasElement>;

  private stream: MediaStream | null = null;
  isCapturing = false;
  capturedImage: string | null = null;
  private streamCheckInterval: any = null;
  private originalOrientation: string | null = null;
  
  // Overlay properties
  alignmentOverlay = '';

  constructor() {
    addIcons({ camera, close, refresh });
  }

  async ngOnInit() {
    console.log('FullscreenCameraComponent ngOnInit');
    console.log('sideName:', this.sideName);
    
    // Set overlay based on side name
    const overlays: Record<string, string> = {
      driver: 'assets/overlays/driverSideOverlay.png',
      passenger: 'assets/overlays/passengerSideOverlay.png',
      front: 'assets/overlays/frontOverlay.png',
      rear: 'assets/overlays/rearOverlay.png',
    };
    this.alignmentOverlay = overlays[this.sideName] || overlays['driver'];
    console.log('alignmentOverlay set to:', this.alignmentOverlay);
  }

  async ngAfterViewInit() {
    console.log('FullscreenCameraComponent ngAfterViewInit');
    console.log('Video element available:', !!this.videoElement?.nativeElement);
    
    // Lock to landscape orientation
    await this.lockToLandscape();
    
    // Add a small delay to ensure the view is fully initialized
    setTimeout(async () => {
      console.log('About to start camera after delay...');
      await this.startCamera();
    }, 200);
  }

  ngOnChanges(changes: SimpleChanges) {
    console.log('FullscreenCameraComponent ngOnChanges', changes);
  }

  ngOnDestroy() {
    console.log('FullscreenCameraComponent ngOnDestroy');
    this.stopCamera();
    this.unlockOrientation();
  }

  private async startCamera() {
    try {
      console.log('Starting camera...');
      console.log('Video element available:', !!this.videoElement?.nativeElement);
      
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });
      
      console.log('Camera stream obtained:', this.stream);
      console.log('Stream active:', this.stream.active);
      console.log('Stream tracks:', this.stream.getTracks().length);
      
      if (this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.srcObject = this.stream;
        
        // Wait for the video to be ready
        await new Promise((resolve) => {
          this.videoElement.nativeElement.onloadedmetadata = resolve;
        });
        
        await this.videoElement.nativeElement.play();
        console.log('Video element playing');
        console.log('Video dimensions:', this.videoElement.nativeElement.videoWidth, 'x', this.videoElement.nativeElement.videoHeight);
        
        // Start monitoring the stream
        this.startStreamMonitoring();
      } else {
        console.error('Video element not found');
        console.log('Emitting cancelled event due to missing video element');
        this.cancelled.emit();
        return;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      // Fallback to any available camera
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
        if (this.videoElement?.nativeElement) {
          this.videoElement.nativeElement.srcObject = this.stream;
          await this.videoElement.nativeElement.play();
          console.log('Fallback camera started');
        }
      } catch (fallbackError) {
        console.error('Error accessing fallback camera:', fallbackError);
        console.log('Emitting cancelled event due to camera failure');
        this.cancelled.emit();
      }
    }
  }

  private startStreamMonitoring() {
    this.streamCheckInterval = setInterval(() => {
      if (this.stream && !this.stream.active) {
        console.log('Stream became inactive, restarting camera...');
        this.restartCamera();
      }
    }, 1000);
  }

  private stopStreamMonitoring() {
    if (this.streamCheckInterval) {
      clearInterval(this.streamCheckInterval);
      this.streamCheckInterval = null;
    }
  }

  private async restartCamera() {
    this.stopCamera();
    await this.startCamera();
  }

  private stopCamera() {
    this.stopStreamMonitoring();
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }
  }

  async capturePhoto() {
    if (!this.videoElement?.nativeElement || !this.canvasElement?.nativeElement) {
      return;
    }

    this.isCapturing = true;

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext('2d');

    if (!context) {
      this.isCapturing = false;
      return;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw the current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert canvas to data URL
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    this.capturedImage = imageDataUrl;

    // Stop the camera stream
    this.stopCamera();

    this.isCapturing = false;
  }

  retakePhoto() {
    this.capturedImage = null;
    this.startCamera();
  }

  confirmPhoto() {
    if (this.capturedImage) {
      this.photoCaptured.emit(this.capturedImage);
    }
  }

  cancel() {
    console.log('cancel() called - camera component is cancelling');
    this.stopCamera();
    this.unlockOrientation();
    this.cancelled.emit();
  }

  private async lockToLandscape() {
    try {
      // Get current orientation
      const currentOrientation = await ScreenOrientation.orientation();
      this.originalOrientation = currentOrientation.type;
      console.log('Current orientation:', this.originalOrientation);
      
      // Lock to landscape
      await ScreenOrientation.lock({ orientation: 'landscape' });
      console.log('Locked to landscape orientation');
    } catch (error) {
      console.log('Could not lock orientation (may not be supported on this device):', error);
    }
  }

  private async unlockOrientation() {
    try {
      if (this.originalOrientation) {
        await ScreenOrientation.unlock();
        console.log('Unlocked orientation, restored to:', this.originalOrientation);
      }
    } catch (error) {
      console.log('Could not unlock orientation:', error);
    }
  }
}
