import { NextResponse } from 'next/server';
import { loadDatabase, saveDatabase } from '@/src/lib/db';
import { supabase } from '@/src/lib/supabase';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> | { id: string; docId: string } }
) {
  try {
    const resolvedParams = await params;
    const { id: empId, docId } = resolvedParams;

    const db = loadDatabase();
    const empIndex = db.employees.findIndex(e => e.id === empId);
    if (empIndex === -1) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (db.employees[empIndex].documents) {
      db.employees[empIndex].documents = db.employees[empIndex].documents.filter(d => d.id !== docId);
    }
    saveDatabase(db);

    if (supabase) {
      try {
        await supabase.from('employees').update({
          documents: db.employees[empIndex].documents
        }).eq('id', empId);
      } catch (sbErr) {
        console.warn('Supabase sync documents delete warning:', sbErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete document' }, { status: 500 });
  }
}