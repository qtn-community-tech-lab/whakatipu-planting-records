export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      areas: {
        Row: {
          class: Database["public"]["Enums"]["site_class"] | null;
          created_at: string;
          created_by: string | null;
          description: string;
          lat: number | null;
          lng: number | null;
          name: string;
          pin_checked_on: string | null;
          pin_source_url: string | null;
          radius_m: number | null;
          retired_at: string | null;
          site: string;
          slug: string;
          updated_at: string;
          updated_by: string | null;
          wrt_number: string | null;
        };
        ComputedFields: never;
        Insert: {
          class?: Database["public"]["Enums"]["site_class"] | null;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          lat?: number | null;
          lng?: number | null;
          name: string;
          pin_checked_on?: string | null;
          pin_source_url?: string | null;
          radius_m?: number | null;
          retired_at?: string | null;
          site: string;
          slug: string;
          updated_at?: string;
          updated_by?: string | null;
          wrt_number?: string | null;
        };
        Update: {
          class?: Database["public"]["Enums"]["site_class"] | null;
          created_at?: string;
          created_by?: string | null;
          description?: string;
          lat?: number | null;
          lng?: number | null;
          name?: string;
          pin_checked_on?: string | null;
          pin_source_url?: string | null;
          radius_m?: number | null;
          retired_at?: string | null;
          site?: string;
          slug?: string;
          updated_at?: string;
          updated_by?: string | null;
          wrt_number?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "areas_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "areas_site_fkey";
            columns: ["site"];
            isOneToOne: false;
            referencedRelation: "line_details";
            referencedColumns: ["site"];
          },
          {
            foreignKeyName: "areas_site_fkey";
            columns: ["site"];
            isOneToOne: false;
            referencedRelation: "sites";
            referencedColumns: ["slug"];
          },
          {
            foreignKeyName: "areas_site_fkey";
            columns: ["site"];
            isOneToOne: false;
            referencedRelation: "totals_by_area";
            referencedColumns: ["site"];
          },
          {
            foreignKeyName: "areas_site_fkey";
            columns: ["site"];
            isOneToOne: false;
            referencedRelation: "totals_by_site";
            referencedColumns: ["site"];
          },
          {
            foreignKeyName: "areas_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      notes: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: number;
          kind: Database["public"]["Enums"]["note_kind"];
          line: number;
          question: string;
          resolved_at: string | null;
          retired_at: string | null;
          text: string;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: never;
          kind: Database["public"]["Enums"]["note_kind"];
          line: number;
          question: string;
          resolved_at?: string | null;
          retired_at?: string | null;
          text?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: never;
          kind?: Database["public"]["Enums"]["note_kind"];
          line?: number;
          question?: string;
          resolved_at?: string | null;
          retired_at?: string | null;
          text?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "notes_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notes_line_fkey";
            columns: ["line"];
            isOneToOne: false;
            referencedRelation: "line_details";
            referencedColumns: ["line_id"];
          },
          {
            foreignKeyName: "notes_line_fkey";
            columns: ["line"];
            isOneToOne: false;
            referencedRelation: "planting_lines";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notes_question_fkey";
            columns: ["question"];
            isOneToOne: false;
            referencedRelation: "questions";
            referencedColumns: ["slug"];
          },
          {
            foreignKeyName: "notes_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      planting_lines: {
        Row: {
          created_at: string;
          created_by: string | null;
          id: number;
          legacy_code: string | null;
          planting: number;
          quantity: number | null;
          retired_at: string | null;
          source_cell: string | null;
          species: string;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          id?: never;
          legacy_code?: string | null;
          planting: number;
          quantity?: number | null;
          retired_at?: string | null;
          source_cell?: string | null;
          species: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          id?: never;
          legacy_code?: string | null;
          planting?: number;
          quantity?: number | null;
          retired_at?: string | null;
          source_cell?: string | null;
          species?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "planting_lines_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "planting_lines_planting_fkey";
            columns: ["planting"];
            isOneToOne: false;
            referencedRelation: "line_details";
            referencedColumns: ["planting_id"];
          },
          {
            foreignKeyName: "planting_lines_planting_fkey";
            columns: ["planting"];
            isOneToOne: false;
            referencedRelation: "plantings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "planting_lines_species_fkey";
            columns: ["species"];
            isOneToOne: false;
            referencedRelation: "line_details";
            referencedColumns: ["species"];
          },
          {
            foreignKeyName: "planting_lines_species_fkey";
            columns: ["species"];
            isOneToOne: false;
            referencedRelation: "species";
            referencedColumns: ["slug"];
          },
          {
            foreignKeyName: "planting_lines_species_fkey";
            columns: ["species"];
            isOneToOne: false;
            referencedRelation: "totals_by_species";
            referencedColumns: ["species"];
          },
          {
            foreignKeyName: "planting_lines_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      plantings: {
        Row: {
          area: string;
          created_at: string;
          created_by: string | null;
          id: number;
          notes: string;
          planted_on: string | null;
          retired_at: string | null;
          season: number;
          source: Database["public"]["Enums"]["planting_source"];
          type: Database["public"]["Enums"]["planting_type"] | null;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          area: string;
          created_at?: string;
          created_by?: string | null;
          id?: never;
          notes?: string;
          planted_on?: string | null;
          retired_at?: string | null;
          season: number;
          source?: Database["public"]["Enums"]["planting_source"];
          type?: Database["public"]["Enums"]["planting_type"] | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          area?: string;
          created_at?: string;
          created_by?: string | null;
          id?: never;
          notes?: string;
          planted_on?: string | null;
          retired_at?: string | null;
          season?: number;
          source?: Database["public"]["Enums"]["planting_source"];
          type?: Database["public"]["Enums"]["planting_type"] | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "plantings_area_fkey";
            columns: ["area"];
            isOneToOne: false;
            referencedRelation: "areas";
            referencedColumns: ["slug"];
          },
          {
            foreignKeyName: "plantings_area_fkey";
            columns: ["area"];
            isOneToOne: false;
            referencedRelation: "line_details";
            referencedColumns: ["area"];
          },
          {
            foreignKeyName: "plantings_area_fkey";
            columns: ["area"];
            isOneToOne: false;
            referencedRelation: "totals_by_area";
            referencedColumns: ["area"];
          },
          {
            foreignKeyName: "plantings_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "plantings_season_fkey";
            columns: ["season"];
            isOneToOne: false;
            referencedRelation: "line_details";
            referencedColumns: ["season_order"];
          },
          {
            foreignKeyName: "plantings_season_fkey";
            columns: ["season"];
            isOneToOne: false;
            referencedRelation: "seasons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "plantings_season_fkey";
            columns: ["season"];
            isOneToOne: false;
            referencedRelation: "totals_by_season";
            referencedColumns: ["season_order"];
          },
          {
            foreignKeyName: "plantings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      questions: {
        Row: {
          created_at: string;
          created_by: string | null;
          question: string;
          retired_at: string | null;
          ruled_by: string | null;
          ruled_on: string | null;
          ruling: string | null;
          slug: string;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          question: string;
          retired_at?: string | null;
          ruled_by?: string | null;
          ruled_on?: string | null;
          ruling?: string | null;
          slug: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          question?: string;
          retired_at?: string | null;
          ruled_by?: string | null;
          ruled_on?: string | null;
          ruling?: string | null;
          slug?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "questions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "questions_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      seasons: {
        Row: {
          half: Database["public"]["Enums"]["season_half"];
          id: number;
          label: string;
          slug: string;
          workbook_cell: string | null;
          workbook_total: number | null;
          year: number;
        };
        ComputedFields: never;
        Insert: {
          half: Database["public"]["Enums"]["season_half"];
          id: number;
          label: string;
          slug: string;
          workbook_cell?: string | null;
          workbook_total?: number | null;
          year: number;
        };
        Update: {
          half?: Database["public"]["Enums"]["season_half"];
          id?: number;
          label?: string;
          slug?: string;
          workbook_cell?: string | null;
          workbook_total?: number | null;
          year?: number;
        };
        Relationships: [];
      };
      sites: {
        Row: {
          created_at: string;
          created_by: string | null;
          description: string;
          is_scheme: boolean;
          name: string;
          retired_at: string | null;
          slug: string;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by?: string | null;
          description?: string;
          is_scheme?: boolean;
          name: string;
          retired_at?: string | null;
          slug: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          description?: string;
          is_scheme?: boolean;
          name?: string;
          retired_at?: string | null;
          slug?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "sites_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "sites_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      species: {
        Row: {
          common_name: string | null;
          contested_group: string | null;
          created_at: string;
          created_by: string | null;
          maori_name: string | null;
          needs_decision: boolean;
          over_5m: boolean | null;
          photos: NonNullable<Json>;
          profile: NonNullable<Json>;
          register_code: string | null;
          register_note: string | null;
          retired_at: string | null;
          scientific_name: string;
          slug: string;
          status: Database["public"]["Enums"]["species_status"] | null;
          suggested_spelling: string | null;
          threatened: boolean | null;
          threatened_te_kakano: boolean;
          updated_at: string;
          updated_by: string | null;
        };
        ComputedFields: never;
        Insert: {
          common_name?: string | null;
          contested_group?: string | null;
          created_at?: string;
          created_by?: string | null;
          maori_name?: string | null;
          needs_decision?: boolean;
          over_5m?: boolean | null;
          photos?: NonNullable<Json>;
          profile?: NonNullable<Json>;
          register_code?: string | null;
          register_note?: string | null;
          retired_at?: string | null;
          scientific_name: string;
          slug: string;
          status?: Database["public"]["Enums"]["species_status"] | null;
          suggested_spelling?: string | null;
          threatened?: boolean | null;
          threatened_te_kakano?: boolean;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          common_name?: string | null;
          contested_group?: string | null;
          created_at?: string;
          created_by?: string | null;
          maori_name?: string | null;
          needs_decision?: boolean;
          over_5m?: boolean | null;
          photos?: NonNullable<Json>;
          profile?: NonNullable<Json>;
          register_code?: string | null;
          register_note?: string | null;
          retired_at?: string | null;
          scientific_name?: string;
          slug?: string;
          status?: Database["public"]["Enums"]["species_status"] | null;
          suggested_spelling?: string | null;
          threatened?: boolean | null;
          threatened_te_kakano?: boolean;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "species_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "species_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      users: {
        Row: {
          created_at: string;
          id: string;
          is_staff: boolean;
          name: string;
          retired_at: string | null;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id: string;
          is_staff?: boolean;
          name: string;
          retired_at?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_staff?: boolean;
          name?: string;
          retired_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      line_details: {
        Row: {
          area: string | null;
          area_name: string | null;
          class: Database["public"]["Enums"]["site_class"] | null;
          common_name: string | null;
          contested_group: string | null;
          is_scheme: boolean | null;
          legacy_code: string | null;
          line_id: number | null;
          maori_name: string | null;
          needs_review: boolean | null;
          planted_on: string | null;
          planting_id: number | null;
          quantity: number | null;
          scientific_name: string | null;
          season: string | null;
          season_label: string | null;
          season_order: number | null;
          site: string | null;
          site_name: string | null;
          source: Database["public"]["Enums"]["planting_source"] | null;
          species: string | null;
          threatened: boolean | null;
          wrt_number: string | null;
          year: number | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
      totals_by_area: {
        Row: {
          area: string | null;
          area_name: string | null;
          class: Database["public"]["Enums"]["site_class"] | null;
          lines: number | null;
          lines_unknown: number | null;
          plants: number | null;
          plants_confirmed: number | null;
          plants_needs_review: number | null;
          site: string | null;
          site_name: string | null;
          species: number | null;
          wrt_number: string | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
      totals_by_season: {
        Row: {
          lines: number | null;
          plants: number | null;
          plants_confirmed: number | null;
          plants_needs_review: number | null;
          season: string | null;
          season_label: string | null;
          season_order: number | null;
          sites: number | null;
          species: number | null;
          workbook_total: number | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
      totals_by_site: {
        Row: {
          first_season: number | null;
          is_scheme: boolean | null;
          last_season: number | null;
          lines: number | null;
          lines_unknown: number | null;
          plants: number | null;
          plants_confirmed: number | null;
          plants_needs_review: number | null;
          site: string | null;
          site_name: string | null;
          species: number | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
      totals_by_species: {
        Row: {
          common_name: string | null;
          lines: number | null;
          lines_unknown: number | null;
          maori_name: string | null;
          plants: number | null;
          plants_confirmed: number | null;
          plants_needs_review: number | null;
          scientific_name: string | null;
          sites: number | null;
          species: string | null;
        };
        ComputedFields: never;
        Relationships: [];
      };
    };
    Functions: {
      is_staff: { Args: Record<PropertyKey, never>; Returns: boolean };
    };
    Enums: {
      note_kind: "ruling" | "confirm" | "fyi";
      planting_source: "workbook" | "app";
      planting_type: "establishment" | "infill" | "replacement";
      season_half: "autumn" | "spring";
      site_class: "keystone" | "community" | "school";
      species_status: "core" | "appended" | "contested" | "seedlog_only";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      note_kind: ["ruling", "confirm", "fyi"],
      planting_source: ["workbook", "app"],
      planting_type: ["establishment", "infill", "replacement"],
      season_half: ["autumn", "spring"],
      site_class: ["keystone", "community", "school"],
      species_status: ["core", "appended", "contested", "seedlog_only"],
    },
  },
} as const;
