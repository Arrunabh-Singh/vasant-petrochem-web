import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTicket } from "@/lib/upload-ticket";

export const runtime = "nodejs";

const MAX_SIZE = 26_214_400; // matches the etl-inbox bucket's file_size_limit

/**
 * Raw Tally delta XML staging — separate from the document vault
 * (documents/document_versions). The office box uploads the file
 * already age-encrypted (tools/office-box/tally-pull.mjs); this route
 * never sees plaintext Tally data, only ciphertext it relays into
 * storage and hands off to the parse-tally edge function.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const ticket = verifyTicket(authHeader.slice(7));
  if (!ticket || !ticket.classes.includes("etl-inbox")) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return NextResponse.json({ error: "file is required" }, { status: 400 });
  }
  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: "file exceeds the etl-inbox size limit" }, { status: 413 });
  }

  const admin = createAdminClient();
  const path = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}.age`;

  const { error: uploadError } = await admin.storage
    .from("etl-inbox")
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: "application/octet-stream" });
  if (uploadError) {
    console.error("etl-inbox upload failed:", uploadError.message);
    return NextResponse.json({ error: "storage upload failed" }, { status: 502 });
  }

  await admin.rpc("log_event", {
    p_action: "etl_upload",
    p_object_type: "etl_run",
    p_object_id: path,
    p_actor_email: ticket.sub,
  });

  const { error: invokeError } = await admin.functions.invoke("parse-tally", { body: { path } });
  if (invokeError) {
    // Not fatal to the upload itself — the file is safely staged; a
    // missed parse run surfaces via finance.etl_run_log / the 2-missed-
    // nights alert (supabase/functions/parse-tally) rather than here.
    console.error("parse-tally invoke failed:", invokeError.message);
  }

  return NextResponse.json({ path }, { status: 201 });
}
