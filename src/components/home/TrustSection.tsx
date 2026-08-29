import { BadgeCheck, ShieldCheck, Truck, Lock, RotateCcw, Headset } from "lucide-react";
import { Container } from "@/components/ui/Container";

const benefits = [
  {
    icon: BadgeCheck,
    title: "ოფიციალური პროდუქცია",
    description: "სერტიფიცირებული ბრენდები და ავტორიზებული მომწოდებლები",
  },
  {
    icon: ShieldCheck,
    title: "გარანტია",
    description: "ოფიციალური საგარანტიო მომსახურება",
  },
  {
    icon: Truck,
    title: "მიწოდება",
    description: "თბილისში და რეგიონებში — მოკლე ვადებით",
  },
  {
    icon: Lock,
    title: "უსაფრთხო გადახდა",
    description: "ბარათით, გადმოზიდვისას ან განვადებით",
  },
  {
    icon: RotateCcw,
    title: "დაბრუნება",
    description: "დაბრუნება და გაცვლა 14 დღის განმავლობაში",
  },
  {
    icon: Headset,
    title: "მხარდაჭერა",
    description: "დაგვიკავშირდით — პასუხს გცემთ სწრაფად",
  },
];

export function TrustSection() {
  return (
    <section className="border-y border-border bg-surface-2/50 py-10 sm:py-12">
      <Container>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
          {benefits.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex flex-col items-center rounded-[var(--radius-lg)] border border-border bg-surface px-3 py-5 text-center shadow-xs sm:px-4"
            >
              <span className="mb-3 flex size-11 items-center justify-center rounded-full bg-brand-50 text-brand-600">
                <Icon className="size-5" strokeWidth={1.75} />
              </span>
              <h3 className="text-small font-semibold text-text">{title}</h3>
              <p className="text-label mt-1 text-text-muted">{description}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
