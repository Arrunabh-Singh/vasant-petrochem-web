import { createClient } from "./supabase/server";
import { createAdminClient } from "./supabase/admin";
import type { Product } from "./products";

/**
 * Authenticated-only reads: RLS grants the `authenticated` role broad access
 * to leads, unpublished products, and TDS files. Everything here requires an
 * admin session — see lib/supabase/server.ts and proxy.ts for the guard.
 */

export type LeadStatus = "new" | "contacted" | "quoted" | "won" | "lost";

export type Lead = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  product_label: string | null;
  quantity: string | null;
  message: string | null;
  status: LeadStatus;
  created_at: string;
};

export async function getLeads(): Promise<Lead[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("quote_requests")
    .select("id, name, email, company, phone, product_label, quantity, message, status, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getLeads failed:", error.message);
    return [];
  }
  return data as Lead[];
}

export type TdsRequest = {
  id: string;
  email: string;
  product_label: string | null;
  created_at: string;
};

export async function getTdsRequests(): Promise<TdsRequest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tds_requests")
    .select("id, email, product_label, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getTdsRequests failed:", error.message);
    return [];
  }
  return data as TdsRequest[];
}

// Product (lib/products.ts) intentionally drops tds_document_id/display_order
// from the public shape (audit.md M19) — the admin view still needs both.
export type AdminProduct = Product & { published: boolean; tds_document_id: string | null; display_order: number };

const ADMIN_COLUMNS =
  "id, slug, name, code, description, specs, applications, industries, packaging, tds_document_id, display_order, published";

export async function getAllProductsAdmin(): Promise<AdminProduct[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(ADMIN_COLUMNS)
    .order("display_order", { ascending: true });

  if (error) {
    console.error("getAllProductsAdmin failed:", error.message);
    return [];
  }
  return data as AdminProduct[];
}

export async function getProductByIdAdmin(id: string): Promise<AdminProduct | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select(ADMIN_COLUMNS)
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;
  return data as AdminProduct;
}

export type DocClass = "tds" | "purchase-bills" | "sales-bills" | "gst" | "contracts" | "coa" | "hr" | "bank";

export type VaultDocument = {
  id: string;
  doc_class: DocClass;
  logical_name: string;
  status: string;
  legal_hold: boolean;
  encrypted: boolean;
  version: number;
  size_bytes: number;
  retention_until: string;
  created_by: string;
  created_at: string;
};

export async function getAllDocuments(): Promise<VaultDocument[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("id, doc_class, logical_name, status, legal_hold, encrypted, version, size_bytes, retention_until, created_by, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("getAllDocuments failed:", error.message);
    return [];
  }
  return data as VaultDocument[];
}

export async function getDocument(docId: string): Promise<VaultDocument | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documents")
    .select("id, doc_class, logical_name, status, legal_hold, encrypted, version, size_bytes, retention_until, created_by, created_at")
    .eq("id", docId)
    .maybeSingle();

  if (error || !data) return null;
  return data as VaultDocument;
}

export type DocumentVersion = {
  version: number;
  checksum_sha256: string;
  size_bytes: number;
  uploaded_by: string;
  created_at: string;
};

export async function getDocumentVersions(docId: string): Promise<DocumentVersion[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_versions")
    .select("version, checksum_sha256, size_bytes, uploaded_by, created_at")
    .eq("doc_id", docId)
    .order("version", { ascending: false });

  if (error) {
    console.error("getDocumentVersions failed:", error.message);
    return [];
  }
  return data as DocumentVersion[];
}

export type DocumentAclEntry = { subject_email: string; level: string; granted_by: string; expires_at: string | null };

export async function getDocumentAcl(docId: string): Promise<DocumentAclEntry[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("document_acl")
    .select("subject_email, level, granted_by, expires_at")
    .eq("doc_id", docId);

  if (error) {
    console.error("getDocumentAcl failed:", error.message);
    return [];
  }
  return data as DocumentAclEntry[];
}

export type DocEvent = { id: number; actor_email: string; action: string; meta: unknown; created_at: string };

export async function getDocumentEvents(docId: string): Promise<DocEvent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("doc_events")
    .select("id, actor_email, action, meta, created_at")
    .eq("doc_id", docId)
    .order("id", { ascending: false })
    .limit(50);

  if (error) {
    console.error("getDocumentEvents failed:", error.message);
    return [];
  }
  return data as DocEvent[];
}

export async function getRecentAuditLog(limit = 200) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("audit_log")
    .select("id, actor_email, action, object_type, object_id, outcome, created_at")
    .order("id", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("getRecentAuditLog failed:", error.message);
    return [];
  }
  return data;
}

export type ComplianceItem = {
  id: string;
  kind: string;
  label: string;
  identifier: string | null;
  expires_on: string;
  owner_email: string;
  status: string;
  days_remaining: number;
};

export async function getComplianceDue(): Promise<ComplianceItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("compliance_due").select("*");
  if (error) {
    console.error("getComplianceDue failed:", error.message);
    return [];
  }
  return data as ComplianceItem[];
}

export type ApprovalRequest = {
  id: string;
  kind: string;
  subject: string;
  amount: number | null;
  requested_by: string;
  approved_by: string | null;
  status: string;
  reason: string | null;
  created_at: string;
  decided_at: string | null;
};

export async function getApprovalRequests(): Promise<ApprovalRequest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("approval_requests")
    .select("id, kind, subject, amount, requested_by, approved_by, status, reason, created_at, decided_at")
    .order("created_at", { ascending: false });
  if (error) {
    console.error("getApprovalRequests failed:", error.message);
    return [];
  }
  return data as ApprovalRequest[];
}

export type AppUserRow = { email: string; role: string; groups: string[]; is_active: boolean; created_at: string };

export async function getAppUsers(): Promise<AppUserRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("app_users").select("email, role, groups, is_active, created_at").order("email");
  if (error) {
    console.error("getAppUsers failed:", error.message);
    return [];
  }
  return data as AppUserRow[];
}

export type SecurityAlert = { id: number; kind: string; detail: string; severity: string; created_at: string; acked_at: string | null };

export async function getSecurityAlerts(): Promise<SecurityAlert[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("security_alerts")
    .select("id, kind, detail, severity, created_at, acked_at")
    .order("id", { ascending: false })
    .limit(100);
  if (error) {
    console.error("getSecurityAlerts failed:", error.message);
    return [];
  }
  return data as SecurityAlert[];
}

export async function getSystemFlags(): Promise<{ key: string; value: boolean; note: string | null }[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("system_flags").select("key, value, note");
  if (error) {
    console.error("getSystemFlags failed:", error.message);
    return [];
  }
  return data;
}

export type McpTokenRow = {
  id: string;
  requester_email: string;
  monthly_token_budget: number;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
};

export async function getMcpTokens(): Promise<McpTokenRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mcp_tokens")
    .select("id, requester_email, monthly_token_budget, expires_at, revoked_at, created_at")
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    console.error("getMcpTokens failed:", error.message);
    return [];
  }
  return data;
}

export type AiActionRow = {
  id: number;
  requester_email: string;
  tool_name: string;
  status: string;
  row_count: number | null;
  input_tokens: number | null;
  output_tokens: number | null;
  error: string | null;
  created_at: string;
};

export async function getRecentAiActions(limit = 50): Promise<AiActionRow[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_action_log")
    .select("id, requester_email, tool_name, status, row_count, input_tokens, output_tokens, error, created_at")
    .order("id", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("getRecentAiActions failed:", error.message);
    return [];
  }
  return data;
}

// decision 3: storage.objects is deny-all for every role but service_role,
// so this — like every other storage read in the app — goes through the
// admin (service-role) client, never the session client.
export async function getAdminSignedTdsUrl(docId: string): Promise<string | null> {
  const admin = createAdminClient();
  const { data: ver } = await admin
    .from("document_versions")
    .select("path")
    .eq("doc_id", docId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!ver) return null;

  const { data, error } = await admin.storage.from("tds").createSignedUrl(ver.path, 60 * 10);
  if (error) return null;
  return data.signedUrl;
}
