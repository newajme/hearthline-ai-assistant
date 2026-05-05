import { getPersonaName } from "@/app/lib/persona";

import TestCall from "./TestCall";

export const metadata = {
  title: "Hearthline · Test agent",
};

export default async function TestCallPage() {
  const persona = await getPersonaName();
  return <TestCall personaName={persona} />;
}
