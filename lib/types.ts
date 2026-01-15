export interface Place {
  place_id: string;
  name: string;
  address: string;
  website: string | null;
  phone: string | null;
  location: { latitude: number; longitude: number };
}

export interface Lead {
  place_id: string;
  status: "new" | "contacted" | "sold" | "rejected";
  id?: string;
  name?: string;
  address?: string;
  phone?: string;
  website?: string | null;
}

export interface Asset {
  id: string;
  place_name: string;
  type: "demo" | "proposal";
}
