"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  ExternalLink,
  MessageCircle,
  Zap,
  Check,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

// Helper for classes if lib/utils doesn't exist yet (just in case)
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

interface PlaceCardProps {
  place: Place;
  savedLead?: Lead; // Lead from Supabase if exists
  onStatusChange: (
    placeId: string,
    newStatus: "new" | "contacted" | "sold"
  ) => void;
  onGenerate: (place: Place, type: "demo" | "proposal") => void;
}

export default function PlaceCard({
  place,
  savedLead,
  onStatusChange,
  onGenerate,
}: PlaceCardProps) {
  const [loading, setLoading] = useState(false);

  // Status logic: savedLead.status or 'new'
  const currentStatus = savedLead?.status || "new";

  const handleStatusUpdate = async (
    newStatus: "new" | "contacted" | "sold"
  ) => {
    setLoading(true);
    try {
      // Upsert lead
      const { data, error } = await supabase
        .from("leads")
        .upsert(
          {
            place_id: place.place_id,
            name: place.name,
            city: "Unknown", // We might need to pass this or extract it, for now 'Unknown' or derived
            category: "Unknown", // Same
            status: newStatus,
            website: place.website,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "place_id" }
        )
        .select()
        .single();

      if (!error) {
        onStatusChange(place.place_id, newStatus);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    new: "bg-slate-700 text-slate-300 border-slate-600",
    contacted: "bg-yellow-900/30 text-yellow-400 border-yellow-700/50",
    sold: "bg-green-900/30 text-green-400 border-green-700/50",
  };

  const statusLabels = {
    new: "⚪ Nuevo",
    contacted: "🟡 Contactado",
    sold: "🟢 Vendido",
  };

  return (
    <div
      className={cnBase(
        "p-4 rounded-xl border transition-all duration-300 backdrop-blur-sm group hover:border-cyan-500/50",
        currentStatus === "sold"
          ? "bg-green-950/10 border-green-900/30"
          : "bg-slate-900/50 border-slate-800"
      )}
    >
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-bold text-white text-lg truncate">
              {place.name}
            </h3>
            <span
              className={cnBase(
                "text-xs px-2 py-0.5 rounded-full border",
                statusColors[currentStatus]
              )}
            >
              {statusLabels[currentStatus]}
            </span>
          </div>
          <p className="text-slate-400 text-sm mb-2 truncate">
            {place.address}
          </p>

          <div className="flex flex-wrap gap-2 mt-3">
            {/* WhatsApp Action */}
            {place.phone && (
              <a
                href={`https://wa.me/${place.phone.replace(
                  /[^0-9]/g,
                  ""
                )}?text=${encodeURIComponent(
                  `Hola ${place.name}, vi su negocio en Google Maps y me gustaría hacerles una propuesta de mejora digital.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  if (currentStatus === "new") handleStatusUpdate("contacted");
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 hover:bg-green-600/30 text-green-400 border border-green-600/30 rounded-lg text-xs font-medium transition-colors"
              >
                <MessageCircle size={14} /> WhatsApp
              </a>
            )}

            {/* Website Action */}
            {place.website && (
              <a
                href={place.website}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-600/30 rounded-lg text-xs font-medium transition-colors"
              >
                <ExternalLink size={14} /> Web
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-2 items-end">
          {/* Primary Generation Action */}
          {place.website ? (
            <button
              onClick={() => onGenerate(place, "proposal")}
              className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-lg hover:shadow-cyan-500/20"
            >
              <FileText size={14} /> PROPUESTA
            </button>
          ) : (
            <button
              onClick={() => onGenerate(place, "demo")}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-3 py-2 rounded-lg text-xs font-bold transition-all shadow-lg shadow-red-900/20 hover:shadow-red-500/40"
            >
              <Zap size={14} /> CREAR DEMO
            </button>
          )}

          {/* Quick Status Toggle (Sold) */}
          {currentStatus !== "sold" && (
            <button
              onClick={() => handleStatusUpdate("sold")}
              disabled={loading}
              className="text-xs text-slate-500 hover:text-green-400 flex items-center gap-1 transition-colors mt-2"
            >
              <Check size={12} /> Marcar Vendido
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
