"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/rbac";

function str(v: FormDataEntryValue | null): string | null {
  if (v == null) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

function num(v: FormDataEntryValue | null): number | null {
  if (v == null || String(v).trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function chk(v: FormDataEntryValue | null): boolean {
  return v != null && v !== "" && v !== "false";
}

export async function createShipment(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const payload = {
    shipment_no: str(formData.get("shipment_no")) ?? "UNKNOWN",
    mode: str(formData.get("mode")) ?? "road",
    counterparty_name: str(formData.get("counterparty_name")),
    origin: str(formData.get("origin")),
    destination: str(formData.get("destination")),
    product: str(formData.get("product")),
    qty: num(formData.get("qty")),
    uom: str(formData.get("uom")) ?? "KL",
    transporter_name: str(formData.get("transporter_name")),
    vehicle_no: str(formData.get("vehicle_no")),
    eway_no: str(formData.get("eway_no")),
    eway_expiry: str(formData.get("eway_expiry")),
    eta: str(formData.get("eta")),
    status: str(formData.get("status")) ?? "booked",
  };

  const { error } = await supabase.from("logistics.shipment").insert(payload);
  if (error) console.error("createShipment failed:", error.message);
  revalidatePath("/admin/logistics/shipments");
}

export async function createVehicle(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const payload = {
    vehicle_no: str(formData.get("vehicle_no")) ?? "UNKNOWN",
    transporter_name: str(formData.get("transporter_name")),
    tanker_type: str(formData.get("tanker_type")),
    capacity_kl: num(formData.get("capacity_kl")),
    rto: str(formData.get("rto")),
    insurance_expiry: str(formData.get("insurance_expiry")),
    fitness_expiry: str(formData.get("fitness_expiry")),
    puc_expiry: str(formData.get("puc_expiry")),
    permit_expiry: str(formData.get("permit_expiry")),
    is_active: chk(formData.get("is_active")),
    notes: str(formData.get("notes")),
  };

  const { error } = await supabase.from("logistics.fleet_vehicle").insert(payload);
  if (error) console.error("createVehicle failed:", error.message);
  revalidatePath("/admin/logistics/vehicles");
}

export async function createSanction(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const payload = {
    party_name: str(formData.get("party_name")) ?? "UNKNOWN",
    screening_status: str(formData.get("screening_status")) ?? "pending",
    ofac_match: chk(formData.get("ofac_match")),
    g7_pricecap_ok: formData.get("g7_pricecap_ok") ? true : null,
    source: str(formData.get("source")),
    notes: str(formData.get("notes")),
  };

  const { error } = await supabase.from("logistics.counterparty_sanction").insert(payload);
  if (error) console.error("createSanction failed:", error.message);
  revalidatePath("/admin/logistics/sanctions");
}
