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
  isCapturing = false;
  capturedImage: string | null = null;
  private streamCheckInterval: any = null;
  private originalOrientation: string | null = null;
  private orientationChangeListener: (() => void) | null = null;
  currentOrientation: string = 'portrait';
  
  // Overlay properties
  alignmentOverlay = '';
  
  // Debug properties
  debugMessage = '';
  showDebug = true;
  
  // Landscape mode properties
  isLandscape = false;
  showRotationPrompt = false;

  constructor(private platform: Platform) {
    addIcons({ camera, close, refresh });
  }

  private setDebugMessage(message: string) {
    this.debugMessage = message;
    console.log('DEBUG:', message);
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
    
    // Initialize landscape mode tracking
    this.isLandscape = window.innerWidth > window.innerHeight;
    this.showRotationPrompt = !this.isLandscape;
    
    // Test if we can access the DOM
    console.log('Document ready state:', document.readyState);
    console.log('Window inner dimensions:', window.innerWidth, 'x', window.innerHeight);
    console.log('Initial landscape mode:', this.isLandscape);
  }

  async ngAfterViewInit() {
    console.log('FullscreenCameraComponent ngAfterViewInit');
    console.log('Video element available:', !!this.videoElement?.nativeElement);
    
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
    console.log('FullscreenCameraComponent ngOnChanges', changes);
  }

  ngOnDestroy() {
    console.log('FullscreenCameraComponent ngOnDestroy');
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
      console.log('Starting camera...');
      console.log('Video element available:', !!this.videoElement?.nativeElement);
      console.log('Video element:', this.videoElement?.nativeElement);
      console.log('navigator.mediaDevices available:', !!navigator.mediaDevices);
      console.log('getUserMedia available:', !!navigator.mediaDevices?.getUserMedia);
      console.log('Constraints:', constraints);
      
      // Check if we're on HTTPS or localhost
      const isSecure = location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1';
      console.log('Secure context:', isSecure);
      console.log('Current URL:', location.href);
      
      if (!isSecure) {
        throw new Error('Camera access requires HTTPS. Please use https://vanguard-f8b90.web.app');
      }
      
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported on this device');
      }
      
      console.log('About to call getUserMedia...');
      
      // Try to get camera permissions first
      try {
        await navigator.permissions.query({ name: 'camera' as PermissionName });
      } catch (permError) {
        console.log('Permission query not supported, proceeding anyway');
      }
      
      this.stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      console.log('Camera stream obtained:', this.stream);
      console.log('Stream active:', this.stream.active);
      console.log('Stream tracks:', this.stream.getTracks().length);
      
      if (this.videoElement?.nativeElement) {
        console.log('Setting video srcObject...');
        this.videoElement.nativeElement.srcObject = this.stream;
        
        console.log('Waiting for video metadata...');
        // Wait for the video to be ready with timeout
        await Promise.race([
          new Promise((resolve) => {
            this.videoElement.nativeElement.onloadedmetadata = resolve;
          }),
          new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Video metadata timeout')), 5000);
          })
        ]);
        
        console.log('Playing video...');
        await this.videoElement.nativeElement.play();
        console.log('Video element playing');
        console.log('Video dimensions:', this.videoElement.nativeElement.videoWidth, 'x', this.videoElement.nativeElement.videoHeight);
        
        // Set mirror for rear camera (no mirroring needed)
        this.setCssVar('--vid-mirror', '1');

        this.videoElement.nativeElement.onloadedmetadata = () => {
          console.log('Video metadata loaded, applying initial orientation fix');
          this.applyOrientationFix();
        };
        
        // Also apply orientation fix after a short delay to ensure everything is ready
        setTimeout(() => {
          console.log('Applying delayed orientation fix');
          this.applyOrientationFix();
        }, 1000);
        
        // Start monitoring the stream
        this.startStreamMonitoring();
        console.log('Camera successfully started!');
      } else {
        console.error('Video element not found');
        console.log('Emitting cancelled event due to missing video element');
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
        console.log('Trying fallback camera...');
        this.stream = await navigator.mediaDevices.getUserMedia({
          video: true
        });
        if (this.videoElement?.nativeElement) {
          this.videoElement.nativeElement.srcObject = this.stream;
          await this.videoElement.nativeElement.play();
          console.log('Fallback camera started');
          this.startStreamMonitoring();
        }
      } catch (fallbackError) {
        console.error('Error accessing fallback camera:', fallbackError);
        alert('Unable to access camera. Please check your device settings and try again.');
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
      this.stream = undefined;
    }
  }

  private applyOrientationFix() {
    if (!this.videoElement?.nativeElement) {
      console.log('Video element not available for orientation fix');
      return;
    }

    const video = this.videoElement.nativeElement;
    
    // Wait for video metadata to be available
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.log('Video metadata not ready, retrying...');
      setTimeout(() => this.applyOrientationFix(), 100);
      return;
    }

    const naturalLandscape = video.videoWidth >= video.videoHeight;
    const screenLandscape = window.innerWidth >= window.innerHeight;

    const needsRotate = naturalLandscape !== screenLandscape;
    const rotationValue = needsRotate ? '90deg' : '0deg';
    
    console.log('Applying orientation fix:', {
      videoSize: `${video.videoWidth}x${video.videoHeight}`,
      screenSize: `${window.innerWidth}x${window.innerHeight}`,
      naturalLandscape,
      screenLandscape,
      needsRotate,
      rotationValue
    });

    this.setCssVar('--vid-rotate', rotationValue);
    
    // Also update the current orientation for debugging
    this.currentOrientation = screenLandscape ? 'landscape' : 'portrait';
  }

  private setCssVar(name: string, value: string) {
    if (!this.videoElement?.nativeElement) {
      console.log('Cannot set CSS var - video element not available');
      return;
    }
    
    const video = this.videoElement.nativeElement;
    video.style.setProperty(name, value);
    
    // Also set on the camera-shell container for better compatibility
    const cameraShell = video.closest('.camera-shell');
    if (cameraShell) {
      (cameraShell as HTMLElement).style.setProperty(name, value);
    }
    
    console.log(`Set CSS variable ${name} = ${value}`);
  }

  // Keep the same stream; just adjust layout on rotate/resize
  @HostListener('window:resize') onResize() { 
    console.log('Window resize detected');
    // Add a small delay to ensure the resize is complete
    setTimeout(() => this.applyOrientationFix(), 100);
  }
  
  @HostListener('window:orientationchange') onOrientationChange() { 
    console.log('Orientation change detected');
    // Add a delay to ensure the orientation change is complete
    setTimeout(() => this.applyOrientationFix(), 300);
  }

  // Additional listener for PWA environments
  @HostListener('window:deviceorientation') onDeviceOrientation() {
    console.log('Device orientation detected');
    setTimeout(() => this.applyOrientationFix(), 100);
  }

  async capturePhoto() {
    if (!this.videoElement?.nativeElement || !this.canvasElement?.nativeElement) {
      return;
    }

    // Prevent photo capture in portrait mode
    if (!this.isLandscape) {
      console.log('Photo capture blocked: Device must be in landscape mode');
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

  retakePhoto() {
    this.capturedImage = null;
    this.startCamera();
  }


  debugOrientation() {
    console.log('Manual orientation debug triggered');
    console.log('Current video element:', this.videoElement?.nativeElement);
    console.log('Current video dimensions:', this.videoElement?.nativeElement?.videoWidth, 'x', this.videoElement?.nativeElement?.videoHeight);
    console.log('Window dimensions:', window.innerWidth, 'x', window.innerHeight);
    console.log('Current orientation:', this.currentOrientation);
    
    // Force orientation fix
    this.applyOrientationFix();
    
    // Show debug message
    this.setDebugMessage(`Debug: ${this.currentOrientation} - Video: ${this.videoElement?.nativeElement?.videoWidth}x${this.videoElement?.nativeElement?.videoHeight}`);
  }

  confirmPhoto() {
    if (this.capturedImage) {
      this.photoCaptured.emit(this.capturedImage);
    }
  }

  cancel() {
    console.log('cancel() called - camera component is cancelling');
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
      console.log('Orientation changed to:', orientation);
      
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
    console.log('Setting up camera back button handling');
    console.log('Platform info:', {
      isAndroid: this.platform.is('android'),
      isMobile: this.platform.is('mobile'),
      isPWA: this.platform.is('pwa'),
      userAgent: navigator.userAgent,
      standalone: (window.navigator as any).standalone
    });

    // Multiple detection methods for Android
    const isAndroid = this.platform.is('android') || 
                     /Android/i.test(navigator.userAgent) ||
                     (window.navigator as any).standalone === true;

    if (isAndroid) {
      console.log('Android detected - setting up camera back button handling');
      
      // Method 1: Ionic Platform back button (if available)
      if (this.platform.backButton) {
        console.log('Using Ionic Platform back button handler for camera');
        this.platform.backButton.subscribeWithPriority(20, (processNextHandler) => {
          console.log('Android back button pressed in camera (Ionic Platform)');
          this.handleCameraBackButton();
          processNextHandler();
        });
      }

      // Method 2: Window popstate event (PWA fallback)
      console.log('Setting up window popstate handler for camera');
      const popstateHandler = (event: PopStateEvent) => {
        console.log('Window popstate event triggered in camera');
        event.preventDefault();
        this.handleCameraBackButton();
      };
      window.addEventListener('popstate', popstateHandler);

      // Method 3: Document keydown event (additional fallback)
      console.log('Setting up document keydown handler for camera');
      const keydownHandler = (event: KeyboardEvent) => {
        if (event.key === 'Backspace' && event.target === document.body) {
          console.log('Backspace key pressed on body in camera');
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
    console.log('Handling camera back button press');
    
    // If we have a captured image, go back to camera preview
    if (this.capturedImage) {
      console.log('Going back to camera preview');
      this.retakePhoto();
      return;
    }
    
    // Otherwise, cancel the camera
    console.log('Cancelling camera');
    this.cancel();
  }
}
