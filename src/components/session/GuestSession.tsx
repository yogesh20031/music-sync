"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { buttonClassName } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { LargeTitle } from "@/components/ui/LargeTitle";
import { Screen } from "@/components/ui/Screen";
import { deviceLabel } from "@/lib/format";
import { isValidRoomCode, normalizeRoomCode } from "@/lib/room-code";
import { GuestRoom } from "./GuestRoom";

export function GuestSession() {
  const params = useSearchParams();
  const code = normalizeRoomCode(params.get("code") ?? "");
  const name = params.get("name")?.trim() || deviceLabel();

  if (!isValidRoomCode(code)) {
    return (
      <Screen className="space-y-5">
        <LargeTitle title="Join" back={{ href: "/", label: "Home" }} />
        <Card className="text-center">
          <p className="text-headline text-label">That room code is not valid</p>
          <p className="mt-1 text-footnote text-label-secondary">Codes are six letters and numbers, like ABC234.</p>
          <Link href="/" className={`${buttonClassName({ variant: "tinted", size: "sm" })} mt-3`}>
            Enter a code
          </Link>
        </Card>
      </Screen>
    );
  }

  return <GuestRoom code={code} name={name} />;
}
