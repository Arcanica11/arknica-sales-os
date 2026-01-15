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
  Kanban,
} from "lucide-react";
import * as Tabs from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";
import PlaceCard from "@/components/place-card";
import MapView from "@/components/map-view";
import { Place, Lead, Asset } from "@/lib/types";

export default function Dashboard() {
  const [city, setCity] = useState("");
  const [category, setCategory] = useState("");
  const [places, setPlaces] = useState<Place[]>([]);
  const [savedLeads, setSavedLeads] = useState<Lead[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]); // Estado para guardar los demos encontrados
  const [loading, setLoading] = useState(false);
  const [nextPageToken, setNextPageToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("list");
  const [generating, setGenerating] = useState<string | null>(null);

  const [filterMode, setFilterMode] = useState<"all" | "no-web" | "with-web">(
    "all"
  );

  useEffect(() => {
    fetchSavedLeads();
    fetchAssets(); // Cargamos los assets al iniciar
  }, []);

  const fetchSavedLeads = async () => {
    const { data } = await supabase
      .from("leads")
      .select("place_id, status, id, name, address, phone, website");
    if (data) setSavedLeads(data as Lead[]);
  };

  // Nueva función para traer los demos existentes
  const fetchAssets = async () => {
    const { data } = await supabase
      .from("generated_assets")
      .select("id, place_name, type");
    if (data) setAssets(data as Asset[]);
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
        fetchAssets(); // Refrescamos assets por si acaso
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

      if (data.id) {
        // Actualizamos la lista de assets localmente para que aparezca el botón "Ver Demo" sin recargar
        setAssets((prev) => [
          ...prev,
          { id: data.id, place_name: place.name, type },
        ]);

        if (type === "demo") {
          const url = `/demo/${data.id}`;
          const newWindow = window.open(url, "_blank");
          if (!newWindow)
            alert(`¡Demo lista! Permitir popups para abrir: ${url}`);
        } else {
          alert("Propuesta generada correctamente. ID: " + data.id);
        }

        // --- AUTO-SAVE LOGIC (Status: Contacted) ---
        // If lead is not already 'sold' or 'rejected', mark as 'contacted'
        const currentLead = savedLeads.find(
          (l) => l.place_id === place.place_id
        );
        if (!currentLead || currentLead.status === "new") {
          const newStatus = "contacted";

          // 1. Update Supabase
          const { error: dbError } = await supabase.from("leads").upsert(
            {
              place_id: place.place_id,
              name: place.name,
              address: place.address,
              phone: place.phone,
              website: place.website,
              status: newStatus,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "place_id" }
          );

          if (!dbError) {
            // 2. Update Local State (This triggers filtering)
            handleStatusChange(place.place_id, newStatus);
          } else {
            console.error("Auto-save failed", dbError);
          }
        }
      }
    } catch (error) {
      console.error("Generation failed", error);
      alert("Error generando asset. Intenta de nuevo.");
    } finally {
      setGenerating(null);
    }
  };

  const handleStatusChange = (
    placeId: string,
    newStatus: "new" | "contacted" | "sold" | "rejected"
  ) => {
    setSavedLeads((prev) => {
      const exists = prev.find((l) => l.place_id === placeId);
      if (exists) {
        return prev.map((l) =>
          l.place_id === placeId ? { ...l, status: newStatus } : l
        );
      }

      // If adding new, try to find full details from 'places' state to store in 'savedLeads'
      const placeDetails = places.find((p) => p.place_id === placeId);
      const newLead: Lead = {
        place_id: placeId,
        status: newStatus,
        name: placeDetails?.name,
        address: placeDetails?.address,
        phone: placeDetails?.phone || undefined,
        website: placeDetails?.website,
      };
      return [...prev, newLead];
    });
  };

  const isSocialMedia = (url: string | null) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    const socialDomains = ["facebook", "instagram", "tiktok", "twitter"];
    return socialDomains.some((domain) => lower.includes(domain));
  };

  const filteredPlaces = places.filter((place) => {
    // 1. Smart Filter: Exclude if already in pipeline (contacted, sold, rejected)
    const saved = savedLeads.find((l) => l.place_id === place.place_id);
    if (saved && ["contacted", "sold", "rejected"].includes(saved.status)) {
      return false;
    }

    const hasEffectiveWebsite = place.website && !isSocialMedia(place.website);
    if (filterMode === "no-web")
      return !place.website || isSocialMedia(place.website);
    if (filterMode === "with-web") return hasEffectiveWebsite;
    return true;
  });

  const countNoWeb = places.filter(
    (p) => !p.website || isSocialMedia(p.website)
  ).length;
  const countWithWeb = places.filter(
    (p) => p.website && !isSocialMedia(p.website)
  ).length;

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 font-sans">
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

      <div className="max-w-7xl mx-auto p-6 md:p-8 space-y-8">
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
                placeholder="Ej. Restaurantes, Dentistas..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 font-medium focus:ring-2 focus:ring-orange-200 focus:outline-none transition-all"
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
                placeholder="Ej. Madrid, Bogotá..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 text-gray-900 font-medium focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
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
                <LayoutGrid size={18} /> Resultados ({places.length})
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
                <MapIcon size={18} /> Explorar Mapa
              </Tabs.Trigger>
              <Tabs.Trigger
                value="pipeline"
                className={cn(
                  "px-5 py-2.5 rounded-t-lg font-semibold text-sm flex items-center gap-2 transition-all border-b-2",
                  activeTab === "pipeline"
                    ? "border-purple-500 text-purple-600 bg-purple-50/50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                )}
              >
                <Kanban size={18} /> Mi Gestión
              </Tabs.Trigger>
            </Tabs.List>

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
            className="space-y-8 focus:outline-none min-h-[500px]"
          >
            <div className="flex flex-col bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm divide-y divide-gray-100">
              {filteredPlaces.length === 0 && !loading && (
                <div className="p-12 text-center text-gray-400">
                  <p>No hay resultados para mostrar.</p>
                </div>
              )}
              {filteredPlaces.map((place) => {
                // Buscamos si ya existen demos O propuestas separadamente
                const demoAsset = assets.find(
                  (a) => a.place_name === place.name && a.type === "demo"
                );
                const proposalAsset = assets.find(
                  (a) => a.place_name === place.name && a.type === "proposal"
                );

                return (
                  <PlaceCard
                    key={place.place_id}
                    place={place}
                    savedLead={savedLeads.find(
                      (l) => l.place_id === place.place_id
                    )}
                    demoId={demoAsset?.id}
                    proposalId={proposalAsset?.id}
                    isGenerating={generating === place.place_id}
                    searchCity={city}
                    onStatusChange={handleStatusChange}
                    onGenerate={handleGenerate}
                  />
                );
              })}
            </div>

            {places.length > 0 && nextPageToken && (
              <div className="flex justify-center w-full pt-4">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-8 py-3 bg-white border border-gray-300 text-gray-600 hover:text-gray-900 hover:border-gray-400 rounded-full font-bold flex items-center gap-2 transition-all shadow-sm"
                >
                  {loading ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <RefreshCw size={18} />
                  )}
                  Cargar Más Resultados
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

          <Tabs.Content
            value="pipeline"
            className="focus:outline-none min-h-[500px]"
          >
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Columna Contactados */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 pb-2 border-b-2 border-orange-200">
                  <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                  <h3 className="font-bold text-gray-700">
                    Propuestas Enviadas
                  </h3>
                  <span className="ml-auto bg-gray-100 px-2 py-0.5 rounded text-xs font-bold text-gray-600">
                    {savedLeads.filter((l) => l.status === "contacted").length}
                  </span>
                </div>
                <div className="space-y-4">
                  {savedLeads
                    .filter((l) => l.status === "contacted")
                    .map((lead) => {
                      // Reconsturir objeto Place para reutilizar PlaceCard
                      const place: Place = {
                        place_id: lead.place_id,
                        name: lead.name || "Sin nombre",
                        address: lead.address || "",
                        website: lead.website || null,
                        phone: lead.phone || null,
                        location: { latitude: 0, longitude: 0 },
                      };

                      const demoAsset = assets.find(
                        (a) => a.place_name === lead.name && a.type === "demo"
                      );
                      const proposalAsset = assets.find(
                        (a) =>
                          a.place_name === lead.name && a.type === "proposal"
                      );

                      return (
                        <div
                          key={lead.place_id}
                          className="border border-gray-200 rounded-xl overflow-hidden shadow-sm"
                        >
                          <PlaceCard
                            place={place}
                            savedLead={lead}
                            demoId={demoAsset?.id}
                            proposalId={proposalAsset?.id}
                            isGenerating={generating === lead.place_id}
                            onStatusChange={handleStatusChange}
                            onGenerate={handleGenerate}
                          />
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Columna Vendidos */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 pb-2 border-b-2 border-emerald-200">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <h3 className="font-bold text-gray-700">Clientes Ganados</h3>
                  <span className="ml-auto bg-gray-100 px-2 py-0.5 rounded text-xs font-bold text-gray-600">
                    {savedLeads.filter((l) => l.status === "sold").length}
                  </span>
                </div>
                <div className="space-y-4">
                  {savedLeads
                    .filter((l) => l.status === "sold")
                    .map((lead) => {
                      const place: Place = {
                        place_id: lead.place_id,
                        name: lead.name || "Sin nombre",
                        address: lead.address || "",
                        website: lead.website || null,
                        phone: lead.phone || null,
                        location: { latitude: 0, longitude: 0 },
                      };
                      const demoAsset = assets.find(
                        (a) => a.place_name === lead.name && a.type === "demo"
                      );
                      const proposalAsset = assets.find(
                        (a) =>
                          a.place_name === lead.name && a.type === "proposal"
                      );
                      return (
                        <div
                          key={lead.place_id}
                          className="border border-gray-200 rounded-xl overflow-hidden shadow-sm opacity-90 hover:opacity-100 transition-opacity"
                        >
                          <PlaceCard
                            place={place}
                            savedLead={lead}
                            demoId={demoAsset?.id}
                            proposalId={proposalAsset?.id}
                            isGenerating={generating === lead.place_id}
                            onStatusChange={handleStatusChange}
                            onGenerate={handleGenerate}
                          />
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* Columna Descartados */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 pb-2 border-b-2 border-red-200">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <h3 className="font-bold text-gray-700">Descartados</h3>
                  <span className="ml-auto bg-gray-100 px-2 py-0.5 rounded text-xs font-bold text-gray-600">
                    {savedLeads.filter((l) => l.status === "rejected").length}
                  </span>
                </div>
                <div className="space-y-4">
                  {savedLeads
                    .filter((l) => l.status === "rejected")
                    .map((lead) => {
                      const place: Place = {
                        place_id: lead.place_id,
                        name: lead.name || "Sin nombre",
                        address: lead.address || "",
                        website: lead.website || null,
                        phone: lead.phone || null,
                        location: { latitude: 0, longitude: 0 },
                      };
                      const demoAsset = assets.find(
                        (a) => a.place_name === lead.name && a.type === "demo"
                      );
                      const proposalAsset = assets.find(
                        (a) =>
                          a.place_name === lead.name && a.type === "proposal"
                      );
                      return (
                        <div
                          key={lead.place_id}
                          className="border border-gray-200 rounded-xl overflow-hidden shadow-sm grayscale opacity-60 hover:grayscale-0 hover:opacity-100 transition-all"
                        >
                          <PlaceCard
                            place={place}
                            savedLead={lead}
                            demoId={demoAsset?.id}
                            proposalId={proposalAsset?.id}
                            isGenerating={generating === lead.place_id}
                            onStatusChange={handleStatusChange}
                            onGenerate={handleGenerate}
                          />
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </Tabs.Content>
        </Tabs.Root>
      </div>
    </main>
  );
}
