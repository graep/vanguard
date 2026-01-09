import { Component, Input, Output, EventEmitter, OnInit, OnDestroy, ViewChild, ElementRef, OnChanges, SimpleChanges, AfterViewInit, HostListener } from '@angular/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import { CommonModule } from '@angular/common';
import {
  IonButton,
  IonIcon,
  Platform
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { camera, close, refresh } from 'ionicons/icons';

// Type definitions for ImageCapture API
interface PhotoSettings {
  fillLightMode?: 'auto' | 'off' | 'flash' | 'torch';
  imageWidth?: number;
  imageHeight?: number;
  redEyeReduction?: boolean;
}

declare global {
  interface Window {
    ImageCapture: {
      new (videoTrack: MediaStreamTrack): ImageCapture;
    };
  }
  
  class ImageCapture {
    constructor(videoTrack: MediaStreamTrack);
    takePhoto(photoSettings?: PhotoSettings): Promise<Blob>;
    getPhotoCapabilities(): Promise<PhotoCapabilities>;
    getPhotoSettings(): Promise<PhotoSettings>;
    track: MediaStreamTrack;
  }
  
  interface PhotoCapabilities {
    fillLightMode: string[];
    imageWidth: { min: number; max: number; step: number };
    imageHeight: { min: number; max: number; step: number };
    redEyeReduction: 'never' | 'always' | 'controllable';
  }
}

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

  private stream?: MediaStream;
  private imageCapture?: ImageCapture;
  isCapturing = false;
  capturedImage: string | null = null;
  private streamCheckInterval: any = null;
  private originalOrientation: string | null = null;
  private orientationChangeListener: (() => void) | null = null;
  currentOrientation: string = 'portrait';
  
  // Overlay properties
  alignmentOverlay = '';
  
  // Landscape mode properties
  isLandscape = false;
  showRotationPrompt = false;

  constructor(private platform: Platform) {
    addIcons({ camera, close, refresh });
  }

  async ngOnInit() {
    // Set overlay based on side name
    const overlays: Record<string, string> = {
      driver: 'assets/overlays/driverSideOverlay.png',
      passenger: 'assets/overlays/passengerSideOverlay.png',
      front: 'assets/overlays/frontOverlay.png',
      rear: 'assets/overlays/rearOverlay.png',
    };
    this.alignmentOverlay = overlays[this.sideName] || overlays['driver'];
    
    // Initialize landscape mode tracking
    this.isLandscape = window.innerWidth > window.innerHeight;
    this.showRotationPrompt = !this.isLandscape;
  }

  async ngAfterViewInit() {
    
    // Prevent body scroll
    document.body.classList.add('camera-open');
    
    // Set up orientation change listener
    this.setupOrientationListener();
    
    // Setup Android back button handling for camera
    this.setupCameraBackButton();
    
    // Wait a bit for the view to be fully initialized
    setTimeout(async () => {
      if (this.videoElement?.nativeElement) {
        // Start camera once - don't restart on rotate
        await this.startCamera();
        this.applyOrientationFix();
      } else {
        console.error('Video element not available after view init');
        this.cancelled.emit();
      }
    }, 100);
  }

  ngOnChanges(changes: SimpleChanges) {
    // Component changes handled
  }

  ngOnDestroy() {
    this.stopCamera();
    this.removeOrientationListener();
    
    // Clean up back button event listeners
    if ((this as any).popstateHandler) {
      window.removeEventListener('popstate', (this as any).popstateHandler);
    }
    if ((this as any).keydownHandler) {
      document.removeEventListener('keydown', (this as any).keydownHandler);
    }
    
    // Restore body scroll
    document.body.classList.remove('camera-open');
  }

  private async startCamera() {
    // Do not call this on every rotation
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    };

    try {
      // Check if we're on HTTPS or localhost
      const isSecure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
      
      if (!isSecure) {
        throw new Error('Camera access requires HTTPS. Please use https://vanguard-f8b90.web.app');
      }
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this device');
      }
      
      // Try to get camera permissions first
      try {
        await navigator.permissions.query({ name: 'camera' as PermissionName });
      } catch (permError) {
        // Permission query not supported, proceeding anyway
      }
      
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Create ImageCapture instance for flash control
      if (this.stream && 'ImageCapture' in window) {
        try {
          const videoTrack = this.stream.getVideoTracks()[0];
          if (videoTrack) {
            this.imageCapture = new ImageCapture(videoTrack);
          }
        } catch (error) {
          console.warn('ImageCapture not supported, flash control unavailable:', error);
        }
      }
      
      if (this.videoElement?.nativeElement) {
        this.videoElement.nativeElement.srcObject = this.stream;
        // Wait for the video to be ready with timeout
        await Promise.race([
          new Promise((resolve) => {
            this.videoElement.nativeElement.onloadedmetadata = resolve;
          }),
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Video metadata timeout')), 5000);
          })
        ]);
        
        await this.videoElement.nativeElement.play();
        
        // Set mirror for rear camera (no mirroring needed)
        this.setCssVar('--vid-mirror', '1');

        this.videoElement.nativeElement.onloadedmetadata = () => {
          this.applyOrientationFix();
        };
        
        // Also apply orientation fix after a short delay to ensure everything is ready
        setTimeout(() => {
          this.applyOrientationFix();
        }, 1000);
        
        // Start monitoring the stream
        this.startStreamMonitoring();
      } else {
        console.error('Video element not found');
        this.cancelled.emit();
        return;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      console.error('Error details:', {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined
      });
      
      // Check if it's a permission error
      if (error instanceof Error && error.name === 'NotAllowedError') {
        console.error('Camera permission denied by user');
        alert('Camera permission denied. Please allow camera access and try again.');
        this.cancelled.emit();
        return;
      }
      
      // Check if it's a constraint error
      if (error instanceof Error && error.name === 'OverconstrainedError') {
        console.error('Camera constraints not supported, trying fallback...');
      }
      
      // Check if it's a not found error
      if (error instanceof Error && error.name === 'NotFoundError') {
        console.error('No camera found on device');
        alert('No camera found on this device. Please use a device with a camera.');
        this.cancelled.emit();
        return;
      }
      
      // Check if it's a security error
      if (error instanceof Error && error.name === 'SecurityError') {
        console.error('Camera access blocked due to security policy');
        alert('Camera access is blocked. Please ensure you are using HTTPS and try again.');
        this.cancelled.emit();
        return;
      }
      
      // Fallback to any available camera
      try {
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
        if (this.videoElement?.nativeElement) {
          this.videoElement.nativeElement.srcObject = this.stream;
          await this.videoElement.nativeElement.play();
          this.startStreamMonitoring();
        }
      } catch (fallbackError) {
        console.error('Error accessing fallback camera:', fallbackError);
        alert('Unable to access camera. Please check your device settings and try again.');
        this.cancelled.emit();
      }
    }
  }

  private startStreamMonitoring() {
    this.streamCheckInterval = setInterval(() => {
      if (this.stream && !this.stream.active) {
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
      this.stream = undefined;
    }
  }

  private applyOrientationFix() {
    if (!this.videoElement?.nativeElement) {
      return;
    }

    const video = this.videoElement.nativeElement;
    
    // Wait for video metadata to be available
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      setTimeout(() => this.applyOrientationFix(), 100);
      return;
    }

    const naturalLandscape = video.videoWidth >= video.videoHeight;
    const screenLandscape = window.innerWidth >= window.innerHeight;

    const needsRotate = naturalLandscape !== screenLandscape;
    const rotationValue = needsRotate ? '90deg' : '0deg';

    this.setCssVar('--vid-rotate', rotationValue);
    
    // Also update the current orientation for debugging
    this.currentOrientation = screenLandscape ? 'landscape' : 'portrait';
  }

  private setCssVar(name: string, value: string) {
    if (!this.videoElement?.nativeElement) {
      return;
    }
    
    const video = this.videoElement.nativeElement;
    video.style.setProperty(name, value);
    
    // Also set on the camera-shell container for better compatibility
    const cameraShell = video.closest('.camera-shell');
    if (cameraShell) {
      (cameraShell as HTMLElement).style.setProperty(name, value);
    }
  }

  // Keep the same stream; just adjust layout on rotate/resize
  @HostListener('window:resize') onResize() { 
    // Add a small delay to ensure the resize is complete
    setTimeout(() => this.applyOrientationFix(), 100);
  }
  
  @HostListener('window:orientationchange') onOrientationChange() { 
    // Add a delay to ensure the orientation change is complete
    setTimeout(() => this.applyOrientationFix(), 300);
  }

  // Additional listener for PWA environments
  @HostListener('window:deviceorientation') onDeviceOrientation() {
    setTimeout(() => this.applyOrientationFix(), 100);
  }

  async capturePhoto() {
    if (!this.videoElement?.nativeElement || !this.canvasElement?.nativeElement) {
      return;
    }

    // Prevent photo capture in portrait mode
    if (!this.isLandscape) {
      return;
    }

    this.isCapturing = true;

    // Try to use ImageCapture API if available
    if (this.imageCapture && 'ImageCapture' in window) {
      try {
        // Set flash mode to 'off' to disable flash
        const photoSettings: PhotoSettings = {
          fillLightMode: 'off'
        };
        
        const blob = await this.imageCapture.takePhoto(photoSettings);
        const imageDataUrl = await this.blobToDataURL(blob);
        this.capturedImage = imageDataUrl;
        
        // Stop the camera stream
        this.stopCamera();
        this.isCapturing = false;
        return;
      } catch (error) {
        console.warn('ImageCapture with flash failed, falling back to canvas method:', error);
        // Fall through to canvas method
      }
    }

    // Fallback to canvas method if ImageCapture is not available or fails
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

    // Check if we need to rotate the canvas based on orientation
    const naturalLandscape = video.videoWidth >= video.videoHeight;
    const screenLandscape = window.innerWidth >= window.innerHeight;
    const needsRotate = naturalLandscape !== screenLandscape;

    if (needsRotate) {
      // Rotate canvas context before drawing
      context.save();
      context.translate(canvas.width / 2, canvas.height / 2);
      context.rotate(Math.PI / 2);
      context.translate(-canvas.height / 2, -canvas.width / 2);
      context.drawImage(video, 0, 0, canvas.height, canvas.width);
      context.restore();
    } else {
      // Draw the current video frame to canvas normally
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
    }

    // Convert canvas to data URL
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    this.capturedImage = imageDataUrl;

    // Stop the camera stream
    this.stopCamera();

    this.isCapturing = false;
  }

  private blobToDataURL(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
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
    this.stopCamera();
    this.removeOrientationListener();
    
    // Restore body scroll
    document.body.classList.remove('camera-open');
    
    this.cancelled.emit();
  }


  private setupOrientationListener() {
    this.orientationChangeListener = () => {
      this.handleOrientationChange();
    };
    
    // Listen for orientation changes
    window.addEventListener('orientationchange', this.orientationChangeListener);
    window.addEventListener('resize', this.orientationChangeListener);
    
    // Initial orientation check
    this.handleOrientationChange();
  }

  private removeOrientationListener() {
    if (this.orientationChangeListener) {
      window.removeEventListener('orientationchange', this.orientationChangeListener);
      window.removeEventListener('resize', this.orientationChangeListener);
      this.orientationChangeListener = null;
    }
  }

  private handleOrientationChange() {
    // Small delay to ensure the orientation change is complete
    setTimeout(() => {
      const orientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
      
      // Update landscape mode tracking
      this.isLandscape = orientation === 'landscape';
      this.showRotationPrompt = !this.isLandscape;
      
      if (this.currentOrientation !== orientation) {
        this.currentOrientation = orientation;
        this.applyOrientationFix();
      }
    }, 100);
  }

  private setupCameraBackButton() {
    // Multiple detection methods for Android
    const isAndroid = this.platform.is('android') || 
                     /Android/i.test(navigator.userAgent) ||
                     (window.navigator as any).standalone === true;

    if (isAndroid) {
      // Method 1: Ionic Platform back button (if available)
      if (this.platform.backButton) {
        this.platform.backButton.subscribeWithPriority(20, (processNextHandler) => {
          this.handleCameraBackButton();
          processNextHandler();
        });
      }

      // Method 2: Window popstate event (PWA fallback)
      const popstateHandler = (event: PopStateEvent) => {
        event.preventDefault();
        this.handleCameraBackButton();
      };
      window.addEventListener('popstate', popstateHandler);

      // Method 3: Document keydown event (additional fallback)
      const keydownHandler = (event: KeyboardEvent) => {
        if (event.key === 'Backspace' && event.target === document.body) {
          event.preventDefault();
          this.handleCameraBackButton();
        }
      };
      document.addEventListener('keydown', keydownHandler);

      // Store handlers for cleanup
      (this as any).popstateHandler = popstateHandler;
      (this as any).keydownHandler = keydownHandler;
    }
  }

  private handleCameraBackButton() {
    // If we have a captured image, go back to camera preview
    if (this.capturedImage) {
      this.retakePhoto();
      return;
    }
    
    // Otherwise, cancel the camera
    this.cancel();
  }
}
