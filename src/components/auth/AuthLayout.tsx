import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/layout/Logo";

/** Shared centered-card layout for /login, /register, /forgot-password, /reset-password. */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Container className="flex items-center justify-center py-12 sm:py-16">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo />
          <div>
            <h1 className="text-h2 text-text">{title}</h1>
            {subtitle ? <p className="text-body mt-1.5 text-text-muted">{subtitle}</p> : null}
          </div>
        </div>

        <div className="rounded-[var(--radius-md)] border border-border bg-surface p-6 sm:p-8">{children}</div>

        {footer ? <div className="mt-5 text-center">{footer}</div> : null}
      </div>
    </Container>
  );
}
