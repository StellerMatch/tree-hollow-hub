import { createFileRoute } from "@tanstack/react-router";
import { AccessGate } from "@/components/lobby/AccessGate";
import { Lobby } from "@/components/lobby/Lobby";

export const Route = createFileRoute("/")({
  component: Index,
});

function Index() {
  return (
    <AccessGate>
      <Lobby />
    </AccessGate>
  );
}
