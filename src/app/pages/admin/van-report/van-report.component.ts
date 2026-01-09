// src/app/pages/admin/van-report/van-report.component.ts
import { Component, OnInit, AfterViewInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule, AlertController, ToastController, ActionSheetController } from '@ionic/angular';
import { ActivatedRoute, Router } from '@angular/router';
import { InspectionService, Inspection } from 'src/app/services/inspection.service';
import { AuthService } from 'src/app/services/auth.service';
import { BreadcrumbService } from '@app/services/breadcrumb.service';
import { BreadcrumbItem } from '@app/components/breadcrumb/breadcrumb.component';
import { Firestore, collection, query, where, getDocs } from '@angular/fire/firestore';
import { getFunctions, httpsCallable } from '@angular/fire/functions';

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
  private actionSheet = inject(ActionSheetController);
  private breadcrumbService = inject(BreadcrumbService);
  private firestore = inject(Firestore);
  
  private resizeObserver?: ResizeObserver;
  private windowResizeHandler?: () => void;
  private keyboardHandler?: (event: KeyboardEvent) => void;

  currReportItems: any[] = [];
  prevReportItems: any[] = [];
  comparisonRows: { side: string; prevUrl: string; currUrl: string }[] = [];
  longerReportItems: any[] = [];

  currInspectionId: string | null = null;
  currentInspection: any = null;
  previousInspection: any = null;
  currentSubmitterName: string = 'Unknown';
  previousSubmitterName: string = 'Unknown';
  currentSubmitterId: string | null = null;
  previousSubmitterId: string | null = null;
  loading = true;
  errorMsg = '';
  reviewMode = false;
  expandedImage: string | null = null;
  expandedImageRow: { side: string; prevUrl: string; currUrl: string } | null = null;
  expandedImageType: 'prev' | 'curr' | null = null;
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
      const vanLabel = `${(curr.vanType || '').toUpperCase()} ${curr.vanNumber}`;
      
      // Get van docId to construct the URL
      const vanDocId = await this.getVanDocId(curr.vanType, curr.vanNumber);
      const vanUrl = vanDocId ? `/admin/van/${vanDocId}` : undefined;
      
      if (!currentTail || currentTail.length === 0) {
        // No tail exists (direct navigation) → set Van node + Van Report
        this.setBreadcrumbTail([
          { label: vanLabel, icon: 'car', url: vanUrl },
          { label: 'Van Report' }
        ]);
      } else if (currentTail[currentTail.length - 1]?.label !== 'Van Report') {
        // Tail exists (e.g., EDV 1) → append Van Report without replacing existing items
        // Update the van item in the tail to include the URL if it doesn't have one
        const updatedTail = currentTail.map((item, index) => {
          if (index === 0 && !item.url && item.label === vanLabel) {
            return { ...item, url: vanUrl };
          }
          return item;
        });
        this.setBreadcrumbTail([...updatedTail, { label: 'Van Report' }]);
      } else {
        // Van Report already in tail, but ensure van item has URL
        const updatedTail = currentTail.map((item, index) => {
          if (index === 0 && !item.url && item.label === vanLabel) {
            return { ...item, url: vanUrl };
          }
          return item;
        });
        if (JSON.stringify(updatedTail) !== JSON.stringify(currentTail)) {
          this.setBreadcrumbTail(updatedTail);
        }
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

  private async getVanDocId(vanType: string, vanNumber: string): Promise<string | null> {
    try {
      const vansRef = collection(this.firestore, 'vans');
      const normalizedVanNumber = vanNumber.replace(/^0+/, '') || '0';
      
      // Query for van by type and number
      const q = query(
        vansRef,
        where('type', '==', vanType),
        where('number', '==', parseInt(normalizedVanNumber, 10))
      );
      
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        return querySnapshot.docs[0].id;
      }
      
      // If not found with number, try with vanId for rental vehicles
      if (vanType === 'Rental') {
        const rentalQ = query(
          vansRef,
          where('type', '==', vanType),
          where('vanId', '==', vanNumber)
        );
        const rentalSnapshot = await getDocs(rentalQ);
        if (!rentalSnapshot.empty) {
          return rentalSnapshot.docs[0].id;
        }
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get van docId:', error);
      return null;
    }
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
        this.currentSubmitterId = this.currentInspection.createdBy;
        const currentUser = await this.auth.getUserProfile(this.currentInspection.createdBy);
        this.currentSubmitterName = this.auth.getDisplayName(currentUser);
      }

      // Load previous inspection submitter name
      if (this.previousInspection?.createdBy) {
        this.previousSubmitterId = this.previousInspection.createdBy;
        const previousUser = await this.auth.getUserProfile(this.previousInspection.createdBy);
        this.previousSubmitterName = this.auth.getDisplayName(previousUser);
      }
    } catch (error) {
      console.error('Failed to load user display names:', error);
    }
  }

  viewUser(userId: string | null): void {
    if (!userId) return;
    
    // Prime breadcrumb so it shows immediately on navigation
    this.breadcrumbService.setTail([
      { label: 'User Details', icon: 'person' }
    ]);
    
    // Navigate to the user detail page using the user's uid
    // Navigate relative to parent (admin) route
    this.router.navigate(['user', userId], { relativeTo: this.route.parent });
  }

  toggleImageExpansion(url: string) {
    // If clicking the same image or backdrop, close it
    if (this.expandedImage === url || url === '') {
      this.expandedImage = null;
      this.expandedImageRow = null;
      this.expandedImageType = null;
    } else {
      this.expandedImage = url;
      // Find which row and type this image belongs to
      const row = this.comparisonRows.find(r => r.prevUrl === url || r.currUrl === url);
      if (row) {
        this.expandedImageRow = row;
        this.expandedImageType = row.prevUrl === url ? 'prev' : 'curr';
      }
    }
  }

  navigateToPreviousPhoto() {
    if (!this.expandedImageRow || this.expandedImageType !== 'curr') return;
    
    // Switch from current to previous
    if (this.expandedImageRow.prevUrl) {
      this.expandedImage = this.expandedImageRow.prevUrl;
      this.expandedImageType = 'prev';
    }
  }

  navigateToCurrentPhoto() {
    if (!this.expandedImageRow || this.expandedImageType !== 'prev') return;
    
    // Switch from previous to current
    if (this.expandedImageRow.currUrl) {
      this.expandedImage = this.expandedImageRow.currUrl;
      this.expandedImageType = 'curr';
    }
  }

  canNavigateToPrevious(): boolean {
    // Show left arrow when viewing current photo (to go to previous)
    return this.expandedImageRow !== null && 
           this.expandedImageType === 'curr' && 
           !!this.expandedImageRow.prevUrl;
  }

  canNavigateToCurrent(): boolean {
    // Show right arrow when viewing previous photo (to go to current)
    return this.expandedImageRow !== null && 
           this.expandedImageType === 'prev' && 
           !!this.expandedImageRow.currUrl;
  }

  // ----- Unsure Photo Modal -----
  viewUnsurePhoto(photoUrl: string, description: string) {
    this.unsurePhotoModal = { photoUrl, description };
  }

  closeUnsurePhotoModal() {
    this.unsurePhotoModal = null;
  }

  // ----- Share Functionality -----
  async openShareOptions() {
    if (!this.currInspectionId) {
      const toast = await this.toast.create({
        message: 'Unable to share: Inspection ID not found',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
      return;
    }

    const shareUrl = this.getShareUrl();
    const vanInfo = this.currentInspection 
      ? `${(this.currentInspection.vanType || '').toUpperCase()} ${this.currentInspection.vanNumber}`
      : 'Van Report';

    const actionSheet = await this.actionSheet.create({
      header: 'Share Van Report',
      subHeader: `Share report for ${vanInfo}`,
      buttons: [
        {
          text: 'Copy Link',
          icon: 'copy-outline',
          handler: () => {
            this.copyToClipboard(shareUrl);
          }
        },
        {
          text: 'Share via Email',
          icon: 'mail-outline',
          handler: () => {
            this.shareViaEmail(shareUrl, vanInfo);
          }
        },
        {
          text: 'Cancel',
          role: 'cancel'
        }
      ]
    });

    await actionSheet.present();
  }

  private getShareUrl(): string {
    const baseUrl = window.location.origin;
    const inspectionId = this.currInspectionId;
    return `${baseUrl}/admin/van-report/${inspectionId}`;
  }

  private async copyToClipboard(url: string) {
    try {
      // Use the Clipboard API if available
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url);
        const toast = await this.toast.create({
          message: 'Link copied to clipboard!',
          duration: 2000,
          color: 'success',
          position: 'top'
        });
        await toast.present();
      } else {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          
          if (successful) {
            const toast = await this.toast.create({
              message: 'Link copied to clipboard!',
              duration: 2000,
              color: 'success',
              position: 'top'
            });
            await toast.present();
          } else {
            throw new Error('Copy command failed');
          }
        } catch (err) {
          document.body.removeChild(textArea);
          throw err;
        }
      }
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      const toast = await this.toast.create({
        message: 'Failed to copy link. Please copy manually.',
        duration: 3000,
        color: 'warning',
        position: 'top'
      });
      await toast.present();
    }
  }

  private async shareViaEmail(url: string, vanInfo: string) {
    const alert = await this.alert.create({
      header: 'Send Email',
      subHeader: `Share report for ${vanInfo}`,
      inputs: [
        {
          name: 'email',
          type: 'email',
          placeholder: 'Enter email address',
          attributes: {
            required: true,
            autocomplete: 'email'
          }
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel'
        },
        {
          text: 'Send',
          handler: async (data) => {
            if (!data.email || !this.isValidEmail(data.email)) {
              const toast = await this.toast.create({
                message: 'Please enter a valid email address',
                duration: 2000,
                color: 'danger',
                position: 'top'
              });
              await toast.present();
              return false; // Keep the alert open
            }
            await this.sendEmail(data.email, url, vanInfo);
            return true; // Close the alert
          }
        }
      ]
    });

    await alert.present();
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private async sendEmail(toEmail: string, url: string, vanInfo: string) {
    let loadingToast: any;
    try {
      // Show loading toast
      loadingToast = await this.toast.create({
        message: 'Sending email...',
        duration: 0,
        position: 'top'
      });
      await loadingToast.present();

      // Call Firebase Function to send email
      // Specify region to match the deployed function
      const functions = getFunctions(undefined, 'us-central1');
      const sendEmailFunction = httpsCallable(functions, 'sendVanReportEmail');
      
      await sendEmailFunction({
        to: toEmail,
        subject: `Van Report: ${vanInfo}`,
        reportUrl: url,
        vanInfo: vanInfo
      });

      await loadingToast.dismiss();

      const successToast = await this.toast.create({
        message: 'Email sent successfully!',
        duration: 2000,
        color: 'success',
        position: 'top'
      });
      await successToast.present();
    } catch (error: any) {
      console.error('Failed to send email:', error);
      
      if (loadingToast) {
        await loadingToast.dismiss();
      }
      
      const errorToast = await this.toast.create({
        message: error?.message || 'Failed to send email. Please try again.',
        duration: 3000,
        color: 'danger',
        position: 'top'
      });
      await errorToast.present();
    }
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
    // Add keyboard navigation for expanded images
    this.keyboardHandler = (event: KeyboardEvent) => {
      if (!this.expandedImage) return;
      
      if (event.key === 'ArrowLeft') {
        this.navigateToPreviousPhoto();
        event.preventDefault();
      } else if (event.key === 'ArrowRight') {
        this.navigateToCurrentPhoto();
        event.preventDefault();
      } else if (event.key === 'Escape') {
        this.toggleImageExpansion('');
        event.preventDefault();
      }
    };
    
    window.addEventListener('keydown', this.keyboardHandler);
    
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
    // Remove keyboard event listener
    if (this.keyboardHandler) {
      window.removeEventListener('keydown', this.keyboardHandler);
    }
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
    // Only run on desktop (where arrows are visible) - 431px and above
    if (window.innerWidth <= 430) return;

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
