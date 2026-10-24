import type * as React from 'react';

/** A catalog row (public.products), as the site's lib/products.ts returns it. */
export interface Product {
  slug: string;
  name: string;
  /** Grade code, e.g. "SN-500". */
  code: string;
  description: string;
  specs: { label: string; value: string }[];
  applications: string[];
  industries: string[];
  packaging: string | null;
}

export type IconName = 'arrow' | 'phone' | 'whatsapp' | 'doc' | 'check' | 'menu' | 'close' | 'chevron' | 'alert' | 'pin';
export type TintName = 'gold' | 'straw' | 'amber' | 'brown' | 'fuel' | 'bitumen' | 'clear' | 'white';

export interface ButtonProps {
  /** primary: the one action per view, in gold. dark / outline-dark: on the gold band. */
  variant?: 'primary' | 'secondary' | 'dark' | 'outline-dark';
  /** default 48px; small 44px on phone, 40px on laptop; touch 56px. */
  size?: 'small' | 'touch';
  icon?: IconName;
  iconAfter?: IconName;
  /** Renders a link instead of a button. */
  href?: string;
  full?: boolean;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: React.MouseEventHandler;
  /** Required when there is no text label. */
  'aria-label'?: string;
  className?: string;
  children?: React.ReactNode;
}
export declare function Button(props: ButtonProps): React.ReactElement;

export interface ChipProps { selected?: boolean; onClick?: React.MouseEventHandler; href?: string; children?: React.ReactNode }
export declare function Chip(props: ChipProps): React.ReactElement;

export interface GradeChipProps { code: string; tone?: 'gold' | 'quiet' }
export declare function GradeChip(props: GradeChipProps): React.ReactElement;

export interface DropletProps {
  /** Picks the tint from the product; unknown slugs are gold. */
  slug?: string;
  tint?: TintName;
  /** Width in px; height is 1.76x. */
  size?: number;
  /** The liquid rises once on mount (skipped with reduced motion). */
  animate?: boolean;
  /** Makes the drop an image with this accessible name; decorative without it. */
  title?: string;
  className?: string;
}
export declare function Droplet(props: DropletProps): React.ReactElement;

export interface ProductCardProps { product: Product; href?: string }
export declare function ProductCard(props: ProductCardProps): React.ReactElement;

export interface AtAGlanceProps { specs: Product['specs'] }
export declare function AtAGlance(props: AtAGlanceProps): React.ReactElement;

export interface SpecTableProps { product: Product }
export declare function SpecTable(props: SpecTableProps): React.ReactElement;

export interface DisclaimerProps {}
export declare function Disclaimer(props: DisclaimerProps): React.ReactElement;

export interface ProductHeroProps { product: Product; animate?: boolean }
export declare function ProductHero(props: ProductHeroProps): React.ReactElement;

export interface GlobalNavProps { active?: 'Products' | 'Industries' | 'About' | 'Contact'; defaultOpen?: boolean }
export declare function GlobalNav(props: GlobalNavProps): React.ReactElement;

export interface LocalNavProps { product: Product; active?: 'Overview' | 'Specs' | 'Uses' | 'Documents' }
export declare function LocalNav(props: LocalNavProps): React.ReactElement;

export interface MobileActionBarProps { callHref?: string; whatsappHref?: string; quoteHref?: string }
export declare function MobileActionBar(props: MobileActionBarProps): React.ReactElement;

export interface DocumentsCardProps { product: Product }
export declare function DocumentsCard(props: DocumentsCardProps): React.ReactElement;

export interface EnquiryFormProps {
  /** "Name (CODE)", pre-selected in the product field. */
  defaultProduct?: string;
  title?: string;
  state?: 'idle' | 'error' | 'success';
  /** VP-ENQ-YYYYMM-####, shown on success. */
  reference?: string;
}
export declare function EnquiryForm(props: EnquiryFormProps): React.ReactElement;

export interface FooterProps { years?: string }
export declare function Footer(props: FooterProps): React.ReactElement;

export interface AdCreativeProps {
  format?: 'square' | 'portrait' | 'story' | 'landscape' | 'display-square';
  family?: 'product' | 'range';
  product?: Product;
  ground?: 'gold' | 'ivory';
  /** One of Vasant.claims. */
  claim?: string;
  cta?: string;
  /** Story keep-clear bands, for design review only. */
  safeZones?: boolean;
}
export declare function AdCreative(props: AdCreativeProps): React.ReactElement;

declare global {
  interface Window {
    Vasant: {
      Button: typeof Button; Chip: typeof Chip; GradeChip: typeof GradeChip; Droplet: typeof Droplet;
      ProductCard: typeof ProductCard; AtAGlance: typeof AtAGlance; SpecTable: typeof SpecTable; Disclaimer: typeof Disclaimer;
      ProductHero: typeof ProductHero; GlobalNav: typeof GlobalNav; LocalNav: typeof LocalNav; MobileActionBar: typeof MobileActionBar;
      DocumentsCard: typeof DocumentsCard; EnquiryForm: typeof EnquiryForm; Footer: typeof Footer; AdCreative: typeof AdCreative;
      Icon: (props: { name: IconName; size?: number; stroke?: number }) => React.ReactElement;
      /** Preview helper: renders children at a design width, scaled to fit. */
      Frame: (props: { width: number; label?: string; maxScale?: number; clip?: [number, number]; children?: React.ReactNode }) => React.ReactElement;
      /** The eight live products (19 Oct 2026). */
      catalog: Product[];
      product(slug: string): Product;
      related(product: Product, count?: number): Product[];
      tints: Record<TintName, { label: string; mid: string; light: string; deep: string; rim?: boolean }>;
      tintFor(slug: string): TintName;
      /** The drop as SVG markup; plain: true for hex-only files. */
      dropMarkup(tint: TintName, opts?: { id?: string; title?: string; animate?: boolean; plain?: boolean }): string;
      logos: { full: string; fullReversed: string; compact: string; compactReversed: string; mark: string; wordmark: string };
      /** The only claims pages and ads may make. */
      claims: string[];
      disclaimer: string;
      adFormats: Record<string, { w: number; h: number; label: string; safeTop?: number; safeBottom?: number }>;
      nav: { name: string; href: string }[];
    };
  }
}
