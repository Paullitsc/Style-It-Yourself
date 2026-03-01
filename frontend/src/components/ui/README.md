# Shared UI Component Library

Location: `src/components/ui`

## Exports

```ts
import {
  Button,
  Card,
  ItemCard,
  OutfitCard,
  RecommendationCard,
  Modal,
  ConfirmationModal,
  TextInput,
  SelectInput,
  FileUploadInput,
  Badge,
  StatusBadge,
  CategoryBadge,
  FormalityBadge,
  Skeleton,
  CardSkeleton,
  TextSkeleton,
} from '@/components/ui'
```

## Design Tokens

Global spacing/sizing tokens are defined in `src/app/global.css`:
- Spacing: `--space-1` to `--space-12`
- Controls: `--size-control-sm|md|lg`
- Icons: `--size-icon-sm|md|lg`
- Radius: `--radius-sm|md|lg|xl`

These tokens are used by all shared UI components via `var(...)`.

## Components

### Button
Variants:
- `primary`
- `secondary`
- `ghost`
- `danger`

Sizes:
- `sm`
- `md`
- `lg`

Supports:
- `loading`
- `leftIcon` and `rightIcon`
- `fullWidth`

### Card
Base:
- `Card`
- `CardHeader`
- `CardBody`
- `CardFooter`

Specialized:
- `ItemCard`
- `OutfitCard`
- `RecommendationCard`

### Modal
- `Modal`: base accessible dialog
- `ConfirmationModal`: reusable destructive/confirm dialog

Features:
- Escape to close
- Backdrop close support
- Focus trapping
- Focus restore on close
- `aria-modal`, dialog labelling

### Input
- `TextInput`
- `SelectInput`
- `FileUploadInput`

Features:
- Label + required marker
- Hint and error wiring via `aria-describedby`
- Invalid state via `aria-invalid`
- File size/type validation in `FileUploadInput`

### Badge
- `Badge`
- `StatusBadge`
- `CategoryBadge`
- `FormalityBadge`

### Skeleton
- `Skeleton`
- `CardSkeleton`
- `TextSkeleton`

