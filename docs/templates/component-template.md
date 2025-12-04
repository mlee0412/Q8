# Component Template

Use this template when creating new React components for Q8.

## Component Name: [ComponentName]

### Purpose
Brief description of what this component does and where it's used.

### File Location
`apps/web/src/components/[category]/[ComponentName].tsx`

### Component Code

```typescript
'use client'; // If client component

import { useState } from 'react';
import { cn } from '@/lib/utils';
// Import other dependencies

interface [ComponentName]Props {
  // Required props
  prop1: string;
  prop2: number;

  // Optional props
  prop3?: boolean;
  className?: string;
  children?: React.ReactNode;
}

/**
 * [ComponentName] - Brief description
 *
 * @example
 * ```tsx
 * <[ComponentName] prop1="value" prop2={123} />
 * ```
 */
export function [ComponentName]({
  prop1,
  prop2,
  prop3 = false,
  className,
  children,
}: [ComponentName]Props) {
  // State
  const [state, setState] = useState<StateType>(initialValue);

  // Handlers
  const handleAction = () => {
    // Implementation
  };

  // Effects
  // useEffect(() => {}, []);

  return (
    <div className={cn('base-classes', className)}>
      {/* Component JSX */}
      {children}
    </div>
  );
}

// Export displayName for debugging
[ComponentName].displayName = '[ComponentName]';
```

### Variants (if using CVA)

```typescript
import { cva, type VariantProps } from 'class-variance-authority';

const [componentName]Variants = cva(
  'base-classes',
  {
    variants: {
      variant: {
        default: 'variant-classes',
        glass: 'glass-panel',
        neon: 'neon-border',
      },
      size: {
        sm: 'size-sm',
        md: 'size-md',
        lg: 'size-lg',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
    },
  }
);

interface [ComponentName]Props extends VariantProps<typeof [componentName]Variants> {
  // Other props
}
```

### Usage Examples

#### Basic Usage
```tsx
<[ComponentName] prop1="value" prop2={123} />
```

#### With Variants
```tsx
<[ComponentName]
  prop1="value"
  prop2={123}
  variant="glass"
  size="lg"
/>
```

#### With Children
```tsx
<[ComponentName] prop1="value" prop2={123}>
  <p>Child content</p>
</[ComponentName]>
```

### Styling Guidelines

- Use Tailwind classes
- Follow Glassmorphism design system
- Use design tokens from `globals.css`
- Ensure responsive behavior

**Design Tokens:**
- `glass-panel` - Glass morphism effect
- `text-neon-primary` - Purple accent
- `text-neon-accent` - Green accent

### Accessibility

- [ ] Semantic HTML elements
- [ ] ARIA labels where needed
- [ ] Keyboard navigation support
- [ ] Screen reader friendly
- [ ] Color contrast meets WCAG AA

### Testing

#### Unit Tests

```typescript
// apps/web/src/components/[category]/[ComponentName].test.tsx
import { render, screen } from '@testing-library/react';
import { [ComponentName] } from './[ComponentName]';

describe('[ComponentName]', () => {
  it('renders correctly', () => {
    render(<[ComponentName] prop1="test" prop2={123} />);
    expect(screen.getByText('expected text')).toBeInTheDocument();
  });

  it('handles interactions', () => {
    // Test user interactions
  });
});
```

#### Storybook Story

```typescript
// apps/web/src/components/[category]/[ComponentName].stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { [ComponentName] } from './[ComponentName]';

const meta: Meta<typeof [ComponentName]> = {
  title: '[Category]/[ComponentName]',
  component: [ComponentName],
  tags: ['autodocs'],
  argTypes: {
    prop1: { control: 'text' },
    prop2: { control: 'number' },
  },
};

export default meta;
type Story = StoryObj<typeof [ComponentName]>;

export const Default: Story = {
  args: {
    prop1: 'Example',
    prop2: 123,
  },
};

export const WithVariant: Story = {
  args: {
    prop1: 'Example',
    prop2: 123,
    variant: 'glass',
  },
};
```

### Performance Considerations

- [ ] Use `memo` if expensive renders
- [ ] Lazy load heavy dependencies
- [ ] Optimize images with Next.js Image
- [ ] Minimize re-renders
- [ ] Use `useCallback` for handlers

### Integration Points

**Used in:**
- [Page/Component 1]
- [Page/Component 2]

**Uses:**
- [Dependency 1]
- [Dependency 2]

### Props Documentation

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| prop1 | string | - | Required description |
| prop2 | number | - | Required description |
| prop3 | boolean | false | Optional description |
| className | string | - | Additional CSS classes |
| children | ReactNode | - | Child elements |

### State Management

If component uses RxDB or global state:

```typescript
import { useRxQuery } from '@/hooks/useRxDB';

const { data, isLoading } = useRxQuery('collection_name',
  (collection) => collection.find()
);
```

### Animation

If component uses Framer Motion:

```typescript
import { motion } from 'framer-motion';

const variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

<motion.div
  variants={variants}
  initial="hidden"
  animate="visible"
  transition={{ duration: 0.3 }}
>
  {/* Content */}
</motion.div>
```

### Checklist

- [ ] Component file created
- [ ] TypeScript types defined
- [ ] Props interface documented
- [ ] Accessibility implemented
- [ ] Responsive design verified
- [ ] Unit tests written
- [ ] Storybook story created
- [ ] Used in at least one place
- [ ] Peer reviewed
- [ ] Documentation complete

### Related Components

- [Related Component 1]
- [Related Component 2]

### Design Reference

Link to Figma/design file (if applicable)

---

**Created by:** [Your Name]
**Date:** [YYYY-MM-DD]
**Status:** [Planning/In Development/Active/Deprecated]
