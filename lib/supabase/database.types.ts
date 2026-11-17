
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "ai_usage": {
                  Row: {
                    "cache_read_tokens": number,"cache_write_tokens": number,"cost_usd": number,"created_at": string,"duration_ms": number,"id": string,"input_tokens": number,"model": string,"output_tokens": number,"project_id": string | null,"stage": string,"step": string,"success": boolean,"updated_at": string,"web_searches": number,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cache_read_tokens"?: number,"cache_write_tokens"?: number,"cost_usd": number,"created_at"?: string,"duration_ms": number,"id"?: string,"input_tokens": number,"model": string,"output_tokens": number,"project_id"?: string | null,"stage": string,"step": string,"success": boolean,"updated_at"?: string,"web_searches"?: number,"workspace_id": string
                  }
                  Update: {
                    "cache_read_tokens"?: number,"cache_write_tokens"?: number,"cost_usd"?: number,"created_at"?: string,"duration_ms"?: number,"id"?: string,"input_tokens"?: number,"model"?: string,"output_tokens"?: number,"project_id"?: string | null,"stage"?: string,"step"?: string,"success"?: boolean,"updated_at"?: string,"web_searches"?: number,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ai_usage_project_id_projects_id_fk"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ai_usage_workspace_id_workspaces_id_fk"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"allowlist_entries": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"kind": string,"updated_at": string,"value": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"kind": string,"updated_at"?: string,"value": string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"kind"?: string,"updated_at"?: string,"value"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "allowlist_entries_created_by_members_id_fk"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "allowlist_entries_workspace_id_workspaces_id_fk"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"events": {
                  Row: {
                    "created_at": string,"id": string,"member_id": string | null,"name": string,"props": NonNullable<Json>,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"member_id"?: string | null,"name": string,"props"?: NonNullable<Json>,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"member_id"?: string | null,"name"?: string,"props"?: NonNullable<Json>,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "events_member_id_members_id_fk"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "events_workspace_id_workspaces_id_fk"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"intakes": {
                  Row: {
                    "approved_at": string | null,"approved_by": string | null,"audience_context": string | null,"behavioural_objective": string | null,"business_objective": string | null,"constraints": string | null,"created_at": string,"figma_link": string | null,"low_specificity": NonNullable<Json>,"project_id": string,"sector": string | null,"sector_other": string | null,"updated_at": string,"version": number,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_at"?: string | null,"approved_by"?: string | null,"audience_context"?: string | null,"behavioural_objective"?: string | null,"business_objective"?: string | null,"constraints"?: string | null,"created_at"?: string,"figma_link"?: string | null,"low_specificity"?: NonNullable<Json>,"project_id": string,"sector"?: string | null,"sector_other"?: string | null,"updated_at"?: string,"version"?: number,"workspace_id": string
                  }
                  Update: {
                    "approved_at"?: string | null,"approved_by"?: string | null,"audience_context"?: string | null,"behavioural_objective"?: string | null,"business_objective"?: string | null,"constraints"?: string | null,"created_at"?: string,"figma_link"?: string | null,"low_specificity"?: NonNullable<Json>,"project_id"?: string,"sector"?: string | null,"sector_other"?: string | null,"updated_at"?: string,"version"?: number,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "intakes_approved_by_members_id_fk"
      columns: ["approved_by"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "intakes_project_id_projects_id_fk"
      columns: ["project_id"]
isOneToOne: true
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "intakes_workspace_id_workspaces_id_fk"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"members": {
                  Row: {
                    "active": boolean,"created_at": string,"display_name": string | null,"email": string,"id": string,"onboarded_at": string | null,"role": string,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "active"?: boolean,"created_at"?: string,"display_name"?: string | null,"email": string,"id": string,"onboarded_at"?: string | null,"role"?: string,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "active"?: boolean,"created_at"?: string,"display_name"?: string | null,"email"?: string,"id"?: string,"onboarded_at"?: string | null,"role"?: string,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "members_workspace_id_workspaces_id_fk"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"principle_relations": {
                  Row: {
                    "created_at": string,"from_id": string,"id": string,"to_id": string,"updated_at": string,"version_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"from_id": string,"id"?: string,"to_id": string,"updated_at"?: string,"version_id": string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"from_id"?: string,"id"?: string,"to_id"?: string,"updated_at"?: string,"version_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "principle_relations_from_id_principles_id_fk"
      columns: ["from_id"]
isOneToOne: false
      referencedRelation: "principles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "principle_relations_to_id_principles_id_fk"
      columns: ["to_id"]
isOneToOne: false
      referencedRelation: "principles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "principle_relations_version_id_toolkit_versions_id_fk"
      columns: ["version_id"]
isOneToOne: false
      referencedRelation: "toolkit_versions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "principle_relations_workspace_id_workspaces_id_fk"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"principles": {
                  Row: {
                    "created_at": string,"design_lever": string | null,"evidence": string | null,"evidence_level": string,"examples": string | null,"extended_explanation": string | null,"general_goal": string,"id": string,"link_to_paper": string | null,"mechanism": string,"name": string,"outcome": string | null,"principle_key": string,"quick_insight": string | null,"reference": string | null,"related_raw": string | null,"sense": string | null,"sub_goal": string,"updated_at": string,"version_id": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"design_lever"?: string | null,"evidence"?: string | null,"evidence_level": string,"examples"?: string | null,"extended_explanation"?: string | null,"general_goal": string,"id"?: string,"link_to_paper"?: string | null,"mechanism": string,"name": string,"outcome"?: string | null,"principle_key": string,"quick_insight"?: string | null,"reference"?: string | null,"related_raw"?: string | null,"sense"?: string | null,"sub_goal": string,"updated_at"?: string,"version_id": string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"design_lever"?: string | null,"evidence"?: string | null,"evidence_level"?: string,"examples"?: string | null,"extended_explanation"?: string | null,"general_goal"?: string,"id"?: string,"link_to_paper"?: string | null,"mechanism"?: string,"name"?: string,"outcome"?: string | null,"principle_key"?: string,"quick_insight"?: string | null,"reference"?: string | null,"related_raw"?: string | null,"sense"?: string | null,"sub_goal"?: string,"updated_at"?: string,"version_id"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "principles_version_id_toolkit_versions_id_fk"
      columns: ["version_id"]
isOneToOne: false
      referencedRelation: "toolkit_versions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "principles_workspace_id_workspaces_id_fk"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"project_ratings": {
                  Row: {
                    "created_at": string,"id": string,"member_id": string,"project_id": string,"rating": number,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"member_id": string,"project_id": string,"rating": number,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"member_id"?: string,"project_id"?: string,"rating"?: number,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "project_ratings_member_id_members_id_fk"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_ratings_project_id_projects_id_fk"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "project_ratings_workspace_id_workspaces_id_fk"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"projects": {
                  Row: {
                    "archived_at": string | null,"channel": string,"client_label": string | null,"cost_cap_override_gbp": number | null,"created_at": string,"created_by": string,"current_stage": string,"id": string,"mode": string,"name": string,"status": string,"toolkit_version_id": string | null,"updated_at": string,"updated_by": string,"variants_per_rec": number,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "archived_at"?: string | null,"channel": string,"client_label"?: string | null,"cost_cap_override_gbp"?: number | null,"created_at"?: string,"created_by": string,"current_stage"?: string,"id"?: string,"mode": string,"name": string,"status"?: string,"toolkit_version_id"?: string | null,"updated_at"?: string,"updated_by": string,"variants_per_rec"?: number,"workspace_id": string
                  }
                  Update: {
                    "archived_at"?: string | null,"channel"?: string,"client_label"?: string | null,"cost_cap_override_gbp"?: number | null,"created_at"?: string,"created_by"?: string,"current_stage"?: string,"id"?: string,"mode"?: string,"name"?: string,"status"?: string,"toolkit_version_id"?: string | null,"updated_at"?: string,"updated_by"?: string,"variants_per_rec"?: number,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "projects_created_by_members_id_fk"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_toolkit_version_id_toolkit_versions_id_fk"
      columns: ["toolkit_version_id"]
isOneToOne: false
      referencedRelation: "toolkit_versions"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_updated_by_members_id_fk"
      columns: ["updated_by"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "projects_workspace_id_workspaces_id_fk"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"toolkit_candidates": {
                  Row: {
                    "created_at": string,"id": string,"mechanism": string | null,"name": string,"project_id": string,"source_id": string,"updated_at": string,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"mechanism"?: string | null,"name": string,"project_id": string,"source_id": string,"updated_at"?: string,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"mechanism"?: string | null,"name"?: string,"project_id"?: string,"source_id"?: string,"updated_at"?: string,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "toolkit_candidates_project_id_projects_id_fk"
      columns: ["project_id"]
isOneToOne: false
      referencedRelation: "projects"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "toolkit_candidates_workspace_id_workspaces_id_fk"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"toolkit_versions": {
                  Row: {
                    "created_at": string,"file_name": string,"id": string,"number": number,"principle_count": number,"updated_at": string,"uploaded_by": string,"warnings": NonNullable<Json>,"workspace_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"file_name": string,"id"?: string,"number": number,"principle_count": number,"updated_at"?: string,"uploaded_by": string,"warnings"?: NonNullable<Json>,"workspace_id": string
                  }
                  Update: {
                    "created_at"?: string,"file_name"?: string,"id"?: string,"number"?: number,"principle_count"?: number,"updated_at"?: string,"uploaded_by"?: string,"warnings"?: NonNullable<Json>,"workspace_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "toolkit_versions_uploaded_by_members_id_fk"
      columns: ["uploaded_by"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "toolkit_versions_workspace_id_workspaces_id_fk"
      columns: ["workspace_id"]
isOneToOne: false
      referencedRelation: "workspaces"
      referencedColumns: ["id"]
    }
                  ]
                },"workspaces": {
                  Row: {
                    "agency_services": (string)[],"cost_cap_gbp": number,"created_at": string,"default_toolkit_version_id": string | null,"gbp_per_usd": number,"id": string,"model_prices": NonNullable<Json>,"name": string,"sector_flag_list": (string)[],"sector_refuse_list": (string)[],"stage_models": NonNullable<Json>,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "agency_services"?: (string)[],"cost_cap_gbp"?: number,"created_at"?: string,"default_toolkit_version_id"?: string | null,"gbp_per_usd"?: number,"id"?: string,"model_prices"?: NonNullable<Json>,"name": string,"sector_flag_list"?: (string)[],"sector_refuse_list"?: (string)[],"stage_models"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Update: {
                    "agency_services"?: (string)[],"cost_cap_gbp"?: number,"created_at"?: string,"default_toolkit_version_id"?: string | null,"gbp_per_usd"?: number,"id"?: string,"model_prices"?: NonNullable<Json>,"name"?: string,"sector_flag_list"?: (string)[],"sector_refuse_list"?: (string)[],"stage_models"?: NonNullable<Json>,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "workspaces_default_toolkit_version_id_toolkit_versions_id_fk"
      columns: ["default_toolkit_version_id"]
isOneToOne: false
      referencedRelation: "toolkit_versions"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "allowed_workspace_for":
{ Args: { "email": string }; Returns: string
                           },
"is_admin":
{ Args: { "ws": string }; Returns: boolean
                           },
"is_email_allowed":
{ Args: { "email": string }; Returns: boolean
                           },
"is_member":
{ Args: { "ws": string }; Returns: boolean
                           },
"save_toolkit_version":
{ Args: { "p_file_name": string,"p_principles": Json,"p_relations": Json,"p_warnings": Json }; Returns: {
              "version_id": string,"version_number": number
            }[]
                           },
"set_member_active":
{ Args: { "is_active": boolean,"member_id": string }; Returns: undefined
                           },
"set_member_role":
{ Args: { "member_id": string,"new_role": string }; Returns: undefined
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
