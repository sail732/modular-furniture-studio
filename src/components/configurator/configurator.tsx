"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Elevation } from "@/components/furniture/elevation";
import { buttonClass } from "@/components/ui/button-link";
import { buildLayout } from "@/lib/configuration/layout";
import { defaultSelection, newBay, overallWidth } from "@/lib/configuration/selection";
import {
  baseLabels,
  type BaySelection,
  type ConfiguratorCatalog,
  type Issue,
  type Selection,
  type ValidationResult,
} from "@/lib/configuration/types";
import { formatMoney } from "@/lib/money";
import { formatDimensions, formatLength } from "@/lib/units";
import { allowedWidths } from "@/lib/width-options";
import * as api from "./api";

const steps = [
  { id: "design", label: "Design", paths: ["templateCode"] },
  { id: "size", label: "Size", paths: ["dimensions"] },
  { id: "layout", label: "Layout", paths: ["bays"] },
  { id: "finish", label: "Finish", paths: ["materialCode", "finishCode"] },
  { id: "details", label: "Details", paths: ["base", "handleSku", "accessories"] },
  { id: "review", label: "Review", paths: [] as string[] },
] as const;
type StepId = (typeof steps)[number]["id"];

const under = (issue: Issue, prefix: string) => issue.path === prefix || issue.path.startsWith(`${prefix}.`);

function Issues({ issues, id }: { issues: Issue[]; id?: string }) {
  if (issues.length === 0) return null;
  return (
    <ul id={id} role="alert" className="mt-2 space-y-1 border-l-4 border-danger pl-3 text-[0.95rem] text-danger">
      {issues.map((issue) => (
        <li key={`${issue.code}-${issue.path}`}>{issue.message}</li>
      ))}
    </ul>
  );
}

const cardClass = (selected: boolean) =>
  `flex cursor-pointer items-start gap-3 rounded-panel border p-3 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-spruce ${
    selected ? "border-ink bg-surface" : "border-line hover:border-ink"
  }`;
const controlClass = "min-h-11 rounded-control border border-ink/60 bg-surface px-3";
const fieldClass = `${controlClass} w-full`;
const smallButton =
  "inline-flex min-h-10 items-center justify-center rounded-control border border-ink/50 px-3 text-sm font-medium hover:bg-ink hover:text-paper disabled:cursor-not-allowed disabled:border-line disabled:text-ink-soft disabled:hover:bg-transparent disabled:hover:text-ink-soft";

export interface SavedState {
  id: string;
  shareToken: string;
  name: string;
  /** True when the design was saved under an older template or rule version. */
  savedUnderOlderRules: boolean;
}

export function Configurator({
  catalog,
  initialSelection,
  saved: initialSaved = null,
  origin,
}: {
  catalog: ConfiguratorCatalog;
  initialSelection: Selection;
  saved?: SavedState | null;
  origin: string;
}) {
  const router = useRouter();
  const [selection, setSelection] = useState<Selection>(initialSelection);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [checkedKey, setCheckedKey] = useState<string | null>(null);
  const [step, setStep] = useState<StepId>("design");
  const [activeBay, setActiveBay] = useState<number | null>(null);
  const [resizeIssues, setResizeIssues] = useState<Issue[]>([]);
  const [resizing, setResizing] = useState(false);
  const [saved, setSaved] = useState<SavedState | null>(initialSaved);
  const [savedKey, setSavedKey] = useState<string | null>(initialSaved ? JSON.stringify(initialSelection) : null);
  const [name, setName] = useState(initialSaved?.name ?? "");
  const [saveState, setSaveState] = useState<{ status: "idle" | "saving" | "error"; message?: string }>({ status: "idle" });
  const [copied, setCopied] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  const selectionKey = useMemo(() => JSON.stringify(selection), [selection]);
  const checking = checkedKey !== selectionKey;
  const dirty = savedKey !== selectionKey;

  // Ask the server whether the current selection can be built. The server's answer is the only one shown.
  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const result = await api.validate(selection, controller.signal);
        if (controller.signal.aborted) return;
        setValidation(result);
        setCheckedKey(selectionKey);
      } catch {
        // Aborted or offline: keep the last answer; `checking` stays true.
      }
    }, 180);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [selection, selectionKey]);

  const template = catalog.templates.find((t) => t.code === selection.templateCode) ?? catalog.templates[0];
  const modules = useMemo(() => new Map(catalog.modules.map((m) => [m.code, m])), [catalog.modules]);
  const finish = catalog.materials.flatMap((m) => m.finishes).find((f) => f.code === selection.finishCode);
  const width = overallWidth(selection.bays);
  const widths = allowedWidths(template);
  const issues = validation?.issues ?? [];
  const at = (prefix: string) => issues.filter((i) => under(i, prefix));
  const stepIssues = (id: StepId) => {
    const paths: readonly string[] = steps.find((s) => s.id === id)!.paths;
    return issues.filter((i) => paths.some((p) => under(i, p)));
  };

  // Drawn immediately from the local selection. Presentation only.
  const layout = useMemo(
    () =>
      buildLayout(
        selection.bays.map((bay) => ({
          widthUm: bay.widthUm,
          count: bay.count,
          cellTemplate: modules.get(bay.moduleCode)?.cellTemplate ?? [{ kind: "open" as const, heightShare: 1 }],
        })),
        selection.base,
      ),
    [selection.bays, selection.base, modules],
  );

  const update = (patch: Partial<Selection>) => {
    setResizeIssues([]);
    setSelection((current) => ({ ...current, ...patch }));
  };
  const updateBay = (index: number, patch: Partial<BaySelection>) =>
    update({ bays: selection.bays.map((bay, i) => (i === index ? { ...bay, ...patch } : bay)) });

  const goTo = (id: StepId) => {
    setStep(id);
    setActiveBay(null);
    requestAnimationFrame(() => panelRef.current?.focus());
  };
  const stepIndex = steps.findIndex((s) => s.id === step);

  async function chooseWidth(target: number) {
    setResizing(true);
    setResizeIssues([]);
    try {
      const result = await api.resize(selection, target);
      if (!result) setResizeIssues([{ code: "UNAVAILABLE", path: "dimensions.width", message: "The width could not be changed just now. Try again." }]);
      else if (result.ok) setSelection((current) => ({ ...current, bays: result.bays }));
      else setResizeIssues(result.issues);
    } catch {
      setResizeIssues([{ code: "OFFLINE", path: "dimensions.width", message: "The width could not be changed. Check your connection and try again." }]);
    } finally {
      setResizing(false);
    }
  }

  async function saveDesign() {
    setSaveState({ status: "saving" });
    try {
      const result = await api.save(selection, name, saved?.id ?? null);
      if (result.kind === "saved") {
        const firstSave = saved === null;
        setSaved({ id: result.id, shareToken: result.shareToken, name, savedUnderOlderRules: false });
        setSavedKey(selectionKey);
        setSaveState({ status: "idle" });
        // Point the address bar at the saved design without leaving this screen,
        // so a reload or bookmark returns to it and the current step is kept.
        if (firstSave) window.history.replaceState(null, "", `/configurations/${result.id}`);
      } else if (result.kind === "invalid") {
        setValidation(result.validation);
        setCheckedKey(selectionKey);
        setSaveState({ status: "error", message: "This design was not saved because it cannot be built as it stands. Fix the items listed above and save again." });
      } else {
        setSaveState({ status: "error", message: result.message });
      }
    } catch {
      setSaveState({ status: "error", message: "The design could not be saved. Check your connection and try again." });
    }
  }

  async function duplicateDesign() {
    if (!saved) return;
    const result = await api.duplicate(saved.id);
    if ("id" in result) router.push(`/configurations/${result.id}`);
    else setSaveState({ status: "error", message: result.message });
  }

  const shareUrl = saved ? `${origin}/shared/${saved.shareToken}` : "";
  const status = checking
    ? "Checking this configuration…"
    : validation === null
      ? "This configuration could not be checked. Changes will be checked again when you edit or save."
      : validation.valid
        ? "This configuration can be built."
        : `${issues.length} ${issues.length === 1 ? "thing needs" : "things need"} attention before this can be built.`;

  return (
    <div className="page py-6 sm:py-10">
      <nav aria-label="Breadcrumb" className="text-sm text-ink-soft">
        <Link href={`/products/${catalog.product.slug}`} className="hover:underline">
          Back to {catalog.product.name}
        </Link>
      </nav>
      <h1 className="mt-2 text-title">Configure your {catalog.product.name}</h1>
      {saved?.savedUnderOlderRules ? (
        <p role="note" className="mt-3 max-w-2xl rounded-panel border-l-4 border-signal bg-surface p-3 text-[0.95rem]">
          This design was saved before the catalog was last updated. It has been checked against the current
          options; anything that no longer fits is listed under Review.
        </p>
      ) : null}

      <div className="mt-6 grid gap-6 *:min-w-0 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-12">
        {/* Preview */}
        <section aria-label="Preview" className="sticky top-16 z-20 -mx-5 bg-paper px-5 pb-3 pt-2 sm:static sm:mx-0 sm:p-0 lg:sticky lg:top-28 lg:self-start">
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            aria-expanded={showPreview}
            className="mb-2 text-sm underline underline-offset-4 sm:hidden"
          >
            {showPreview ? "Hide preview" : "Show preview"}
          </button>
          <div className={showPreview ? "" : "hidden sm:block"}>
            <figure>
              <div className="rounded-panel bg-surface ring-1 ring-line-soft">
                <Elevation
                  layout={layout}
                  widthUm={width}
                  heightUm={template.heightUm}
                  finishHex={finish?.swatchHex ?? "#C7CEC6"}
                  label={`${catalog.product.name}, ${selection.bays.length} ${selection.bays.length === 1 ? "bay" : "bays"}, ${formatLength(width)} wide${finish ? `, in ${finish.name}` : ""}`}
                  showDimensions
                  highlightBay={step === "layout" ? activeBay : null}
                  className="max-h-[24vh] w-full sm:max-h-none"
                />
              </div>
              <figcaption className="mt-2 text-sm text-ink-soft">
                2D front view<span className="hidden sm:inline">, not a photograph</span>. {formatDimensions({ widthUm: width, heightUm: template.heightUm, depthUm: template.depthUm })}.
              </figcaption>
            </figure>
          </div>
          <p role="status" aria-live="polite" data-testid="config-status" className={`mt-2 text-[0.95rem] font-medium ${!checking && validation && !validation.valid ? "text-danger" : ""}`}>
            {status}
          </p>
        </section>

        {/* Options */}
        <section aria-label="Options">
          <nav aria-label="Configuration steps">
            <ol className="flex flex-wrap gap-2">
              {steps.map((s, i) => {
                const problems = s.id === "review" ? issues.length : stepIssues(s.id).length;
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => goTo(s.id)}
                      aria-current={s.id === step ? "step" : undefined}
                      className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3.5 text-sm ${
                        s.id === step ? "border-ink bg-ink text-paper" : "border-line hover:border-ink"
                      }`}
                    >
                      <span className="tabular-nums">{i + 1}.</span> {s.label}
                      {problems > 0 ? (
                        <span className={`rounded-full px-1.5 text-xs font-semibold ${s.id === step ? "bg-paper text-danger" : "bg-danger text-white"}`}>
                          <span aria-hidden="true">!</span>
                          <span className="sr-only">needs attention</span>
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <div ref={panelRef} tabIndex={-1} className="mt-6 outline-none">
            {step === "design" ? (
              <fieldset>
                <legend className="font-display text-2xl font-medium">Choose a starting design</legend>
                <p className="mt-1 text-ink-soft">Changing the starting design resets the layout. Your finish and handles are kept.</p>
                <Issues issues={at("templateCode")} />
                <div className="mt-4 space-y-2">
                  {catalog.templates.map((t) => (
                    <label key={t.code} className={cardClass(t.code === selection.templateCode)}>
                      <input
                        type="radio"
                        name="template"
                        className="mt-1 size-4 accent-spruce"
                        checked={t.code === selection.templateCode}
                        onChange={() =>
                          update({
                            ...defaultSelection(catalog, t.code, selection.finishCode),
                            handleSku: selection.handleSku,
                          })
                        }
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium">{t.name}</span>
                        <span className="block text-sm text-ink-soft">{t.description}</span>
                        <span className="block text-sm text-ink-soft">
                          {formatLength(t.minWidthUm)} to {formatLength(t.maxWidthUm)} wide, {formatLength(t.heightUm)} high, {formatLength(t.depthUm)} deep
                        </span>
                      </span>
                      <span className="shrink-0 text-sm tabular-nums text-ink-soft">from {formatMoney(t.basePriceCents, t.currency)}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {step === "size" ? (
              <fieldset disabled={resizing}>
                <legend className="font-display text-2xl font-medium">Choose the overall width</legend>
                <p className="mt-1 text-ink-soft">
                  This design is made in {formatLength(template.widthIncrementUm)} steps. Bays are resized to fit the width you pick.
                </p>
                <div className="mt-4 flex flex-wrap gap-2" aria-describedby="width-issues">
                  {widths.map((w) => (
                    <label key={w} className={`${cardClass(w === width)} min-h-11 items-center px-4 py-2`}>
                      <input type="radio" name="width" className="sr-only" checked={w === width} onChange={() => chooseWidth(w)} />
                      <span className="tabular-nums">{formatLength(w)}</span>
                    </label>
                  ))}
                </div>
                {!widths.includes(width) ? (
                  <p className="mt-3 text-[0.95rem]">Current width: {formatLength(width)} (not one of the widths above).</p>
                ) : null}
                <Issues id="width-issues" issues={[...resizeIssues, ...at("dimensions")]} />
                <dl className="mt-6 grid max-w-sm grid-cols-2 gap-4 border-t border-line pt-4">
                  <div>
                    <dt className="text-sm text-ink-soft">Height (fixed)</dt>
                    <dd className="text-lg tabular-nums">{formatLength(template.heightUm)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-ink-soft">Depth (fixed)</dt>
                    <dd className="text-lg tabular-nums">{formatLength(template.depthUm)}</dd>
                  </div>
                </dl>
                <p className="mt-3 text-sm text-ink-soft">
                  Height and depth cannot be changed. For a different height or depth, choose another design or piece.
                </p>
              </fieldset>
            ) : null}

            {step === "layout" ? (
              <div>
                <h2 className="text-2xl">Arrange the bays</h2>
                <p className="mt-1 text-ink-soft">
                  Bays run left to right. This design takes {template.minBays === template.maxBays ? template.minBays : `${template.minBays} to ${template.maxBays}`}{" "}
                  {template.maxBays === 1 ? "bay" : "bays"}.
                </p>
                <Issues issues={issues.filter((i) => i.path === "bays")} />
                <ol className="mt-4 space-y-3">
                  {selection.bays.map((bay, i) => {
                    const m = modules.get(bay.moduleCode);
                    const bayIssues = at(`bays.${i}`);
                    return (
                      <li
                        key={i}
                        onFocus={() => setActiveBay(i)}
                        onMouseEnter={() => setActiveBay(i)}
                        className={`rounded-panel border p-3 ${activeBay === i ? "border-spruce" : "border-line"} ${bayIssues.length ? "border-danger" : ""}`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <h3 className="font-sans text-base font-semibold tracking-normal">Bay {i + 1}</h3>
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              className={smallButton}
                              disabled={i === 0}
                              aria-label={`Move bay ${i + 1} left`}
                              onClick={() => {
                                const bays = [...selection.bays];
                                [bays[i - 1], bays[i]] = [bays[i], bays[i - 1]];
                                update({ bays });
                                setActiveBay(i - 1);
                              }}
                            >
                              <span aria-hidden="true">←</span>
                            </button>
                            <button
                              type="button"
                              className={smallButton}
                              disabled={i === selection.bays.length - 1}
                              aria-label={`Move bay ${i + 1} right`}
                              onClick={() => {
                                const bays = [...selection.bays];
                                [bays[i + 1], bays[i]] = [bays[i], bays[i + 1]];
                                update({ bays });
                                setActiveBay(i + 1);
                              }}
                            >
                              <span aria-hidden="true">→</span>
                            </button>
                            <button
                              type="button"
                              className={smallButton}
                              disabled={selection.bays.length <= template.minBays}
                              onClick={() => {
                                update({ bays: selection.bays.filter((_, j) => j !== i) });
                                setActiveBay(null);
                              }}
                            >
                              Remove<span className="sr-only"> bay {i + 1}</span>
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 grid gap-3 sm:grid-cols-[1.6fr_1fr_1fr]">
                          <label className="block text-sm">
                            <span className="mb-1 block text-ink-soft">Type</span>
                            <select
                              className={fieldClass}
                              value={bay.moduleCode}
                              onChange={(e) => {
                                const next = modules.get(e.target.value);
                                if (next) updateBay(i, newBay(next, bay.widthUm));
                              }}
                            >
                              {!m ? <option value={bay.moduleCode}>Unavailable module</option> : null}
                              {catalog.modules.map((option) => (
                                <option key={option.code} value={option.code}>
                                  {option.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="block text-sm">
                            <span className="mb-1 block text-ink-soft">Width</span>
                            <select className={fieldClass} value={bay.widthUm} onChange={(e) => updateBay(i, { widthUm: Number(e.target.value) })}>
                              {m && !m.widthsUm.includes(bay.widthUm) ? <option value={bay.widthUm}>{formatLength(bay.widthUm)} (not available)</option> : null}
                              {(m?.widthsUm ?? [bay.widthUm]).map((w) => (
                                <option key={w} value={w}>
                                  {formatLength(w)}
                                </option>
                              ))}
                            </select>
                          </label>
                          {m && m.countLabel && m.minCount < m.maxCount ? (
                            <label className="block text-sm">
                              <span className="mb-1 block text-ink-soft">{m.countLabel}</span>
                              <select className={fieldClass} value={bay.count} onChange={(e) => updateBay(i, { count: Number(e.target.value) })}>
                                {Array.from({ length: m.maxCount - m.minCount + 1 }, (_, k) => m.minCount + k).map((n) => (
                                  <option key={n} value={n}>
                                    {n}
                                  </option>
                                ))}
                              </select>
                            </label>
                          ) : null}
                        </div>
                        <Issues issues={bayIssues} />
                      </li>
                    );
                  })}
                </ol>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    className={buttonClass("secondary")}
                    disabled={selection.bays.length >= template.maxBays}
                    onClick={() => {
                      update({ bays: [...selection.bays, newBay(catalog.modules[0])] });
                      setActiveBay(selection.bays.length);
                    }}
                  >
                    Add a bay
                  </button>
                  <p className="tabular-nums">
                    Bays add up to <strong>{formatLength(width)}</strong>
                  </p>
                </div>
                <Issues issues={at("dimensions")} />
                {at("dimensions").length > 0 ? (
                  <p className="mt-2 text-sm text-ink-soft">
                    Change a bay width here, or pick a width under{" "}
                    <button type="button" className="underline underline-offset-4" onClick={() => goTo("size")}>
                      Size
                    </button>{" "}
                    to have the bays resized for you.
                  </p>
                ) : null}
              </div>
            ) : null}

            {step === "finish" ? (
              <fieldset>
                <legend className="font-display text-2xl font-medium">Choose a finish</legend>
                <p className="mt-1 text-ink-soft">Each finish belongs to one material. Screen colours are approximate.</p>
                <Issues issues={[...at("materialCode"), ...at("finishCode")]} />
                <div className="mt-4 space-y-5">
                  {catalog.materials.map((material) => (
                    <div key={material.code}>
                      <h3 className="font-sans text-base font-semibold tracking-normal">{material.name}</h3>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {material.finishes.map((f) => (
                          <label key={f.code} className={`${cardClass(f.code === selection.finishCode)} min-h-11 items-center rounded-full py-1 pl-1.5 pr-4`}>
                            <input
                              type="radio"
                              name="finish"
                              className="sr-only"
                              checked={f.code === selection.finishCode}
                              onChange={() => update({ finishCode: f.code, materialCode: material.code })}
                            />
                            <span aria-hidden="true" className="size-7 rounded-full border border-ink/25" style={{ backgroundColor: f.swatchHex }} />
                            {f.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </fieldset>
            ) : null}

            {step === "details" ? (
              <div className="space-y-8">
                <fieldset>
                  <legend className="font-display text-2xl font-medium">Base</legend>
                  <Issues issues={at("base")} />
                  <div className="mt-3 flex flex-wrap gap-2">
                    {template.allowedBases.map((b) => (
                      <label key={b} className={`${cardClass(b === selection.base)} min-h-11 items-center px-4 py-2`}>
                        <input type="radio" name="base" className="sr-only" checked={b === selection.base} onChange={() => update({ base: b })} />
                        {baseLabels[b]}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset>
                  <legend className="font-display text-2xl font-medium">Handles</legend>
                  <Issues issues={at("handleSku")} />
                  <div className="mt-3 space-y-2">
                    {[...catalog.handles, { sku: null, name: "No handles", description: "Doors and drawers open with a push." }].map((h) => (
                      <label key={h.sku ?? "none"} className={cardClass(h.sku === selection.handleSku)}>
                        <input
                          type="radio"
                          name="handle"
                          className="mt-1 size-4 accent-spruce"
                          checked={h.sku === selection.handleSku}
                          onChange={() => update({ handleSku: h.sku })}
                        />
                        <span>
                          <span className="block font-medium">{h.name}</span>
                          <span className="block text-sm text-ink-soft">{h.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>

                {catalog.accessories.length > 0 ? (
                  <fieldset>
                    <legend className="font-display text-2xl font-medium">Accessories</legend>
                    <Issues issues={at("accessories")} />
                    <ul className="mt-3 space-y-2">
                      {catalog.accessories.map((a) => {
                        const quantity = selection.accessories.find((x) => x.sku === a.sku)?.quantity ?? 0;
                        const setQuantity = (n: number) =>
                          update({
                            accessories: [
                              ...selection.accessories.filter((x) => x.sku !== a.sku),
                              ...(n > 0 ? [{ sku: a.sku, quantity: n }] : []),
                            ],
                          });
                        return (
                          <li key={a.sku} className="flex items-center justify-between gap-4 rounded-panel border border-line p-3">
                            <label htmlFor={`acc-${a.sku}`} className="min-w-0">
                              <span className="block font-medium">{a.name}</span>
                              <span className="block text-sm text-ink-soft">{a.description}</span>
                            </label>
                            <select
                              id={`acc-${a.sku}`}
                              className={`${controlClass} w-24 shrink-0`}
                              value={quantity}
                              onChange={(e) => setQuantity(Number(e.target.value))}
                            >
                              {Array.from({ length: Math.max(a.maxQuantity, quantity) + 1 }, (_, n) => (
                                <option key={n} value={n}>
                                  {n === 0 ? "None" : n}
                                </option>
                              ))}
                            </select>
                          </li>
                        );
                      })}
                    </ul>
                  </fieldset>
                ) : null}
              </div>
            ) : null}

            {step === "review" ? (
              <div>
                <h2 className="text-2xl">Review your design</h2>
                {issues.length > 0 ? (
                  <div className="mt-4 rounded-panel border border-danger p-4" role="alert">
                    <h3 className="font-sans text-base font-semibold tracking-normal text-danger">Needs attention before this can be built</h3>
                    <ul className="mt-2 space-y-2">
                      {issues.map((issue) => {
                        const target = steps.find((s) => (s.paths as readonly string[]).some((p) => under(issue, p)));
                        return (
                          <li key={`${issue.code}-${issue.path}`} className="text-[0.95rem]">
                            {issue.message}{" "}
                            {target ? (
                              <button type="button" className="underline underline-offset-4" onClick={() => goTo(target.id)}>
                                Go to {target.label}
                              </button>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}

                <dl className="mt-5 divide-y divide-line-soft border-y border-line">
                  {[
                    ["Design", template.name],
                    ["Size", formatDimensions({ widthUm: width, heightUm: template.heightUm, depthUm: template.depthUm })],
                    [
                      "Bays",
                      selection.bays
                        .map((bay) => {
                          const m = modules.get(bay.moduleCode);
                          const count = m?.countLabel && m.minCount < m.maxCount ? `, ${m.countLabel.toLowerCase()}: ${bay.count}` : "";
                          return `${m?.name ?? "Unavailable module"} (${formatLength(bay.widthUm)}${count})`;
                        })
                        .join("; "),
                    ],
                    ["Finish", finish ? `${finish.name}, ${catalog.materials.find((m) => m.code === selection.materialCode)?.name.toLowerCase() ?? ""}` : "Not available"],
                    ["Base", baseLabels[selection.base]],
                    ["Handles", catalog.handles.find((h) => h.sku === selection.handleSku)?.name ?? "No handles"],
                    [
                      "Accessories",
                      selection.accessories.length
                        ? selection.accessories.map((a) => `${catalog.accessories.find((x) => x.sku === a.sku)?.name ?? a.sku} × ${a.quantity}`).join("; ")
                        : "None",
                    ],
                  ].map(([term, value]) => (
                    <div key={term} className="grid grid-cols-[7rem_1fr] gap-3 py-2.5">
                      <dt className="text-ink-soft">{term}</dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>

                <p className="mt-4 text-sm text-ink-soft">
                  Pricing for configured designs and ordering are not available yet. The starting price for this design at
                  its standard size is {formatMoney(template.basePriceCents, template.currency)}.
                </p>

                <div className="mt-6 rounded-panel bg-surface p-4 ring-1 ring-line-soft">
                  <label htmlFor="config-name" className="block font-medium">
                    Name this design <span className="font-normal text-ink-soft">(optional)</span>
                  </label>
                  <input
                    id="config-name"
                    className={`${fieldClass} mt-2`}
                    maxLength={120}
                    value={name}
                    placeholder={`${catalog.product.name}, ${template.name.split(":")[0]}`}
                    onChange={(e) => setName(e.target.value)}
                  />
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button type="button" className={buttonClass("primary")} onClick={saveDesign} disabled={saveState.status === "saving"}>
                      {saveState.status === "saving" ? "Saving…" : saved ? "Save changes" : "Save design"}
                    </button>
                    {saved ? (
                      <button type="button" className={buttonClass("secondary")} onClick={duplicateDesign} disabled={dirty}>
                        Duplicate
                      </button>
                    ) : null}
                    <Link href="/contact" className={buttonClass("quiet")}>
                      Ask for help with this design
                    </Link>
                  </div>
                  <p role="status" aria-live="polite" className="mt-3 text-[0.95rem]">
                    {saveState.status === "error" ? (
                      <span className="text-danger">{saveState.message}</span>
                    ) : saved && !dirty ? (
                      <>
                        Saved.{" "}
                        <Link href="/configurations" className="underline underline-offset-4">
                          View saved designs
                        </Link>
                      </>
                    ) : saved && dirty ? (
                      "You have changes that are not saved."
                    ) : (
                      "Saved designs are kept for this browser. Accounts are not available yet."
                    )}
                  </p>
                  {saved && !dirty ? (
                    <div className="mt-4 border-t border-line-soft pt-4">
                      <label htmlFor="share-link" className="block font-medium">
                        Share link <span className="font-normal text-ink-soft">(view only)</span>
                      </label>
                      <div className="mt-2 flex gap-2">
                        <input id="share-link" readOnly className={fieldClass} value={shareUrl} onFocus={(e) => e.target.select()} />
                        <button
                          type="button"
                          className={`${smallButton} min-h-11 shrink-0 px-4`}
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(shareUrl);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                            } catch {
                              setCopied(false);
                            }
                          }}
                        >
                          {copied ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-8 flex justify-between gap-3 border-t border-line pt-5">
            <button type="button" className={buttonClass("secondary")} disabled={stepIndex === 0} onClick={() => goTo(steps[stepIndex - 1].id)}>
              Back
            </button>
            {stepIndex < steps.length - 1 ? (
              <button type="button" className={buttonClass("primary")} onClick={() => goTo(steps[stepIndex + 1].id)}>
                Next: {steps[stepIndex + 1].label}
              </button>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}
