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
    // Get current URL to determine route
    const currentUrl = this.router.url;
    
    // Map of all sidebar routes that are their own home pages
    const sidebarRoutes: Record<string, { label: string; icon?: string; url?: string }> = {
      '/admin': { label: 'Dashboard', icon: 'home', url: '/admin' },
      '/admin/users': { label: 'Users', icon: 'people', url: '/admin/users' },
      '/admin/planning': { label: 'Planning', icon: 'calendar', url: '/admin/planning' },
      '/admin/fleet': { label: 'Fleet', icon: 'car', url: '/admin/fleet' }
    };

    // Map of route prefixes to their parent sidebar route (for nested routes)
    const nestedRoutePrefixes: Record<string, { label: string; icon?: string; url?: string }> = {
      '/admin/van/': { label: 'Fleet', icon: 'car', url: '/admin/fleet' },
      '/admin/van-report/': { label: 'Fleet', icon: 'car', url: '/admin/fleet' },
      '/admin/user/': { label: 'Users', icon: 'people', url: '/admin/users' }
    };

    // Find matching route (check exact match first, then check if URL starts with route)
    let routeInfo: { label: string; icon?: string; url?: string } | undefined;
    let matchedRoute = '';
    
    // First try exact match
    if (sidebarRoutes[currentUrl]) {
      routeInfo = sidebarRoutes[currentUrl];
      matchedRoute = currentUrl;
    } else {
      // Check if URL matches a nested route prefix (e.g., /admin/van/:id)
      for (const [prefix, info] of Object.entries(nestedRoutePrefixes)) {
        if (currentUrl.startsWith(prefix)) {
          routeInfo = info;
          matchedRoute = prefix.slice(0, -1); // Remove trailing slash for matching
          break;
        }
      }
      
      // If no nested route match, try to find route that URL starts with
      if (!routeInfo) {
        for (const [routePath, info] of Object.entries(sidebarRoutes)) {
          if (currentUrl.startsWith(routePath + '/') || currentUrl === routePath) {
            routeInfo = info;
            matchedRoute = routePath;
            break;
          }
        }
      }
    }
    
    if (routeInfo) {
      // We're on a sidebar route or nested route - start breadcrumb with this route, NEVER show Dashboard
      if (tail && tail.length > 0) {
        // Check if tail already starts with this route (to avoid duplication)
        const firstTailItem = tail[0];
        if (firstTailItem.label === routeInfo.label) {
          // Tail already starts with the route, use it as-is
          this.breadcrumbItems = tail;
        } else {
          // Prepend the route to the tail (with URL for clickability)
          this.breadcrumbItems = [
            { label: routeInfo.label, icon: routeInfo.icon, url: routeInfo.url },
            ...tail
          ];
        }
      } else {
        // No tail, just show the route itself (no URL since we're already there for exact matches)
        const isExactMatch = currentUrl === matchedRoute || sidebarRoutes[currentUrl];
        this.breadcrumbItems = [
          { label: routeInfo.label, icon: routeInfo.icon, url: isExactMatch ? undefined : routeInfo.url }
        ];
      }
    } else {
      // Not a recognized route - fallback to Dashboard
      if (tail && tail.length > 0) {
        this.breadcrumbItems = [
          { label: 'Dashboard', url: '/admin', icon: 'home' },
          ...tail
        ];
      } else {
        this.breadcrumbItems = [{ label: 'Dashboard', url: '/admin', icon: 'home' }];
      }
    }
  }
}