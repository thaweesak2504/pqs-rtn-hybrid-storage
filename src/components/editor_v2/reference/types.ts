export interface ReferenceDoc {
  id: string; // The Link ID (SectionReference ID)
  reference_id?: number; // The actual Reference ID (for updates)
  code: string;
  title: string;
  category: string;
  classification: string;
  resource_type: string; // DOCUMENT, WEBLINK, VIDEO, IMAGE, AUDIO, TEMPLATE
  file_path: string;
  description?: string;
  usage_count?: number;
}

export type AlertVariant = 'danger' | 'warning' | 'info';

export interface DocumentReference {
  id: number;
  code: string;
  title: string;
  classification: string | null;
  category: string | null;
  resource_type: string | null;
  file_path: string | null;
  created_at: string;
  updated_at: string | null;
}
