# Overview

This is a Korean bakery order management system called "낫띵메터스" (Nothing Matters) that specializes in custom handmade cookies. The application provides a comprehensive online ordering platform where customers can select various cookie types, customize their orders, and receive detailed quotes via email. The system handles multiple product categories including regular cookies, brownie cookies, fortune cookies, and airplane sandwiches, with extensive customization options and automated pricing calculations.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
The client is built as a React SPA using TypeScript with a component-based architecture. The UI leverages shadcn/ui components built on Radix UI primitives for consistent design and accessibility. The application uses Wouter for lightweight client-side routing and TanStack Query for state management and server communication. The design system implements a Korean-friendly theme with custom CSS variables and supports both light and dark modes through Tailwind CSS.

## Backend Architecture
The server follows an Express.js REST API pattern with TypeScript support. The architecture separates concerns through distinct service layers: storage abstraction for data persistence, email service for quote delivery, and Excel generation service for creating detailed order documents. The server implements middleware for request logging, JSON parsing, and error handling. Development and production builds are handled through different bundling strategies using Vite for the client and esbuild for the server.

## Data Storage Solutions
The application currently uses an in-memory storage implementation with a well-defined interface that can be easily swapped for persistent database solutions. The schema is defined using Drizzle ORM with PostgreSQL dialect, though the current implementation uses memory storage. The data models support complex order structures with nested objects for different product types and customization options.

## Authentication and Authorization
The current implementation does not include user authentication, operating as a public ordering system where customers can place orders without accounts. Session management infrastructure is prepared through connect-pg-simple for future authentication requirements.

## Form Management and Validation
The application uses React Hook Form with Zod schema validation for robust form handling. Custom hooks manage form state, real-time pricing calculations, and server communication. The validation schemas ensure data integrity for customer information, product selections, and order configurations.

# External Dependencies

## Database Infrastructure
- **Neon Database**: PostgreSQL-compatible serverless database configured through environment variables
- **Drizzle ORM**: Type-safe database toolkit with schema definition and migration support
- **connect-pg-simple**: PostgreSQL session store for Express applications

## Email Services
- **Nodemailer**: Email delivery service supporting multiple providers including Gmail
- **Email Templates**: HTML-based email templates with Korean language support

## Document Generation
- **ExcelJS**: Excel workbook generation for detailed order quotes and business documentation
- **Date-fns**: Date manipulation and formatting utilities

## UI Component Libraries
- **Radix UI**: Comprehensive set of accessible, unstyled UI primitives
- **shadcn/ui**: Pre-built component library based on Radix UI with consistent styling
- **Tailwind CSS**: Utility-first CSS framework with custom design tokens

## Development and Build Tools
- **Vite**: Frontend build tool with hot module replacement and optimized production builds
- **esbuild**: Fast JavaScript bundler for server-side code
- **TypeScript**: Static type checking across the entire application
- **PostCSS**: CSS processing with Tailwind CSS integration

## State Management and Data Fetching
- **TanStack Query**: Server state management with caching, background updates, and error handling
- **Wouter**: Minimalist client-side routing library

## Korean Language Support
- **Noto Sans KR**: Google Fonts integration for proper Korean typography
- **Korean locale formatting**: Date and number formatting for Korean users