import { NextResponse } from "next/server";
import { InventoryItem } from "@/src/types";
import { supabase } from "@/src/lib/supabase";

export async function GET() {
  if (supabase) {
    try {
      const { data, error } = await supabase.from("inventory").select("*").order("created_at", { ascending: false });
      if (error) {
        console.error("Supabase GET inventory error:", error);
        return NextResponse.json([]);
      }
      if (data) {
        const mappedInventory: InventoryItem[] = data.map((row: any) => ({
          id: row.id,
          name: row.name || "",
          serialNumber: row.serial_number || row.serialNumber || "",
          category: row.category || "Laptop",
          status: row.status || "Available",
          assignedToEmployeeId: row.assigned_to_employee_id || row.assignedToEmployeeId || null,
          assignedDate: row.assigned_date || row.assignedDate || null,
          branch: undefined
        }));
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

    const newItem: InventoryItem = {
      id: body.id || `inv-${Date.now()}`,
      name: body.name || "",
      serialNumber: body.serialNumber || body.serial_number || "",
      category: body.category || "Laptop",
      status: body.status || "Available",
      assignedToEmployeeId: body.assignedToEmployeeId || null,
      assignedDate: body.assignedDate || null
    };

    if (supabase) {
      const record = {
        id: newItem.id,
        name: newItem.name,
        serial_number: newItem.serialNumber,
        category: newItem.category,
        status: newItem.status,
        assigned_to_employee_id: newItem.assignedToEmployeeId,
        assigned_date: newItem.assignedDate
      };

      const { error } = await supabase.from("inventory").upsert(record, { onConflict: "id" });
      if (error) {
        console.error("Supabase POST inventory error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      console.log("Successfully dynamically saved asset to Supabase inventory table:", newItem.id);
    }

    return NextResponse.json({ success: true, item: newItem });
  } catch (error: any) {
    console.error("Failed to add inventory item to Supabase:", error);
    return NextResponse.json({ error: "Failed to add inventory item" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const updatedItem: InventoryItem = await request.json();

    if (supabase) {
      const record = {
        id: updatedItem.id,
        name: updatedItem.name,
        serial_number: updatedItem.serialNumber,
        category: updatedItem.category,
        status: updatedItem.status,
        assigned_to_employee_id: updatedItem.assignedToEmployeeId || null,
        assigned_date: updatedItem.assignedDate || null
      };

      const { error } = await supabase.from("inventory").upsert(record, { onConflict: "id" });
      if (error) {
        console.error("Supabase PUT inventory error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
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
