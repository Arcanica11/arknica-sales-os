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
  MapPin,
  Image as ImageIcon, // <--- ÚNICO CAMBIO EN IMPORTS
} from "lucide-react";
import { Place, Lead } from "@/lib/types";

interface PlaceCardProps {
  place: Place;
  savedLead?: Lead;
  demoId?: string;
  proposalId?: string;
  isGenerating: boolean;
  searchCity?: string;
  onStatusChange: (
    placeId: string,
    newStatus: "new" | "contacted" | "sold" | "rejected"
  ) => void;
  onGenerate: (place: Place, type: "demo" | "proposal") => void;
}

export default function PlaceCard({
  place,
  savedLead,
  demoId,
  proposalId,
  isGenerating,
  searchCity,
  onStatusChange,
  onGenerate,
}: PlaceCardProps) {
  const [loading, setLoading] = useState(false);
  const currentStatus = savedLead?.status || "new";

  const handleStatusUpdate = async (
    newStatus: "new" | "contacted" | "sold" | "rejected"
  ) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("leads")
        .upsert(
          {
            place_id: place.place_id,
            name: place.name,
            city: searchCity || "Unknown",
            category: "Unknown",
            status: newStatus,
            website: place.website,
            address: place.address,
            phone: place.phone,
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

  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    place.name + " " + place.address
  )}`;

  // --- NUEVA LÓGICA WHATSAPP (Anti-Spam) ---
  // No afecta el diseño, solo lo que pasa al hacer clic.
  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!place.phone) return;

    // 1. Mensaje Aleatorio (Para evitar baneo)
    const saludos = [
      "Hola",
      "Qué tal",
      "Buenas",
      "Saludos a todo el equipo de",
    ];
    const saludo = saludos[Math.floor(Math.random() * saludos.length)];

    // 2. Contexto (Sin vender aún)
    const mensaje = `${saludo} ${place.name}, soy vecino de la zona. Hice un diseño visual rápido de cómo se verían sus uniformes y menús renovados. Les adjunto la imagen, ¿qué opinan?`;

    // 3. Abrir WhatsApp
    const phone = place.phone.replace(/[^0-9]/g, "");
    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(mensaje)}`,
      "_blank"
    );

    // 4. Marcar Contactado
    if (currentStatus === "new") handleStatusUpdate("contacted");
  };

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
        {/* 1. WhatsApp (ACTUALIZADO CON LÓGICA) */}
        {place.phone && (
          <button
            onClick={handleWhatsAppClick}
            className="w-8 h-8 flex items-center justify-center bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg border border-emerald-200 transition-colors"
            title="Enviar WhatsApp (Mensaje Anti-Spam)"
          >
            <MessageCircle size={16} />
          </button>
        )}

        {/* 0. Botón Descartar (X) - NUEVO */}
        <button
          onClick={() => handleStatusUpdate("rejected")}
          className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg border border-gray-200 hover:border-red-200 transition-colors"
          title="Descartar Lead"
        >
          <span className="sr-only">Descartar</span>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        {/* 2. Google Maps Externo */}
        <a
          href={googleMapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-8 h-8 flex items-center justify-center bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg border border-orange-200 transition-colors"
          title="Ver en Google Maps"
        >
          <MapPin size={16} />
        </a>

        {/* Separador */}
        <div className="w-px h-6 bg-gray-200 mx-1"></div>

        {/* 3. BOTÓN PROPUESTA (Ahora genera el Flyer) */}
        {proposalId ? (
          <a
            href={`/demo/${proposalId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
            title="Ver Flyer Generado"
          >
            <ImageIcon size={14} /> <span>Ver Flyer</span>
          </a>
        ) : (
          <button
            onClick={() => onGenerate(place, "proposal")}
            disabled={isGenerating}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
            title="Crear Flyer Visual"
          >
            {isGenerating ? (
              <Loader2 size={14} className="animate-spin text-orange-500" />
            ) : (
              <ImageIcon size={14} className="text-orange-500" />
            )}
            <span>Crear Flyer</span>
          </button>
        )}

        {/* 4. BOTÓN DEMO WEB (Sin cambios visuales) */}
        {demoId ? (
          <a
            href={`/demo/${demoId}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
            title="Ver Demo Web"
          >
            <Eye size={14} /> <span>Ver Demo</span>
          </a>
        ) : (
          !hasProfessionalWeb && (
            <button
              onClick={() => onGenerate(place, "demo")}
              disabled={isGenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors shadow-sm disabled:opacity-50"
              title="Generar Demo Web"
            >
              {isGenerating ? (
                <Loader2 size={14} className="animate-spin text-white" />
              ) : (
                <Zap size={14} className="text-white" />
              )}
              <span>Generar Demo</span>
            </button>
          )
        )}

        {/* 5. Marcar Vendido */}
        <button
          onClick={() =>
            handleStatusUpdate(currentStatus === "sold" ? "new" : "sold")
          }
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
