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
import PlaceCard from "@/components/place-card";
import MapView from "@/components/map-view";

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
      setSavedLeads(data as Lead[]);
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

        // Refresh leads status slightly after result change to ensure sync if needed,
        // though strictly not necessary if we use the savedLeads state properly.
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

  // Improved Logic
  const isSocialMedia = (url: string | null) => {
    if (!url) return false;
    return ["facebook", "instagram", "tiktok", "twitter"].some((social) =>
      url.toLowerCase().includes(social)
    );
  };

  // Filter Logic
  const filteredPlaces = places.filter((place) => {
    const hasEffectiveWebsite = place.website && !isSocialMedia(place.website);

    if (filterMode === "no-web") {
      return !place.website || isSocialMedia(place.website);
    }
    if (filterMode === "with-web") {
      return hasEffectiveWebsite;
    }
    return true;
  });

  // Counters
  const countNoWeb = places.filter(
    (p) => !p.website || isSocialMedia(p.website)
  ).length;
  const countWithWeb = places.filter(
    (p) => p.website && !isSocialMedia(p.website)
  ).length;

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              RUEDA LA ROLA{" "}
              <span className="text-orange-600 font-normal">MEDIA</span>
            </h1>
            <p className="text-gray-500 text-xs tracking-wider uppercase font-semibold mt-0.5">
              Lead Command Center
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              System Active
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-6">
        {/* Search Panel */}
        <section className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <form
            onSubmit={(e) => handleSearch(e)}
            className="grid grid-cols-1 md:grid-cols-12 gap-6 items-end"
          >
            <div className="md:col-span-5 space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-orange-600" /> Rubro /
                Categoría
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ej. Restaurantes, Dentistas, Abogados..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none transition-all font-medium"
              />
            </div>
            <div className="md:col-span-4 space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" /> Ciudad Inicial
              </label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="Ej. Madrid, Bogotá, CDMX..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 placeholder:text-gray-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all font-medium"
              />
            </div>
            <div className="md:col-span-3">
              <button
                type="submit"
                disabled={loading}
                className="w-full h-[50px] bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-lg transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {loading ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Search className="w-5 h-5" />
                )}
                BUSCAR
              </button>
            </div>
          </form>
        </section>

        {/* Content Area with Tabs */}
        <Tabs.Root
          value={activeTab}
          onValueChange={setActiveTab}
          className="flex flex-col gap-6"
        >
          <div className="flex flex-col md:flex-row md:justify-between md:items-end border-b border-gray-200 pb-1 gap-4">
            <Tabs.List className="flex gap-1">
              <Tabs.Trigger
                value="list"
                className={cn(
                  "px-5 py-2.5 rounded-t-lg font-semibold text-sm flex items-center gap-2 transition-all border-b-2",
                  activeTab === "list"
                    ? "border-orange-500 text-orange-600 bg-orange-50/50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                )}
              >
                <LayoutGrid size={18} /> Lista ({places.length})
              </Tabs.Trigger>
              <Tabs.Trigger
                value="map"
                className={cn(
                  "px-5 py-2.5 rounded-t-lg font-semibold text-sm flex items-center gap-2 transition-all border-b-2",
                  activeTab === "map"
                    ? "border-blue-500 text-blue-600 bg-blue-50/50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                )}
              >
                <MapIcon size={18} /> Mapa
              </Tabs.Trigger>
            </Tabs.List>

            {/* Filter Pills with Counters */}
            <div className="flex bg-white p-1 rounded-lg border border-gray-200 shadow-sm mb-2">
              <button
                onClick={() => setFilterMode("all")}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-md transition-colors",
                  filterMode === "all"
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                Todos ({places.length})
              </button>
              <button
                onClick={() => setFilterMode("no-web")}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center gap-1.5",
                  filterMode === "no-web"
                    ? "bg-red-50 text-red-600 ring-1 ring-red-200"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <WifiOff size={14} /> Sin Web ({countNoWeb})
              </button>
              <button
                onClick={() => setFilterMode("with-web")}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-md transition-colors flex items-center gap-1.5",
                  filterMode === "with-web"
                    ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200"
                    : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Globe size={14} /> Con Web ({countWithWeb})
              </button>
            </div>
          </div>

          <Tabs.Content
            value="list"
            className="space-y-4 focus:outline-none min-h-[500px]"
          >
            {places.length === 0 && !loading && (
              <div className="flex flex-col items-center justify-center h-64 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                <Search className="w-12 h-12 mb-4 opacity-20" />
                <p className="font-medium">
                  Define rubro y ciudad para comenzar la búsqueda
                </p>
              </div>
            )}

            {/* List Container Fixed */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col divide-y divide-gray-100 shadow-sm">
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
              <div className="flex justify-center w-full pt-4 pb-12">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="w-full max-w-md py-3 border border-gray-200 bg-white text-gray-500 hover:text-gray-900 hover:bg-gray-50 hover:border-gray-300 rounded-xl font-bold flex items-center justify-center gap-3 transition-all shadow-sm text-sm"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" size={16} />
                  ) : (
                    <RefreshCw size={16} />
                  )}
                  Cargar 20 Resultados Más
                </button>
              </div>
            )}
          </Tabs.Content>

          <Tabs.Content
            value="map"
            className="focus:outline-none h-[600px] border border-gray-200 rounded-xl shadow-sm overflow-hidden"
          >
            <MapView
              apiKey={
                process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
                process.env.NEXT_PUBLIC_MAPS_API_KEY ||
                ""
              }
              places={filteredPlaces}
              onGenerate={handleGenerate}
              onSearchArea={handleAreaSearch}
            />
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </main>
  );
}
