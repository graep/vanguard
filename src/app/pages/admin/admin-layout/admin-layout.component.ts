// src/app/pages/admin/admin-layout/admin-layout.component.ts
import { Component, OnDestroy, OnInit } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { BreadcrumbItem, BreadcrumbComponent } from '@app/components/breadcrumb/breadcrumb.component';
import { PageHeaderComponent } from '@app/components/page-header/page-header.component';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { combineLatest, Subscription } from 'rxjs';
import { BreadcrumbService } from '@app/services/breadcrumb.service';
import { NavbarStateService } from '@app/services/navbar-state.service';

@Component({
  selector: 'app-admin-layout',
  standalone: true,
  imports: [IonicModule, CommonModule, RouterOutlet, NavbarComponent, BreadcrumbComponent, PageHeaderComponent],
  templateUrl: './admin-layout.component.html',
  styleUrls: ['./admin-layout.component.scss']
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  breadcrumbItems: BreadcrumbItem[] = [];
  private navSub?: Subscription;
  private tailSub?: Subscription;
  isCollapsed = true;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private breadcrumbService: BreadcrumbService,
    private navbarState: NavbarStateService
  ) {}

  ngOnInit(): void {
    // Recompute on navigation or when a child sets a dynamic tail
    this.navSub = this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.buildBreadcrumbs(this.breadcrumbService.getTail()));

    this.tailSub = this.breadcrumbService.tail$
      .subscribe((tail) => this.buildBreadcrumbs(tail));

    // Track navbar collapsed state to apply padding classes
    this.navbarState.isCollapsed$.subscribe(v => this.isCollapsed = v);

    // Initial build
    this.buildBreadcrumbs(this.breadcrumbService.getTail());
  }

  ngOnDestroy(): void {
    this.navSub?.unsubscribe();
    this.tailSub?.unsubscribe();
  }

  toggleMobileMenu(): void {
    const isCurrentlyOpen = this.navbarState.getMobileOpen();
    
    if (isCurrentlyOpen) {
      // Close the menu completely
      this.navbarState.setMobileOpen(false);
    } else {
      // Open the menu - on mobile, skip collapsed state and go straight to expanded
      // Check if we're on mobile (window width <= 768px)
      const isMobile = window.innerWidth <= 768;
      
      if (isMobile) {
        // Mobile: skip collapsed state, go straight to expanded
        this.navbarState.setMobileOpen(true);
        this.navbarState.setCollapsed(false);
      } else {
        // Desktop: normal toggle behavior
        this.navbarState.setMobileOpen(true);
      }
    }
  }

  onLogout(): void {
    // Logout is handled by the navbar component
  }

  private buildBreadcrumbs(tail: BreadcrumbItem[] = []): void {
    // Base breadcrumb
    const items: BreadcrumbItem[] = [{ label: 'Dashboard', url: '/admin', icon: 'home' }];

    // Walk child route to determine current page
    let child = this.route.firstChild;
    while (child && child.firstChild) {
      child = child.firstChild;
    }

    const path = child?.routeConfig?.path || '';
    // If a dynamic tail is provided (e.g., van number), prefer it regardless of path detection timing
    if (tail && tail.length > 0) {
      items.push(...tail);
    } else {
      // Map path to breadcrumb label
      const pathMap: Record<string, string> = {
        'users': 'Users',
        'planning': 'Planning',
        'analytics': 'Analytics'
      };

      if (path && pathMap[path]) {
        items.push({ label: pathMap[path], url: `/admin/${path}` });
      }
    }

    this.breadcrumbItems = items;
  }
}