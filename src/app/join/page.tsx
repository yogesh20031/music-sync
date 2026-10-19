import { Suspense } from "react";
import { GuestSession } from "@/components/session/GuestSession";
import { Screen } from "@/components/ui/Screen";

export default function JoinPage() {
  return (
    <Suspense fallback={<Screen />}>
      <GuestSession />
    </Suspense>
  );
}
