import { NextResponse } from 'next/server';
import { loadDatabase, saveDatabase } from '@/src/lib/db';
import { supabase } from '@/src/lib/supabase';
import { EmployeeDocument } from '@/src/types';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await params;
    const empId = resolvedParams.id;
    const { name, category, size, fileUrl } = await request.json();

    if (!name || !category) {
      return NextResponse.json({ error: 'Name and category are required' }, { status: 400 });
    }

    const db = loadDatabase();
    if (!db.employees) db.employees = [];
    let empIndex = db.employees.findIndex(e => e.id === empId);

    const newDoc: EmployeeDocument = {
      id: 'doc-' + Date.now(),
      name,
      category,
      uploadedAt: new Date().toISOString().split('T')[0],
      size: size || '1.5 MB',
      fileUrl: fileUrl || ''
    };

    if (empIndex === -1) {
      db.employees.push({
        id: empId,
        documents: [newDoc]
      } as any);
      empIndex = db.employees.length - 1;
    } else {
      if (!db.employees[empIndex].documents) {
        db.employees[empIndex].documents = [];
      }
      db.employees[empIndex].documents.push(newDoc);
    }
    saveDatabase(db);

    if (supabase) {
      try {
        await supabase.from('employees').update({
          documents: db.employees[empIndex].documents
        }).eq('id', empId);

        await supabase.from('employee_documents').upsert({
          id: newDoc.id,
          employee_id: empId,
          name: newDoc.name,
          category: newDoc.category,
          uploaded_at: newDoc.uploadedAt,
          size: newDoc.size,
          file_url: newDoc.fileUrl || null
        }, { onConflict: 'id' });
      } catch (sbErr) {
        console.warn('Supabase sync documents warning:', sbErr);
      }
    }

    return NextResponse.json({ success: true, document: newDoc });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Failed to add document' }, { status: 500 });
  }
}