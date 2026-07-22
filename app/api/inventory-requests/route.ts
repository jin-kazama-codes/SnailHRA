import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { InventoryRequest } from "@/src/types";
import { supabase, syncInventoryRequestToSupabase, syncInventoryToSupabase } from "@/src/lib/supabase";

export async function GET() {
  const db = loadDatabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("inventory_requests").select("*").order("created_at", { ascending: false });
      if (!error && data) {
        const mappedRequests: InventoryRequest[] = data.map((row: any) => ({
          id: row.id,
          employeeId: row.employee_id || row.employeeId || "",
          employeeName: row.employee_name || row.employeeName || "",
          itemName: row.item_name || row.itemName || "",
          category: row.category || "Laptop",
          requestDate: row.request_date || row.requestDate || "",
          reason: row.reason || "",
          status: row.status || "Pending"
        }));
        const reqMap = new Map();
        (db.inventoryRequests || []).forEach((r: any) => { if (r.id) reqMap.set(r.id, r); });
        mappedRequests.forEach((r: any) => { reqMap.set(r.id, r); });
        db.inventoryRequests = Array.from(reqMap.values());
        return NextResponse.json(db.inventoryRequests);
      }
    } catch (err) {
      console.warn("Supabase GET inventory_requests error:", err);
    }
  }
  return NextResponse.json(db.inventoryRequests || []);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = loadDatabase();

    const emp = db.employees.find(e => e.id === body.employeeId);
    const empName = body.employeeName || emp?.fullName || "Employee " + (body.employeeId || "");
    const reqId = body.id || `invreq-${Date.now()}`;

    const newReqItem: InventoryRequest = {
      id: reqId,
      employeeId: body.employeeId || "",
      employeeName: empName,
      itemName: body.itemName || body.item_name || "",
      category: body.category || "Laptop",
      requestDate: body.requestDate || body.request_date || new Date().toISOString().split("T")[0],
      reason: body.reason || "",
      status: body.status || "Pending"
    };

    if (!db.inventoryRequests) db.inventoryRequests = [];
    db.inventoryRequests = [newReqItem, ...db.inventoryRequests.filter(r => r.id !== reqId)];
    saveDatabase(db);

    // Sync directly to Supabase table inventory_requests
    await syncInventoryRequestToSupabase(newReqItem);

    return NextResponse.json({ success: true, request: newReqItem });
  } catch (error: any) {
    console.error("Failed to create inventory request:", error);
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, status, assetId } = await request.json();
    const db = loadDatabase();
    if (!db.inventoryRequests) db.inventoryRequests = [];

    const targetReq = db.inventoryRequests.find(r => r.id === id);

    db.inventoryRequests = db.inventoryRequests.map(r => r.id === id ? { ...r, status } : r);

    // If approved and assetId allocated, update item allocation in inventory
    if (status === "Approved" && assetId && targetReq) {
      const today = new Date().toISOString().split("T")[0];
      db.inventory = (db.inventory || []).map(item => {
        if (item.id === assetId) {
          const updatedAsset = {
            ...item,
            status: "Assigned" as const,
            assignedToEmployeeId: targetReq.employeeId,
            assignedDate: today
          };
          syncInventoryToSupabase(updatedAsset);
          return updatedAsset;
        }
        return item;
      });
    }

    saveDatabase(db);

    if (supabase) {
      try {
        const { error } = await supabase.from("inventory_requests").update({ status }).eq("id", id);
        if (error) {
          console.warn("Supabase inventory_requests update status error:", error.message);
        }
      } catch (e) {
        console.warn("Supabase inventory_requests update error:", e);
      }
    }

    return NextResponse.json({ success: true, id, status });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update request status" }, { status: 500 });
  }
}
