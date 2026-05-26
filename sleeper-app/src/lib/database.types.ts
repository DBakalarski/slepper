// AUTO-GENERATED FILE.
// Po apply migracji uruchom:
//   npx supabase gen types typescript --project-id qcyklmrotbkehgpjdebl > src/lib/database.types.ts
//
// Ten plik to placeholder z recznie wpisanymi typami zgodnymi z migracjami 0001/0003/0004.
// Zostanie nadpisany przez `supabase gen types`.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      families: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      family_members: {
        Row: {
          id: string;
          family_id: string;
          user_id: string;
          role: 'owner' | 'member';
          created_at: string;
        };
        Insert: {
          id?: string;
          family_id: string;
          user_id: string;
          role?: 'owner' | 'member';
          created_at?: string;
        };
        Update: {
          id?: string;
          family_id?: string;
          user_id?: string;
          role?: 'owner' | 'member';
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'family_members_family_id_fkey';
            columns: ['family_id'];
            referencedRelation: 'families';
            referencedColumns: ['id'];
          },
        ];
      };
      family_invitations: {
        Row: {
          id: string;
          family_id: string;
          email: string;
          invited_by: string;
          created_at: string;
          accepted_at: string | null;
        };
        Insert: {
          id?: string;
          family_id: string;
          email: string;
          invited_by: string;
          created_at?: string;
          accepted_at?: string | null;
        };
        Update: {
          id?: string;
          family_id?: string;
          email?: string;
          invited_by?: string;
          created_at?: string;
          accepted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'family_invitations_family_id_fkey';
            columns: ['family_id'];
            referencedRelation: 'families';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_family_member: {
        Args: { _family_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
