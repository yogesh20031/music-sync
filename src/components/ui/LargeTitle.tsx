import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { ReactNode } from "react";

type LargeTitleProps = {
  title: string;
  subtitle?: ReactNode;
  back?: { href: string; label: string };
};

export function LargeTitle({ title, subtitle, back }: LargeTitleProps) {
  return (
    <header className="pt-3 pb-4">
      {back && (
        <Link
          href={back.href}
          className="-ml-1 mb-1 gap-0.5 inline-flex items-center text-body text-tint"
        >
          <ChevronLeft size={22} strokeWidth={2.5} />
          {back.label}
        </Link>
      )}
      <h1 className="text-large-title text-label">{title}</h1>
      {subtitle && <p className="mt-1 text-subheadline text-label-secondary">{subtitle}</p>}
    </header>
  );
}
