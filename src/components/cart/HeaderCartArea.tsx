"use client";

import { useRef } from "react";
import { HeaderCartButton } from "./HeaderCartButton";
import { MiniCartPopover } from "./MiniCartPopover";

/** Cart icon + desktop mini-cart popover anchor (mobile sheet uses fixed positioning). */
export function HeaderCartArea() {
  const anchorRef = useRef<HTMLDivElement>(null);
  return (
    <div ref={anchorRef} className="relative">
      <HeaderCartButton />
      <MiniCartPopover anchorRef={anchorRef} />
    </div>
  );
}
