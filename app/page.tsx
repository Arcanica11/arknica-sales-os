"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import {
  Search,
  MapPin,
  Briefcase,
  LayoutGrid,
  Map as MapIcon,
  RefreshCw,
  Loader2,
  Globe,
  WifiOff,
} from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";
import PlaceCard from "@/components/place-card";
import MapView from "@/components/map-view";

// Helper for classes
function cnBase(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

interface Place {
  place_id: string;
  name: string;
  address: string;
  website: string | null;
  phone: string | null;
  location: { latitude: number; longitude: number };
}

interface Lead {
  place_id: string;
  status: "new" | "contacted" | "sold";
  id?: string;
}

export default function Dashboard() {
  // State
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [savedLeads, setSavedLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("list");
  const [generating, setGenerating] = useState<string | null>(null);

  // Filter State
  const [filterMode, setFilterMode] = useState<"all" | "no-web" | "with-web">(
    "all"
  );

  // Initial Load of Saved Leads
  useEffect(() => {
    fetchSavedLeads();
  }, []);

  const fetchSavedLeads = async () => {
    const { data } = await supabase
      .from("leads")
      .select("place_id, status, id");
    if (data) {
      setSavedLeads(data as Lead[]); // Cast for safety
    }
  };

  const handleSearch = async (
    e?: React.FormEvent,
    token?: string | null,
    lat?: number,
    lng?: number
  ) => {
    if (e) e.preventDefault();
    setLoading(true);

    try {
      let url = `/api/places?category=${encodeURIComponent(category)}`;

      if (lat && lng) {
        url += `&lat=${lat}&lng=${lng}`;
      } else if (city) {
        url += `&city=${encodeURIComponent(city)}`;
      }

      if (token) {
        url += `&pageToken=${encodeURIComponent(token)}`;
      }

      const res = await fetch(url);
      const data = await res.json();

      if (data.results) {
        if (token) {
          setPlaces((prev) => [...prev, ...data.results]);
        } else {
          setPlaces(data.results);
        }
        setNextPageToken(data.nextPageToken || null);
        fetchSavedLeads();
      }
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (nextPageToken) {
      handleSearch(undefined, nextPageToken);
    }
  };

  const handleAreaSearch = (center: { lat: number; lng: number }) => {
    handleSearch(undefined, null, center.lat, center.lng);
  };

  const handleGenerate = async (place: Place, type: "demo" | "proposal") => {
    setGenerating(place.place_id);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placeName: place.name,
          placeAddress: place.address,
          type,
          website: place.website,
        }),
      });
      const data = await res.json();
      if (data.id && type === "demo") {
        window.open(`/demo/${data.id}`, "_blank");
      } else {
        alert("Asset Generado! ID: " + data.id);
      }
    } catch (error) {
      console.error("Generation failed", error);
      alert("Error generando asset");
    } finally {
      setGenerating(null);
    }
  };

  const handleStatusChange = (
    placeId: string,
    newStatus: "new" | "contacted" | "sold"
  ) => {
    setSavedLeads((prev) => {
      const exists = prev.find((l) => l.place_id === placeId);
      if (exists) {
        return prev.map((l) =>
          l.place_id === placeId ? { ...l, status: newStatus } : l
        );
      }
      return [...prev, { place_id: placeId, status: newStatus }];
    });
  };

  // Filter Logic
  const filteredPlaces = places.filter((place) => {
    if (filterMode === "no-web") return !place.website;
    if (filterMode === "with-web") return !!place.website;
    return true;
  });

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-cyan-500/30">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-600 drop-shadow-sm">
              RUEDA LA ROLA{" "}
              <span className="text-slate-100 not-italic">MEDIA</span>
            </h1>
            <p className="text-slate-500 text-xs tracking-widest uppercase font-bold">
              Lead Command Center
            </p>
          </div>
          <div className="flex items-center gap-4">
            <button className="p-2 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors">
              <div className="w-5 h-5 bg-gradient-to-tr from-cyan-400 to-blue-500 rounded-full"></div>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
        {/* Search Panel */}
        <section className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl">
          <form
            onSubmit={(e) => handleSearch(e)}
            className="grid grid-cols-1 md:grid-cols-12 gap-4"
          >
            <div className="md:col-span-5 space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Briefcase className="w-3 h-3" /> Rubro / Categoría
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ej. Restaurantes, Dentistas, Hoteles..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all font-medium"
              />
            </div>
            <div className="md:col-span-4 space-y-1">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <MapPin className="w-3 h-3" /> Ciudad Inicial
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ej. Madrid, Medellín, CDMX..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all font-medium"
              />
            </div>
            <div className="md:col-span-3 flex items-end">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[50px] bg-gradient-to-br from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-orange-500/20 active:scale-95 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin" /> : <Search />}
                BUSCAR LEADS
              </button>
            </div>
          </form>
        </section>

        {/* content Area with Tabs */}
        <Tabs.Root
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col gap-6"
        >
          <div className="flex flex-col md:flex-row md:justify-between md:items-center border-b border-slate-800 pb-2 gap-4">
            <Tabs.List className="flex gap-2">
              <Tabs.Trigger
                value="list"
                className={cnBase(
                  "px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all",
                  activeTab === "list"
                    ? "bg-slate-800 text-white shadow-lg"
                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-900"
                )}
              >
                <LayoutGrid size={16} /> VISTA LISTA
              </Tabs.Trigger>
              <Tabs.Trigger
                value="map"
                className={cnBase(
                  "px-6 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-all",
                  activeTab === "map"
                    ? "bg-slate-800 text-white shadow-lg"
                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-900"
                )}
              >
                <MapIcon size={16} /> VISTA MAPA
              </Tabs.Trigger>
            </Tabs.List>

            {/* Filter Pills */}
            <div className="flex bg-slate-900 p-1 rounded-lg">
              <button
                onClick={() => setFilterMode("all")}
                className={cnBase(
                  "px-3 py-1.5 text-xs font-bold rounded-md transition-colors",
                  filterMode === "all"
                    ? "bg-slate-700 text-white shadow"
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                Todos
              </button>
              <button
                onClick={() => setFilterMode("no-web")}
                className={cnBase(
                  "px-3 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center gap-1",
                  filterMode === "no-web"
                    ? "bg-red-500/20 text-red-400 shadow"
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                <WifiOff size={12} /> Sin Sitio Web
              </button>
              <button
                onClick={() => setFilterMode("with-web")}
                className={cnBase(
                  "px-3 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center gap-1",
                  filterMode === "with-web"
                    ? "bg-green-500/20 text-green-400 shadow"
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                <Globe size={12} /> Con Sitio Web
              </button>
            </div>
          </div>

          <Tabs.Content value="list" className="space-y-4 focus:outline-none">
            {places.length === 0 && !loading && (
              <div className="text-center py-20 text-slate-600">
                <p>Define tus parámetros y busca leads potenciales.</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
              {filteredPlaces.map((place) => (
                <PlaceCard
                  key={place.place_id}
                  place={place}
                  savedLead={savedLeads.find(
                    (l) => l.place_id === place.place_id
                  )}
                  onStatusChange={handleStatusChange}
                  onGenerate={handleGenerate}
                />
              ))}
            </div>

            {places.length > 0 && nextPageToken && (
              <div className="flex justify-center pt-8 pb-12 w-full">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="w-full py-4 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900 hover:border-slate-700 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <RefreshCw />
                  )}
                  ⬇ Cargar 20 Resultados Más
                </button>
              </div>
            )}
          </Tabs.Content>

          <Tabs.Content value="map" className="focus:outline-none h-[600px]">
            <MapView
              apiKey={
                process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
                process.env.NEXT_PUBLIC_MAPS_API_KEY ||
                ""
              }
              places={filteredPlaces} // Use filtered places in map too? Usually yes if consistent.
              onGenerate={handleGenerate}
              onSearchArea={handleAreaSearch}
            />
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </main>
  );
}
