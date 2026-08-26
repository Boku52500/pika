import { BadgeCheck, ShieldCheck, Truck, Lock, RotateCcw, Headset } from "lucide-react";
import { Container } from "@/components/ui/Container";

const benefits = [
  {
    icon: BadgeCheck,
    title: "ოფიციალური პროდუქცია",
    description: "მხოლოდ სერტიფიცირებული ბრენდები და ავტორიზებული მომწოდებლები",
  },
  {
    icon: ShieldCheck,
    title: "გარანტია",
    description: "ყველა პროდუქტზე ვრცელდება ოფიციალური საგარანტიო მომსახურება",
  },
  {
    icon: Truck,
    title: "სწრაფი მიწოდება",
    description: "თბილისში — 1 დღეში, რეგიონებში — 1-დან 3 დღემდე",
  },
  {
    icon: Lock,
    title: "უსაფრთხო გადახდა",
    description: "ბარათით, გადმოზიდვისას ან განვადებით, საკომისიოს გარეშე",
  },
  {
    icon: RotateCcw,
    title: "მარტივი დაბრუნება",
    description: "დაბრუნება და გაცვლა შეძენიდან 14 დღის განმავლობაში",
  },
  {
    icon: Headset,
    title: "მომხმარებელთა მხარდაჭერა",
    description: "დაგვიკავშირდი ნებისმიერ დღეს — პასუხს გცემთ სწრაფად",
  },
];

export function TrustSection() {
  return (
    <section className="border-y border-border bg-surface-2 py-10 sm:py-14">
      <Container>
        <div className="grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {benefits.map(({ icon: Icon, title, description }) => (
            <div key={title} className="flex items-start gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-white text-brand-600 shadow-xs">
                <Icon className="size-[22px]" strokeWidth={1.6} />
              </span>
              <div>
                <h3 className="text-body font-semibold text-text">{title}</h3>
                <p className="text-small mt-1 text-text-muted">{description}</p>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
