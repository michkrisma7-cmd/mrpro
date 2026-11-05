"use client";
import { useEffect, useState } from "react";
import {
  activeRegionFields,
  regionKeys,
  regionLevels,
  type Region,
  type RegionLevel,
} from "@/lib/region-config";
import type { Field, Values } from "@/lib/types";

function RegionSelect({
  label,
  level,
  parent,
  selected,
  required,
  creation,
  onChange,
}: {
  label: string;
  level: RegionLevel;
  parent: string;
  selected: Region;
  required: boolean;
  creation: boolean;
  onChange: (region: Region) => void;
}) {
  const enabled = level === "provinces" || Boolean(parent);
  const [options, setOptions] = useState<Region[]>([]);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    fetch(`/api/wilayah?${new URLSearchParams({ level, parent })}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Daftar wilayah belum dapat dimuat.");
        return response.json() as Promise<Region[]>;
      })
      .then((items) => {
        setOptions(
          creation && level === "provinces"
            ? [...items].sort((a, b) => a.name.localeCompare(b.name, "id"))
            : items,
        );
        setLoading(false);
      })
      .catch((failure) => {
        if (controller.signal.aborted) return;
        setError(
          failure instanceof Error
            ? failure.message
            : "Daftar wilayah belum dapat dimuat.",
        );
        setLoading(false);
      });
    return () => controller.abort();
  }, [enabled, level, parent, attempt, creation]);
  // Keep the stored label visible while its options are loading during edit.
  const displayed =
    selected.id && !options.some((r) => r.id === selected.id)
      ? [selected, ...options]
      : options;
  return (
    <fieldset className="region-choice">
      <legend>
        {label}
        {required && <span className="required"> *</span>}
      </legend>
      <select
        aria-label={label}
        value={selected.id}
        required={required}
        disabled={!enabled || loading || Boolean(error)}
        onChange={(e) => {
          onChange(
            options.find((r) => r.id === e.target.value) ?? {
              id: "",
              name: "",
            },
          );
        }}
      >
        <option value="">
          {creation
            ? {
                provinces: "Pilih provinsi",
                regencies: "Pilih Kota / Kabupaten",
                districts: "Pilih Kecamatan",
                villages: "Pilih Kelurahan / Desa",
              }[level]
            : !enabled
              ? "Pilih wilayah di atas terlebih dahulu"
              : loading
                ? "Memuat wilayah…"
                : `Pilih ${label.toLowerCase()}`}
        </option>
        {displayed.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
        {!loading && enabled && !displayed.length && (
          <option disabled>Tidak ada wilayah yang cocok</option>
        )}
      </select>
      {error && (
        <div>
          <p className="form-message error" role="alert">
            {error}
          </p>
          <button
            type="button"
            className="text-button"
            onClick={() => {
              setError("");
              setLoading(true);
              setAttempt((n) => n + 1);
            }}
          >
            Coba muat ulang wilayah
          </button>
        </div>
      )}
    </fieldset>
  );
}

export function PropertyRegions({
  fields,
  initial = {},
  creation = false,
}: {
  fields: Field[];
  initial?: Values;
  creation?: boolean;
}) {
  const active = activeRegionFields(fields);
  const [selected, setSelected] = useState<Region[]>(() =>
    regionKeys.map((key) => ({
      id: String(initial[`${key}_kode`] ?? ""),
      name: String(initial[key] ?? ""),
    })),
  );
  const [legacy, setLegacy] = useState(
    () =>
      !regionKeys.some((key) => initial[`${key}_kode`]) &&
      regionKeys.some((key) => initial[key]),
  );
  if (!active.length) return null;
  return (
    <section
      className="property-regions full-span"
      aria-label="Wilayah properti"
    >
      <input
        type="hidden"
        name="region_mode"
        value={legacy ? "legacy" : "select"}
      />
      {legacy ? (
        <>
          <p>
            Wilayah dari listing lama tetap disimpan. Pilih ulang hanya jika
            Anda ingin memperbaruinya.
          </p>
          <dl>
            {active
              .filter((f) => initial[f.key])
              .map((f) => (
                <div key={f.key}>
                  <dt>{f.name}</dt>
                  <dd>{String(initial[f.key])}</dd>
                </div>
              ))}
          </dl>
          <button
            type="button"
            className="outline-button"
            onClick={() => {
              setLegacy(false);
              setSelected(regionKeys.map(() => ({ id: "", name: "" })));
            }}
          >
            Pilih ulang wilayah
          </button>
        </>
      ) : (
        <>
          <div className="form-grid">
            {active.map((f, index) => {
              const parent = index ? selected[index - 1].id : "";
              return (
                <div key={f.key}>
                  <input
                    type="hidden"
                    name={`field_${f.key}_kode`}
                    value={selected[index].id}
                  />
                  <input
                    type="hidden"
                    name={`field_${f.key}`}
                    value={selected[index].name}
                  />
                  <RegionSelect
                    key={`${f.key}:${parent}`}
                    label={
                      index === 1
                        ? "Kota / Kabupaten"
                        : index === 3
                          ? "Kelurahan / Desa"
                          : f.name
                    }
                    level={regionLevels[index]}
                    parent={parent}
                    selected={selected[index]}
                    required={f.required}
                    creation={creation}
                    onChange={(value) =>
                      setSelected((previous) =>
                        previous.map((r, i) =>
                          i < index
                            ? r
                            : i === index
                              ? value
                              : { id: "", name: "" },
                        ),
                      )
                    }
                  />
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
