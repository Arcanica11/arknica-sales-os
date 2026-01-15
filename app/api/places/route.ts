import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const city = searchParams.get("city");
  const category = searchParams.get("category");
  const pageToken = searchParams.get("pageToken");
  const lat = searchParams.get("lat");
  const lng = searchParams.get("lng");

  // Si hay lat/lng, ignoramos la ciudad porque buscamos por zona
  const isLocationSearch = lat && lng;

  if ((!city && !isLocationSearch) || !category) {
    return NextResponse.json(
      { error: "Faltan parámetros: rubro y (ciudad o coordenadas)" },
      { status: 400 }
    );
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY || process.env.Maps_API_KEY;

  if (!apiKey) {
    return NextResponse.json(
      { error: "Falta la API Key de Google Maps" },
      { status: 500 }
    );
  }

  try {
    // URL DE LA NUEVA API (Places API v1)
    const apiUrl = "https://places.googleapis.com/v1/places:searchText";

    const requestBody: any = {
      textQuery: `${category} ${!isLocationSearch ? "in " + city : ""}`,
    };

    if (pageToken) {
      requestBody.pageToken = pageToken;
    }

    if (isLocationSearch) {
      // Configuramos el sesgo de ubicación al centro del mapa
      requestBody.locationBias = {
        circle: {
          center: {
            latitude: parseFloat(lat!),
            longitude: parseFloat(lng!),
          },
          radius: 2000.0, // 2km radius bias
        },
      };
    }

    const response = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        // Pedimos campos adicionales: internationalPhoneNumber, location
        "X-Goog-FieldMask":
          "places.displayName,places.formattedAddress,places.websiteUri,places.id,places.internationalPhoneNumber,places.location,nextPageToken",
      },
      body: JSON.stringify(requestBody),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error?.message || "Error al conectar con Google Maps"
      );
    }

    const results =
      data.places?.map((place: any) => ({
        place_id: place.id,
        name: place.displayName?.text,
        address: place.formattedAddress,
        website: place.websiteUri || null,
        phone: place.internationalPhoneNumber || null,
        location: place.location, // { latitude, longitude }
      })) || [];

    return NextResponse.json({
      results,
      nextPageToken: data.nextPageToken || null,
    });
  } catch (error: any) {
    console.error("Error en API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
