import { NextResponse } from 'next/server';
import { loadDatabase, saveDatabase } from '@/src/lib/db';
import { supabase } from '@/src/lib/supabase';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; docId: string }> | { id: string; docId: string } }
) {
  try {
    const resolvedParams = await params;
    const { id: empId, docId: rawDocId } = resolvedParams;
    const docId = decodeURIComponent(rawDocId);

    const db = loadDatabase();
    if (!db.employees) db.employees = [];
    const empIndex = db.employees.findIndex(e => e.id === empId);

    if (empIndex >= 0 && db.employees[empIndex].documents) {
      db.employees[empIndex].documents = db.employees[empIndex].documents.filter(d => d.id !== docId && d.name !== docId);
      saveDatabase(db);
    }

    if (supabase) {
      try {
        if (empIndex >= 0) {
          await supabase.from('employees').update({
            documents: db.employees[empIndex].documents
          }).eq('id', empId);
        }

        await supabase.from('employee_documents').delete().or(`id.eq.${docId},name.eq.${docId}`);
      } catch (sbErr) {
        console.warn('Supabase sync documents delete warning:', sbErr);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to delete document' }, { status: 500 });
  }
}