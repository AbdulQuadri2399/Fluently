
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
            "allowlist_entries": {
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
                },"workspaces": {
                  Row: {
                    "agency_services": (string)[],"cost_cap_gbp": number,"created_at": string,"default_toolkit_version_id": string | null,"gbp_per_usd": number,"id": string,"name": string,"sector_flag_list": (string)[],"sector_refuse_list": (string)[],"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "agency_services"?: (string)[],"cost_cap_gbp"?: number,"created_at"?: string,"default_toolkit_version_id"?: string | null,"gbp_per_usd"?: number,"id"?: string,"name": string,"sector_flag_list"?: (string)[],"sector_refuse_list"?: (string)[],"updated_at"?: string
                  }
                  Update: {
                    "agency_services"?: (string)[],"cost_cap_gbp"?: number,"created_at"?: string,"default_toolkit_version_id"?: string | null,"gbp_per_usd"?: number,"id"?: string,"name"?: string,"sector_flag_list"?: (string)[],"sector_refuse_list"?: (string)[],"updated_at"?: string
                  }
                  Relationships: [
                    
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
