import { NextResponse } from "next/server";
import { loadDatabase, saveDatabase } from "@/src/lib/db";
import { Holiday } from "@/src/types";
import { supabase, syncHolidayToSupabase, deleteHolidayFromSupabase } from "@/src/lib/supabase";

export async function GET() {
  try {
    const db = loadDatabase();
    if (supabase) {
      try {
        const { data } = await supabase.from("holidays").select("*").order("date", { ascending: true });
        if (data && data.length > 0) {
          const sbHolidays = data.map((row: any) => ({
            id: row.id,
            name: row.name,
            date: row.date,
            type: row.type || "National"
          }));
          db.holidays = sbHolidays;
        }
      } catch (err) {}
    }
    return NextResponse.json(db.holidays || []);
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch holidays" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, date, type } = body;

    if (!name || !date) {
      return NextResponse.json({ error: "Name and date are required" }, { status: 400 });
    }

    const db = loadDatabase();
    if (!db.holidays) db.holidays = [];

    const newHoliday: Holiday = {
      id: body.id || `hol-${Date.now()}`,
      name,
      date,
      type: type || "National"
    };

    db.holidays.push(newHoliday);
    // Sort holidays chronologically by date
    db.holidays.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    saveDatabase(db);

    if (supabase) {
      (async () => {
        try {
          await syncHolidayToSupabase(newHoliday);
        } catch (e) {
          console.warn("Supabase sync warning:", e);
        }
      })();
    }

    return NextResponse.json({ success: true, holiday: newHoliday });
  } catch (error) {
    return NextResponse.json({ error: "Failed to create holiday" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Holiday ID is required" }, { status: 400 });
    }

    const db = loadDatabase();
    db.holidays = (db.holidays || []).filter(h => h.id !== id);

    saveDatabase(db);

    if (supabase) {
      (async () => {
        try {
          await deleteHolidayFromSupabase(id);
        } catch (e) {
          console.warn("Supabase sync warning:", e);
        }
      })();
    }

    return NextResponse.json({ success: true, message: "Holiday deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Failed to delete holiday" }, { status: 500 });
  }
}
