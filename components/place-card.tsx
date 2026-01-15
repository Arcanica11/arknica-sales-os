"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import {
  ExternalLink,
  MessageCircle,
  Zap,
  Check,
  FileText,
  Loader2,
  Eye,
  MapPin, // Importamos el icono del mapa
} from "lucide-react";

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
  existingAssetId?: string;
  existingAssetType?: "demo" | "proposal";
  isGenerating: boolean;
  onStatusChange: (
    placeId: string,
    newStatus: "new" | "contacted" | "sold"
  ) => void;
  onGenerate: (place: Place, type: "demo" | "proposal") => void;
}

export default function PlaceCard({
  place,
  savedLead,
  existingAssetId,
  existingAssetType,
  isGenerating,
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
      const { error } = await supabase
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

  // URL para buscar en Google Maps externo
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    place.name + " " + place.address
  )}`;

  return (
    <div className="w-full flex flex-col md:flex-row md:items-center justify-between p-4 bg-white border-b border-gray-100 hover:bg-gray-50 transition-colors gap-4 group">
      {/* IZQUIERDA: Info del Negocio */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-bold text-gray-900 text-base truncate">
            {place.name}
          </h3>
          {hasProfessionalWeb ? (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 uppercase tracking-wide">
              Con Web
            </span>
          ) : (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-700 border border-red-200 uppercase tracking-wide">
              {place.website ? "Solo Red Social" : "Sin Sitio Web"}
            </span>
          )}
        </div>
        <p className="text-gray-500 text-xs truncate max-w-md">
          {place.address}
        </p>
      </div>

      {/* CENTRO: Estado CRM */}
      <div className="flex items-center gap-2">
        <span
          className={cn(
            "px-2 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider border min-w-[80px] text-center",
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

      {/* DERECHA: Acciones */}
      <div className="flex items-center gap-2 mt-2 md:mt-0">
        {/* 1. WhatsApp */}
        {place.phone && (
          <a
            href={`https://wa.me/${place.phone.replace(/[^0-9]/g, "")}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              if (currentStatus === "new") handleStatusUpdate("contacted");
            }}
            className="w-8 h-8 flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg border border-emerald-200 transition-colors"
            title="Enviar WhatsApp"
          >
            <MessageCircle size={16} />
          </a>
        )}

        {/* 2. NUEVO: Ver en Google Maps Externo (Fotos, Reseñas) */}
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-8 h-8 flex items-center justify-center bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg border border-orange-200 transition-colors"
          title="Ver fotos y reseñas en Google Maps"
        >
          <MapPin size={16} />
        </a>

        {/* 3. Visitar Web Actual (si tiene) */}
        {hasProfessionalWeb && place.website && (
          <a
            href={place.website}
            target="_blank"
            rel="noopener noreferrer"
            className="w-8 h-8 flex items-center justify-center bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg border border-blue-200 transition-colors"
            title="Ver Web Actual"
          >
            <ExternalLink size={16} />
          </a>
        )}

        {/* 4. BOTONES DE GENERACIÓN IA */}
        {existingAssetId ? (
          // CASO: YA EXISTE UN ASSET -> BOTÓN "VER"
          <a
            href={`/demo/${existingAssetId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm min-w-[130px] justify-center animate-in fade-in zoom-in duration-300"
          >
            <Eye size={14} />
            <span>Ver {existingAssetType === 'demo' ? 'Demo Web' : 'Propuesta'}</span>
          </a>
        ) : (
          // CASO: NO EXISTE ASSET AÚN
          hasProfessionalWeb ? (
            // TIENE WEB -> Botón Principal: Propuesta
            <button
              onClick={() => onGenerate(place, "proposal")}
              disabled={isGenerating}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed min-w-[130px] justify-center"
            >
              {isGenerating ? (
                <>
                  <Loader2 size={14} className="animate-spin text-orange-500" />
                  <span>Escribiendo...</span>
                </>
              ) : (
                <>
                  <FileText size={14} className="text-orange-500" />
                  <span>Crear Propuesta</span>
                </>
              )}
            </button>
          ) : (
            // NO TIENE WEB -> Botón Principal: Demo + Botón Pequeño: Propuesta
            <div className="flex items-center gap-2">
              {/* Botón pequeño de Propuesta (Siempre disponible) */}
              <button
                 onClick={() => onGenerate(place, "proposal")}
                 disabled={isGenerating}
                 className="w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg border border-gray-300 transition-colors"
                 title="Generar solo Propuesta"
               >
                 {isGenerating ? <Loader2 size={16} className="animate-spin"/> : <FileText size={16} />}
              </button>
              
              {/* Botón grande de Demo */}
              <button
                onClick={() => onGenerate(place, "demo")}
                disabled={isGenerating}
                className="flex items-center gap-2 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm disabled:opacity-70 disabled:cursor-not-allowed min-w-[130px] justify-center"
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-red-500" />
                    <span>Creando Web...</span>
                  </>
                ) : (
                  <>
                    <Zap size={14} className="text-red-500" />
                    <span>Generar Demo</span>
                  </>
                )}
              </button>
            </div>
          )
        )}

        {/* 5. Marcar Vendido */}
        <button
          onClick={() => handleStatusUpdate(currentStatus === 'sold' ? 'new' : 'sold')}
          disabled={loading}
          className={cn(
            "w-8 h-8 flex items-center justify-center rounded-lg border transition-colors ml-1",
            currentStatus === "sold"
              ? "bg-emerald-500 text-white border-emerald-600"
              : "bg-white text-gray-300 border-gray-200 hover:border-emerald-500 hover:text-emerald-500"
          )}
          title="Marcar como Vendido"
        >
          <Check size={16} />
        </button>
      </div>
    </div>
  );
}