import { StorefrontHeader } from "@/components/layout/StorefrontHeader";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/ui/Container";
import { Breadcrumbs } from "@/components/ui/Breadcrumbs";
import type { InfoPageDef } from "@/lib/infoPages";

export function InfoPageShell({ page }: { page: InfoPageDef }) {
  return (
    <>
      <StorefrontHeader />
      <main className="flex-1">
        <Container className="py-8 sm:py-12">
          <Breadcrumbs items={[{ label: page.title }]} />
          <article className="mt-6 max-w-2xl">
            <h1 className="text-h2 text-text">{page.title}</h1>
            {page.needsAdminReview ? (
              <p
                role="note"
                className="text-small mt-4 rounded-[var(--radius-md)] border border-border bg-surface-2 px-4 py-3 text-text-muted"
              >
                ეს ტექსტი დროებითია და ადმინისტრაციის დასამტკიცებლადაა. აქ არ არის საბოლოო იურიდიული პირობა.
              </p>
            ) : null}
            <div className="mt-5 flex flex-col gap-4">
              {page.paragraphs.map((paragraph) => (
                <p key={paragraph} className="text-body text-text-muted">
                  {paragraph}
                </p>
              ))}
            </div>
          </article>
        </Container>
      </main>
      <Footer />
    </>
  );
}
