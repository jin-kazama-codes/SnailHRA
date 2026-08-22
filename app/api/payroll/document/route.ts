import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { syncPayslipToSupabase, supabase } from "@/src/lib/supabase";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { Payslip } from "@/src/types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { employeeId, month, documentUrl, documentName, uploadedBy, fileType, size, payslipId, documents: incomingDocs } = body;

    if (!employeeId || !month || (!documentUrl && (!incomingDocs || incomingDocs.length === 0))) {
      return NextResponse.json({ error: "employeeId, month, and documentUrl (or documents array) are required" }, { status: 400 });
    }

    const db = loadDatabase();
    const dbClient = supabaseAdmin || supabase;

    // First check if payslips exist in Supabase
    if (dbClient) {
      try {
        const { data: slipsRows } = await dbClient
          .from("payslips")
          .select("*")
          .eq("employee_id", employeeId)
          .eq("month", month);

        if (slipsRows && slipsRows.length > 0) {
          const row = slipsRows[0];
          let parsedDocs: any[] = [];
          if (row.documents) {
            if (Array.isArray(row.documents)) {
              parsedDocs = row.documents;
            } else if (typeof row.documents === "string") {
              try { parsedDocs = JSON.parse(row.documents); } catch (e) { parsedDocs = []; }
            }
          }
          if (parsedDocs.length === 0 && row.document_name && (row.document_name.startsWith("DOCS_JSON:") || row.document_name.startsWith("["))) {
            try {
              const rawJson = row.document_name.startsWith("DOCS_JSON:") ? row.document_name.slice(10) : row.document_name;
              parsedDocs = JSON.parse(rawJson);
            } catch (e) {
              parsedDocs = [];
            }
          }
          if (parsedDocs.length === 0 && row.document_url) {
            parsedDocs = [{
              id: "doc-1",
              name: row.document_name || "Payroll Document",
              url: row.document_url,
              uploadedAt: row.document_uploaded_at || new Date().toISOString(),
              uploadedBy: row.document_uploaded_by || "Admin"
            }];
          }
          const matchedIndex = db.payslips.findIndex(p => p.id === row.id || (p.employeeId === employeeId && p.month === month));

          const existingSlip: Payslip = {
            id: row.id,
            employeeId: row.employee_id,
            month: row.month,
            basic: Number(row.basic) || 0,
            hra: Number(row.hra) || 0,
            telephone: Number(row.telephone ?? 0),
            fuel: Number(row.fuel ?? 0),
            professionalDev: Number(row.professional_dev ?? 0),
            lta: Number(row.lta ?? 0),
            allowances: Number(row.allowances) || 0,
            finesDeducted: Number(row.fines_deducted ?? 0),
            pfDeduction: Number(row.pf_deduction ?? 0),
            taxDeduction: Number(row.tax_deduction ?? 0),
            esiDeduction: Number(row.esi_deduction ?? 0),
            netPay: Number(row.net_pay) || 0,
            status: row.status || "Generated",
            generatedAt: row.generated_at || new Date().toISOString(),
            sentToEmail: row.sent_to_email || null,
            documentUrl: (parsedDocs[0]?.url) || row.document_url || undefined,
            documentName: (row.document_name && row.document_name.startsWith("DOCS_JSON:")) ? (parsedDocs[0]?.name || "Payroll Document") : (row.document_name || undefined),
            documentUploadedAt: row.document_uploaded_at || undefined,
            documentUploadedBy: row.document_uploaded_by || undefined,
            documents: parsedDocs
          };
          if (matchedIndex >= 0) {
            const currentMemDocs = db.payslips[matchedIndex].documents || [];
            const mergedDocs = currentMemDocs.length >= parsedDocs.length ? currentMemDocs : parsedDocs;
            db.payslips[matchedIndex] = { ...existingSlip, ...db.payslips[matchedIndex], documents: mergedDocs };
          } else {
            db.payslips.push(existingSlip);
          }
        }
      } catch (sbErr) {
        console.warn("Supabase payslip check warning:", sbErr);
      }
    }

    // Build array of new doc items to add
    const newDocItems: Array<{ id: string; name: string; url: string; uploadedAt: string; uploadedBy?: string; fileType?: string; size?: string }> = [];
    if (Array.isArray(incomingDocs) && incomingDocs.length > 0) {
      incomingDocs.forEach((doc: any, index: number) => {
        if (doc.url || doc.documentUrl) {
          newDocItems.push({
            id: doc.id || `doc-${Date.now()}-${index}`,
            name: doc.name || doc.documentName || "Payroll Document",
            url: doc.url || doc.documentUrl,
            uploadedAt: doc.uploadedAt || new Date().toISOString(),
            uploadedBy: doc.uploadedBy || uploadedBy || "Admin",
            fileType: doc.fileType || "document",
            size: doc.size || "",
          });
        }
      });
    } else if (documentUrl) {
      newDocItems.push({
        id: "doc-" + Date.now(),
        name: documentName || "Payroll Document",
        url: documentUrl,
        uploadedAt: new Date().toISOString(),
        uploadedBy: uploadedBy || "Admin",
        fileType: fileType || "document",
        size: size || "",
      });
    }

    let targetSlip = db.payslips.find(
      p => (payslipId && p.id === payslipId) || (p.employeeId === employeeId && p.month === month)
    );

    if (targetSlip) {
      // Merge with existing docs
      const existingDocs = Array.isArray(targetSlip.documents) ? targetSlip.documents : [];
      const newUrls = new Set(newDocItems.map(d => d.url));
      const combinedDocs = [...newDocItems, ...existingDocs.filter(d => !newUrls.has(d.url))];

      targetSlip.documents = combinedDocs;
      targetSlip.documentUrl = combinedDocs[0]?.url || documentUrl;
      targetSlip.documentName = combinedDocs[0]?.name || documentName || "Payroll Document";
      targetSlip.documentUploadedAt = new Date().toISOString();
      targetSlip.documentUploadedBy = uploadedBy || "Admin";
    } else {
      // Create a new draft placeholder payslip so document is saved for this employee & month
      const emp = db.employees?.find(e => e.id === employeeId || e.code === employeeId);
      const basic = emp?.salary?.basic || 0;
      const hra = emp?.salary?.hra || 0;
      const allowances = emp?.salary?.allowances || 0;

      targetSlip = {
        id: "pay-" + Date.now(),
        employeeId,
        month,
        basic,
        hra,
        telephone: emp?.salary?.telephone || 0,
        fuel: emp?.salary?.fuel || 0,
        professionalDev: emp?.salary?.professionalDev || 0,
        lta: emp?.salary?.lta || 0,
        allowances,
        finesDeducted: 0,
        pfDeduction: emp?.salary?.pfDeduction || 0,
        taxDeduction: emp?.salary?.tdsDeduction || 0,
        esiDeduction: emp?.salary?.esiDeduction || 0,
        netPay: Math.max(0, basic + hra + allowances - (emp?.salary?.pfDeduction || 0) - (emp?.salary?.tdsDeduction || 0)),
        status: "Draft",
        generatedAt: new Date().toISOString(),
        sentToEmail: null,
        documentUrl: newDocItems[0]?.url || documentUrl,
        documentName: newDocItems[0]?.name || documentName || "Payroll Document",
        documentUploadedAt: new Date().toISOString(),
        documentUploadedBy: uploadedBy || "Admin",
        documents: newDocItems,
      };
      db.payslips.push(targetSlip);
    }

    saveDatabase(db);
    await syncPayslipToSupabase(targetSlip);

    return NextResponse.json({ success: true, payslip: targetSlip });
  } catch (error: any) {
    console.error("Payroll document upload error:", error);
    return NextResponse.json({ error: error?.message || "Failed to attach document" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { employeeId, month, payslipId, docId } = await request.json();

    if (!employeeId && !payslipId) {
      return NextResponse.json({ error: "employeeId or payslipId is required" }, { status: 400 });
    }

    const db = loadDatabase();
    let targetSlip = db.payslips.find(
      p => (payslipId && p.id === payslipId) || (p.employeeId === employeeId && p.month === month)
    );

    if (!targetSlip) {
      return NextResponse.json({ error: "Payslip record not found" }, { status: 404 });
    }

    if (docId && Array.isArray(targetSlip.documents) && targetSlip.documents.length > 1) {
      targetSlip.documents = targetSlip.documents.filter(d => d.id !== docId);
      const firstDoc = targetSlip.documents[0];
      targetSlip.documentUrl = firstDoc?.url || undefined;
      targetSlip.documentName = firstDoc?.name || undefined;
      targetSlip.documentUploadedAt = firstDoc?.uploadedAt || undefined;
      targetSlip.documentUploadedBy = firstDoc?.uploadedBy || undefined;
    } else {
      delete targetSlip.documentUrl;
      delete targetSlip.documentName;
      delete targetSlip.documentUploadedAt;
      delete targetSlip.documentUploadedBy;
      targetSlip.documents = [];
    }

    saveDatabase(db);
    await syncPayslipToSupabase(targetSlip);

    return NextResponse.json({ success: true, payslip: targetSlip });
  } catch (error: any) {
    console.error("Payroll document delete error:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete document" }, { status: 500 });
  }
}
