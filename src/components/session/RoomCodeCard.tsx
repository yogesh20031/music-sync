"use client";

import { Check, Copy } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import type { HostStatus } from "@/hooks/useHostRoom";

const noop = () => () => {};
const useOrigin = () =>
  useSyncExternalStore(
    noop,
    () => window.location.origin,
    () => "",
  );

export function RoomCodeCard({ status }: { status: HostStatus }) {
  const origin = useOrigin();
  const [copied, setCopied] = useState(false);

  if (status.kind === "starting") {
    return (
      <Card className="text-center">
        <p className="text-footnote uppercase tracking-wide text-label-secondary">Room code</p>
        <p className="mt-2 text-title1 text-label-tertiary">Creating…</p>
      </Card>
    );
  }
  if (status.kind === "error") {
    return (
      <Card className="text-center">
        <p className="text-headline text-red">Could not open a room</p>
        <p className="mt-1 text-subheadline text-label-secondary">{status.message}</p>
      </Card>
    );
  }

  const joinUrl = `${origin}/join?code=${status.code}`;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard can be unavailable in some webviews; the code is still on screen.
    }
  };

  return (
    <Card className="text-center">
      <p className="text-footnote uppercase tracking-wide text-label-secondary">Room code</p>
      <p className="mt-1 text-5xl font-bold tracking-widest tabular-nums text-label">{status.code}</p>
      <div className="my-4 p-3 mx-auto w-fit rounded-card bg-bg">
        <QRCodeSVG value={joinUrl} size={168} bgColor="transparent" fgColor="currentColor" className="text-label" />
      </div>
      <p className="mb-3 text-footnote text-label-secondary">Scan, or open the site and type the code.</p>
      <Button variant="tinted" size="sm" onClick={copy}>
        {copied ? <Check size={16} /> : <Copy size={16} />}
        {copied ? "Copied" : "Copy join link"}
      </Button>
    </Card>
  );
}
