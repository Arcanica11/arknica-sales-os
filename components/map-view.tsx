"use client";

import { useState, useCallback, useEffect } from "react";
import {
  APIProvider,
  Map,
  AdvancedMarker,
  Pin,
  InfoWindow,
  useMap,
} from "@vis.gl/react-google-maps";
import { Target, Zap, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
// Assuming clsx is available or I use standard class strings.
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

function cnBase(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface MapViewProps {
  apiKey: string;
  places: any[]; // Using any for speed, but ideally typed
  onGenerate: (place: any, type: "demo" | "proposal") => void;
  onSearchArea: (center: { lat: number; lng: number }) => void;
}

export default function MapView({
  apiKey,
  places,
  onGenerate,
  onSearchArea,
}: MapViewProps) {
  // We need a wrapper to use useMap hook or just handle it inside.
  // We can't use useMap outside of APIProvider.
  // So we'll limit the "Search Area" button to be inside a sub-component or just overlay it and manage via state if possible?
  // Actually, standard pattern is to put the button as a sibling or child and use useMap.

  return (
    <div className="w-full h-[600px] rounded-xl overflow-hidden border border-slate-800 shadow-2xl relative">
      <APIProvider apiKey={apiKey}>
        <MapContent
          places={places}
          onGenerate={onGenerate}
          onSearchArea={onSearchArea}
        />
      </APIProvider>
    </div>
  );
}

function MapContent({
  places,
  onGenerate,
  onSearchArea,
}: Omit<MapViewProps, "apiKey">) {
  const map = useMap();
  const [selectedPlace, setSelectedPlace] = useState<any>(null);
  const [center, setCenter] = useState({ lat: 25.7617, lng: -80.1918 }); // Default Miami

  useEffect(() => {
    if (places.length > 0 && places[0].location) {
      setCenter({
        lat: places[0].location.latitude,
        lng: places[0].location.longitude,
      });
    }
  }, [places]);

  const handleSearchThisArea = () => {
    if (!map) return;
    const c = map.getCenter();
    if (c) {
      const lat = c.lat();
      const lng = c.lng();
      onSearchArea({ lat, lng });
    }
  };

  return (
    <>
      <Map
        defaultCenter={center}
        center={center}
        onCameraChanged={(ev) => setCenter(ev.detail.center)}
        defaultZoom={13}
        mapId={process.env.NEXT_PUBLIC_MAP_ID || "DEMO_MAP_ID"} // Required for AdvancedMarker
        className="w-full h-full"
        disableDefaultUI={true}
        gestureHandling={"greedy"}
      >
        {places.map(
          (place) =>
            place.location && (
              <AdvancedMarker
                key={place.place_id}
                position={{
                  lat: place.location.latitude,
                  lng: place.location.longitude,
                }}
                onClick={() => setSelectedPlace(place)}
              >
                <Pin
                  background={place.website ? "#22c55e" : "#ef4444"}
                  borderColor={"#0f172a"}
                  glyphColor={"#fff"}
                />
              </AdvancedMarker>
            )
        )}

        {selectedPlace && selectedPlace.location && (
          <InfoWindow
            position={{
              lat: selectedPlace.location.latitude,
              lng: selectedPlace.location.longitude,
            }}
            onCloseClick={() => setSelectedPlace(null)}
            maxWidth={200}
          >
            <div className="p-2 text-slate-900">
              <h3 className="font-bold text-sm mb-1">{selectedPlace.name}</h3>
              <p className="text-xs text-slate-600 mb-2">
                {selectedPlace.address}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() =>
                    onGenerate(
                      selectedPlace,
                      selectedPlace.website ? "proposal" : "demo"
                    )
                  }
                  className={cnBase(
                    "w-full py-1.5 px-3 rounded text-xs font-bold text-white flex items-center justify-center gap-1",
                    selectedPlace.website ? "bg-slate-800" : "bg-red-600"
                  )}
                >
                  {selectedPlace.website ? (
                    <FileText size={12} />
                  ) : (
                    <Zap size={12} />
                  )}
                  {selectedPlace.website ? "Propuesta" : "Demo"}
                </button>
              </div>
            </div>
          </InfoWindow>
        )}
      </Map>

      {/* Floating Action Button */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
        <button
          onClick={handleSearchThisArea}
          className="bg-white/90 hover:bg-white text-slate-900 px-4 py-2 rounded-full font-bold shadow-lg backdrop-blur flex items-center gap-2 transform transition-transform hover:scale-105 active:scale-95 text-sm"
        >
          <Target className="w-4 h-4 text-cyan-600" />
          Buscar en esta zona
        </button>
      </div>
    </>
  );
}
