# Billora — Frontend Route Integration Requests

Owner: Abiya (Admin & Operations Frontend)  
Recipient: Abhishikth (Shared Frontend Architecture, Routing & Navigation)  
Updated: 2026-10-31

This document requests routing and navigation registrations for new features implemented within Abiya's ownership.

---

## 1. Route Status

| Feature | Requested Route | Component Export | Allowed Roles | Target Navigation Section | Current Status |
|---|---|---|---|---|---|
| **Activity Timeline** | `/app/activity` | `ActivityTimelinePage` from `@/features/activity` | `ADMIN`, `STAFF` | Operations / Audit | **INTEGRATED BY ABHISHIKTH** (commit `055d4e4`) |
| **Notifications Center** | `/app/notifications` | `NotificationsPage` from `@/features/notifications` | `ADMIN`, `STAFF` | Header / Tools | **INTEGRATED BY ABHISHIKTH** (commit `055d4e4`) |
| **Revenue Leak Radar** | `/app/revenue-radar` | `RevenueRadarPage` from `@/features/revenue-radar` | `ADMIN`, `STAFF` | Intelligence / Operations | **PENDING INTEGRATION** |
| **CSV Import** | `/app/import` | `CsvImportWizard` from `@/features/import` | `ADMIN`, `STAFF` | Settings / Data Management | **PENDING INTEGRATION** |
| **GST Management** | `/app/gst` | `GstManagementPage` from `@/features/gst` | `ADMIN` | Compliance / Taxes | **PENDING INTEGRATION** |

---

## 2. Integration Details for Remaining Routes

### A. Revenue Leak Radar
- **Component:** `import { RevenueRadarPage } from '../features/revenue-radar';`
- **Route:** `<ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}><Route path="revenue-radar" element={<RevenueRadarPage />} /></ProtectedRoute>`

### B. CSV Import Wizard
- **Component:** `import { CsvImportWizard } from '../features/import';`
- **Route:** `<ProtectedRoute allowedRoles={['ADMIN', 'STAFF']}><Route path="import" element={<CsvImportWizard />} /></ProtectedRoute>`

### C. GST Compliance
- **Component:** `import { GstManagementPage } from '../features/gst';`
- **Route:** `<ProtectedRoute allowedRoles={['ADMIN']}><Route path="gst" element={<GstManagementPage />} /></ProtectedRoute>`
