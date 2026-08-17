import type { ReactNode } from "react";

type AccountSetupSectionProps = {
  title: string;
  description?: ReactNode;
  children: ReactNode;
};

export function AccountSetupSection({
  title,
  description,
  children,
}: AccountSetupSectionProps) {
  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold leading-6 text-foreground">
          {title}
        </h2>
        {description ? (
          <div className="space-y-1 text-sm leading-5 text-muted-foreground">
            {description}
          </div>
        ) : null}
      </div>
      {children}
    </section>
  );
}
