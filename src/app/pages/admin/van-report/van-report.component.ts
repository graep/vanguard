// src/app/pages/dashboard/van-report/van-report.component.ts
import { Component, OnInit, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController, ToastController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { InspectionService, Inspection } from 'src/app/services/inspection.service';
import { AuthService } from 'src/app/services/auth.service';
import { BreadcrumbService } from '@app/services/breadcrumb.service';
import { BreadcrumbItem } from '@app/components/breadcrumb/breadcrumb.component';

type Side = 'front' | 'passenger' | 'rear' | 'driver';

@Component({
  selector: 'app-van-report',
  standalone: true,
  imports: [CommonModule, IonicModule],
  templateUrl: './van-report.component.html',
  styleUrls: ['./van-report.component.scss'],
  host: {
    '[class.review-mode]': 'reviewMode'
  }
})
export class VanReportComponent implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private insp = inject(InspectionService);
  private auth = inject(AuthService);
  private toast = inject(ToastController);
  private alert = inject(AlertController);
  private breadcrumbService = inject(BreadcrumbService);
  
  private resizeObserver?: ResizeObserver;
  private windowResizeHandler?: () => void;

  currReportItems: any[] = [];
  prevReportItems: any[] = [];
  comparisonRows: { side: string; prevUrl: string; currUrl: string }[] = [];
  longerReportItems: any[] = [];

  currInspectionId: string | null = null;
  currentInspection: any = null;
  previousInspection: any = null;
  currentSubmitterName: string = 'Unknown';
  previousSubmitterName: string = 'Unknown';
  loading = true;
  errorMsg = '';
  reviewMode = false;
  expandedImage: string | null = null;
  unsurePhotoModal: { photoUrl: string; description: string } | null = null;

  async ngOnInit() {
    this.loading = true;
    this.reviewMode = this.route.snapshot.queryParamMap.get('review') === '1';

    // If coming from Van Details, the tail is already primed. If the van node is present
    // but missing the final label, append it immediately; otherwise wait for data load.
    const existingTail = this.breadcrumbService.getTail();
    if (existingTail && existingTail.length > 0 && existingTail[existingTail.length - 1]?.label !== 'Van Report') {
      this.setBreadcrumbTail([...existingTail, { label: 'Van Report' }]);
    }

    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.errorMsg = 'No inspection id provided.';
      this.loading = false;
      return;
    }

    try {
      // 1. Load current inspection
      const curr = await this.insp.getInspectionById(id);
      if (!curr) throw new Error('Inspection not found.');
      this.currInspectionId = curr.id;
      this.currentInspection = curr;

      // 2. Load latest 2 inspections for this van
      const latestTwo = await this.insp.getLatestInspectionsByVan(curr.vanType, curr.vanNumber, 2);
      const prev = latestTwo.find(x => x.id !== curr.id);
      this.previousInspection = prev;

      // 3. Build rows for comparison
      this.buildComparisonRows([curr, prev].filter(Boolean) as Inspection[]);
      this.currReportItems = curr.report ?? [];
      this.prevReportItems = prev?.report ?? [];
      this.updateLongerReportItems();

      // 4. Load user display names
      await this.loadUserDisplayNames();

      // 5. Breadcrumbs: Only append or construct if missing
      const currentTail = this.breadcrumbService.getTail();
      if (!currentTail || currentTail.length === 0) {
        // No tail exists (direct navigation) → set Van node + Van Report
        const vanLabel = `${(curr.vanType || '').toUpperCase()} ${curr.vanNumber}`;
        this.setBreadcrumbTail([
          { label: vanLabel, icon: 'car' },
          { label: 'Van Report' }
        ]);
      } else if (currentTail[currentTail.length - 1]?.label !== 'Van Report') {
        // Tail exists (e.g., EDV 1) → append Van Report without replacing existing items
        this.setBreadcrumbTail([...currentTail, { label: 'Van Report' }]);
      }
    } catch (e: any) {
      this.errorMsg = e?.message ?? 'Failed to load report.';
      this.buildComparisonRows([]);
      this.currReportItems = [];
      this.prevReportItems = [];
      this.updateLongerReportItems();
    } finally {
      this.loading = false;
    }
  }

  private setBreadcrumbTail(items: BreadcrumbItem[]): void {
    try {
      this.breadcrumbService.setTail(items);
    } catch {}
  }

  private buildComparisonRows(reports: Inspection[]) {
    const order: Side[] = ['front', 'passenger', 'rear', 'driver'];
    const prev = reports[1]?.photos ?? {};
    const curr = reports[0]?.photos ?? {};

    this.comparisonRows = order.map(side => ({
      side,
      prevUrl: (prev as any)[side] ?? '',
      currUrl: (curr as any)[side] ?? '',
    }));
  }

  private async loadUserDisplayNames() {
    try {
      // Load current inspection submitter name
      if (this.currentInspection?.createdBy) {
        const currentUser = await this.auth.getUserProfile(this.currentInspection.createdBy);
        this.currentSubmitterName = currentUser?.displayName || 'Unknown';
      }

      // Load previous inspection submitter name
      if (this.previousInspection?.createdBy) {
        const previousUser = await this.auth.getUserProfile(this.previousInspection.createdBy);
        this.previousSubmitterName = previousUser?.displayName || 'Unknown';
      }
    } catch (error) {
      console.error('Failed to load user display names:', error);
    }
  }

  toggleImageExpansion(url: string) {
    // If clicking the same image or backdrop, close it
    if (this.expandedImage === url || url === '') {
      this.expandedImage = null;
    } else {
      this.expandedImage = url;
    }
  }

  // ----- Unsure Photo Modal -----
  viewUnsurePhoto(photoUrl: string, description: string) {
    this.unsurePhotoModal = { photoUrl, description };
  }

  closeUnsurePhotoModal() {
    this.unsurePhotoModal = null;
  }

  // ----- Approve / Deny -----
  async approve() {
    if (!this.currInspectionId) return;
    await this.insp.approveInspection(this.currInspectionId);
    (await this.toast.create({ message: 'Approved', duration: 1400 })).present();
    this.router.navigate(['/admin']);
  }

  async deny() {
    if (!this.currInspectionId) return;
    const a = await this.alert.create({
      header: 'Reject submission?',
      inputs: [{ name: 'reason', type: 'text', placeholder: 'Reason (optional)' }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Reject',
          role: 'confirm',
          handler: async (data: any) => {
            await this.insp.rejectInspection(this.currInspectionId!, data?.reason);
            (await this.toast.create({ message: 'Rejected', duration: 1400 })).present();
            this.router.navigate(['/admin']);
          },
        },
      ],
    });
    await a.present();
  }

  // Update longer report items array (matches comparisonRows pattern)
  updateLongerReportItems(): void {
    const prevLen = this.prevReportItems?.length || 0;
    const currLen = this.currReportItems?.length || 0;
    this.longerReportItems = prevLen >= currLen ? (this.prevReportItems || []) : (this.currReportItems || []);
  }

  ngAfterViewInit() {
    // Wait a bit for DOM to be fully rendered
    setTimeout(() => {
      // Align arrows immediately
      this.alignArrowsToImageCenters();
      
      // Set up ResizeObserver to dynamically adjust when images resize
      this.setupResizeObserver();
    }, 100);
    
    // Also align after a longer delay to catch any late-loading images
    setTimeout(() => this.alignArrowsToImageCenters(), 500);
  }

  ngOnDestroy(): void {
    // Clean up ResizeObserver
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    // Clean up resize timeout
    if ((this as any)._resizeTimeout) {
      clearTimeout((this as any)._resizeTimeout);
    }
    // Remove window resize listener
    if (this.windowResizeHandler) {
      window.removeEventListener('resize', this.windowResizeHandler);
    }
    // Do not clear tail here; allows immediate back-nav without flicker
  }

  /**
   * Programmatically positions arrows at the exact center of each img.photo element
   * This always finds the center of the actual image, regardless of its size changes
   * Made public so it can be called from template (load events)
   */
  alignArrowsToImageCenters(): void {
    // Only run on desktop (where arrows are visible)
    if (window.innerWidth < 768) return;

    const arrowContainers = document.querySelectorAll('.arrow-container');
    // Get the actual img.photo elements (not containers) from the previous/left column
    const previousPhotos = document.querySelectorAll('.photos-section ion-col:first-child .photo');
    
    arrowContainers.forEach((arrowContainer, index) => {
      const photo = previousPhotos[index] as HTMLImageElement;
      const arrowEl = arrowContainer as HTMLElement;
      
      if (photo && arrowEl) {
        // Get the photo's actual bounding box (the img.photo element itself)
        const photoRect = photo.getBoundingClientRect();
        
        // Skip if photo hasn't loaded or has zero dimensions
        if (photoRect.height === 0 || photoRect.width === 0) {
          return;
        }
        
        // Calculate the vertical center point of the photo image itself
        const photoCenterY = photoRect.top + (photoRect.height / 2);
        
        // Get the arrow container's parent (arrow-containers) position for relative positioning
        const arrowContainersParent = arrowEl.closest('.arrow-containers') as HTMLElement;
        if (!arrowContainersParent) return;
        
        const parentRect = arrowContainersParent.getBoundingClientRect();
        
        // Calculate the position relative to the parent container
        // This accounts for any padding on the arrow-containers parent
        const relativeCenterY = photoCenterY - parentRect.top;
        
        // Position the arrow container absolutely at the photo's center
        // This ensures the arrow is always centered on the image, regardless of image size
        arrowEl.style.position = 'absolute';
        arrowEl.style.top = `${relativeCenterY}px`;
        arrowEl.style.transform = 'translateY(-50%)'; // Center the arrow icon itself at the calculated position
        arrowEl.style.height = 'auto';
        arrowEl.style.minHeight = 'auto';
        arrowEl.style.width = '100%';
        arrowEl.style.marginTop = '0';
        arrowEl.style.marginBottom = '0';
        arrowEl.style.left = '0';
        arrowEl.style.right = '0';
      }
    });
  }

  /**
   * Sets up ResizeObserver to watch for image size changes and realign arrows
   * This ensures arrows always stay centered when images resize
   */
  private setupResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') return;

    // Create observer that triggers whenever any photo image resizes
    this.resizeObserver = new ResizeObserver((entries) => {
      // Debounce rapid resize events
      clearTimeout((this as any)._resizeTimeout);
      (this as any)._resizeTimeout = setTimeout(() => {
        this.alignArrowsToImageCenters();
      }, 50);
    });

    // Observe all photo images directly (not the containers) - this is the key
    // We watch the actual img.photo elements so any size change triggers realignment
    const photos = document.querySelectorAll('.photos-section .photo');
    photos.forEach(photo => {
      this.resizeObserver?.observe(photo);
      
      // Also handle load events for images that haven't loaded yet
      const img = photo as HTMLImageElement;
      if (img.complete) {
        // Image already loaded, align immediately
        setTimeout(() => this.alignArrowsToImageCenters(), 50);
      } else {
        // Wait for image to load, then align
        img.addEventListener('load', () => {
          setTimeout(() => this.alignArrowsToImageCenters(), 50);
        }, { once: true });
      }
    });
    
    // Also observe the arrow-containers parent for scroll/resize/viewport changes
    const arrowContainers = document.querySelector('.arrow-containers') as HTMLElement;
    if (arrowContainers) {
      this.resizeObserver?.observe(arrowContainers);
    }
    
    // Watch for window resize events as well
    this.windowResizeHandler = () => {
      setTimeout(() => this.alignArrowsToImageCenters(), 100);
    };
    window.addEventListener('resize', this.windowResizeHandler);
  }

}
