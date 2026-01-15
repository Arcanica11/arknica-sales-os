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
    return ["facebook", "instagram", "tiktok", "twitter"].some((social) =>
      lower.includes(social)
    );
  };

  const hasProfessionalWeb = place.website && !isSocialMedia(place.website);

  return (
    <div
      className={cn(
        "flex flex-row items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors h-[80px] group",
        currentStatus === "sold" && "bg-emerald-50/50"
      )}
    >
      {/* Left: Info */}
      <div className="flex flex-col justify-center min-w-0 flex-1 pr-6">
        <div className="flex items-center gap-3">
          <h3
            className="font-bold text-gray-900 text-sm truncate"
            title={place.name}
          >
            {place.name}
          </h3>
          {place.phone && (
            <span className="text-[10px] text-gray-400 font-mono hidden sm:inline">
              {place.phone}
            </span>
          )}
        </div>
        <p
          className="text-gray-500 text-xs truncate mt-0.5"
          title={place.address}
        >
          {place.address}
        </p>
      </div>

      {/* Center: Badges */}
      <div className="flex items-center gap-3 mr-6 shrink-0">
        {/* Web Badge */}
        {hasProfessionalWeb ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
            WEB OK
          </span>
        ) : (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200">
            {place.website ? "SOCIAL" : "NO WEB"}
          </span>
        )}

        {/* CRM Status Badge */}
        <span
          className={cn(
            "px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider border",
            currentStatus === "new"
              ? "bg-gray-100 text-gray-500 border-gray-200"
              : currentStatus === "contacted"
              ? "bg-orange-50 text-orange-600 border-orange-200"
              : "bg-emerald-50 text-emerald-600 border-emerald-200"
          )}
        >
          {currentStatus === "new"
            ? "NUEVO"
            : currentStatus === "contacted"
            ? "CONTACTADO"
            : "VENDIDO"}
        </span>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* WhatsApp */}
        {place.phone && (
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
            className="h-8 w-8 flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition-colors"
            title="WhatsApp"
          >
            <MessageCircle size={16} />
          </a>
        )}

        {/* Web Link */}
        {place.website ? (
          <a
            href={place.website}
            target="_blank"
            rel="noopener noreferrer"
            className="h-8 w-8 flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg transition-colors"
            title="Visitar Web"
          >
            <ExternalLink size={16} />
          </a>
        ) : (
          <div className="h-8 w-8 flex items-center justify-center bg-gray-50 text-gray-300 border border-gray-100 rounded-lg cursor-not-allowed">
            <ExternalLink size={16} />
          </div>
        )}

        <div className="w-px h-6 bg-gray-200 mx-1"></div>

        {/* Primary Magic Action */}
        {hasProfessionalWeb ? (
          <button
            onClick={() => onGenerate(place, "proposal")}
            className="h-8 px-3 flex items-center gap-2 bg-white hover:bg-gray-50 border border-gray-200 hover:border-orange-300 text-gray-600 hover:text-orange-600 rounded-lg text-xs font-bold transition-all shadow-sm"
          >
            <FileText size={14} className="text-orange-500" />
            <span className="hidden lg:inline">Audit</span>
          </button>
        ) : (
          <button
            onClick={() => onGenerate(place, "demo")}
            className="h-8 px-3 flex items-center gap-2 bg-red-600 hover:bg-red-500 border border-red-500 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
          >
            <Zap size={14} className="fill-white" />
            <span className="hidden lg:inline">Demo</span>
          </button>
        )}

        {/* Quick Sold Checkbox-style */}
        <button
          onClick={() =>
            handleStatusUpdate(currentStatus === "sold" ? "contacted" : "sold")
          }
          disabled={loading}
          className={cn(
            "h-8 w-8 flex items-center justify-center rounded-lg border transition-colors ml-1",
            currentStatus === "sold"
              ? "bg-emerald-500 border-emerald-600 text-white"
              : "bg-white border-gray-200 text-gray-300 hover:border-emerald-400 hover:text-emerald-400"
          )}
          title={
            currentStatus === "sold" ? "Desmarcar Vendido" : "Marcar Vendido"
          }
        >
          <Check size={16} />
        </button>
      </div>
    </div>
  );
}
