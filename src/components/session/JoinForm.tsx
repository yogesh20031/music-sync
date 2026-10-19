"use client";

import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Field } from "@/components/ui/Field";
import { extractRoomCode, isValidRoomCode, ROOM_CODE_LENGTH } from "@/lib/room-code";

export function JoinForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const valid = isValidRoomCode(code);
  const hint = codeHint(code);

  return (
    <Card>
      <p className="text-headline text-label">Join a session</p>
      <p className="mt-0.5 text-footnote text-label-secondary">Type the 6-character code from the host&apos;s screen.</p>
      <form
        className="mt-3 gap-2 flex flex-col"
        onSubmit={(event) => {
          event.preventDefault();
          if (!valid) return;
          const params = new URLSearchParams({ code });
          if (name.trim()) params.set("name", name.trim());
          router.push(`/join?${params.toString()}`);
        }}
      >
        <Field
          value={code}
          onChange={(event) => setCode(extractRoomCode(event.target.value))}
          placeholder="ABC234"
          maxLength={ROOM_CODE_LENGTH}
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          inputMode="text"
          aria-label="Room code"
          className="h-12 text-center text-title2 tracking-widest uppercase placeholder:tracking-widest"
        />
        <p className={`px-1 text-footnote ${valid ? "text-green" : "text-label-secondary"}`}>{hint}</p>
        <Field
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Your name (optional)"
          maxLength={40}
          aria-label="Your name"
        />
        <Button type="submit" size="lg" fullWidth disabled={!valid}>
          Join
          <ArrowRight size={20} />
        </Button>
      </form>
    </Card>
  );
}

// Codes skip 0, O, 1 and I on purpose; say so instead of silently refusing.
function codeHint(code: string) {
  if (code.length < ROOM_CODE_LENGTH) return `${code.length} of ${ROOM_CODE_LENGTH} characters`;
  if (isValidRoomCode(code)) return "Looks good";
  return "Codes never contain 0, O, 1 or I. Check the host screen: it may be D, Q, L or J.";
}
