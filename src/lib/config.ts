export const appConfig = {
  appName: "Kinderwerte",
  units: {
    weight: process.env.NEXT_PUBLIC_WEIGHT_UNIT ?? "kg",
    height: process.env.NEXT_PUBLIC_HEIGHT_UNIT ?? "cm",
    temperature: process.env.NEXT_PUBLIC_TEMPERATURE_UNIT ?? "°C",
  },
  networkHint:
    process.env.NEXT_PUBLIC_NETWORK_HINT ??
    "Nur im internen Netzwerk oder per VPN verwenden.",
};

export type UnitsConfig = typeof appConfig.units;
