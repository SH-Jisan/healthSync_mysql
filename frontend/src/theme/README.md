# HealthSync Design System & Theme

This directory contains the central styling architecture for the HealthSync application. It is designed to provide a consistent, premium UI across all pages.

## File Structure

- **`design_tokens.css`**: The source of truth for all variables.
  - **Colors**: Primary brand (Teal/Green), Secondary, Neutral, and Semantic colors.
  - **Typography**: Font sizes and families.
  - **Effects**: Shadows, Border Radius, and Animation curves.
  - **Spacing**: Global spacing and sizing constants.

- **`ui_templates.css`**: Ready-to-use utility classes for common UI patterns.
  - **Glassmorphism**: `.t-card-glass`, `.t-glass-nav`.
  - **Buttons**: `.t-btn-primary`, `.t-btn-secondary`.
  - **Layout**: `.t-section-padding`, `.t-grid-auto`.
  - **Typography**: `.t-section-title`, `.t-text-gradient`.

## Usage Guide

To use the theme in your components, simply use the `t-` prefixed classes or the CSS variables defined in `:root`.

### Example: Creating a new Feature Section

```tsx
import styles from './MyPage.module.css'; // Your local overrides if needed

export default function MyPage() {
  return (
    <section className="t-section-padding">
        {/* Title */}
        <div className="text-center mb-10">
            <h2 className="t-section-title">My Premium Section</h2>
            <div className="t-title-underline"></div>
        </div>

        {/* Grid */}
        <div className="t-grid-auto">
            {/* Card */}
            <div className="t-card-glass p-6">
                <h3 className="text-xl font-bold mb-2">Feature 1</h3>
                <p className="text-gray-600">Description here...</p>
            </div>
        </div>
    </section>
  );
}
```

### Extending variables
You can access variables in your CSS Modules:

```css
.myComponent {
    color: var(--primary);
    box-shadow: var(--shadow-lg);
    transition: transform 0.3s var(--ease-spring);
}
```

## Dark Mode Theme & Tokens

The application features a professional, eye-comfortable dark mode that eschews pure black (#000000) or high-contrast near-black backdrops in favor of a layered, dark-gray color palette inspired by modern tools like Notion, Slack, and Discord.

### Dark Theme Tokens

These tokens are active when `body.dark-theme` is applied:

| Token Name | Color Code | Purpose / UI Mapping |
| :--- | :--- | :--- |
| `--background` | `#1A1D21` | Main application background (soft dark-gray) |
| `--surface` | `#23272F` | Main cards, sidebar, table containers, forms |
| `--surface-elevated` | `#2A2F38` | Raised cards, dropdowns, inputs, list items |
| `--surface-overlay` | `#343A46` | Modals, popovers, tooltips |
| `--border` | `#404854` | Subtle borders and dividers |
| `--border-hover` | `#4A5563` | Hovered borders and interactive focus states |
| `--border-strong` | `#5B6675` | High-contrast borders (e.g. active indicators) |
| `--text-primary` | `#F3F4F6` | Off-white / light gray text for primary readability |
| `--text-secondary` | `#9CA3AF` | Medium gray text for secondary labels / body copy |
| `--text-muted` | `#6B7280` | Muted text for placeholders and disabled states |

### Design Decisions

1. **Layered Surfaces**: Deep layers are indicated by lighter gray colors. For example, background is `#1A1D21`, the main surface is `#23272F`, and interactive modals/popovers use `#343A46`. This establishes visual depth and hierarchy.
2. **Reduced Contrast Eye Strain**: Pure black (#000000) backgrounds with high-contrast text create glare and eye strain. By using off-white `#F3F4F6` text on soft dark-gray surfaces, readability is maintained over long sessions.
3. **Accessibility**: All interactive text-on-background pairs maintain a high contrast ratio meeting WCAG 2.1 AA standards, ensuring readable text without visual fatigue.
4. **Theme Transitions**: Transition durations (`0.2s`) are configured for smooth interpolation of backgrounds, borders, and colors when switching between light and dark modes.
