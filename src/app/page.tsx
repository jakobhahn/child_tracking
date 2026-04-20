import { Dashboard } from "@/components/dashboard";
import { appConfig } from "@/lib/config";
import { getInitialAppState } from "@/lib/db";

export default function Home() {
  const { children, measurementsByChild } = getInitialAppState();

  return (
    <Dashboard
      initialChildren={children}
      initialMeasurementsByChild={measurementsByChild}
      networkHint={appConfig.networkHint}
      units={appConfig.units}
    />
  );
}
