"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Map, MapControls, MapMarker, MapPopup, MarkerContent, useMap } from "@/components/ui/map";
import { compactPlantCount, groupNearbyLocations, locationBounds, locationMapUrl, type MappedSiteLocation } from "@/lib/wrt/site-locations";
import { formatNumber } from "@/lib/wrt/text";
import { SplitBar, SplitLine } from "@/components/wrt/quantity";

function MapFocus({ locations, selected }: { locations: MappedSiteLocation[]; selected?: MappedSiteLocation }) {
  const { map, isLoaded } = useMap();
  useEffect(() => {
    if (!map || !isLoaded) return;
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 450;
    if (selected) {
      // Sit the marker below centre so its popover has room above it.
      map.easeTo({ center: [selected.longitude, selected.latitude], zoom: 15, duration, offset: [0, map.getContainer().clientHeight * 0.3] });
    } else {
      const bounds = locationBounds(locations);
      if (bounds) map.fitBounds(bounds, { padding: 60, maxZoom: 14, duration });
    }
  }, [map, isLoaded, locations, selected]);
  return null;
}

function LocationMarkers({ locations, selectedId, onSelect }: { locations: MappedSiteLocation[]; selectedId?: string; onSelect: (id: string) => void }) {
  const { map, isLoaded } = useMap();
  const [groups, setGroups] = useState<number[][]>(() => locations.map((_, index) => [index]));
  useEffect(() => {
    if (!map || !isLoaded) return;
    const regroup = () => {
      const points = locations.map((location) => map.project([location.longitude, location.latitude]));
      const next = groupNearbyLocations(points);
      setGroups((current) => JSON.stringify(current) === JSON.stringify(next) ? current : next);
    };
    // The first idle follows the initial fit; later moves and resizes re-group at the new scale.
    map.on("idle", regroup);
    map.on("moveend", regroup);
    map.on("resize", regroup);
    return () => {
      map.off("idle", regroup);
      map.off("moveend", regroup);
      map.off("resize", regroup);
    };
  }, [map, isLoaded, locations]);

  return groups.map((indexes) => {
    const members = indexes.map((index) => locations[index]).filter(Boolean);
    if (!members.length) return null;
    const clustered = members.length > 1;
    const total = members.reduce((sum, point) => sum + point.split.total, 0);
    const needsReview = members.reduce((sum, point) => sum + point.split.needsReview, 0);
    const longitude = members.reduce((sum, point) => sum + point.longitude, 0) / members.length;
    const latitude = members.reduce((sum, point) => sum + point.latitude, 0) / members.length;
    return (
      <MapMarker key={members.map((point) => point.id).join("/")} longitude={longitude} latitude={latitude}>
        <MarkerContent>
          <button type="button" className={`wrt-location-marker${clustered ? " wrt-location-marker--group" : ""}`}
            aria-pressed={!clustered && members[0].id === selectedId}
            aria-label={clustered ? `Zoom to ${members.length} nearby locations: ${members.map((point) => point.label).join(", ")}` : `Show ${members[0].label}`}
            title={`${formatNumber(total)} recorded plants${needsReview ? `; ${formatNumber(needsReview)} needing review` : ""}`}
            onClick={() => {
              if (!clustered) { onSelect(members[0].id); return; }
              const bounds = locationBounds(members);
              if (bounds && map) map.fitBounds(bounds, { padding: 80, maxZoom: 17,
                duration: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 450 });
            }}>
            <span className="tabular-nums">{compactPlantCount(total)}</span>
            {clustered && <span className="wrt-location-marker__places">{members.length} places</span>}
            {needsReview > 0 && <span className="wrt-location-marker__review" aria-label="Includes records needing review" />}
          </button>
        </MarkerContent>
      </MapMarker>
    );
  });
}

export function RegionMap({ locations, siteName }: { locations: MappedSiteLocation[]; siteName?: string }) {
  const selectId = useId();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = locations.find((location) => location.id === selectedId);
  const mapRef = useRef<HTMLDivElement>(null);
  // Bring the whole map on screen when a location is chosen, so its popover is never cut off by the page edge.
  useEffect(() => {
    if (!selectedId) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    mapRef.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [selectedId]);

  return (
    <div className="flex flex-col gap-4">
      <div className="wrt-location-picker">
        <label htmlFor={selectId}>Choose a location</label>
        <select id={selectId} className="wrt-select" value={selected?.id ?? ""}
          onChange={(event) => setSelectedId(event.target.value || null)}>
          <option value="">Show all reference locations</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.label} · {compactPlantCount(location.split.total)} recorded plants
            </option>
          ))}
        </select>
      </div>
      <div ref={mapRef} className="h-[320px] w-full scroll-my-24 overflow-hidden rounded-lg sm:h-[420px]"
        role="region" aria-label={siteName ? `Map of approximate locations at ${siteName}` : "Map of approximate planting site locations"}>
        <Map center={[168.75, -45.01]} zoom={10} theme="light">
          <MapFocus locations={locations} selected={selected} />
          <MapControls showFullscreen />
          <LocationMarkers key={locations.map((location) => location.id).join("/")} locations={locations} selectedId={selected?.id} onSelect={setSelectedId} />
          {selected && (
            <MapPopup key={selected.id} longitude={selected.longitude} latitude={selected.latitude}
              closeButton closeOnClick={false} focusAfterOpen={false} anchor="bottom" offset={26}
              onClose={() => setSelectedId(null)} className="wrt-mappop !max-w-none">
              <div className="wrt-mappop__body">
                <span className="wrt-mappop__eyebrow">{selected.countScope === "part" ? "Part of a site" : "Whole site"} · approximate</span>
                <h3 className="wrt-mappop__title">{selected.label}</h3>
                <p className="wrt-mappop__figure m-0">
                  <b className="tabular-nums">{formatNumber(selected.split.total)}</b>
                  <span>recorded plants</span>
                </p>
                {selected.split.needsReview > 0 && (
                  <>
                    <SplitBar split={selected.split} size="sm" />
                    <p className="wrt-mappop__split m-0 tabular-nums">
                      <span>{formatNumber(selected.split.resolved)} resolved</span>
                      <span className="is-review">{formatNumber(selected.split.needsReview)} need review</span>
                    </p>
                  </>
                )}
                {!siteName && <Link href={`/sites/${selected.siteSlug}`} className="wrt-mappop__go">View site history →</Link>}
              </div>
            </MapPopup>
          )}
        </Map>
      </div>
      <div aria-live="polite" aria-atomic="true">
        {selected ? (
          <div className="flex flex-col gap-2">
            <strong>{selected.label}</strong>
            <p className="wrt-prose m-0"><b className="tabular-nums">{formatNumber(selected.split.total)}</b> recorded plants · {selected.countScope === "part" ? "this part of the site" : "whole site"}</p>
            <SplitLine split={selected.split} />
            <p className="wrt-prose m-0">{selected.description}</p>
            <p className="wrt-muted m-0 tabular-nums">
              Approximate latitude: {selected.latitude.toFixed(4)} · longitude: {selected.longitude.toFixed(4)}
            </p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {!siteName && <Link href={`/sites/${selected.siteSlug}`} className="cn-link">View {selected.siteName} →</Link>}
              <a href={locationMapUrl(selected)} target="_blank" rel="noopener noreferrer" className="cn-link">Open in Google Maps ↗</a>
              <a href={selected.sourceUrl} target="_blank" rel="noopener noreferrer" className="cn-link">{selected.sourceLabel} ↗</a>
              {selected.coordinateSourceUrl !== selected.sourceUrl && (
                <a href={selected.coordinateSourceUrl} target="_blank" rel="noopener noreferrer" className="cn-link">Coordinate reference ↗</a>
              )}
            </div>
          </div>
        ) : (
          <p className="wrt-muted m-0">Select a marker or choose a location to see coordinates and sources. Click a group to zoom into nearby places.</p>
        )}
      </div>
    </div>
  );
}
