---
name: SaaS Business OS
colors:
  surface: '#f8f9fb'
  surface-dim: '#d9dadc'
  surface-bright: '#f8f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#edeef0'
  surface-container-high: '#e7e8ea'
  surface-container-highest: '#e1e2e4'
  on-surface: '#191c1e'
  on-surface-variant: '#45464d'
  inverse-surface: '#2e3132'
  inverse-on-surface: '#f0f1f3'
  outline: '#76777d'
  outline-variant: '#c6c6cd'
  surface-tint: '#565e74'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#131b2e'
  on-primary-container: '#7c839b'
  inverse-primary: '#bec6e0'
  secondary: '#a83900'
  on-secondary: '#ffffff'
  secondary-container: '#ff6a2b'
  on-secondary-container: '#5b1b00'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#0b1c30'
  on-tertiary-container: '#75859d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2fd'
  primary-fixed-dim: '#bec6e0'
  on-primary-fixed: '#131b2e'
  on-primary-fixed-variant: '#3f465c'
  secondary-fixed: '#ffdbcf'
  secondary-fixed-dim: '#ffb59a'
  on-secondary-fixed: '#380d00'
  on-secondary-fixed-variant: '#812900'
  tertiary-fixed: '#d3e4fe'
  tertiary-fixed-dim: '#b7c8e1'
  on-tertiary-fixed: '#0b1c30'
  on-tertiary-fixed-variant: '#38485d'
  background: '#f8f9fb'
  on-background: '#191c1e'
  surface-variant: '#e1e2e4'
typography:
  metric-lg:
    fontFamily: Manrope
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  metric-md:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Manrope
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-lg-mobile:
    fontFamily: Manrope
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Manrope
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Manrope
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Manrope
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-bold:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Manrope
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  container-max: 1440px
  edge-margin-desktop: 40px
  edge-margin-mobile: 16px
  gutter: 24px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

The design system is built on a foundation of **Professional Minimalism**. It targets decision-makers and operators who require a high-density information environment that remains calm and organized. The aesthetic is "Light and Airy," prioritizing clarity and speed of comprehension over decorative elements. 

The emotional response is one of **confident control**. By stripping away heavy gradients and complex textures, the focus is placed entirely on user data and actionable insights. The style utilizes "Industrial Precision"—relying on exact alignment, generous white space, and a high-contrast accent to guide the eye through complex workflows.

## Colors

The palette is anchored by a stark high-contrast pairing of deep slate and pure white. 

- **Canvas & Surfaces:** The primary background is `#F8F9FB`, creating a subtle distinction against pure white `#FFFFFF` cards.
- **Brand Accent:** `#FF6A2B` (Amber/Orange) is used sparingly for critical status indicators, active navigation states, and primary highlights. It serves as a visual "heat map" for the interface.
- **Action Colors:** Primary actions use a near-black slate to provide maximum grounding.
- **Status Tones:** Semantic messaging uses high-chroma pastel backgrounds with high-contrast text for immediate legibility without visual fatigue.

## Typography

This design system utilizes **Manrope** for its modern, geometric construction that maintains high legibility in data-heavy views.

- **Metrics:** For dashboards, use the `metric-lg` and `metric-md` tokens. These feature tight letter spacing and bold weights to emphasize scale.
- **Hierarchy:** Headlines use semi-bold weights to stand out against white surfaces.
- **Labels:** Small labels use an increased letter spacing and uppercase styling to differentiate metadata from body content.
- **Responsiveness:** On mobile devices, headline sizes scale down to prevent excessive line wrapping while maintaining the 600-weight density.

## Layout & Spacing

The layout follows a **Fixed-Fluid Hybrid** model. The main content area is capped at 1440px for readability, centered on the viewport, while sidebar navigation remains fixed to the left edge.

- **Grid:** A 12-column grid is utilized for dashboards, with elements typically spanning 3, 4, 6, or 12 columns.
- **Rhythm:** An 8px base unit drives all spacing. Component internals use 16px padding (stack-md), while vertical section separation uses 32px (stack-lg).
- **Mobile Adaptivity:** On mobile, the 12-column grid collapses to a single column. Margins reduce to 16px to maximize horizontal real estate.

## Elevation & Depth

Visual hierarchy is established through a **Flat-Layered** approach. Instead of traditional shadows that imply high altitude, this design system uses subtle tonal separation.

- **Base Layer:** The background canvas (`#F8F9FB`).
- **Surface Layer:** White cards (`#FFFFFF`) sitting on the canvas. These are defined by a 1px hairline border in `#E2E8F0` and a very soft, diffused shadow (`0 2px 4px rgba(0,0,0,0.04)`).
- **Interactive Layer:** Active elements or hovered cards may slightly increase shadow depth to `0 4px 12px rgba(0,0,0,0.06)` to provide tactile feedback.
- **No Glassmorphism:** Surfaces must remain opaque to ensure maximum contrast for text and data points.

## Shapes

The shape language is consistently "Rounded" to soften the professional tone and make the UI feel approachable.

- **Cards & Panels:** Use the `rounded-lg` (16px) standard to create a distinct containerized look.
- **Inputs & Small UI:** Use the base `rounded` (8px) for form fields and list items.
- **Buttons & Pills:** These utilize a "Full-Pill" (999px) radius to distinguish them clearly from structural containers like cards.

## Components

### Buttons
- **Primary:** Solid `#0F172A` fill, white text, pill-shaped. Focus states add an `#FF6A2B` outer ring.
- **Secondary:** White fill, `#E2E8F0` border, `#475569` text, pill-shaped.
- **Accent:** Solid `#FF6A2B` fill, white text (used for "New" or "Create" actions only).

### Cards
- Always white background.
- 16px corner radius.
- 1px hairline border in `#E2E8F0`.
- Include a 16px internal padding for content.

### Status Pills
- **Active:** Light Blue (`#E0F2FE`) background, Dark Blue (`#0369A1`) text.
- **Overdue:** Light Red (`#FEE2E2`) background, Dark Red (`#991B1B`) text.
- **Warning:** Light Amber (`#FEF3C7`) background, Dark Amber (`#92400E`) text.
- Shape: Pill-shaped, semi-bold 12px text.

### Inputs
- Background: `#FFFFFF`.
- Border: 1px `#E2E8F0`.
- On Focus: Border color changes to `#0F172A` with no glow, just a crisp color shift.

### Data Tables
- Row height: 56px for high legibility.
- Header: `#64748B` text, uppercase, 12px weight.
- Row separation: 1px horizontal rule only, no vertical lines.