"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { format, isWithinInterval, parseISO, subDays } from "date-fns";
import { de } from "date-fns/locale";
import { CalendarRange, Download, HeartPulse, Pencil, Plus, Ruler, Scale, Trash2, UserRoundPlus } from "lucide-react";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { Child, Measurement } from "@/lib/db";
import type { UnitsConfig } from "@/lib/config";
import { cn, roundValue } from "@/lib/utils";

type MeasurementsByChild = Record<number, Measurement[]>;

type DashboardProps = {
  initialChildren: Child[];
  initialMeasurementsByChild: MeasurementsByChild;
  units: UnitsConfig;
  networkHint: string;
};

type DatePreset = "7" | "30" | "90" | "365" | "all" | "custom";

type MetricKey = "weight" | "height" | "temperature";

const metricMeta: Record<
  MetricKey,
  { label: string; color: string; icon: typeof Scale }
> = {
  weight: { label: "Gewicht", color: "#2f6fed", icon: Scale },
  height: { label: "Groesse", color: "#2f9e71", icon: Ruler },
  temperature: { label: "Temperatur", color: "#e06b4f", icon: HeartPulse },
};

function formatLocalDateTimeInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}

function toIsoString(value: string) {
  return new Date(value).toISOString();
}

function formatMeasurementDate(value: string) {
  return format(parseISO(value), "dd. MMM yyyy, HH:mm", { locale: de });
}

function emptyMeasurementForm() {
  return {
    id: null as number | null,
    measuredAt: formatLocalDateTimeInput(new Date()),
    weight: "",
    height: "",
    temperature: "",
  };
}

function emptyChildForm() {
  return {
    id: null as number | null,
    name: "",
    birthDate: "",
  };
}

async function requestJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;

    throw new Error(payload?.error ?? "Die Anfrage ist fehlgeschlagen.");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function Dashboard({
  initialChildren,
  initialMeasurementsByChild,
  units,
  networkHint,
}: DashboardProps) {
  const [children, setChildren] = useState(initialChildren);
  const [measurementsByChild, setMeasurementsByChild] = useState(
    initialMeasurementsByChild,
  );
  const [selectedChildId, setSelectedChildId] = useState<number | null>(
    initialChildren[0]?.id ?? null,
  );
  const [childForm, setChildForm] = useState(emptyChildForm());
  const [measurementForm, setMeasurementForm] = useState(emptyMeasurementForm());
  const [activeMetrics, setActiveMetrics] = useState<Record<MetricKey, boolean>>({
    weight: true,
    height: true,
    temperature: true,
  });
  const [datePreset, setDatePreset] = useState<DatePreset>("90");
  const [customRange, setCustomRange] = useState({
    from: format(new Date(subDays(new Date(), 90)), "yyyy-MM-dd"),
    to: format(new Date(), "yyyy-MM-dd"),
  });
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const chartRef = useRef<HTMLDivElement>(null);

  const selectedChild = useMemo(
    () => children.find((child) => child.id === selectedChildId) ?? null,
    [children, selectedChildId],
  );

  const measurements = useMemo(
    () => (selectedChildId ? measurementsByChild[selectedChildId] ?? [] : []),
    [measurementsByChild, selectedChildId],
  );

  const filteredMeasurements = useMemo(() => {
    if (datePreset === "all") {
      return measurements;
    }

    const interval =
      datePreset === "custom"
        ? {
            start: new Date(`${customRange.from}T00:00:00`),
            end: new Date(`${customRange.to}T23:59:59`),
          }
        : {
            start: subDays(new Date(), Number(datePreset)),
            end: new Date(),
          };

    return measurements.filter((measurement) =>
      isWithinInterval(parseISO(measurement.measuredAt), interval),
    );
  }, [customRange.from, customRange.to, datePreset, measurements]);

  const chartData = useMemo(
    () =>
      [...filteredMeasurements]
        .sort(
          (left, right) =>
            parseISO(left.measuredAt).getTime() - parseISO(right.measuredAt).getTime(),
        )
        .map((measurement) => ({
          id: measurement.id,
          measuredAt: measurement.measuredAt,
          label: format(parseISO(measurement.measuredAt), "dd.MM.yy"),
          weight: measurement.weight,
          height: measurement.height,
          temperature: measurement.temperature,
        })),
    [filteredMeasurements],
  );

  const latestMeasurement = filteredMeasurements[0] ?? measurements[0] ?? null;

  const stats = useMemo(() => {
    return {
      total: measurements.length,
      visible: filteredMeasurements.length,
      latestDate: latestMeasurement?.measuredAt ?? null,
    };
  }, [filteredMeasurements.length, latestMeasurement?.measuredAt, measurements.length]);

  function resetMeasurementForm() {
    setMeasurementForm(emptyMeasurementForm());
  }

  function resetChildForm() {
    setChildForm(emptyChildForm());
  }

  function showMessage(message: string) {
    setFeedback(message);
    window.setTimeout(() => setFeedback(null), 2400);
  }

  function toggleMetric(metric: MetricKey) {
    setActiveMetrics((current) => ({
      ...current,
      [metric]: !current[metric],
    }));
  }

  async function handleChildSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      try {
        if (childForm.id) {
          const { child } = await requestJson<{ child: Child }>(
            `/api/children/${childForm.id}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: childForm.name,
                birthDate: childForm.birthDate || null,
              }),
            },
          );

          setChildren((current) =>
            current.map((entry) => (entry.id === child.id ? child : entry)),
          );
          showMessage("Kind aktualisiert.");
        } else {
          const { child } = await requestJson<{ child: Child }>("/api/children", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: childForm.name,
              birthDate: childForm.birthDate || null,
            }),
          });

          setChildren((current) =>
            [...current, child].sort((left, right) => left.name.localeCompare(right.name)),
          );
          setMeasurementsByChild((current) => ({ ...current, [child.id]: [] }));
          setSelectedChildId(child.id);
          showMessage("Kind angelegt.");
        }

        resetChildForm();
      } catch (error) {
        showMessage(error instanceof Error ? error.message : "Kind konnte nicht gespeichert werden.");
      }
    });
  }

  async function handleDeleteChild(childId: number) {
    if (!window.confirm("Kind und alle Messungen wirklich loeschen?")) {
      return;
    }

    startTransition(async () => {
      try {
        await requestJson(`/api/children/${childId}`, { method: "DELETE" });
        const remainingChildren = children.filter((child) => child.id !== childId);
        setChildren(remainingChildren);
        setMeasurementsByChild((current) => {
          const next = { ...current };
          delete next[childId];
          return next;
        });
        setSelectedChildId(remainingChildren[0]?.id ?? null);
        resetChildForm();
        resetMeasurementForm();
        showMessage("Kind geloescht.");
      } catch (error) {
        showMessage(error instanceof Error ? error.message : "Kind konnte nicht geloescht werden.");
      }
    });
  }

  async function handleMeasurementSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedChildId) {
      showMessage("Bitte zuerst ein Kind auswaehlen.");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          childId: selectedChildId,
          measuredAt: toIsoString(measurementForm.measuredAt),
          weight: measurementForm.weight ? Number(measurementForm.weight) : null,
          height: measurementForm.height ? Number(measurementForm.height) : null,
          temperature: measurementForm.temperature
            ? Number(measurementForm.temperature)
            : null,
        };

        if (measurementForm.id) {
          const { measurement } = await requestJson<{ measurement: Measurement }>(
            `/api/measurements/${measurementForm.id}`,
            {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                measuredAt: payload.measuredAt,
                weight: payload.weight,
                height: payload.height,
                temperature: payload.temperature,
              }),
            },
          );

          setMeasurementsByChild((current) => ({
            ...current,
            [selectedChildId]: (current[selectedChildId] ?? [])
              .map((entry) => (entry.id === measurement.id ? measurement : entry))
              .sort((left, right) => right.measuredAt.localeCompare(left.measuredAt)),
          }));
          showMessage("Messung aktualisiert.");
        } else {
          const { measurement } = await requestJson<{ measurement: Measurement }>(
            "/api/measurements",
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            },
          );

          setMeasurementsByChild((current) => ({
            ...current,
            [selectedChildId]: [measurement, ...(current[selectedChildId] ?? [])],
          }));
          showMessage("Messung gespeichert.");
        }

        resetMeasurementForm();
      } catch (error) {
        showMessage(
          error instanceof Error ? error.message : "Messung konnte nicht gespeichert werden.",
        );
      }
    });
  }

  async function handleDeleteMeasurement(measurementId: number) {
    if (!selectedChildId || !window.confirm("Messung wirklich loeschen?")) {
      return;
    }

    startTransition(async () => {
      try {
        await requestJson(`/api/measurements/${measurementId}`, { method: "DELETE" });
        setMeasurementsByChild((current) => ({
          ...current,
          [selectedChildId]: (current[selectedChildId] ?? []).filter(
            (entry) => entry.id !== measurementId,
          ),
        }));
        if (measurementForm.id === measurementId) {
          resetMeasurementForm();
        }
        showMessage("Messung geloescht.");
      } catch (error) {
        showMessage(
          error instanceof Error ? error.message : "Messung konnte nicht geloescht werden.",
        );
      }
    });
  }

  function startEditChild(child: Child) {
    setChildForm({
      id: child.id,
      name: child.name,
      birthDate: child.birthDate ?? "",
    });
  }

  function startEditMeasurement(measurement: Measurement) {
    setMeasurementForm({
      id: measurement.id,
      measuredAt: formatLocalDateTimeInput(parseISO(measurement.measuredAt)),
      weight: measurement.weight?.toString() ?? "",
      height: measurement.height?.toString() ?? "",
      temperature: measurement.temperature?.toString() ?? "",
    });
  }

  async function exportPdf() {
    if (!selectedChild || filteredMeasurements.length === 0) {
      showMessage("Keine Daten fuer den Export vorhanden.");
      return;
    }

    try {
      const pdf = new jsPDF({ unit: "pt", format: "a4" });
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(20);
      pdf.text(`Kinderwerte - ${selectedChild.name}`, 40, 48);
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(11);
      pdf.text(
        `Exportiert am ${format(new Date(), "dd.MM.yyyy HH:mm", { locale: de })}`,
        40,
        68,
      );
      pdf.text(`Zeitraum: ${datePreset === "custom" ? `${customRange.from} bis ${customRange.to}` : datePreset === "all" ? "Alles" : `letzte ${datePreset} Tage`}`, 40, 86);

      if (chartRef.current) {
        const image = await toPng(chartRef.current, {
          cacheBust: true,
          pixelRatio: 2,
          backgroundColor: "#fffaf5",
        });

        pdf.addImage(image, "PNG", 40, 106, 515, 220);
      }

      autoTable(pdf, {
        startY: 346,
        head: [[
          "Zeitpunkt",
          `Gewicht (${units.weight})`,
          `Groesse (${units.height})`,
          `Temperatur (${units.temperature})`,
        ]],
        body: filteredMeasurements.map((measurement) => [
          formatMeasurementDate(measurement.measuredAt),
          measurement.weight ?? "-",
          measurement.height ?? "-",
          measurement.temperature ?? "-",
        ]),
        styles: {
          fontSize: 10,
          cellPadding: 7,
        },
        headStyles: {
          fillColor: [47, 111, 237],
        },
      });

      pdf.save(
        `kinderwerte-${selectedChild.name.toLowerCase().replaceAll(" ", "-")}.pdf`,
      );
    } catch {
      showMessage("PDF konnte nicht erstellt werden.");
    }
  }

  return (
    <main className="shell">
      <section className="hero">
        <div>
          <span className="eyebrow">Lokal, schnell, uebersichtlich</span>
          <h1>Kinderwerte im Blick</h1>
          <p>
            Erfasse Gewicht, Groesse und Temperatur ohne Zettelwirtschaft. Optimiert
            fuer Familien im Heimnetz oder per VPN.
          </p>
        </div>
        <div className="hero-card">
          <span className="hero-badge">{networkHint}</span>
          <div className="hero-stats">
            <div>
              <strong>{children.length}</strong>
              <span>Kinder</span>
            </div>
            <div>
              <strong>{measurements.length}</strong>
              <span>Messungen aktiv</span>
            </div>
            <div>
              <strong>{stats.visible}</strong>
              <span>Im Filter</span>
            </div>
          </div>
        </div>
      </section>

      <section className="grid-layout">
        <div className="panel stack">
          <div className="panel-head">
            <h2>Kinder</h2>
            <button className="ghost-button" type="button" onClick={resetChildForm}>
              <UserRoundPlus size={16} />
              Neu
            </button>
          </div>

          <form className="stack compact" onSubmit={handleChildSubmit}>
            <label className="field">
              <span>Name</span>
              <input
                required
                value={childForm.name}
                onChange={(event) =>
                  setChildForm((current) => ({ ...current, name: event.target.value }))
                }
                placeholder="z. B. Emil"
              />
            </label>
            <label className="field">
              <span>Geburtsdatum</span>
              <input
                type="date"
                value={childForm.birthDate}
                onChange={(event) =>
                  setChildForm((current) => ({
                    ...current,
                    birthDate: event.target.value,
                  }))
                }
              />
            </label>
            <div className="row">
              <button className="primary-button" disabled={isPending} type="submit">
                {childForm.id ? "Kind speichern" : "Kind anlegen"}
              </button>
              {childForm.id ? (
                <button className="secondary-button" type="button" onClick={resetChildForm}>
                  Abbrechen
                </button>
              ) : null}
            </div>
          </form>

          <div className="stack child-list">
            {children.length === 0 ? (
              <div className="empty-state">Noch kein Kind angelegt.</div>
            ) : (
              children.map((child) => (
                <article
                  className={cn(
                    "child-card",
                    selectedChildId === child.id && "child-card-active",
                  )}
                  key={child.id}
                >
                  <button
                    className="child-card-main"
                    onClick={() => setSelectedChildId(child.id)}
                    type="button"
                  >
                    <strong>{child.name}</strong>
                    <span>
                      {child.birthDate
                        ? `Geboren am ${format(parseISO(`${child.birthDate}T00:00:00`), "dd.MM.yyyy")}`
                        : "Geburtsdatum offen"}
                    </span>
                  </button>
                  <div className="icon-actions">
                    <button
                      aria-label="Kind bearbeiten"
                      className="icon-button"
                      onClick={() => startEditChild(child)}
                      type="button"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      aria-label="Kind loeschen"
                      className="icon-button danger"
                      onClick={() => handleDeleteChild(child.id)}
                      type="button"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>

        <div className="content-column">
          <section className="summary-grid">
            <article className="metric-card">
              <span>Ausgewaehltes Kind</span>
              <strong>{selectedChild?.name ?? "Noch keines"}</strong>
              <small>
                {selectedChild?.birthDate
                  ? format(parseISO(`${selectedChild.birthDate}T00:00:00`), "dd. MMM yyyy", {
                      locale: de,
                    })
                  : "Geburtsdatum optional"}
              </small>
            </article>
            <article className="metric-card">
              <span>Letzte Messung</span>
              <strong>
                {stats.latestDate ? formatMeasurementDate(stats.latestDate) : "Noch keine"}
              </strong>
              <small>{stats.total} Gesamtmessungen</small>
            </article>
            <article className="metric-card">
              <span>PDF & Ansicht</span>
              <strong>{stats.visible} sichtbar</strong>
              <small>Gefilterte Werte im Export</small>
            </article>
          </section>

          <section className="panel stack">
            <div className="panel-head">
              <h2>Neue Messung</h2>
              <span className="soft-note">
                Mindestens ein Wert erforderlich, Zeit ist voreingestellt.
              </span>
            </div>

            <form className="stack" onSubmit={handleMeasurementSubmit}>
              <div className="form-grid">
                <label className="field">
                  <span>Zeitpunkt</span>
                  <input
                    type="datetime-local"
                    value={measurementForm.measuredAt}
                    onChange={(event) =>
                      setMeasurementForm((current) => ({
                        ...current,
                        measuredAt: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Gewicht ({units.weight})</span>
                  <input
                    inputMode="decimal"
                    placeholder="z. B. 12.4"
                    value={measurementForm.weight}
                    onChange={(event) =>
                      setMeasurementForm((current) => ({
                        ...current,
                        weight: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Groesse ({units.height})</span>
                  <input
                    inputMode="decimal"
                    placeholder="z. B. 89"
                    value={measurementForm.height}
                    onChange={(event) =>
                      setMeasurementForm((current) => ({
                        ...current,
                        height: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Temperatur ({units.temperature})</span>
                  <input
                    inputMode="decimal"
                    placeholder="z. B. 37.1"
                    value={measurementForm.temperature}
                    onChange={(event) =>
                      setMeasurementForm((current) => ({
                        ...current,
                        temperature: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>

              <div className="row">
                <button className="primary-button" disabled={isPending} type="submit">
                  <Plus size={16} />
                  {measurementForm.id ? "Messung speichern" : "Messung erfassen"}
                </button>
                {measurementForm.id ? (
                  <button
                    className="secondary-button"
                    onClick={resetMeasurementForm}
                    type="button"
                  >
                    Abbrechen
                  </button>
                ) : null}
              </div>
            </form>
          </section>

          <section className="panel stack">
            <div className="panel-head wrap">
              <div>
                <h2>Verlauf & Export</h2>
                <span className="soft-note">
                  Zeitraum filtern, Linien ausblenden und PDF direkt exportieren.
                </span>
              </div>
              <button className="secondary-button" onClick={exportPdf} type="button">
                <Download size={16} />
                PDF Export
              </button>
            </div>

            <div className="toolbar">
              {(["7", "30", "90", "365", "all"] as const).map((preset) => (
                <button
                  className={cn("chip", datePreset === preset && "chip-active")}
                  key={preset}
                  onClick={() => setDatePreset(preset)}
                  type="button"
                >
                  <CalendarRange size={14} />
                  {preset === "all" ? "Alles" : `${preset} Tage`}
                </button>
              ))}
              <button
                className={cn("chip", datePreset === "custom" && "chip-active")}
                onClick={() => setDatePreset("custom")}
                type="button"
              >
                Eigener Bereich
              </button>
            </div>

            {datePreset === "custom" ? (
              <div className="form-grid compact-grid">
                <label className="field">
                  <span>Von</span>
                  <input
                    type="date"
                    value={customRange.from}
                    onChange={(event) =>
                      setCustomRange((current) => ({ ...current, from: event.target.value }))
                    }
                  />
                </label>
                <label className="field">
                  <span>Bis</span>
                  <input
                    type="date"
                    value={customRange.to}
                    onChange={(event) =>
                      setCustomRange((current) => ({ ...current, to: event.target.value }))
                    }
                  />
                </label>
              </div>
            ) : null}

            <div className="toolbar">
              {(Object.keys(metricMeta) as MetricKey[]).map((metric) => {
                const Icon = metricMeta[metric].icon;
                return (
                  <button
                    className={cn("toggle-chip", activeMetrics[metric] && "toggle-chip-active")}
                    key={metric}
                    onClick={() => toggleMetric(metric)}
                    type="button"
                  >
                    <Icon size={15} />
                    {metricMeta[metric].label}
                  </button>
                );
              })}
            </div>

            <div className="chart-card" ref={chartRef}>
              {chartData.length === 0 ? (
                <div className="empty-state large">Keine Messungen im gewaelten Zeitraum.</div>
              ) : (
                <ResponsiveContainer height={340} width="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid stroke="#eadfd5" strokeDasharray="3 3" />
                    <XAxis dataKey="label" tick={{ fill: "#7a6556", fontSize: 12 }} />
                    <YAxis tick={{ fill: "#7a6556", fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: 18,
                        border: "1px solid #eadfd5",
                        boxShadow: "0 18px 45px rgba(94, 67, 43, 0.12)",
                      }}
                      formatter={(value, name) => {
                        const numericValue =
                          typeof value === "number" ? roundValue(value) : value;
                        const unit =
                          name === "weight" || name === `Gewicht (${units.weight})`
                            ? units.weight
                            : name === "height" || name === `Groesse (${units.height})`
                              ? units.height
                              : units.temperature;
                        return [numericValue ?? "-", unit];
                      }}
                      labelFormatter={(label) => {
                        const match = chartData.find((entry) => entry.label === label);
                        return match ? formatMeasurementDate(match.measuredAt) : label;
                      }}
                    />
                    <Legend />
                    {activeMetrics.weight ? (
                      <Line
                        connectNulls
                        dataKey="weight"
                        name={`Gewicht (${units.weight})`}
                        stroke={metricMeta.weight.color}
                        strokeWidth={3}
                        type="monotone"
                      />
                    ) : null}
                    {activeMetrics.height ? (
                      <Line
                        connectNulls
                        dataKey="height"
                        name={`Groesse (${units.height})`}
                        stroke={metricMeta.height.color}
                        strokeWidth={3}
                        type="monotone"
                      />
                    ) : null}
                    {activeMetrics.temperature ? (
                      <Line
                        connectNulls
                        dataKey="temperature"
                        name={`Temperatur (${units.temperature})`}
                        stroke={metricMeta.temperature.color}
                        strokeWidth={3}
                        type="monotone"
                      />
                    ) : null}
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className="panel stack">
            <div className="panel-head">
              <h2>Messverlauf</h2>
              <span className="soft-note">Neueste Eintraege zuerst.</span>
            </div>
            <div className="measurement-list">
              {filteredMeasurements.length === 0 ? (
                <div className="empty-state">Keine Messungen fuer den aktuellen Filter.</div>
              ) : (
                filteredMeasurements.map((measurement) => (
                  <article className="measurement-card" key={measurement.id}>
                    <div>
                      <strong>{formatMeasurementDate(measurement.measuredAt)}</strong>
                      <div className="measurement-values">
                        <span>
                          Gewicht: {roundValue(measurement.weight) ?? "-"} {units.weight}
                        </span>
                        <span>
                          Groesse: {roundValue(measurement.height) ?? "-"} {units.height}
                        </span>
                        <span>
                          Temperatur: {roundValue(measurement.temperature) ?? "-"}{" "}
                          {units.temperature}
                        </span>
                      </div>
                    </div>
                    <div className="icon-actions">
                      <button
                        aria-label="Messung bearbeiten"
                        className="icon-button"
                        onClick={() => startEditMeasurement(measurement)}
                        type="button"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        aria-label="Messung loeschen"
                        className="icon-button danger"
                        onClick={() => handleDeleteMeasurement(measurement.id)}
                        type="button"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </div>
      </section>

      {feedback ? <div className="toast">{feedback}</div> : null}
    </main>
  );
}
