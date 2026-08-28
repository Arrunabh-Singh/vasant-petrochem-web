import { createClient } from "./supabase/server";

/**
 * Reads for the logistics / fleet / sanctions admin screens.
 * RLS: shipment, fleet_vehicle, vessel are visible to any `authenticated`
 * user; counterparty_sanction is restricted to admin/approver. The pages that
 * call these run behind the admin guard in app/admin/(dashboard)/layout.tsx.
 */

export type ShipmentRow = {
  id: number;
  shipment_no: string;
  mode: string;
  counterparty_name: string | null;
  origin: string | null;
  destination: string | null;
  product: string | null;
  qty: number | null;
  uom: string | null;
  vehicle_no: string | null;
  transporter_name: string | null;
  eway_no: string | null;
  eway_expiry: string | null;
  eta: string | null;
  status: string;
};

export async function getAllShipmentsAdmin(): Promise<ShipmentRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("logistics.shipment")
    .select(
      "id, shipment_no, mode, counterparty_name, origin, destination, product, qty, uom, vehicle_no, transporter_name, eway_no, eway_expiry, eta, status"
    )
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getAllShipmentsAdmin failed:", error.message);
    return [];
  }
  return data as ShipmentRow[];
}

export type VehicleRow = {
  id: number;
  vehicle_no: string;
  transporter_name: string | null;
  tanker_type: string | null;
  capacity_kl: number | null;
  rto: string | null;
  insurance_expiry: string | null;
  fitness_expiry: string | null;
  puc_expiry: string | null;
  permit_expiry: string | null;
  is_active: boolean | null;
};

export async function getVehiclesAdmin(): Promise<VehicleRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("logistics.fleet_vehicle")
    .select(
      "id, vehicle_no, transporter_name, tanker_type, capacity_kl, rto, insurance_expiry, fitness_expiry, puc_expiry, permit_expiry, is_active"
    )
    .order("vehicle_no", { ascending: true });

  if (error) {
    console.error("getVehiclesAdmin failed:", error.message);
    return [];
  }
  return data as VehicleRow[];
}

export type SanctionRow = {
  id: number;
  party_name: string;
  screening_status: string;
  ofac_match: boolean | null;
  g7_pricecap_ok: boolean | null;
  source: string | null;
  screened_at: string;
  notes: string | null;
};

export async function getSanctionsAdmin(): Promise<SanctionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("logistics.counterparty_sanction")
    .select("id, party_name, screening_status, ofac_match, g7_pricecap_ok, source, screened_at, notes")
    .order("screened_at", { ascending: false });

  if (error) {
    console.error("getSanctionsAdmin failed:", error.message);
    return [];
  }
  return data as SanctionRow[];
}

export type ShipmentAlert = {
  id: number;
  shipment_no: string;
  alert_type: "eway_expiry" | "overdue";
  detail: string;
  severity: "warning" | "critical";
};

const EWAY_WINDOW_DAYS = 3;

/**
 * At-risk shipments for the alert dashboard: e-way expiring within 3 days
 * (or already expired) and deliveries past ETA that are not yet delivered.
 * Pure computation on `logistics.shipment` — no external calls.
 */
export async function getShipmentAlertsAdmin(): Promise<ShipmentAlert[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("logistics.shipment")
    .select("id, shipment_no, eway_expiry, eta, status")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getShipmentAlertsAdmin failed:", error.message);
    return [];
  }

  const now = Date.now();
  const windowMs = EWAY_WINDOW_DAYS * 86_400_000;
  const alerts: ShipmentAlert[] = [];

  for (const r of data as Array<{
    id: number;
    shipment_no: string;
    eway_expiry: string | null;
    eta: string | null;
    status: string;
  }>) {
    if (r.eway_expiry) {
      const e = new Date(r.eway_expiry).getTime();
      if (e <= now + windowMs) {
        const days = Math.ceil((e - now) / 86_400_000);
        alerts.push({
          id: r.id,
          shipment_no: r.shipment_no,
          alert_type: "eway_expiry",
          detail: `e-way ${days < 0 ? "expired" : `expires in ${days}d`} (${r.eway_expiry})`,
          severity: days < 0 ? "critical" : "warning",
        });
      }
    }
    if (r.status && !["delivered", "returned"].includes(r.status) && r.eta) {
      const eta = new Date(r.eta).getTime();
      if (eta < now) {
        const days = Math.floor((now - eta) / 86_400_000);
        alerts.push({
          id: r.id,
          shipment_no: r.shipment_no,
          alert_type: "overdue",
          detail: `delivery overdue by ${days}d (ETA ${r.eta})`,
          severity: "critical",
        });
      }
    }
  }

  return alerts;
}
