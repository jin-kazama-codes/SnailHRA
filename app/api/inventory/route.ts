import { NextResponse } from "next/server";
import { InventoryItem } from "@/src/types";
import { supabase } from "@/src/lib/supabase";
import { supabaseAdmin } from "@/src/lib/supabase-admin";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { toBranchName, encodeBranchPrefix, extractBranchPrefix } from "@/src/lib/branchUtils";

export async function GET() {
  const dbClient = supabaseAdmin || supabase;
  if (dbClient) {
    try {
      const { data, error } = await dbClient.from("inventory").select("*").order("created_at", { ascending: false });
      if (error) {
        console.error("Supabase GET inventory error:", error);
        return NextResponse.json([]);
      }
      if (data) {
        const db = loadDatabase();
        const mappedInventory: InventoryItem[] = data.map((row: any) => {
          const extracted = extractBranchPrefix(row.name);
          const assignedEmp = (db.employees || []).find((e: any) => e.id === (row.assigned_to_employee_id || row.assignedToEmployeeId));
          let serialBranch: string | undefined;
          if (row.serial_number) {
            const sn = row.serial_number.toUpperCase();
            if (sn.startsWith("SHASHTRI") || sn.startsWith("SHAS-") || sn.startsWith("SN-")) serialBranch = "Shashtri Nagar";
            else if (sn.startsWith("NOIDA") || sn.startsWith("NOI-")) serialBranch = "Noida";
            else if (sn.startsWith("LUDHIANA") || sn.startsWith("LUD-")) serialBranch = "Ludhiana";
          }
          const resolvedBranch = row.branch 
            ? toBranchName(row.branch) 
            : (extracted.branch || serialBranch || (assignedEmp?.branch ? toBranchName(assignedEmp.branch) : undefined));

          return {
            id: row.id,
            name: extracted.cleanText || row.name || "",
            serialNumber: row.serial_number || row.serialNumber || "",
            category: row.category || "Laptop",
            status: row.status || "Available",
            assignedToEmployeeId: row.assigned_to_employee_id || row.assignedToEmployeeId || null,
            assignedDate: row.assigned_date || row.assignedDate || null,
            branch: resolvedBranch ? toBranchName(resolvedBranch) : undefined,
            companyId: row.company_id || row.companyId || undefined
          };
        });
        return NextResponse.json(mappedInventory);
      }
    } catch (err) {
      console.error("Supabase fetch inventory error:", err);
    }
  }
  return NextResponse.json([]);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = loadDatabase();

    const newItem: InventoryItem = {
      id: body.id || `inv-${Date.now()}`,
      name: body.name || "",
      serialNumber: body.serialNumber || body.serial_number || "",
      category: body.category || "Laptop",
      status: body.status || "Available",
      assignedToEmployeeId: body.assignedToEmployeeId || null,
      assignedDate: body.assignedDate || null,
      branch: body.branch ? toBranchName(body.branch) : undefined,
      companyId: body.companyId || body.company_id || undefined
    };

    if (!db.inventory) db.inventory = [];
    db.inventory = [newItem, ...db.inventory.filter(i => i.id !== newItem.id)];
    saveDatabase(db);

    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      const bName = newItem.branch && newItem.branch !== "All Branches" ? toBranchName(newItem.branch) : null;
      const baseRecord = {
        id: newItem.id,
        name: newItem.name,
        serial_number: newItem.serialNumber,
        category: newItem.category,
        status: newItem.status,
        assigned_to_employee_id: newItem.assignedToEmployeeId,
        assigned_date: newItem.assignedDate,
        company_id: newItem.companyId || null
      };

      let synced = false;
      if (bName) {
        try {
          const { error } = await dbClient.from("inventory").upsert({
            ...baseRecord,
            branch: bName
          }, { onConflict: "id" });
          if (!error) synced = true;
        } catch {}
      }

      if (!synced) {
        try {
          const encodedName = bName ? encodeBranchPrefix(newItem.name, bName) : newItem.name;
          const { error } = await dbClient.from("inventory").upsert({
            ...baseRecord,
            name: encodedName
          }, { onConflict: "id" });
          if (error) console.error("Supabase POST inventory fallback error:", error);
        } catch (e) {
          console.warn("Supabase POST inventory exception:", e);
        }
      }
    }

    return NextResponse.json({ success: true, item: newItem });
  } catch (error: any) {
    console.error("Failed to add inventory item:", error);
    return NextResponse.json({ error: "Failed to add inventory item" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const updatedItem: InventoryItem = await request.json();
    const db = loadDatabase();
    if (!db.inventory) db.inventory = [];
    db.inventory = db.inventory.map(item => item.id === updatedItem.id ? updatedItem : item);
    saveDatabase(db);

    const dbClient = supabaseAdmin || supabase;
    if (dbClient) {
      const bName = updatedItem.branch && updatedItem.branch !== "All Branches" ? toBranchName(updatedItem.branch) : null;
      const baseRecord = {
        id: updatedItem.id,
        name: updatedItem.name,
        serial_number: updatedItem.serialNumber,
        category: updatedItem.category,
        status: updatedItem.status,
        assigned_to_employee_id: updatedItem.assignedToEmployeeId || null,
        assigned_date: updatedItem.assignedDate || null,
        company_id: updatedItem.companyId || (updatedItem as any).company_id || null
      };

      let synced = false;
      if (bName) {
        try {
          const { error } = await dbClient.from("inventory").upsert({
            ...baseRecord,
            branch: bName
          }, { onConflict: "id" });
          if (!error) synced = true;
        } catch {}
      }

      if (!synced) {
        try {
          const encodedName = bName ? encodeBranchPrefix(updatedItem.name, bName) : updatedItem.name;
          await dbClient.from("inventory").upsert({
            ...baseRecord,
            name: encodedName
          }, { onConflict: "id" });
        } catch (e) {
          console.warn("Supabase PUT inventory exception:", e);
        }
      }
    }

    return NextResponse.json({ success: true, item: updatedItem });
  } catch (error) {
    return NextResponse.json({ error: "Failed to update inventory item" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    const db = loadDatabase();
    if (db.inventory) {
      db.inventory = db.inventory.filter(i => i.id !== id);
      saveDatabase(db);
    }

    if (supabase) {
      const { error } = await supabase.from("inventory").delete().eq("id", id);
      if (error) {
        console.error("Supabase DELETE inventory error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, id });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete item" }, { status: 500 });
  }
}
