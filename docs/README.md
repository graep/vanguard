# Vanguard AI Model Specifications  
**Project:** Vanguard Fleet Inspection & Condition Tracking App  
**Last Updated:** October 2025  

---

## 🧭 Purpose

This folder contains all **AI-Model Specification Files** for the Vanguard project.  
These documents are designed to help **AI systems and developers** fully understand  
the structure, styling, and layout patterns of the Vanguard application —  
so generated code, UI, and logic always match the existing system.

These specs ensure:
- Consistency across UI and code generation  
- AI models understand Vanguard’s stack and layout conventions  
- Easy onboarding for new developers  

---

## 📁 Files Overview

### Core Specifications (Do Not Modify)
| File | Description |
|------|--------------|
| **vanguard-technical-stack.md** | Defines the complete architecture (Angular + Ionic + Firebase). Describes services, data models, authentication, and Firestore/Storage structure. |
| **vanguard-ui-ux-style-standards.md** | Describes the full Vanguard design system — colors, typography, spacing, button styles, and accessibility rules. Used to keep UI generation consistent. |
| **vanguard-application-ui-general-layout.md** | Outlines all page layouts and navigation patterns for both Driver and Admin roles. Establishes split-pane, tab layouts, and responsive behavior. |

### Technical Documentation
| File | Description |
|------|--------------|
| **IONIC_STANDALONE_COMPONENTS_IMPORT.md** | ⚠️ **CRITICAL** - Documents the requirement to import individual Ionic components in standalone Angular components. Using `IonicModule` breaks production builds. |
| **CSS_BUILD_ISSUES.md** | CSS build issues, visual differences between dev/production, and fixes. Includes `inlineCritical` fix and build verification. |
| **SERVICE_WORKER_CACHING_ISSUES.md** | Service worker update fixes, IndexedDB corruption recovery, and caching strategies. |
| **CORS_CONFIGURATION.md** | CORS configuration for development and production, testing procedures, and deployment setup. |
| **SECURITY_GUIDE.md** | Comprehensive security guide covering Firebase configuration, security rules, vulnerability assessment, and production deployment security. |
| **PRODUCTION_DEPLOYMENT_GUIDE.md** | Complete production deployment process with environment configuration, deployment methods, and post-deployment testing. |
| **DEPENDENCY_UPDATE_STRATEGY.md** | Strategy for updating dependencies, security vulnerability assessment, and update plans. |

---

## 🧠 How to Use These with AI Tools

When prompting an AI assistant (ChatGPT, Cursor, Claude, etc.),  
you can reference these files directly in your prompt to give the model full context.

### Example Prompt
> “Refer to `/docs/specs/vanguard-technical-stack.md` and  
> `/docs/specs/vanguard-application-ui-general-layout.md`.  
> Generate a new Angular component for the driver dashboard that fits this architecture.”

This tells the model:
- What frameworks and services it should use  
- What UI and structure conventions to follow  
- How to make its output consistent with Vanguard’s ecosystem  

---

## 🧩 Recommended Structure

```
E:\Projects\Vanguard\
│
├── src/                # Angular/Ionic app source code
├── docs/
│   └── specs/
│       ├── vanguard-technical-stack.md
│       ├── vanguard-ui-ux-style-standards.md
│       ├── vanguard-application-ui-general-layout.md
│       └── README.md   ← (this file)
│
└── firebase.json       # Firebase configuration
```

---

## 🛠 Updating Specs

Whenever you make major architectural or design changes:
1. Update the relevant `.md` spec file.  
2. Commit the changes with a clear message, e.g.:  
   ```
   git commit -m "docs: updated Vanguard UI/UX style standards for new overlay system"
   ```
3. Keep the version and “Last Updated” date current.

---

## 🔒 Notes
- These `.md` files are **not part of the Angular build**; they live outside `/src/`.  
- Avoid placing them under `/src/app/` to prevent unnecessary bundling.  
- Safe to share publicly (no secrets or credentials).  

---

**Maintainer:** Graeson Pritchard  
**Project:** Vanguard Fleet Inspection System  
**Spec Version:** 1.0  
