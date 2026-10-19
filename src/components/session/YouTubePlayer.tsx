"use client";

import type { RefObject } from "react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { formatSignedMs } from "@/lib/format";

type YouTubePlayerProps = {
  containerRef: RefObject<HTMLDivElement | null>;
  needsArm: boolean;
  onArm: () => void;
  driftMs: number | null;
};

export function YouTubePlayer({ containerRef, needsArm, onArm, driftMs }: YouTubePlayerProps) {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="relative aspect-video bg-black">
        <div ref={containerRef} className="absolute inset-0 *:size-full" />
        {needsArm && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <Button size="lg" onClick={onArm}>
              Tap to prepare video
            </Button>
          </div>
        )}
      </div>
      <div className="px-4 py-2.5 gap-2 flex items-center justify-between">
        <Badge tone="orange">Approximate sync</Badge>
        <span className="text-footnote tabular-nums text-label-secondary">
          {driftMs === null ? "Corrects every 0.5 s" : `Drift ${formatSignedMs(driftMs)}`}
        </span>
      </div>
    </Card>
  );
}
