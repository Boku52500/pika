import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { Mail, Phone, MapPin } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { FacebookIcon, InstagramIcon, TikTokIcon, YoutubeIcon } from "./SocialIcons";

const linkColumns: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "ჩვენს შესახებ",
    links: [
      { label: "ვინ ვართ ჩვენ", href: "/about" },
      { label: "მაღაზიების ქსელი", href: "/stores" },
      { label: "კარიერა", href: "/careers" },
      { label: "პარტნიორებისთვის", href: "/partners" },
      { label: "სერვის ცენტრების მისამართები", href: "/service-centers" },
    ],
  },
  {
    title: "წესები და პირობები",
    links: [
      { label: "საგარანტიო პირობები", href: "/warranty" },
      { label: "მიწოდების პირობები", href: "/delivery" },
      { label: "დაბრუნება და გაცვლა", href: "/returns" },
      { label: "კონფიდენციალურობა", href: "/privacy" },
      { label: "წესები და პირობები", href: "/terms" },
    ],
  },
];

const socials: { label: string; Icon: ComponentType<SVGProps<SVGSVGElement>>; className: string }[] = [
  { label: "Facebook", Icon: FacebookIcon, className: "bg-[#1877F2]" },
  { label: "Instagram", Icon: InstagramIcon, className: "bg-gradient-to-tr from-[#FEE411] via-[#E4405F] to-[#6228D7]" },
  { label: "TikTok", Icon: TikTokIcon, className: "bg-ink-950" },
  { label: "YouTube", Icon: YoutubeIcon, className: "bg-[#FF0000]" },
];

const contacts = [
  { label: "info@pika.ge", href: "mailto:info@pika.ge", Icon: Mail },
  { label: "032 200 00 00", href: "tel:+995322000000", Icon: Phone },
  { label: "თბილისი, ვაჟა-ფშაველას გამზ. 71", href: undefined, Icon: MapPin },
];

function FooterHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="text-label text-ink-900">{children}</h3>
      <div className="mt-2 w-10 border-t-2 border-dashed border-brand-300" />
    </div>
  );
}

export function Footer() {
  return (
    <footer className="bg-brand-50 text-ink-700">
      <Container className="py-10 sm:py-12 lg:py-14">
        <Logo className="mb-10" />

        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-4 sm:gap-x-8">
          {linkColumns.map((col) => (
            <div key={col.title}>
              <FooterHeading>{col.title}</FooterHeading>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link href={link.href} className="text-small text-ink-600 transition-colors hover:text-brand-600">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <FooterHeading>გამოგვყევი</FooterHeading>
            <ul className="space-y-3">
              {socials.map(({ label, Icon, className }) => (
                <li key={label}>
                  <a
                    href="#"
                    className="group flex items-center gap-2.5 text-small text-ink-600 transition-colors hover:text-ink-900"
                  >
                    <span
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-full text-white transition-transform group-hover:scale-105",
                        className
                      )}
                    >
                      <Icon className="size-3.5" strokeWidth={1.75} />
                    </span>
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <FooterHeading>დაგვიკავშირდით</FooterHeading>
            <ul className="space-y-3">
              {contacts.map(({ label, href, Icon }) => {
                const content = (
                  <>
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-500 text-white">
                      <Icon className="size-3.5" strokeWidth={2} />
                    </span>
                    {label}
                  </>
                );
                return (
                  <li key={label}>
                    {href ? (
                      <a href={href} className="flex items-center gap-2.5 text-small text-ink-600 transition-colors hover:text-ink-900">
                        {content}
                      </a>
                    ) : (
                      <div className="flex items-center gap-2.5 text-small text-ink-600">{content}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center gap-4 border-t border-dashed border-brand-200 pt-6 sm:mt-12 sm:flex-row sm:justify-between">
          <p className="text-small text-ink-500">
            © {new Date().getFullYear()} Pika. ყველა უფლება დაცულია.
          </p>
          <div className="text-small tnum font-medium text-ink-500">
            VISA · Mastercard · განვადება
          </div>
        </div>
      </Container>
    </footer>
  );
}
