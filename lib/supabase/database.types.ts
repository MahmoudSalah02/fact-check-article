export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      analysis_runs: {
        Row: {
          checked_at: string;
          created_at: string;
          document_id: string;
          error_code: string | null;
          id: string;
          model: string | null;
          provider_response_id: string | null;
          status: Database["public"]["Enums"]["run_status"];
          updated_at: string;
        };
        Insert: {
          checked_at: string;
          created_at?: string;
          document_id: string;
          error_code?: string | null;
          id?: string;
          model?: string | null;
          provider_response_id?: string | null;
          status?: Database["public"]["Enums"]["run_status"];
          updated_at?: string;
        };
        Update: {
          checked_at?: string;
          created_at?: string;
          document_id?: string;
          error_code?: string | null;
          id?: string;
          model?: string | null;
          provider_response_id?: string | null;
          status?: Database["public"]["Enums"]["run_status"];
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "analysis_runs_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
        ];
      };
      documents: {
        Row: {
          created_at: string;
          id: string;
          original_text: string;
          title: string | null;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          original_text: string;
          title?: string | null;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          original_text?: string;
          title?: string | null;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      edit_decisions: {
        Row: {
          decided_at: string;
          decision: Database["public"]["Enums"]["edit_decision_value"];
          finding_id: string;
          user_id: string;
        };
        Insert: {
          decided_at?: string;
          decision: Database["public"]["Enums"]["edit_decision_value"];
          finding_id: string;
          user_id: string;
        };
        Update: {
          decided_at?: string;
          decision?: Database["public"]["Enums"]["edit_decision_value"];
          finding_id?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "edit_decisions_finding_id_fkey";
            columns: ["finding_id"];
            isOneToOne: false;
            referencedRelation: "findings";
            referencedColumns: ["id"];
          },
        ];
      };
      findings: {
        Row: {
          claim_type: Database["public"]["Enums"]["claim_type"];
          confidence: Database["public"]["Enums"]["confidence_level"];
          created_at: string;
          end_offset: number;
          explanation: string;
          forecast_status:
            Database["public"]["Enums"]["forecast_status"] | null;
          id: string;
          prefix_text: string | null;
          replacement: string | null;
          run_id: string;
          source_text: string;
          start_offset: number;
          suffix_text: string | null;
          verdict: Database["public"]["Enums"]["finding_verdict"];
        };
        Insert: {
          claim_type: Database["public"]["Enums"]["claim_type"];
          confidence: Database["public"]["Enums"]["confidence_level"];
          created_at?: string;
          end_offset: number;
          explanation: string;
          forecast_status?:
            Database["public"]["Enums"]["forecast_status"] | null;
          id: string;
          prefix_text?: string | null;
          replacement?: string | null;
          run_id: string;
          source_text: string;
          start_offset: number;
          suffix_text?: string | null;
          verdict: Database["public"]["Enums"]["finding_verdict"];
        };
        Update: {
          claim_type?: Database["public"]["Enums"]["claim_type"];
          confidence?: Database["public"]["Enums"]["confidence_level"];
          created_at?: string;
          end_offset?: number;
          explanation?: string;
          forecast_status?:
            Database["public"]["Enums"]["forecast_status"] | null;
          id?: string;
          prefix_text?: string | null;
          replacement?: string | null;
          run_id?: string;
          source_text?: string;
          start_offset?: number;
          suffix_text?: string | null;
          verdict?: Database["public"]["Enums"]["finding_verdict"];
        };
        Relationships: [
          {
            foreignKeyName: "findings_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "analysis_runs";
            referencedColumns: ["id"];
          },
        ];
      };
      sources: {
        Row: {
          finding_id: string;
          id: string;
          ordinal: number;
          published_at: string | null;
          publisher: string | null;
          title: string;
          url: string;
        };
        Insert: {
          finding_id: string;
          id?: string;
          ordinal: number;
          published_at?: string | null;
          publisher?: string | null;
          title: string;
          url: string;
        };
        Update: {
          finding_id?: string;
          id?: string;
          ordinal?: number;
          published_at?: string | null;
          publisher?: string | null;
          title?: string;
          url?: string;
        };
        Relationships: [
          {
            foreignKeyName: "sources_finding_id_fkey";
            columns: ["finding_id"];
            isOneToOne: false;
            referencedRelation: "findings";
            referencedColumns: ["id"];
          },
        ];
      };
      webhook_events: {
        Row: {
          event_id: string;
          event_type: string;
          received_at: string;
          run_id: string | null;
        };
        Insert: {
          event_id: string;
          event_type: string;
          received_at?: string;
          run_id?: string | null;
        };
        Update: {
          event_id?: string;
          event_type?: string;
          received_at?: string;
          run_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "webhook_events_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "analysis_runs";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      complete_analysis_run: {
        Args: {
          p_findings: Json;
          p_model: string;
          p_provider_response_id: string;
          p_run_id: string;
        };
        Returns: undefined;
      };
      create_analysis_run: {
        Args: {
          p_checked_at: string;
          p_original_text: string;
          p_title?: string;
        };
        Returns: {
          created_at: string;
          document_id: string;
          run_id: string;
          status: Database["public"]["Enums"]["run_status"];
        }[];
      };
      set_finding_decision: {
        Args: {
          p_decision: Database["public"]["Enums"]["edit_decision_value"];
          p_finding_id: string;
        };
        Returns: {
          decided_at: string;
          decision: Database["public"]["Enums"]["edit_decision_value"];
          finding_id: string;
        }[];
      };
    };
    Enums: {
      claim_type: "fact" | "forecast" | "opinion";
      confidence_level: "high" | "medium" | "low";
      edit_decision_value: "accepted" | "rejected" | "restored";
      finding_verdict:
        | "verified"
        | "outdated"
        | "contradicted"
        | "unsupported"
        | "needs_context"
        | "unresolved"
        | "opinion";
      forecast_status:
        | "pending"
        | "on_track"
        | "revised"
        | "fulfilled"
        | "missed"
        | "not_measurable";
      run_status: "queued" | "in_progress" | "completed" | "failed";
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      claim_type: ["fact", "forecast", "opinion"],
      confidence_level: ["high", "medium", "low"],
      edit_decision_value: ["accepted", "rejected", "restored"],
      finding_verdict: [
        "verified",
        "outdated",
        "contradicted",
        "unsupported",
        "needs_context",
        "unresolved",
        "opinion",
      ],
      forecast_status: [
        "pending",
        "on_track",
        "revised",
        "fulfilled",
        "missed",
        "not_measurable",
      ],
      run_status: ["queued", "in_progress", "completed", "failed"],
    },
  },
} as const;
