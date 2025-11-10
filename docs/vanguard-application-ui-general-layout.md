# Vanguard Application UI General Layout

## Overview
The Vanguard Fleet Inspection & Condition Tracking Application follows a modern, dark-themed UI with glass-morphism effects, responsive design principles, and a card-based layout architecture.

---

## Layout Structure

### 0. Admin Shell Architecture (Persistent Frame)

The admin area uses a persistent frame that never unmounts:

```
app-admin-layout (shell)
├── app-admin-navbar (left, persistent sidebar)
└── .content-area [class.sidebar-collapsed]
    ├── app-breadcrumb.layout-breadcrumb (sticky top, matches sidebar color)
    └── .page-content
        └── router-outlet (page swaps here only)
```

Key behaviors
- Navbar is decoupled from page content (no content projection).
- Breadcrumb is sticky, shifts horizontally when the sidebar expands, and animates its left padding to avoid being covered.
- Layout manages left padding and scrolling; pages avoid global wrappers.

Implementation notes
- Sidebar widths: expanded 280px, collapsed 70px.
- Breadcrumb shift: padding-left = 210px when expanded (280 − 70), with `transition: padding-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)`.
- Breadcrumb colors: background `#1e1e1e` (sidebar color); current node uses `var(--ion-color-primary)`.
- State flow: `NavbarStateService` publishes `isCollapsed`/`isMobileOpen`. `AdminLayout` subscribes and toggles classes.
- Dynamic labels: `BreadcrumbService` exposes a `tail$`; pages (e.g., van-details) set/clear tail items.

### 1. Page Container Hierarchy (Within router-outlet)

```
ion-content (page-local container)
├── .content-container (Main content wrapper)
    ├── Loading/Error States
    └── Main Content Sections
        ├── .van-details-container
            ├── .van-header-card (Primary info card)
            └── .history-card (Secondary card with tabs)
```

### 2. Primary Layout Components

#### A. Content Container
- **Responsive Width**: Max-width 1200px, centered
- **Background**: Dark slate (#1e293b)
- **Padding**: 
  - Desktop: 12px
  - Tablet (≤768px): 0px
  - Mobile (≤480px): 0px
- **Full-width behavior**: On mobile devices, containers expand edge-to-edge

#### B. Card Layout System
- **Base Card Style**:
  - Glass-morphism background with gradient overlays
  - Backdrop filter blur(10px)
  - Border radius: 10px (all breakpoints - consistent)
  - Box shadow: 0 8px 32px rgba(0, 0, 0, 0.3)
  - Border: 1px solid rgba(255, 255, 255, 0.1)
  - Transform: none !important (cards should NOT move)
  - Hover effects: Enhanced shadow and border color only (no transform)

#### C. Two-Column Grid Layout
- **Desktop (40/60 Split)**:
  - Grid template: `minmax(320px, 40%) 1fr`
  - Gap: 2rem 3rem
- **Mobile (Stacked)**:
  - Single column at ≤900px breakpoint
  - Gap: 1.5rem

### 3. Responsive Breakpoints

```scss
// Mobile Small
@media (max-width: 480px) { }

// Mobile Large
@media (min-width: 375px) and (max-width: 600px) { }

// Tablet
@media (max-width: 768px) { }

// Desktop
@media (max-width: 900px) { }

// Large Desktop
// Default (max-width: 1200px)
```

---

## Component Layouts

### 1. Van Details Header Card

#### Layout Structure
- **Grid Layout** (Desktop): Two columns, 40% info / 60% image/actions
- **Stack Layout** (Mobile): Single column, top-to-bottom

#### Left Column Components (Van Basic Info)
```
.van-basic-info
├── .van-title (Main heading)
├── .van-subtitle (Secondary heading)
├── .status-chip (Status indicator)
├── .van-details-list (Vertical list)
│   └── .detail-item (Icon + Content pairs)
└── .action-buttons (Side-by-side buttons)
```

#### Right Column Components (Van Actions Section)
```
.van-actions-section
└── .van-image-section
    ├── .van-image (Responsive image)
    └── .toggle-button (Ground/Activate button)
```

#### Detail Items Grid Behavior
- **Desktop**: Single column, vertical stack
- **Mobile L (375-600px)**: 2-column grid for detail items
- **Each Item**: Icon + Content layout
  - Icon: Left-aligned, 1.3rem size
  - Content: Right-aligned text block

### 2. History/Tabbed Content Card

#### Layout Structure
```
.history-card
└── .history-container
    ├── ion-card-header (Card title)
    ├── .tab-navigation (Tab buttons)
    └── .tab-content
        └── .tab-panel (Active tab content)
```

#### Tab Navigation Layout
- **Layout**: Flex row with equal-width buttons
- **Button Style**: Glass-morphism with rounded top corners only
- **Active State**: Enhanced background and white text
- **Mobile Behavior**: Icons only (labels hidden), centered

### 3. Tab Content Sections

#### Notes Tab
```
.notes-tab-content
├── .section-header
├── .note-editor (Conditional editor)
└── .notes-list
    └── .note-card (Individual notes)
```

#### Drivers Tab
```
.drivers-tab-content
├── .section-header
└── .drivers-list
    └── .driver-card (Driver records)
```

#### Issues/Maintenance Tabs
```
[tab]-tab-content
├── .section-header
├── .compact-stats-row (3-column stat cards)
└── [content]-list (Records list)
```

---

## Spacing System

### Typography Spacing
- **Title to Subtitle**: 0.5rem
- **Subtitle to Status**: 1.5rem
- **Status to List**: 2rem
- **List Items**: 0.5rem gap
- **List to Actions**: 2rem

### Component Spacing
- **Card Margin Bottom**: 2rem (desktop), 1.5rem (tablet), 1rem (mobile)
- **Card Padding**: 2.5rem (desktop), 1rem (tablet), 0.75rem (mobile)
- **Section Gaps**: 1rem - 3rem depending on breakpoint
- **Tab Content Padding**: 16px (desktop), 12px (tablet), 8px (mobile)

### Margin/Padding Hierarchy
```scss
Container Level:
  Desktop: 12px
  Tablet: 0px (edge-to-edge)
  Mobile: 0px (edge-to-edge)

Card Level:
  Desktop: 2.5rem (2.5rem = 40px)
  Tablet: 1rem (16px)
  Mobile: 0.75rem (12px)

Content Level:
  Desktop: 1.5rem (24px)
  Tablet: 1rem (16px)
  Mobile: 0.75rem (12px)
```

---

## Grid & Flexbox Patterns

### 1. Main Header Grid (Desktop)
```scss
.van-header {
  display: grid;
  grid-template-columns: minmax(320px, 40%) 1fr;
  gap: 2rem 3rem;
  
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
}
```

### 2. Detail Items Grid (Mobile)
```scss
.van-details-list {
  @media (min-width: 375px) and (max-width: 600px) {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
  }
}
```

### 3. Action Buttons Flex
```scss
.action-buttons {
  display: flex;
  gap: 0.75rem;
  
  @media (max-width: 420px) {
    flex-direction: column;
  }
}
```

### 4. Tab Navigation Flex
```scss
.tab-navigation {
  display: flex;
  gap: 0.25rem;
  flex-wrap: nowrap;
  
  .tab-button {
    flex: 1 !important;
  }
}
```

---

## Visual Hierarchy

### 1. Typography Scale
- **Title (h1/Van Title)**: 2.5rem → 1.3rem (tablet) → 1.7rem (mobile)
- **Subtitle (h2)**: 1.2rem → 1rem (tablet) → 0.9rem (mobile)
- **Section Headers (h3)**: 1.2rem → 1.1rem (tablet) → 1rem (mobile)
- **Detail Labels (h3)**: 0.95rem → 0.85rem (tablet) → 0.75rem (mobile)
- **Body Text (p)**: 0.95rem → 0.85rem (tablet) → 0.75rem (mobile)

### 2. Color Hierarchy
- **Primary Text**: White (#ffffff) with text-shadow
- **Secondary Text**: rgba(255, 255, 255, 0.8)
- **Tertiary Text**: rgba(255, 255, 255, 0.7)
- **Interactive Elements**: #3b82f6 (blue)
- **Status Colors**: 
  - Success: #4CAF50
  - Warning: #FF9800
  - Danger: #f44336

### 3. Visual Weight Hierarchy
1. **Title** - Gradient text effect, largest size
2. **Status Chip** - Prominent badge with icon
3. **Detail Items** - Icon + structured content
4. **Action Buttons** - High-contrast, solid fills
5. **Tab Content** - Subtle backgrounds, clear separation

---

## Interaction Patterns

### 1. Button Layout
- **Primary Actions**: Side-by-side, equal width, flex: 1
- **Button Heights**: 
  - Desktop: 48px
  - Tablet: 40px
  - Mobile: 36px
- **Border Radius**: 10px (all breakpoints - consistent)

### 2. Tab Interaction
- **Default State**: Translucent background, muted text
- **Active State**: Enhanced background gradient, white text, shadow
- **Hover Effect**: translateY(-2px) - lifts up
- **Active Effect**: translateY(1px) - presses down
- **Mobile**: Icon-only display, labels hidden

### 3. Card Interaction
- **Default**: Subtle shadow, clear border
- **Hover**: Enhanced shadow, brighter border (NO transform - cards don't move)
- **Transform**: transform: none !important (prevents any movement)
- **Active Content**: Slightly different background tint

### 4. Clickable Elements
- **Visual Indicator**: Color change to #3b82f6
- **Hover Effect**: Underline + opacity change
- **Cursor**: Pointer

---

## Empty States

### Layout Pattern
```html
<div class="empty-state">
  <ion-icon name="[icon]" class="empty-icon"></ion-icon>
  <h3>[Title]</h3>
  <p>[Description]</p>
</div>
```

### Styling
- Center-aligned text
- Padding: 40px 20px
- Icon: 48px, 50% opacity
- Spacing between elements: 16px / 8px

---

## Modal & Overlay Patterns

### 1. Modal Dimensions
- Width: 95% (desktop), 98% (mobile)
- Max-width: 800px
- Border radius: 20px
- Backdrop filter: blur(10px)

### 2. Loading States
- Spinner: 48px size, 1.2x scale
- Color: #4CAF50
- Layout: Centered, vertical stack
- Background: Glass-morphism card

---

## Mobile-Specific Patterns

### 1. Touch Targets
- Minimum: 36px height
- Preferred: 44-48px
- Gap between targets: 8-12px

### 2. Scroll Behavior
- Content: Full-width containers
- Padding: Reduced to 8-12px
- Margins: Left/right 12-16px for cards

### 3. Text Optimization
- Labels: Abbreviated or hidden
- Icons: Prominent, centered
- Stacking: Vertical priority over horizontal

---

## Layout Best Practices

### DO's
✅ Use glass-morphism for depth
✅ Implement 3-4 level spacing hierarchy
✅ Stack vertically on mobile
✅ Use grid for multi-column layouts
✅ Add hover effects to interactive elements
✅ Maintain consistent card styling
✅ Use backdrop-filter for depth
✅ Center content with max-width containers
✅ Use flex: 1 for equal-width elements
✅ Implement responsive font scaling

### DON'Ts
❌ Fixed widths (except max-width containers)
❌ Absolute positioning for layout
❌ Hard-coded dimensions without media queries
❌ Missing hover states on interactive elements
❌ Inconsistent spacing between elements
❌ Too much horizontal scrolling
❌ Overlapping content without proper stacking context
❌ Ignoring touch target sizes
❌ Poor visual hierarchy
❌ Missing empty states

---

## Implementation Reference

### Content Container Pattern
```scss
.content-container {
  --background: #1e293b;
  min-height: 100vh;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 12px;
  
  @media (max-width: 768px) {
    padding: 0;
    margin: 0;
    width: 100%;
    max-width: 100%;
    margin-top: 16px;
  }
}
```

### Card Pattern
```scss
ion-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%);
  border-radius: 10px;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
  transform: none !important;  // Cards should NOT move
  
  &:hover {
    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
    border-color: rgba(255, 255, 255, 0.2);
    transform: none !important;  // No movement on hover
  }
}
```

### Button Pattern
```scss
.action-button {
  flex: 1;
  height: 48px;
  font-size: 0.9rem;
  font-weight: 600;
  --border-radius: 10px;
  --box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  
  &:hover {
    --box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
    transform: translateY(-2px);  // Lift up on hover
  }
  
  &:active {
    transform: translateY(1px);      // Press down on click
    --box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
}
```

---

## Design System Philosophy

### Core Principles
1. **Dark First**: Built for dark theme with light elements for contrast
2. **Glass-morphism**: Modern depth through transparency and blur
3. **Responsive First**: Mobile-first, enhanced for larger screens
4. **Hierarchical**: Clear visual and information hierarchy
5. **Accessible**: Adequate contrast, touch targets, clear states
6. **Performant**: Hardware-accelerated transforms and filters
7. **Consistent**: Reusable patterns across all pages
8. **Scalable**: Fluid typography and spacing that adapts

### Design Language
- **Architecture**: Card-based, modular
- **Aesthetics**: Modern, clean, professional
- **Interaction**: Smooth transitions, clear feedback
- **Responsiveness**: Fluid and adaptive
- **Accessibility**: High contrast, large targets, clear labels

---

*This document serves as the blueprint for all Vanguard application UI layouts.*