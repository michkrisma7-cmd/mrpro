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
  onChange,
}: {
  label: string;
  level: RegionLevel;
  parent: string;
  selected: Region;
  required: boolean;
  onChange: (region: Region) => void;
}) {
  const enabled = level === "provinces" || Boolean(parent);
  const [options, setOptions] = useState<Region[]>([]);
  const [query, setQuery] = useState("");
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
        setOptions(items);
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
  }, [enabled, level, parent, attempt]);
  const filtered = options.filter((r) =>
    r.name
      .toLocaleLowerCase("id")
      .includes(query.trim().toLocaleLowerCase("id")),
  );
  if (selected.id && !filtered.some((r) => r.id === selected.id))
    filtered.unshift(selected);
  return (
    <fieldset className="region-choice">
      <legend>
        {label}
        {required && <span className="required"> *</span>}
      </legend>
      <input
        type="search"
        aria-label={`Cari ${label.toLowerCase()}`}
        placeholder={`Cari ${label.toLowerCase()}`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        disabled={!enabled || loading || Boolean(error)}
      />
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
          setQuery("");
        }}
      >
        <option value="">
          {!enabled
            ? "Pilih wilayah di atas terlebih dahulu"
            : loading
              ? "Memuat wilayah…"
              : `Pilih ${label.toLowerCase()}`}
        </option>
        {filtered.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
        {!loading && enabled && !filtered.length && (
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
}: {
  fields: Field[];
  initial?: Values;
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
      <h3>Wilayah properti</h3>
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
          <p>
            Pilih wilayah secara berurutan. Jika memilih satu wilayah, lengkapi
            seluruh pilihan yang tersedia. Lokasi atau alamat tambahan tetap
            diisi manual.
          </p>
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
                    label={f.name}
                    level={regionLevels[index]}
                    parent={parent}
                    selected={selected[index]}
                    required={f.required}
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
