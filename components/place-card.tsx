"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  ExternalLink,
  MessageCircle,
  Zap,
  Check,
  FileText,
  Smartphone,
} from "lucide-react";
import clsx from "clsx";
import { twMerge } from "tailwind-merge";

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
  savedLead?: Lead;
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
  const currentStatus = savedLead?.status || "new";

  const handleStatusUpdate = async (
    newStatus: "new" | "contacted" | "sold"
  ) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("leads")
        .upsert(
          {
            place_id: place.place_id,
            name: place.name,
            city: "Unknown",
            category: "Unknown",
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

  // Logic to determine if "No Web" style applies (Social media counts as no professional web)
  const isSocialMedia = (url: string | null) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return (
      lower.includes("facebook") ||
      lower.includes("instagram") ||
      lower.includes("tiktok") ||
      lower.includes("twitter")
    );
  };

  const hasProfessionalWeb = place.website && !isSocialMedia(place.website);

  // Badge logic
  const renderWebBadge = () => {
    if (hasProfessionalWeb) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
          Con Sitio Web
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-100 text-red-700 border border-red-200">
        {place.website ? "Solo Red Social" : "Sin Sitio Web"}
      </span>
    );
  };

  return (
    <div className="h-full flex flex-col p-5 rounded-xl bg-white border border-gray-100 shadow-md hover:shadow-xl transition-all duration-300 group relative overflow-hidden">
      {/* Top Status Border/Line */}
      <div
        className={cnBase(
          "absolute top-0 left-0 w-full h-1",
          currentStatus === "sold"
            ? "bg-emerald-500"
            : currentStatus === "contacted"
            ? "bg-orange-400"
            : "bg-gray-200"
        )}
      ></div>

      <div className="flex justify-between items-start mb-3 mt-2">
        <div className="flex-1 min-w-0 pr-2">
          <h3
            className="font-bold text-gray-900 text-lg truncate leading-tight mb-1"
            title={place.name}
          >
            {place.name}
          </h3>
          {renderWebBadge()}
        </div>
        <div className="flex flex-col items-end gap-1">
          {/* CRM Status Badge */}
          <span
            className={cnBase(
              "px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider border",
              currentStatus === "new"
                ? "bg-gray-100 text-gray-500 border-gray-200"
                : currentStatus === "contacted"
                ? "bg-orange-50 text-orange-600 border-orange-200"
                : "bg-emerald-50 text-emerald-600 border-emerald-200"
            )}
          >
            {currentStatus === "new"
              ? "Nuevo"
              : currentStatus === "contacted"
              ? "Contactado"
              : "Vendido"}
          </span>
        </div>
      </div>

      <p className="text-gray-500 text-xs mb-5 line-clamp-2 min-h-[2.5em]">
        {place.address}
      </p>

      <div className="mt-auto space-y-3">
        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {/* WhatsApp Action */}
          {place.phone ? (
            <a
              href={`https://wa.me/${place.phone.replace(
                /[^0-9]/g,
                ""
              )}?text=${encodeURIComponent(
                `Hola ${place.name}, le saludamos de Rueda La Rola Media...`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                if (currentStatus === "new") handleStatusUpdate("contacted");
              }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-semibold transition-colors"
            >
              <MessageCircle size={14} /> Contactar
            </a>
          ) : (
            <button
              disabled
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 text-gray-300 border border-gray-100 rounded-lg text-xs font-semibold cursor-not-allowed"
            >
              <Smartphone size={14} /> No Phone
            </button>
          )}

          {/* Web Link or Disabled */}
          {place.website ? (
            <a
              href={place.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-colors truncate"
            >
              <ExternalLink size={14} /> Visitar
            </a>
          ) : (
            <div className="flex items-center justify-center gap-1.5 px-3 py-2 bg-gray-50 text-gray-400 border border-gray-100 rounded-lg text-xs font-semibold">
              <ExternalLink size={14} /> Offline
            </div>
          )}
        </div>

        <div className="border-t border-gray-100 pt-3 flex justify-between items-center">
          {/* Primary Magic Action */}
          {hasProfessionalWeb ? (
            <button
              onClick={() => onGenerate(place, "proposal")}
              className="flex items-center gap-2 text-gray-600 hover:text-orange-600 text-xs font-bold transition-all group-hover:translate-x-1"
            >
              <FileText size={14} className="text-orange-500" />
              Crear Propuesta (Audit)
            </button>
          ) : (
            <button
              onClick={() => onGenerate(place, "demo")}
              className="flex items-center gap-2 text-gray-600 hover:text-red-600 text-xs font-bold transition-all group-hover:translate-x-1"
            >
              <Zap size={14} className="text-red-500" />
              Generar Demo Web
            </button>
          )}

          {/* Quick Sold Toggle */}
          {currentStatus !== "sold" && (
            <button
              onClick={() => handleStatusUpdate("sold")}
              disabled={loading}
              className="text-gray-300 hover:text-emerald-500 transition-colors"
              title="Marcar como Vendido"
            >
              <Check size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
