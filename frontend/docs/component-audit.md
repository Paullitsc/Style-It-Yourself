# Component Duplication Audit

## Scope
Audit date: February 28, 2026

Scanned directories:
- `src/components`
- `src/app/style/components`
- `src/app/closet/components`
- `src/app/closet/page.tsx`

## Duplication Findings

1. Modal shell duplicated across at least 5 files with near-identical backdrop, panel, close button, and z-index layout.
- `src/app/closet/components/ItemDetailModal.tsx`
- `src/app/closet/components/OutfitDetailModal.tsx`
- `src/app/style/components/ItemDetailModal.tsx`
- `src/app/style/components/TryOnModal.tsx`
- `src/app/style/components/TryonOutfitModal.tsx`

2. Repeated button variants (white primary, transparent secondary, destructive) across pages and modal footers.
- `src/components/AuthModal.tsx`
- `src/app/closet/page.tsx`
- `src/app/style/components/SummaryStep.tsx`
- `src/app/style/components/MetadataStep.tsx`

3. Repeated card wrappers for item/outfit thumbnails and metadata.
- `src/app/closet/page.tsx`
- `src/app/style/components/SummaryStep.tsx`
- `src/app/closet/components/OutfitDetailModal.tsx`

4. Label/input styling repeated in auth and metadata forms.
- `src/components/AuthModal.tsx`
- `src/app/style/components/MetadataStep.tsx`
- `src/app/style/components/shared/ColorSelector.tsx`

5. Loading skeleton/spinner patterns are inconsistent and mostly hand-coded per page.
- `src/app/closet/page.tsx`
- `src/app/closet/components/OutfitDetailModal.tsx`
- `src/app/style/components/SummaryStep.tsx`

## Standardization Implemented

Shared UI primitives were introduced in `src/components/ui` and integrated into high-duplication surfaces:
- `Button`: used in `AuthModal`, closet page toggle/retry, modal actions.
- `Card` + card variants: used in closet page and suggestion panel.
- `Modal` + `ConfirmationModal`: used in auth, closet detail modals, style detail and try-on modals.
- `Input` (`TextInput`, `FileUploadInput`): used in auth, metadata optional fields, image upload zone.
- `Badge` variants: used for ownership/status, harmony tags, base item labels.
- `Skeleton`: used for closet loading and outfit detail loading state.

