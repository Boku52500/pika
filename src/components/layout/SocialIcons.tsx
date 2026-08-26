import type { SVGProps } from "react";

/**
 * Minimal brand glyphs for footer social placeholders.
 * lucide-react no longer ships brand/logo icons, so these are hand-rolled
 * to keep the footer dependency-free until real social links exist.
 */

function IconBase(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    />
  );
}

export function FacebookIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M14.5 8.5H16V5.75h-2c-2.07 0-3.5 1.53-3.5 3.75v1.75H8.5v2.75H10.5V21h2.75v-6.75H15.3l.45-2.75h-2.5V9.75c0-.72.28-1.25 1.25-1.25Z" />
    </IconBase>
  );
}

export function InstagramIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M12 8.4a3.6 3.6 0 1 0 0 7.2 3.6 3.6 0 0 0 0-7.2Zm0 5.9a2.3 2.3 0 1 1 0-4.6 2.3 2.3 0 0 1 0 4.6Z" />
      <path d="M15.9 4H8.1A4.1 4.1 0 0 0 4 8.1v7.8A4.1 4.1 0 0 0 8.1 20h7.8a4.1 4.1 0 0 0 4.1-4.1V8.1A4.1 4.1 0 0 0 15.9 4Zm2.8 11.9a2.8 2.8 0 0 1-2.8 2.8H8.1a2.8 2.8 0 0 1-2.8-2.8V8.1a2.8 2.8 0 0 1 2.8-2.8h7.8a2.8 2.8 0 0 1 2.8 2.8v7.8Z" />
      <circle cx="16.1" cy="7.9" r="0.9" />
    </IconBase>
  );
}

export function YoutubeIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M21.6 8.2a2.7 2.7 0 0 0-1.9-1.9C18 6 12 6 12 6s-6 0-7.7.3a2.7 2.7 0 0 0-1.9 1.9A28 28 0 0 0 2 12a28 28 0 0 0 .4 3.8 2.7 2.7 0 0 0 1.9 1.9C6 18 12 18 12 18s6 0 7.7-.3a2.7 2.7 0 0 0 1.9-1.9A28 28 0 0 0 22 12a28 28 0 0 0-.4-3.8ZM10 14.7V9.3L14.9 12 10 14.7Z" />
    </IconBase>
  );
}

export function TikTokIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconBase {...props}>
      <path d="M16.6 5.2c.6.9 1.5 1.6 2.6 1.9.4.1.8.2 1.2.2v2.9c-1.4 0-2.8-.4-4-1.2v6.1c0 3.1-2.5 5.5-5.6 5.5S5.2 18.2 5.2 15.1c0-3 2.3-5.3 5.2-5.5v3c-1.3.2-2.3 1.3-2.3 2.6 0 1.5 1.2 2.6 2.6 2.6s2.7-1.1 2.7-2.6V3h2.9c0 .8.2 1.5.6 2.2Z" />
    </IconBase>
  );
}
