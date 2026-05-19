---
version: "1.0"
date: "2026-05-18"
category: uiux
---

# Design System Tokens

## Color & Spacing

```design-token
color:
  primary:
    value: "#4F46E5"
    type: color
    description: "Brand primary — CTA buttons, links"
  secondary:
    value: "#7C3AED"
    type: color
    description: "Secondary accent"
  background:
    base:
      value: "#FFFFFF"
      type: color
    surface:
      value: "#F9FAFB"
      type: color
  text:
    primary:
      value: "#111827"
      type: color
    secondary:
      value: "#6B7280"
      type: color
    tertiary:
      value: "#9CA3AF"
      type: color
  border:
    default:
      value: "#E5E7EB"
      type: color
    strong:
      value: "#D1D5DB"
      type: color
  error:
    value: "#EF4444"
    type: color
  success:
    value: "#22C55E"
    type: color

spacing:
  xs:
    value: "4px"
    type: dimension
  sm:
    value: "8px"
    type: dimension
  md:
    value: "16px"
    type: dimension
  lg:
    value: "24px"
    type: dimension
  xl:
    value: "32px"
    type: dimension

typography:
  font-family:
    base:
      value: "Inter, system-ui, sans-serif"
      type: fontFamily
    mono:
      value: "JetBrains Mono, monospace"
      type: fontFamily
  font-size:
    xs:
      value: "12px"
      type: dimension
    sm:
      value: "14px"
      type: dimension
    base:
      value: "16px"
      type: dimension
    lg:
      value: "18px"
      type: dimension
    xl:
      value: "24px"
      type: dimension
  font-weight:
    normal:
      value: "400"
      type: fontWeight
    medium:
      value: "500"
      type: fontWeight
    bold:
      value: "700"
      type: fontWeight

shadow:
  sm:
    value: "0 1px 2px rgba(0,0,0,0.05)"
    type: shadow
  md:
    value: "0 4px 6px rgba(0,0,0,0.1)"
    type: shadow
  lg:
    value: "0 10px 15px rgba(0,0,0,0.15)"
    type: shadow
```

## Component Tokens (references)

```design-token
button:
  bg:
    value: "{color.primary.value}"
    type: color
    description: "Primary button background"
  text:
    value: "#FFFFFF"
    type: color
  padding:
    value: "{spacing.sm.value} {spacing.md.value}"
    type: dimension
  radius:
    value: "8px"
    type: dimension
```
