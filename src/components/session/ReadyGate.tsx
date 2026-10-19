"use client";

import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type ReadyGateProps = { resume: boolean; onReady: () => void };

// Browsers only unlock audio inside a tap, so every device gets one.
export function ReadyGate({ resume, onReady }: ReadyGateProps) {
  return (
    <Card className="text-center">
      <div className="size-14 mx-auto flex items-center justify-center rounded-full bg-tint/15 text-tint">
        <Volume2 size={28} />
      </div>
      <p className="mt-3 text-title3 text-label">{resume ? "Audio was interrupted" : "Get this phone ready"}</p>
      <p className="mt-1 text-subheadline text-label-secondary">
        {resume
          ? "Tap to resume in sync with everyone else."
          : "One tap unlocks the speaker so playback can start exactly on time."}
      </p>
      <Button size="lg" fullWidth className="mt-4" onClick={onReady}>
        {resume ? "Resume" : "I'm ready"}
      </Button>
      <p className="mt-3 text-caption1 text-label-tertiary">
        Turn the volume up, switch off silent mode, and keep the screen on.
      </p>
    </Card>
  );
}
