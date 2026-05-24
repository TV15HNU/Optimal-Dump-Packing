import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import * as XLSX from "xlsx";
import { runAtAngle, fillGaps, DEFAULT_TRUCKS, type TruckConfig, type LocalPackResult, type SpotLocal } from "@/engine/localEngine";
import { api } from "@/lib/api";

const R_EARTH = 6371000;

function gpsToLocal(pts: { lat: number; lng: number }[]) {
  const lat0 = (pts.reduce((s, p) => s + p.lat, 0) / pts.length) * Math.PI / 180;
  const lng0 = (pts.reduce((s, p) => s + p.lng, 0) / pts.length) * Math.PI / 180;
  return {
    local: pts.map((p) => ({
      x: (p.lng * Math.PI / 180 - lng0) * R_EARTH * Math.cos(lat0),
      y: (p.lat * Math.PI / 180 - lat0) * R_EARTH,
    })),
    origin: { lat0, lng0 },
  };
}

function gpsPointToLocal(pt: { lat: number; lng: number }, origin: { lat0: number; lng0: number }) {
  return {
    x: (pt.lng * Math.PI / 180 - origin.lng0) * R_EARTH * Math.cos(origin.lat0),
    y: (pt.lat * Math.PI / 180 - origin.lat0) * R_EARTH,
  };
}

function localToGps(pt: { x: number; y: number }, o: { lat0: number; lng0: number }) {
  return {
    lat: (o.lat0 + pt.y / R_EARTH) * 180 / Math.PI,
    lng: (o.lng0 + pt.x / (R_EARTH * Math.cos(o.lat0))) * 180 / Math.PI,
  };
}

interface ParsedSite {
  name: string;
  truck: string;
  entryLat?: number; entryLng?: number;
  exitLat?: number; exitLng?: number;
  vertices: { lat: number; lng: number }[];
}

interface OptimizedSite extends ParsedSite {
  result: LocalPackResult;
  spotCount: number;
  hexSpots: number;
  gapsFilled: number;
  improvement: number;
  bestAngle: number;
  area: number;
  gpsSpots: { lat: number; lng: number; id: number; lane: number; seq: number; global: number }[];
}

function downloadExcel(wb: XLSX.WorkBook, filename: string) {
  const buf = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([buf], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

function parseExcelFile(file: File): Promise<ParsedSite[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array" });
        const sites: ParsedSite[] = [];

        for (const sheetName of wb.SheetNames) {
          const ws = wb.Sheets[sheetName];
          const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

          let siteName = sheetName;
          let truck = "CAT 793";
          let entryLat: number | undefined, entryLng: number | undefined;
          let exitLat: number | undefined, exitLng: number | undefined;
          const vertices: { lat: number; lng: number }[] = [];
          let inVertices = false;

          for (const row of rows) {
            // Strip trailing colon so "Entry:" and "Entry" both work
            const label = String(row[0] ?? "").trim().toLowerCase().replace(/:$/, "");
            if (label === "site name" || label === "name") {
              siteName = String(row[1] ?? sheetName).trim() || sheetName;
            } else if (label === "truck") {
              truck = String(row[1] ?? "CAT 793").trim() || "CAT 793";
            } else if (label === "entry") {
              const lat = parseFloat(String(row[1])), lng = parseFloat(String(row[2]));
              if (!isNaN(lat) && !isNaN(lng)) { entryLat = lat; entryLng = lng; }
            } else if (label === "exit") {
              const lat = parseFloat(String(row[1])), lng = parseFloat(String(row[2]));
              if (!isNaN(lat) && !isNaN(lng)) { exitLat = lat; exitLng = lng; }
            } else if (label === "vertices" || label === "polygon" || label === "vertex" || label === "polygon vertices (gps)") {
              inVertices = true;
            } else if (inVertices || label === "") {
              const lat = parseFloat(String(row[1] ?? row[0]));
              const lng = parseFloat(String(row[2] ?? row[1]));
              if (!isNaN(lat) && !isNaN(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
                vertices.push({ lat, lng });
              }
            }
          }

          if (vertices.length >= 3) {
            sites.push({ name: siteName, truck, entryLat, entryLng, exitLat, exitLng, vertices });
          }
        }

        if (sites.length === 0) reject(new Error("No valid sites found. Each sheet needs ≥ 3 polygon vertices."));
        else resolve(sites);
      } catch (err: any) {
        reject(new Error(err.message ?? "Failed to parse file"));
      }
    };
    reader.readAsArrayBuffer(file);
  });
}

function generateTemplate() {
  const wb = XLSX.utils.book_new();
  const exampleData = [
    ["Site Name:", "Pit A – Bench 3"],
    ["Truck:", "CAT 793"],
    ["Entry:", 20.5940, 78.9640],
    ["Exit:", 20.5935, 78.9700],
    ["Vertices:", "Lat", "Lng"],
    ["", 20.5937, 78.9629],
    ["", 20.5950, 78.9700],
    ["", 20.5960, 78.9680],
    ["", 20.5945, 78.9620],
    ["", 20.5930, 78.9630],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(exampleData);
  ws1["!cols"] = [{ wch: 20 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws1, "Site 1 – Example");

  const exampleData2 = [
    ["Site Name:", "Dump Zone B"],
    ["Truck:", "CAT 793"],
    ["Entry:", 20.6120, 78.9800],
    ["Exit:", 20.6110, 78.9850],
    ["Vertices:", "Lat", "Lng"],
    ["", 20.6115, 78.9790],
    ["", 20.6130, 78.9860],
    ["", 20.6125, 78.9880],
    ["", 20.6105, 78.9870],
    ["", 20.6100, 78.9800],
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(exampleData2);
  ws2["!cols"] = [{ wch: 20 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, ws2, "Site 2 – Example");
  downloadExcel(wb, "dump-packing-template.xlsx");
}

export default function ExcelBatchTab() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsedSites, setParsedSites] = useState<ParsedSite[]>([]);
  const [optimized, setOptimized] = useState<OptimizedSite[]>([]);
  const [parseError, setParseError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [processIdx, setProcessIdx] = useState(0);
  const [savingAll, setSavingAll] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const [selectedSave, setSelectedSave] = useState<Set<number>>(new Set());

  const handleFile = useCallback(async (file: File) => {
    setParseError(""); setParsedSites([]); setOptimized([]); setSelectedSave(new Set());
    try {
      const sites = await parseExcelFile(file);
      setParsedSites(sites);
    } catch (err: any) {
      setParseError(err.message ?? "Failed to parse");
    }
  }, []);

  const resolveTruck = (truckName: string): TruckConfig => {
    const lower = truckName.toLowerCase();
    const match = DEFAULT_TRUCKS.find((t) =>
      lower.includes(t.name.toLowerCase().split(" ")[0].toLowerCase()) ||
      t.name.toLowerCase().includes(lower.split(" ")[0])
    );
    return match ?? DEFAULT_TRUCKS[0];
  };

  const optimizeAll = useCallback(async () => {
    if (parsedSites.length === 0) return;
    setProcessing(true); setProcessIdx(0); setOptimized([]); setSelectedSave(new Set());
    const results: OptimizedSite[] = [];

    for (let i = 0; i < parsedSites.length; i++) {
      setProcessIdx(i + 1);
      const site = parsedSites[i];
      await new Promise((r) => setTimeout(r, 10));

      const truck = resolveTruck(site.truck);
      const { local: localPts, origin } = gpsToLocal(site.vertices);

      let best: LocalPackResult | null = null;
      for (let a = 0; a < 60; a++) {
        const r = runAtAngle(localPts, truck, a);
        if (!best || r.metrics.spotCount > best.metrics.spotCount) best = r;
        if (a % 10 === 0) await new Promise((r) => setTimeout(r, 0));
      }

      if (!best) continue;

      const hexSpots = best.spots.length;

      // Gap fill
      const gapPts = fillGaps(best.insetPolygon, best.spots, truck);
      const gapsFilled = gapPts.length;
      if (gapPts.length > 0) {
        const base = best.spots.length;
        const gapSpots: SpotLocal[] = gapPts.map((p, idx) => ({
          id: base + idx, x: p.x, y: p.y,
          laneId: -1, sequenceInLane: idx,
          globalSequence: base + idx, zoneId: 1,
          rotation: best!.bestRotation, safe: true,
        }));
        const total = best.spots.length + gapSpots.length;
        best = {
          ...best,
          spots: [...best.spots, ...gapSpots],
          metrics: {
            ...best.metrics,
            spotCount: total,
            improvementPercent: best.metrics.squareGridCount > 0
              ? ((total - best.metrics.squareGridCount) / best.metrics.squareGridCount) * 100 : 0,
          },
        };
      }

      // Entry / exit — convert using the SAME polygon origin (not single-point centroid)
      let updatedResult = { ...best };
      if (site.entryLat !== undefined && site.entryLng !== undefined) {
        updatedResult = { ...updatedResult, entryPoint: gpsPointToLocal({ lat: site.entryLat, lng: site.entryLng }, origin) };
      }
      if (site.exitLat !== undefined && site.exitLng !== undefined) {
        updatedResult = { ...updatedResult, exitPoint: gpsPointToLocal({ lat: site.exitLat, lng: site.exitLng }, origin) };
      }

      // Back-project spots to GPS
      const gpsSpots = best.spots.map((s) => {
        const gps = localToGps({ x: s.x, y: s.y }, origin);
        return { ...gps, id: s.id, lane: s.laneId, seq: s.sequenceInLane, global: s.globalSequence };
      });

      results.push({
        ...site,
        result: updatedResult,
        spotCount: best.metrics.spotCount,
        hexSpots,
        gapsFilled,
        improvement: best.metrics.improvementPercent,
        bestAngle: best.bestRotation,
        area: best.metrics.totalArea,
        gpsSpots,
      });
    }
    setOptimized(results);
    setSelectedSave(new Set(results.map((_, idx) => idx)));
    setProcessing(false);
  }, [parsedSites]);

  const exportResults = useCallback(() => {
    if (optimized.length === 0) return;
    const wb = XLSX.utils.book_new();

    // Summary sheet
    const summaryRows: any[][] = [
      ["Site Name", "Total Spots", "Hex Spots", "Gaps Filled", "Grid Spots", "Improvement %", "Best Angle °", "Area m²", "Truck"],
    ];
    for (const s of optimized) {
      summaryRows.push([
        s.name,
        s.spotCount,
        s.hexSpots,
        s.gapsFilled,
        s.result.metrics.squareGridCount,
        s.improvement.toFixed(1) + "%",
        s.bestAngle + "°",
        s.area.toFixed(0),
        s.truck,
      ]);
    }
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary["!cols"] = [{ wch: 24 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 16 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");

    // All spots sheet
    const spotsRows: any[][] = [["Site", "Spot #", "Lat", "Lng", "Lane", "Seq in Lane", "Zone"]];
    for (const s of optimized) {
      for (const spot of s.gpsSpots) {
        spotsRows.push([
          s.name,
          spot.global + 1,
          spot.lat.toFixed(7),
          spot.lng.toFixed(7),
          spot.lane < 0 ? "gap-fill" : spot.lane,
          spot.seq,
          spot.lane < 0 ? "boundary" : "main",
        ]);
      }
    }
    const wsSpots = XLSX.utils.aoa_to_sheet(spotsRows);
    wsSpots["!cols"] = [{ wch: 24 }, { wch: 8 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
    XLSX.utils.book_append_sheet(wb, wsSpots, "All Spots");

    // Per-site sheets
    for (const s of optimized) {
      const rows: any[][] = [
        ["Summary"],
        ["Total Spots", s.spotCount],
        ["Hex Pack Spots", s.hexSpots],
        ["Gaps Filled", s.gapsFilled],
        ["Grid (baseline)", s.result.metrics.squareGridCount],
        ["Best Angle", s.bestAngle + "°"],
        ["Improvement", s.improvement.toFixed(1) + "%"],
        ["Area", s.area.toFixed(0) + " m²"],
        ["Truck", s.truck],
        ...(s.entryLat !== undefined ? [["Entry GPS", s.entryLat, s.entryLng]] : []),
        ...(s.exitLat !== undefined ? [["Exit GPS", s.exitLat, s.exitLng]] : []),
        [],
        ["Spot #", "Lat", "Lng", "Lane", "Seq", "Zone"],
        ...s.gpsSpots.map((sp) => [
          sp.global + 1, sp.lat.toFixed(7), sp.lng.toFixed(7),
          sp.lane < 0 ? "gap" : sp.lane, sp.seq,
          sp.lane < 0 ? "boundary" : "main",
        ]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws["!cols"] = [{ wch: 18 }, { wch: 14 }, { wch: 14 }, { wch: 10 }, { wch: 8 }, { wch: 12 }];
      const sheetName = s.name.slice(0, 31).replace(/[\\/:*?[\]]/g, "_");
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }

    downloadExcel(wb, `dump-packing-results-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }, [optimized]);

  const saveSelectedToDashboard = useCallback(async () => {
    if (selectedSave.size === 0) return;
    setSavingAll(true); setSaveMsg("");
    let saved = 0, failed = 0;
    for (let i = 0; i < optimized.length; i++) {
      if (!selectedSave.has(i)) continue;
      const s = optimized[i];
      try {
        await api.sites.save({
          id: `batch-${s.name.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}`,
          name: s.name,
          truckId: resolveTruck(s.truck).id,
          truckName: s.truck,
          polygon: s.result.polygon,
          gpsPolygon: s.vertices,
          plan: s.result,
        });
        saved++;
      } catch { failed++; }
    }
    setSaveMsg(failed === 0 ? `${saved} site${saved > 1 ? "s" : ""} saved to Dashboard ✓` : `${saved} saved, ${failed} failed`);
    setSavingAll(false);
    setTimeout(() => setSaveMsg(""), 5000);
  }, [optimized, selectedSave]);

  const toggleSave = (i: number) => {
    setSelectedSave((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedSave.size === optimized.length) setSelectedSave(new Set());
    else setSelectedSave(new Set(optimized.map((_, i) => i)));
  };

  return (
    <div className="flex flex-col gap-5 p-4 overflow-y-auto h-full max-w-3xl">

      {/* Header */}
      <div className="bg-card border border-primary/30 rounded p-5">
        <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">Batch Excel Processing</div>
        <p className="text-xs text-muted-foreground mb-4">
          Upload an Excel file with multiple sites (one sheet per site). Each sheet should have the site name, truck, optional entry/exit GPS coordinates, and polygon vertices. The engine sweeps 0–59° rotations + gap-fill to maximise spot count, then exports GPS-projected results.
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={generateTemplate}
            className="px-4 py-2 text-xs bg-secondary border border-border rounded font-semibold hover:bg-muted transition-colors">
            ↓ Download Template
          </button>
          <button onClick={() => fileRef.current?.click()}
            className="px-4 py-2 text-xs bg-primary text-primary-foreground rounded font-semibold hover:opacity-90">
            ↑ Upload Excel File…
          </button>
        </div>
        <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />
        {parseError && (
          <div className="mt-3 text-xs text-red-400 bg-red-950/30 border border-red-900 rounded px-3 py-2">{parseError}</div>
        )}
      </div>

      {/* Format reference */}
      <div className="bg-card border border-border rounded p-4">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Input Format (per sheet)</div>
        <div className="font-mono text-[11px] text-muted-foreground space-y-0.5 bg-secondary/40 rounded p-3">
          <div><span className="text-amber-400">Site Name:</span>  Pit A – Bench 3</div>
          <div><span className="text-amber-400">Truck:</span>      CAT 793  <span className="text-border ml-2">(optional)</span></div>
          <div><span className="text-amber-400">Entry:</span>      20.5940  78.9640  <span className="text-border">(lat, lng — optional)</span></div>
          <div><span className="text-amber-400">Exit:</span>       20.5935  78.9700  <span className="text-border">(optional)</span></div>
          <div><span className="text-amber-400">Vertices:</span>   Lat      Lng</div>
          <div>             20.5937  78.9629</div>
          <div>             20.5950  78.9700</div>
          <div>             <span className="text-muted-foreground/50">…</span></div>
        </div>
      </div>

      {/* Parsed sites preview */}
      <AnimatePresence>
        {parsedSites.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-card border border-border rounded p-4">
            <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
              Parsed Sites ({parsedSites.length})
            </div>
            <div className="space-y-2 max-h-52 overflow-y-auto mb-4">
              {parsedSites.map((s, i) => (
                <div key={i} className="flex items-center gap-3 text-xs bg-secondary rounded px-3 py-2">
                  <span className="font-mono text-primary font-bold w-5 shrink-0">{i + 1}</span>
                  <span className="flex-1 font-semibold truncate">{s.name}</span>
                  <span className="text-muted-foreground shrink-0">{s.truck}</span>
                  <span className="text-muted-foreground font-mono shrink-0">{s.vertices.length} pts</span>
                  {(s.entryLat !== undefined) && <span className="text-green-400 shrink-0 text-[10px]">entry ✓</span>}
                  {(s.exitLat !== undefined) && <span className="text-red-400 shrink-0 text-[10px]">exit ✓</span>}
                </div>
              ))}
            </div>
            <button
              onClick={optimizeAll}
              disabled={processing}
              className="w-full py-2.5 bg-primary text-primary-foreground text-sm font-semibold rounded hover:opacity-90 disabled:opacity-40">
              {processing
                ? `Optimizing site ${processIdx} of ${parsedSites.length}…`
                : `▶ Optimize All ${parsedSites.length} Sites`}
            </button>
            {processing && (
              <div className="mt-2">
                <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-primary rounded-full"
                    animate={{ width: `${(processIdx / parsedSites.length) * 100}%` }}
                    transition={{ duration: 0.3 }} />
                </div>
                <div className="text-[11px] text-muted-foreground font-mono mt-1 text-center">
                  Running 60° rotation sweep + gap-fill…
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {optimized.length > 0 && !processing && (
          <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="bg-card border border-primary/40 rounded p-4">
            <div className="text-xs font-semibold text-primary uppercase tracking-wider mb-3">
              Results — {optimized.length} sites optimized
            </div>
            <div className="overflow-x-auto mb-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    <th className="w-5 py-1.5 pr-2">
                      <input type="checkbox"
                        checked={selectedSave.size === optimized.length}
                        onChange={toggleAll}
                        className="accent-amber-500 cursor-pointer" />
                    </th>
                    <th className="text-left py-1.5 pr-3 font-semibold">Site</th>
                    <th className="text-right py-1.5 px-2 font-semibold">Spots</th>
                    <th className="text-right py-1.5 px-2 font-semibold text-cyan-400">Gaps</th>
                    <th className="text-right py-1.5 px-2 font-semibold text-green-400">+Impr%</th>
                    <th className="text-right py-1.5 px-2 font-semibold">Angle</th>
                    <th className="text-right py-1.5 pl-2 font-semibold">Area m²</th>
                  </tr>
                </thead>
                <tbody>
                  {optimized.map((s, i) => (
                    <tr key={i} className={`border-b border-border/50 transition-colors cursor-pointer ${selectedSave.has(i) ? "bg-primary/5" : "hover:bg-secondary/30"}`}
                      onClick={() => toggleSave(i)}>
                      <td className="py-1.5 pr-2">
                        <input type="checkbox" checked={selectedSave.has(i)} readOnly
                          className="accent-amber-500 cursor-pointer pointer-events-none" />
                      </td>
                      <td className="py-1.5 pr-3 font-semibold truncate max-w-[120px]">{s.name}</td>
                      <td className="text-right py-1.5 px-2 font-mono text-primary font-bold">{s.spotCount}</td>
                      <td className="text-right py-1.5 px-2 font-mono text-cyan-400">{s.gapsFilled > 0 ? `+${s.gapsFilled}` : "—"}</td>
                      <td className="text-right py-1.5 px-2 font-mono text-green-400">+{s.improvement.toFixed(1)}%</td>
                      <td className="text-right py-1.5 px-2 font-mono text-amber-400">{s.bestAngle}°</td>
                      <td className="text-right py-1.5 pl-2 font-mono text-muted-foreground">{s.area.toFixed(0)}</td>
                    </tr>
                  ))}
                  <tr className="font-bold border-t-2 border-border">
                    <td />
                    <td className="py-2 pr-3">Total</td>
                    <td className="text-right py-2 px-2 font-mono text-primary">
                      {optimized.reduce((a, s) => a + s.spotCount, 0)}
                    </td>
                    <td className="text-right py-2 px-2 font-mono text-cyan-400">
                      +{optimized.reduce((a, s) => a + s.gapsFilled, 0)}
                    </td>
                    <td colSpan={3} className="text-right py-2 pl-2 text-muted-foreground font-mono">
                      avg {(optimized.reduce((a, s) => a + s.improvement, 0) / optimized.length).toFixed(1)}% improvement
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="text-[10px] text-muted-foreground mb-3">
              {selectedSave.size} of {optimized.length} sites selected for dashboard import
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={exportResults}
                className="flex-1 py-2.5 bg-primary text-primary-foreground text-xs font-semibold rounded hover:opacity-90">
                ↓ Export Results Excel
              </button>
              <button onClick={saveSelectedToDashboard} disabled={savingAll || selectedSave.size === 0}
                className="flex-1 py-2.5 bg-secondary border border-border text-xs font-semibold rounded hover:bg-muted disabled:opacity-40">
                {savingAll ? "Saving…" : `Save Selected (${selectedSave.size}) to Dashboard`}
              </button>
            </div>
            {saveMsg && (
              <div className={`mt-2 text-xs px-2 py-1.5 rounded ${saveMsg.includes("failed") ? "text-amber-400" : "text-green-400"}`}>
                {saveMsg}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
