import { Radio, Users, Zap } from "lucide-react";
import Link from "next/link";
import { JoinForm } from "@/components/session/JoinForm";
import { BluetoothTip } from "@/components/session/BluetoothTip";
import { buttonClassName } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { InsetGroup } from "@/components/ui/InsetGroup";
import { LargeTitle } from "@/components/ui/LargeTitle";
import { ListRow } from "@/components/ui/ListRow";
import { Screen } from "@/components/ui/Screen";

export default function HomePage() {
  return (
    <Screen className="space-y-5 pb-10">
      <LargeTitle title="Music Share" subtitle="Play the same music on every phone at the same instant. More phones, more sound." />
      <Card>
        <div className="gap-3 flex items-center">
          <div className="size-12 flex shrink-0 items-center justify-center rounded-control bg-tint text-on-tint">
            <Radio size={24} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-headline text-label">Host a session</p>
            <p className="text-footnote text-label-secondary">Pick the music, set a start time, control playback.</p>
          </div>
        </div>
        <Link href="/host" className={`${buttonClassName({ size: "lg", fullWidth: true })} mt-4`}>
          Start hosting
        </Link>
      </Card>
      <JoinForm />
      <InsetGroup header="How it works">
        <ListRow leading={<Users size={22} />} label="Phones connect directly" detail="No account, no upload to a server. The music travels phone to phone." />
        <ListRow leading={<Zap size={22} />} label="One shared clock" detail="Every phone measures its offset from the host and starts on the same tick." />
      </InsetGroup>
      <BluetoothTip />
    </Screen>
  );
}
