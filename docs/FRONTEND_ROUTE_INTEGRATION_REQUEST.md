# Billora — Frontend Route Integration Requests

Owner: Abiya (Admin & Operations Frontend)  
Recipient: Abhishikth (Shared Frontend Architecture, Routing & Navigation)  
Date: 2026-10-31

This document requests routing and navigation registrations for new features implemented within Abiya's ownership.

---

## 1. Route Registrations Requested

| Feature | Requested Route | Component Export | Allowed Roles | Target Navigation Section |
|---|---|---|---|---|
| **Revenue Leak Radar** | `/app/revenue-radar` | `RevenueRadarPage` from `@/features/revenue-radar` | `ADMIN`, `STAFF` | Intelligence / Operations |
| **Activity Timeline** | `/app/activity` | `ActivityTimelinePage` from `@/features/activity` | `ADMIN`, `STAFF` | Operations / Audit |
| **Notifications Center** | `/app/notifications` | `NotificationsPage` from `@/features/notifications` | `ADMIN`, `STAFF` | Header / Workspace Tools |

---

## 2. Integration Details for Abhishikth

### A. Revenue Leak Radar
- **Component:** `import { RevenueRadarPage } from '../features/revenue-radar';`
- **Route Definition in `router.tsx`:**
  ```tsx
  { path: 'revenue-radar', element: <RevenueRadarPage /> },
  ```
- **Navigation item in `navigation.ts`:**
  - Label: `Revenue Leak Radar`
  - Path: `/app/revenue-radar`
  - Roles: `ADMIN`, `STAFF`

### B. Activity Timeline
- **Component:** `import { ActivityTimelinePage } from '../features/activity';`
- **Route Definition in `router.tsx`:**
  ```tsx
  { path: 'activity', element: <ActivityTimelinePage /> },
  ```
- **Navigation item in `navigation.ts`:**
  - Label: `Activity Timeline`
  - Path: `/app/activity`
  - Roles: `ADMIN`, `STAFF`

### C. Notifications Center
- **Component:** `import { NotificationsPage } from '../features/notifications';`
- **Route Definition in `router.tsx`:**
  ```tsx
  { path: 'notifications', element: <NotificationsPage /> },
  ```
- **Navigation item in `navigation.ts`:**
  - Label: `Notifications`
  - Path: `/app/notifications`
  - Roles: `ADMIN`, `STAFF`

