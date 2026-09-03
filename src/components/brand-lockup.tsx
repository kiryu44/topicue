import Link from "next/link";

import { brand } from "@/config/brand";

export const BrandLockup = () => (
  <Link className="brand brand-lockup" href="/" aria-label={`${brand.productName} Talk Dice`}>
    <span className="brand-product-name">{brand.productName}</span>
    <span className="brand-descriptor">Talk Dice</span>
  </Link>
);
