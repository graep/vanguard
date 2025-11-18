# Vanguard UI/UX Style Standards

## Overview
Comprehensive style guide for the Vanguard Fleet Inspection & Condition Tracking Application, establishing visual design patterns, component styles, and user experience standards.

**Important**: The Fleet page (`src/app/pages/admin/fleet/fleet.page.*`) serves as the **blueprint** for all admin list pages. All styling conventions, layout patterns, responsive breakpoints, and component positioning established on the Fleet page should be replicated on other pages (Users, etc.) for consistency.

---

## Color System

### Primary Colors
```scss
// Background
--background-primary: #1e293b;      // Dark slate (main background)
--background-card: rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%;  // Glass gradient

// Text Colors
--text-primary: #ffffff;             // White (main text)
--text-secondary: rgba(255, 255, 255, 0.8);   // 80% white
--text-tertiary: rgba(255, 255, 255, 0.7);    // 70% white
--text-quaternary: rgba(255, 255, 255, 0.5); // 50% white

// Interactive Colors
--interactive-primary: #3b82f6;     // Blue (links, highlights)
--interactive-hover: rgba(59, 130, 246, 0.6); // Blue at 60% opacity
```

### Status Colors
```scss
--success: #4CAF50;           // Green (active, complete)
--success-dark: #45a049;     // Darker green variant
--warning: #FF9800;          // Orange (scheduled, pending)
--warning-dark: #F57C00;     // Darker orange variant
--danger: #f44336;           // Red (grounded, overdue, errors)
--danger-dark: #d32f2f;      // Darker red variant
--info: #3b82f6;             // Blue (information)
```

### Color Usage
- **Primary Text**: Use `--text-primary` for headings, important labels
- **Secondary Text**: Use `--text-secondary` for descriptions, subtitles
- **Tertiary Text**: Use `--text-tertiary` for metadata, timestamps
- **Interactive Elements**: Use `--interactive-primary` with hover states
- **Status Indicators**: Use status colors for chips, badges, alerts
- **Backgrounds**: Use glass-morphism gradients for depth

---

## Typography

### Font Family
```scss
--ion-font-family: 'TikTok Sans', sans-serif;
```

### Typography Scale

#### Headings
```scss
// H1 - Main Page Title (Van Title)
font-size: 2.5rem;      // Desktop
font-size: 1.3rem;      // Tablet (≤768px)
font-size: 1.7rem;      // Mobile (≤480px)
font-weight: 700;
text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;

// H2 - Subtitle
font-size: 1.2rem;      // Desktop
font-weight: 400;
color: rgba(255, 255, 255, 0.8);

// H3 - Section Headers
font-size: 1.2rem;      // Desktop
font-weight: 600;
color: #ffffff;

// H4 - Card Titles
font-size: 1rem;        // Desktop
font-weight: 600;
color: #ffffff;
```

#### Body Text
```scss
// Body Regular
font-size: 0.95rem;     // Desktop
line-height: 1.4;
color: rgba(255, 255, 255, 0.8);

// Body Small
font-size: 0.85rem;     // Desktop
line-height: 1.4;
color: rgba(255, 255, 255, 0.7);

// Labels (Uppercase)
font-size: 0.95rem;     // Desktop
font-weight: 700;
text-transform: uppercase;
letter-spacing: 0.5px;
color: #ffffff;
```

#### Responsive Typography
```scss
// Desktop → Tablet → Mobile scaling ratios
Desktop:    1.00x
Tablet:     0.85x (768px)
Mobile:     0.75x (480px)

// Example: H1 Title (Van Title)
Desktop: 2.5rem (40px)
Tablet:  1.3rem (20.8px)
Mobile:  1.7rem (27.2px) // Slightly larger for readability
```

---

## Spacing System

### Base Unit
- **Base Unit**: 8px (0.5rem)
- **Spacing Scale**: Multiples of 8px

### Spacing Scale
```scss
xxx-small: 0.125rem (2px)
xx-small:  0.25rem (4px)
x-small:   0.375rem (6px)
small:     0.5rem (8px)
medium:    0.75rem (12px)
large:     1rem (16px)
x-large:   1.5rem (24px)
xx-large:  2rem (32px)
xxx-large: 2.5rem (40px)
huge:      3rem (48px)
```

### Component Spacing

#### Padding
```scss
// Content Container
Desktop: 12px
Mobile:  0px (edge-to-edge)

// Card Content
Desktop: 2.5rem (40px)
Tablet:  1rem (16px)
Mobile:  0.75rem (12px)

// Card Header
Desktop: 1.5rem 2rem
Tablet:  1rem
Mobile:  0.75rem

// Tab Content
Desktop: 16px
Tablet:  12px
Mobile:  8px
```

#### Gaps
```scss
// Grid Gaps
Desktop: 2rem 3rem (row column)
Tablet:  1.5rem
Mobile:  1rem

// Flex Gaps
Buttons:    0.75rem
Detail List: 0.5rem
Tab Nav:    0.25rem
```

#### Margins
```scss
// Card Margins
Bottom (Desktop): 2rem (32px)
Bottom (Tablet):  1.5rem (24px)
Bottom (Mobile):  1rem (16px)

// Section Margins
Between Sections: 1rem - 3rem
```

---

## Glass-Morphism Effects

### Core Glass-Morphism Pattern
```scss
.element {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
```

### Glass-Morphism Variations

#### Primary Card
```scss
background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
backdrop-filter: blur(10px);
border: 1px solid rgba(255, 255, 255, 0.1);
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
border-radius: 10px;
transform: none !important;  // Cards should NOT have transform effects

&:hover {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.2);
  transform: none !important;  // No movement on hover
}
```

#### Chip/Badge
```scss
background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0.15) 100%);
backdrop-filter: blur(10px);
box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
border-radius: 10px;
```

#### Tab Button (Default)
```scss
background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
backdrop-filter: blur(10px);
border: none;
box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
```

#### Tab Button (Active)
```scss
background: linear-gradient(135deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.25) 100%);
backdrop-filter: blur(10px);
box-shadow: 0 4px 16px rgba(255, 255, 255, 0.15);
```

---

## Shadows & Depth

### Shadow System
```scss
// Standard Card Shadow
box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);

// Hover/Interactive Shadow
box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);

// Button Shadow
box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);

// Button Hover Shadow
box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);

// Status Card Shadow (Colored)
box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3); // Hover
```

### Depth Layers (z-index)
```scss
--z-background: 0;
--z-base: 1;
--z-elevated: 10;
--z-modal-overlay: 100;
--z-modal-content: 101;
--z-tooltip: 200;
```

---

## Border Radius

### Radius Scale
```scss
--radius-xs: 4px;
--radius-sm: 8px;
--radius-md: 10px;      // Standard container radius
--radius-lg: 12px;
--radius-xl: 16px;
--radius-full: 50%;
```

### Usage by Component
```scss
// Cards & Containers (Standard)
Border radius: 10px (all breakpoints)
// All containers use consistent 10px border-radius

// Buttons
Border radius: 10px
Mobile: 10px (consistent)

// Detail items / Chips
Border radius: 10px

// Images
Border radius: 10px (all breakpoints)

// Tab Buttons
--border-radius: 10px 10px 0 0; // Top corners only
```

---

## Buttons

### Button Sizes

#### Primary Action Button
```scss
height: 48px;               // Desktop
height: 40px;               // Tablet
height: 36px;               // Mobile

font-size: 0.9rem;
font-size: 0.8rem;          // Tablet
font-size: 0.75rem;         // Mobile

padding: 16px;
padding: 12px;              // Mobile
```

#### Compact Button
```scss
height: 36px;               // Desktop
font-size: 0.85rem;
padding: 8px 12px;
```

#### Small Icon Button
```scss
height: 32px;
width: 32px;
border-radius: 50%;
```

### Button Styles

#### Solid (Primary)
```scss
fill: solid;
color: primary;
--border-radius: 10px;
--box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
font-weight: 600;
transition: all 0.3s ease;

&:hover {
  --box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
  transform: translateY(-2px);  // Lift up on hover
}

&:active {
  transform: translateY(1px);     // Press down on click
  --box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
```

#### Outline (Secondary)
```scss
fill: outline;
color: secondary;
--border-radius: 10px;
--box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
font-weight: 600;
transition: all 0.3s ease;

&:hover {
  --box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
  transform: translateY(-2px);  // Lift up on hover
}

&:active {
  transform: translateY(1px);     // Press down on click
  --box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}
```

#### Clear
```scss
fill: clear;
color: medium;
--height: 40px;
opacity: 0.7;

&:hover {
  opacity: 1;
}
```

### Button States
- **Default**: Solid colors, standard shadow
- **Hover**: translateY(-2px), enhanced shadow, lifts up
- **Active**: translateY(1px), reduced shadow, presses down (visual feedback)
- **Disabled**: Opacity 0.5, no interaction

**Important**: Buttons lift up on hover and press down on click for clear visual feedback. Cards and containers should NOT have transform effects (use `transform: none !important`).

---

## Chips & Badges

### Status Chip Pattern
```scss
.status-chip {
  font-weight: 600;
  padding: 0.75rem 1.25rem;
  font-size: 1rem;
  border-radius: 20px;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);

  ion-icon {
    margin-right: 0.5rem;
    font-size: 1.2rem;
  }

  // Size variants
  @media (max-width: 768px) {
    padding: 0.4rem 0.8rem;
    font-size: 0.8rem;
  }

  @media (max-width: 480px) {
    padding: 0.35rem 0.7rem;
    font-size: 0.75rem;
  }
}
```

### Status Colors
- **Success (Active)**: Green gradient, checkmark icon
- **Danger (Grounded)**: Red/danger color, warning icon
- **Warning (Pending)**: Orange gradient, alert icon
- **Info**: Blue gradient, info icon

---

## Icons

### Icon Usage
- **Size Scale**: 1rem → 1.3rem → 1.2rem → 0.9rem (mobile)
- **Color**: Inherit from parent or specific color vars
- **Spacing**: 0.5rem margin-right for inline icons
- **Icon Library**: Ionicons (built-in)

### Icon Patterns
```scss
// Info Icons
.info-icon {
  color: #3b82f6;
  font-size: 1.3rem;
  filter: drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3));
}

// Status Icons
.icon-success { color: #4CAF50; }
.icon-warning { color: #FF9800; }
.icon-danger { color: #f44336; }
.icon-info { color: #3b82f6; }

// Empty State Icons
.empty-icon {
  font-size: 48px;
  opacity: 0.5;
}
```

---

## Transitions & Animations

### Standard Transitions
```scss
// All interactive elements
transition: all 0.3s ease;

// Button Transforms (hover/active effects)
&:hover {
  transform: translateY(-2px);  // Lift up
  transition: transform 0.3s ease;
}

&:active {
  transform: translateY(1px);     // Press down
  transition: transform 0.1s ease;
}

// Cards & Containers: NO transforms
transform: none !important;

// Opacity transitions
transition: opacity 0.2s ease;

// Color transitions
transition: color 0.2s ease, background 0.3s ease;
```

### Shell Transitions (Navbar/Breadcrumb)
```scss
// Sidebar width animation (already implemented in navbar)
.sidebar { transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1); }

// Breadcrumb horizontal shift to avoid overlay when sidebar expands
.layout-breadcrumb {
  transition: padding-left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
```

---

## Admin Shell (Navbar + Breadcrumb)

### Structure
```
app-admin-layout
├── app-admin-navbar          // persistent left sidebar
└── .content-area
    ├── app-breadcrumb       // sticky top header
    └── .page-content        // scrollable; contains router-outlet
```

### Behavior
- Navbar is a pure sidebar; it does not project page content.
- Layout manages left padding and scroll; breadcrumb is sticky.
- Breadcrumb background matches sidebar `#1e1e1e`; current node uses `var(--ion-color-primary)`.
- On desktop expanded sidebar, breadcrumb adds `padding-left: 210px` to remain visible.
- On mobile, breadcrumb left padding is 0; sidebar slides over content.

### Services
- `NavbarStateService`: publishes `isCollapsed` and `isMobileOpen` for layout.
- `BreadcrumbService`: exposes `tail$` and `getTail()`; pages can prime tail before navigation and update after data load.

### Accessibility
- Breadcrumb labels should be concise; truncate long labels with tooltip on hover.
- Ensure contrast on dark breadcrumb background: links `rgba(255,255,255,.75)`, separators `rgba(255,255,255,.6)`, current node primary blue.

### Animation Patterns

#### Fade In (Tab Content)
```scss
@keyframes fadeIn {
  from { 
    opacity: 0; 
    transform: translateY(10px);
  }
  to { 
    opacity: 1; 
    transform: translateY(0);
  }
}

.tab-panel {
  animation: fadeIn 0.3s ease-in;
}
```

#### Scale (Images on Hover)
```scss
img {
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  
  &:hover {
    transform: scale(1.02);
  }
}
```

---

## Form Elements

### Text Inputs
```scss
ion-textarea, ion-input {
  --background: var(--ion-color-light);
  --border-radius: 8px;
  --padding-start: 12px;
  --padding-end: 12px;
  --padding-top: 12px;
  --padding-bottom: 12px;
}
```

### Compact Stats Cards
```scss
.compact-stat-card {
  flex: 1;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  color: white;
  font-weight: 600;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;

  // Success variant
  &.success {
    background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
  }

  // Warning variant
  &.warning {
    background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
  }

  // Danger variant
  &.danger {
    background: linear-gradient(135deg, #f44336 0%, #d32f2f 100%);
  }
}
```

---

## Responsive Design Patterns

### Mobile-First Breakpoints
```scss
// Mobile Small (default)
@media (max-width: 480px) { }

// Mobile Large / Tablet Small
@media (min-width: 375px) and (max-width: 600px) { }

// Tablet
@media (max-width: 768px) { }

// Desktop Small
@media (max-width: 900px) { }

// Desktop Large
// Default (max-width: 1200px)
```

### Responsive Patterns

#### Typography
- **Scale Down**: All text scales down proportionally
- **Line Height**: Maintain 1.4 ratio
- **Letter Spacing**: Adjust for readability

#### Spacing
- **Reduce Padding**: 40px → 16px → 12px
- **Reduce Gaps**: 3rem → 1.5rem → 1rem
- **Reduce Margins**: Proportional to padding

#### Layouts
- **Grid → Stack**: Multi-column to single column
- **Flex Direction**: Row to column
- **Element Hiding**: Labels, extra text
- **Icon Focus**: Icons become primary, text secondary

---

## Component-Specific Styles

### Van Header Card
```scss
// Left Column Info
.van-basic-info {
  .van-title {
    margin: 0 0 0.5rem 0;
    font-size: 2.5rem;        // Desktop
    font-size: 1.3rem;        // Tablet (≤768px)
    font-size: 1.7rem;        // Mobile (≤480px)
    font-weight: 700;
    color: #ffffff;
    text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
    background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
}

// Right Column Image
.van-image {
  width: 100%;
  max-width: 820px;
  aspect-ratio: 14 / 9;
  object-fit: cover;
  border-radius: 10px;
  border: 2px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
    border-color: rgba(76, 175, 80, 0.4);
    // No transform - images don't move on hover
  }
}
```

### Detail Items
```scss
.detail-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;

  .info-icon {
    color: #3b82f6;
    font-size: 1.3rem;
    margin-top: 0;
    flex-shrink: 0;
    filter: drop-shadow(0 2px 4px rgba(59, 130, 246, 0.3));
  }

  .info-content {
    h3 {
      font-weight: 700;
      color: #ffffff;
      font-size: 0.95rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    p {
      color: rgba(255, 255, 255, 0.8);
      font-size: 0.95rem;
      word-break: break-all;
      line-height: 1.4;
    }
  }

  // Clickable interaction
  .clickable {
    color: #3b82f6 !important;
    transition: all 0.2s ease;
    cursor: pointer;

    &:hover {
      opacity: 0.8;
      text-decoration: underline;
    }
  }
}
```

---

## Accessibility Standards

### Contrast Ratios
- **Primary Text**: 21:1 (white on dark background)
- **Secondary Text**: 7:1 minimum
- **Interactive Elements**: 4.5:1 minimum
- **Status Indicators**: High contrast colors

### Touch Targets
- **Minimum Size**: 36px × 36px (mobile)
- **Preferred Size**: 44-48px
- **Gap Between**: 8-12px minimum

### Focus States
- **Visible Outline**: 2px solid, contrasting color
- **Tab Navigation**: Clear focus rings
- **Skip Links**: Present for keyboard navigation

### Screen Reader Support
- **Alt Text**: All images
- **ARIA Labels**: Icon buttons, status indicators
- **Semantic HTML**: Proper heading hierarchy
- **Form Labels**: All inputs labeled

---

## Performance Best Practices

### Hardware Acceleration
```scss
// Use transforms instead of position changes
transform: translateY(-2px); // GPU accelerated

// Use will-change for animated elements
will-change: transform, opacity;
```

### Optimized Animations
- **Duration**: 0.2s - 0.3s (fast, feels responsive)
- **Easing**: ease (natural feeling)
- **Avoid**: width/height changes, layout shifts
- **Prefer**: Transform, opacity, filter

### Asset Optimization
- **Images**: Aspect-ratio maintained, object-fit: cover
- **Icons**: SVG when possible, sprite sheets
- **Fonts**: Subset required characters

---

## Page Layout Patterns (Fleet Page Blueprint)

### Standard Page Structure
The Fleet page establishes the blueprint for all admin list pages (Users, Fleet, etc.). This pattern ensures consistency across the application.

#### Content Container
```scss
.content-container {
  --background: #1e293b;
  min-height: 100vh;
  width: 100%;
  margin: 0;
  padding: 20px;
  
  // Laptop and above: expand to fill available space
  @media (min-width: 1024px) {
    max-width: none;
    margin: 0;
  }
  
  @media (max-width: 768px) {
    padding: 0; // Remove padding to match inner-scroll position
    margin: 0;
    width: 100%;
    max-width: 100%;
    margin-top: 16px; // Add top margin
  }
  
  @media (max-width: 430px) {
    padding: 0;
    margin: 0;
    width: 100%;
    max-width: 100%;
    margin-top: 12px; // Add top margin
  }
}

// Remove left margin when sidebar is expanded (allows overlay)
:host ::ng-deep .content-wrapper:not(.sidebar-collapsed) .content-container {
  margin-left: 0 !important;
}
```

#### Page Header Structure
```scss
.page-header {
  position: relative;
  z-index: 100;
  margin-bottom: 2rem;
  padding: 0 16px;
  
  @media (max-width: 768px) {
    margin-bottom: 1.5rem;
    padding: 0 16px;
  }
  
  @media (max-width: 430px) {
    margin-bottom: 0;
    padding: 0 12px;
  }
  
  // More room on sides for tablet and 426px and below
  @media (max-width: 1023px) and (min-width: 767px) {
    padding: 0 20px;
  }
  
  @media (max-width: 430px) {
    padding: 0 20px;
  }
  
  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 2.5rem;
    padding: 0;
    
    > div:first-child {
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      align-items: flex-start;
      flex: 1;
      min-height: 288px;
      height: 288px;
      margin-left: 1rem;
      position: relative;
      
      // Background logo centered in the container
      &::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 300px;
        height: 300px;
        background-image: url('/assets/5L3R_logo2.png');
        background-size: contain;
        background-repeat: no-repeat;
        background-position: center;
        opacity: 0.2;
        z-index: 0;
        pointer-events: none;
      }
    }
    
    @media (max-width: 768px) {
      flex-direction: column;
      align-items: stretch;
      gap: 1.5rem;
      padding: 0;
      
      > div:first-child {
        align-items: center;
        margin-left: 0;
        min-height: auto;
        height: auto;
      }
    }
    
    // Mobile: reverse order - status bar first, then title/logo
    @media (max-width: 430px) {
      > div:first-child {
        order: 2; // Title/logo appears second
      }
      
      .status-bar-container {
        order: 1; // Status bar appears first
      }
    }
    
    // More space on top and bottom for title div from 425px to 767px - show logo
    @media (max-width: 767px) and (min-width: 425px) {
      > div:first-child {
        padding-top: 1.5rem;
        padding-bottom: 1.5rem;
        position: relative;
        justify-content: flex-end;
        align-items: flex-start;
        min-height: auto;
        height: auto;
        margin-left: 0;
        
        // Show logo behind title with 0.2 opacity
        &::before {
          display: block;
          opacity: 0.2;
          width: 200px;
          height: 200px;
          z-index: 0;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
      }
    }
    
    // Tablet: More space on top and bottom for title div, position to bottom left, show logo
    @media (max-width: 1023px) and (min-width: 768px) {
      > div:first-child {
        padding-top: 1.5rem;
        padding-bottom: 1.5rem;
        position: relative;
        justify-content: flex-end;
        align-items: flex-start;
        
        // Show logo behind title with 0.2 opacity
        &::before {
          display: block;
          opacity: 0.2;
          width: 250px;
          height: 250px;
          z-index: 0;
        }
      }
    }
    
    // More space on top and bottom for title div at 424px and below
    @media (max-width: 430px) {
      > div:first-child {
        padding-top: 2rem;
        padding-bottom: 0;
        position: relative;
        justify-content: flex-end;
        align-items: flex-start;
        min-height: auto;
        height: auto;
        margin-left: 0;
        
        // Show logo behind title with 0.2 opacity
        &::before {
          display: block;
          opacity: 0.2;
          width: 200px;
          height: 200px;
          z-index: 0;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        }
      }
    }
  }
}
```

#### Page Title & Subtitle
```scss
.page-title {
  font-family: 'Montserrat', 'TikTok Sans', sans-serif;
  font-size: 2.5rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #ffffff;
  margin: 0;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  position: relative;
  z-index: 1;
  text-transform: uppercase;
  
  @media (max-width: 768px) {
    font-size: 1.75rem;
  }
  
  @media (max-width: 430px) {
    font-size: 1.5rem;
  }
}

.page-subtitle {
  font-family: 'Montserrat', 'TikTok Sans', sans-serif;
  font-size: 0.95rem;
  font-weight: 600;
  letter-spacing: 0.05em;
  color: rgba(255, 255, 255, 0.8);
  margin: 0;
  text-transform: uppercase;
  position: relative;
  z-index: 1;
  
  @media (max-width: 768px) {
    font-size: 0.85rem;
  }
  
  @media (max-width: 430px) {
    font-size: 0.75rem;
    margin-bottom: 35px; // Compensate for lack of section titles on mobile
  }
}
```

#### Status Count Bar Container
```scss
.status-bar-container {
  flex: 1;
  max-width: 650px;
  width: 100%;
  align-self: center;
  
  @media (max-width: 768px) {
    max-width: 100%;
    width: 100%;
    margin: 0;
  }
}

// Status Count Bar Component (app-status-count-bar)
// Component styles are compartmentalized within the component
// Container styling:
.container {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.03) 100%);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  padding: 24px 32px;
  position: relative;
  z-index: 1;
  width: 100%;
  box-sizing: border-box;
  
  // 431px and above - reduce padding
  @media (min-width: 431px) {
    padding: 18px;
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
    border-color: rgba(255, 255, 255, 0.2);
  }
  
  @media (max-width: 768px) {
    padding: 16px 20px;
  }
  
  @media (max-width: 430px) {
    padding: 12px 16px;
  }
}
```

#### Search Bar (Status Count Bar)
```scss
.search-container {
  position: relative;
  display: flex;
  align-items: center;
  background: var(--ion-color-light-shade);
  border: 1px solid var(--ion-color-light-shade);
  border-radius: 12px;
  padding: 12px 16px;
  min-height: 48px; // Consistent height across pages
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);

  &:focus-within {
    border-color: rgba(33, 150, 243, 0.5);
    box-shadow: 0 0 0 3px rgba(33, 150, 243, 0.1);
    background: var(--ion-color-light-tint);

    .search-icon {
      color: #2196F3;
    }
  }
  
  @media (max-width: 430px) {
    padding: 8px 12px;
    border-radius: 8px;
    min-height: 44px;
  }
}
```

#### Section Containers (Optional - for grouped content)
```scss
.section-container {
  border-radius: 10px;
  padding: 1.5rem;
  margin-bottom: 1.3rem;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  
  @media (max-width: 430px) {
    padding: 0.75rem;
    margin-bottom: 1rem;
    margin-left: 12px;
    margin-right: 12px;
  }
  
  @media (max-width: 768px) {
    padding: 1rem;
    margin-bottom: 1.5rem;
    margin-left: 16px;
    margin-right: 16px;
  }
  
  // 431px and above - reduce padding
  @media (min-width: 431px) {
    padding: 18px 18px 30px 18px;
  }
  
  // Remove container styling only at 426px and below
  @media (max-width: 430px) {
    background: transparent;
    backdrop-filter: none;
    border: none;
    box-shadow: none;
    padding: 0;
    margin-bottom: 1.5rem;
    margin-left: 0;
    margin-right: 0;
    border-radius: 0;
    
    &:hover {
      transform: none;
      box-shadow: none;
      border-color: transparent;
    }
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
    border-color: rgba(255, 255, 255, 0.2);
  }
  
  .section-header {
    margin: 0 0 18px 0;
    text-align: right;
    
    @media (max-width: 768px) {
      margin: 0 0 0.75rem 0;
    }
    
    @media (max-width: 430px) {
      margin: 0 0 1rem 0;
      padding: 0;
    }
    
    .section-title {
      font-family: 'Montserrat', 'TikTok Sans', sans-serif;
      font-size: 1.75rem;
      font-weight: 800;
      color: #ffffff;
      margin: 0;
      text-transform: uppercase;
      letter-spacing: -0.02em;
      text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
      background: linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      display: inline-block;
      
      @media (max-width: 1024px) and (min-width: 427px) {
        font-size: 1.5rem;
      }
      
      @media (max-width: 768px) {
        font-size: 1.25rem;
      }
      
      @media (max-width: 430px) {
        font-size: 1.5rem;
      }
    }
  }
}
```

#### Grid Layout Pattern
```scss
.items-grid {
  display: grid;
  width: 100%;
  justify-content: center; // Center cards when there's extra space
  
  // Base gap for all views (mobile-first)
  gap: 0.625rem;
  
  // Mobile: 2 columns side by side
  grid-template-columns: repeat(2, 1fr);
  justify-content: stretch;
  
  // Tablet: 431px to 768px - same gap, auto-fill columns
  @media (min-width: 431px) {
    grid-template-columns: repeat(auto-fill, minmax(260px, 260px));
    justify-content: center;
  }
  
  // Desktop: 769px and above - slightly larger gap
  @media (min-width: 769px) {
    gap: 0.875rem;
  }
}
```

#### Card Pattern (List Items)
```scss
.item-card {
  border-radius: 20px;
  padding: 0;
  background: #1e1e1e; // Sidebar color at all view sizes 426px and up
  backdrop-filter: blur(10px);
  border: 1px solid var(--ion-color-light-shade);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  cursor: pointer;
  overflow: hidden;
  width: 100%;
  min-width: 0; // Prevent overflow in grid
  height: 100%;
  position: relative;
  
  // Cool effects for 431px and above
  @media (min-width: 431px) {
    background: linear-gradient(135deg, rgba(35, 35, 40, 0.98) 0%, rgba(25, 25, 30, 0.98) 100%);
    border: 1px solid rgba(255, 255, 255, 0.15);
    box-shadow: 
      0 4px 16px rgba(0, 0, 0, 0.25),
      0 0 0 1px rgba(255, 255, 255, 0.08) inset;
    
    // Subtle shine overlay
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(
        90deg,
        transparent,
        rgba(255, 255, 255, 0.05),
        transparent
      );
      transition: left 0.6s ease;
      z-index: 1;
      pointer-events: none;
    }
  }
  
  // Mobile: use status count bar color
  @media (max-width: 430px) {
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.03) 100%);
    border: none;
    backdrop-filter: blur(10px);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    border-radius: 10px;
  }
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 40px rgba(128, 128, 128, 0.2);
    border-color: var(--ion-color-light-shade);
    background: #2a2a2a;
    
    // Enhanced hover effects for 431px and above
    @media (min-width: 431px) {
      transform: translateY(-6px) scale(1.02);
      background: linear-gradient(135deg, rgba(45, 45, 50, 1) 0%, rgba(35, 35, 40, 1) 100%);
      border-color: rgba(255, 255, 255, 0.25);
      box-shadow: 
        0 8px 24px rgba(0, 0, 0, 0.3),
        0 0 0 1px rgba(255, 255, 255, 0.15) inset,
        0 0 20px rgba(33, 150, 243, 0.1);
      
      // Animate shine overlay on hover
      &::before {
        left: 100%;
      }
    }
    
    // Mobile hover
    @media (max-width: 430px) {
      transform: translateY(-2px);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
      border: none;
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.05) 100%);
    }
  }
}

.item-card-content {
  background: transparent;
  display: flex;
  flex-direction: column;
  height: 100%;
  position: relative;
  box-sizing: border-box;
  z-index: 2; // Ensure content is above shine overlay
  
  // Mobile (base blueprint): 430px and below
  padding: 0.75rem 0.75rem 0.2rem 0.75rem;
  min-height: 85px;
  
  // All views above mobile: 431px and above - use tablet styling
  @media (min-width: 431px) {
    padding: 14px 14px 0.3rem 14px;
    min-height: 140px;
  }
}
```

#### List Container
```scss
.items-list {
  position: relative;
  z-index: 1;
  width: 100%;
  
  // Add padding for tablet and 426px mobile view - more room on sides
  @media (max-width: 1023px) and (min-width: 767px) {
    padding: 0 20px;
  }
  
  @media (max-width: 430px) {
    padding: 0 20px;
  }
}
```

### Responsive Breakpoints (Fleet Page Standard)
```scss
// Mobile-first approach
// Key breakpoints:
// - 430px and below: Mobile base (2-column grid, minimal styling)
// - 431px to 768px: Tablet (auto-fill grid, enhanced card effects)
// - 769px and above: Desktop (larger gaps, full effects)
// - 1024px and above: Laptop (full expansion)

// Mobile: 430px and below
@media (max-width: 430px) { }

// Tablet Small: 431px to 767px
@media (min-width: 431px) and (max-width: 767px) { }

// Tablet: 768px to 1023px
@media (min-width: 768px) and (max-width: 1023px) { }

// Desktop: 769px and above
@media (min-width: 769px) { }

// Laptop: 1024px and above
@media (min-width: 1024px) { }
```

### Logo Background Pattern
```scss
// Logo appears behind page title at 0.2 opacity
// Centered in title container
// Responsive sizing:
// - Desktop: 300px × 300px
// - Tablet (768px-1023px): 250px × 250px
// - Mobile (425px-767px): 200px × 200px
// - Mobile (≤430px): 200px × 200px

.page-header .header-content > div:first-child::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 300px; // Responsive sizes above
  height: 300px;
  background-image: url('/assets/5L3R_logo2.png');
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  opacity: 0.2;
  z-index: 0;
  pointer-events: none;
}
```

---

## Design Tokens Summary

```scss
// Colors
--background: #1e293b;
--text-primary: #ffffff;
--text-secondary: rgba(255, 255, 255, 0.8);
--interactive: #3b82f6;
--success: #4CAF50;
--warning: #FF9800;
--danger: #f44336;

// Spacing
--spacing-xs: 0.25rem;
--spacing-sm: 0.5rem;
--spacing-md: 1rem;
--spacing-lg: 1.5rem;
--spacing-xl: 2rem;

// Border Radius
--radius-sm: 8px;
--radius-md: 10px;      // Standard container radius
--radius-lg: 12px;
--radius-xl: 16px;
--radius-card: 20px;    // Card border radius

// Shadows
--shadow-sm: 0 4px 16px rgba(0, 0, 0, 0.2);
--shadow-md: 0 8px 32px rgba(0, 0, 0, 0.3);
--shadow-lg: 0 12px 40px rgba(0, 0, 0, 0.4);

// Transitions
--transition-fast: 0.2s ease;
--transition-normal: 0.3s ease;

// Breakpoints
--breakpoint-mobile: 430px;
--breakpoint-tablet-sm: 431px;
--breakpoint-tablet: 768px;
--breakpoint-desktop: 769px;
--breakpoint-laptop: 1024px;
```

---

## Style Guide Checklist

### Visual Design
- [ ] Consistent use of glass-morphism
- [ ] Proper color application (status colors)
- [ ] Typography scale followed
- [ ] Spacing hierarchy maintained
- [ ] Shadow system consistent
- [ ] Border radius appropriate for component

### Interaction Design
- [ ] Hover states on all interactive elements
- [ ] Active states for buttons
- [ ] Focus states for accessibility
- [ ] Smooth transitions (0.3s ease)
- [ ] Appropriate touch target sizes

### Responsive Design
- [ ] Mobile-first approach
- [ ] Breakpoints implemented correctly
- [ ] Typography scales appropriately
- [ ] Spacing adjusts for screen size
- [ ] Layout adapts (grid → stack)

### Component Consistency
- [ ] Buttons follow patterns
- [ ] Cards have consistent styling
- [ ] Chips use standard design
- [ ] Icons follow guidelines
- [ ] Forms use consistent inputs

### Page Layout Consistency (Fleet Page Blueprint)
- [ ] Content container follows fleet page pattern
- [ ] Page header structure matches (title, subtitle, logo background)
- [ ] Status count bar container positioned correctly
- [ ] Grid layout uses fleet page breakpoints (430px, 431px, 768px, 1024px)
- [ ] Cards follow fleet page styling (mobile vs tablet/desktop)
- [ ] Responsive behavior matches fleet page exactly
- [ ] Search bar height consistent (min-height: 48px)
- [ ] Logo background pattern implemented (if applicable)

---

*This document establishes the visual and interaction standards for the Vanguard application. All components should adhere to these guidelines for consistency and quality. The Fleet page serves as the blueprint for all admin list pages - use it as the reference for styling and layout patterns.*