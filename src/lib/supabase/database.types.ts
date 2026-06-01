export type ThemePreference = "light" | "dark" | "system";
export type ReadingCloseBehavior = "minimize" | "close";
export type ProfileRole = "reader" | "admin";
export type ProfileAccessStatus = "pending" | "active" | "paused" | "suspended";
export type BookStatus = "quero_ler" | "lendo" | "pausado" | "lido";
export type ReadingOrigin = "historico" | "serene";
export type ReadingSessionStatus = "active" | "paused" | "finished" | "cancelled";
export type AnnotationType =
  | "quick_note"
  | "reflection"
  | "highlight"
  | "post_it"
  | "flag"
  | "doubt"
  | "thought"
  | "idea"
  | "action"
  | "ocr_page";
export type AnnotationOrigin = "manual" | "reading" | "mural" | "retroactive" | "camera" | "ocr";
export type AnnotationReviewStatus = "none" | "to_review" | "reviewed";
export type MuralSuggestionStatus = "available" | "used" | "hidden" | "deleted";
export type FeedbackType =
  | "Bug"
  | "Suggestion"
  | "Difficulty"
  | "Confusing"
  | "Liked"
  | "New idea";
export type FeedbackScreen =
  | "Home"
  | "Biblioteca"
  | "Leitura"
  | "Mural"
  | "Anotações"
  | "Mente"
  | "Configurações"
  | "Outro";
export type FeedbackStatus = "new" | "reviewing" | "planned" | "resolved" | "closed";
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
      profiles: {
        Row: {
          id: string;
          name: string | null;
          email: string | null;
          avatar_url: string | null;
          role: ProfileRole;
          is_beta_tester: boolean;
          access_status: ProfileAccessStatus;
          theme_preference: ThemePreference;
          reduced_motion_enabled: boolean;
          reading_close_behavior: ReadingCloseBehavior;
          pressure_free_mode_enabled: boolean;
          created_at: string;
          last_seen_at: string | null;
          updated_at: string;
        };
        Insert: {
          id: string;
          name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          role?: ProfileRole;
          is_beta_tester?: boolean;
          access_status?: ProfileAccessStatus;
          theme_preference?: ThemePreference;
          reduced_motion_enabled?: boolean;
          reading_close_behavior?: ReadingCloseBehavior;
          pressure_free_mode_enabled?: boolean;
          created_at?: string;
          last_seen_at?: string | null;
          updated_at?: string;
        };
        Update: {
          name?: string | null;
          email?: string | null;
          avatar_url?: string | null;
          role?: ProfileRole;
          is_beta_tester?: boolean;
          access_status?: ProfileAccessStatus;
          theme_preference?: ThemePreference;
          reduced_motion_enabled?: boolean;
          reading_close_behavior?: ReadingCloseBehavior;
          pressure_free_mode_enabled?: boolean;
          last_seen_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      books: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          author: string | null;
          cover_url: string | null;
          description: string | null;
          publisher: string | null;
          edition: string | null;
          publication_year: number | null;
          total_pages: number | null;
          current_page: number;
          status: BookStatus;
          source: string;
          reading_origin: ReadingOrigin;
          is_current: boolean;
          is_private: boolean;
          show_in_home: boolean;
          show_in_notifications: boolean;
          show_in_mente: boolean;
          include_in_quick_exports: boolean;
          estimated_reading_seconds: number | null;
          estimated_reading_source: string | null;
          estimated_reading_confidence: string | null;
          read_before_serene: boolean;
          completed_inside_serene: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          author?: string | null;
          cover_url?: string | null;
          description?: string | null;
          publisher?: string | null;
          edition?: string | null;
          publication_year?: number | null;
          total_pages?: number | null;
          current_page?: number;
          status?: BookStatus;
          source?: string;
          reading_origin?: ReadingOrigin;
          is_current?: boolean;
          is_private?: boolean;
          show_in_home?: boolean;
          show_in_notifications?: boolean;
          show_in_mente?: boolean;
          include_in_quick_exports?: boolean;
          estimated_reading_seconds?: number | null;
          estimated_reading_source?: string | null;
          estimated_reading_confidence?: string | null;
          read_before_serene?: boolean;
          completed_inside_serene?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          author?: string | null;
          cover_url?: string | null;
          description?: string | null;
          publisher?: string | null;
          edition?: string | null;
          publication_year?: number | null;
          total_pages?: number | null;
          current_page?: number;
          status?: BookStatus;
          source?: string;
          reading_origin?: ReadingOrigin;
          is_current?: boolean;
          is_private?: boolean;
          show_in_home?: boolean;
          show_in_notifications?: boolean;
          show_in_mente?: boolean;
          include_in_quick_exports?: boolean;
          estimated_reading_seconds?: number | null;
          estimated_reading_source?: string | null;
          estimated_reading_confidence?: string | null;
          read_before_serene?: boolean;
          completed_inside_serene?: boolean;
          deleted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      manual_categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string | null;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string | null;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          color?: string | null;
          deleted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      book_manual_categories: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          category_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_id: string;
          category_id: string;
          created_at?: string;
        };
        Update: {
          book_id?: string;
          category_id?: string;
        };
        Relationships: [];
      };
      reading_sessions: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          started_at: string;
          ended_at: string | null;
          status: ReadingSessionStatus;
          active_seconds: number;
          paused_seconds: number;
          start_page: number | null;
          end_page: number | null;
          current_page_snapshot: number | null;
          opened_from: string | null;
          is_minimized: boolean;
          mural_opened: boolean;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_id: string;
          started_at?: string;
          ended_at?: string | null;
          status?: ReadingSessionStatus;
          active_seconds?: number;
          paused_seconds?: number;
          start_page?: number | null;
          end_page?: number | null;
          current_page_snapshot?: number | null;
          opened_from?: string | null;
          is_minimized?: boolean;
          mural_opened?: boolean;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          ended_at?: string | null;
          status?: ReadingSessionStatus;
          active_seconds?: number;
          paused_seconds?: number;
          start_page?: number | null;
          end_page?: number | null;
          current_page_snapshot?: number | null;
          opened_from?: string | null;
          is_minimized?: boolean;
          mural_opened?: boolean;
          deleted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      reading_pauses: {
        Row: {
          id: string;
          user_id: string;
          session_id: string;
          paused_at: string;
          resumed_at: string | null;
          duration_seconds: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id: string;
          paused_at: string;
          resumed_at?: string | null;
          duration_seconds?: number;
          created_at?: string;
        };
        Update: {
          paused_at?: string;
          resumed_at?: string | null;
          duration_seconds?: number;
        };
        Relationships: [];
      };
      annotations: {
        Row: {
          id: string;
          user_id: string;
          book_id: string | null;
          session_id: string | null;
          type: AnnotationType;
          content: string | null;
          page_number: number | null;
          color: string | null;
          text_color: string | null;
          highlight_color: string | null;
          origin: AnnotationOrigin;
          is_favorite: boolean;
          is_private: boolean;
          review_status: AnnotationReviewStatus;
          deleted_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_id?: string | null;
          session_id?: string | null;
          type?: AnnotationType;
          content?: string | null;
          page_number?: number | null;
          color?: string | null;
          text_color?: string | null;
          highlight_color?: string | null;
          origin?: AnnotationOrigin;
          is_favorite?: boolean;
          is_private?: boolean;
          review_status?: AnnotationReviewStatus;
          deleted_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          book_id?: string | null;
          session_id?: string | null;
          type?: AnnotationType;
          content?: string | null;
          page_number?: number | null;
          color?: string | null;
          text_color?: string | null;
          highlight_color?: string | null;
          origin?: AnnotationOrigin;
          is_favorite?: boolean;
          is_private?: boolean;
          review_status?: AnnotationReviewStatus;
          deleted_at?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      annotation_mural_positions: {
        Row: {
          id: string;
          user_id: string;
          annotation_id: string;
          session_id: string | null;
          book_id: string | null;
          x: number | null;
          y: number | null;
          width: number | null;
          height: number | null;
          rotation: number;
          z_index: number;
          is_visible: boolean;
          is_suggested: boolean;
          suggested_slot: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          annotation_id: string;
          session_id?: string | null;
          book_id?: string | null;
          x?: number | null;
          y?: number | null;
          width?: number | null;
          height?: number | null;
          rotation?: number;
          z_index?: number;
          is_visible?: boolean;
          is_suggested?: boolean;
          suggested_slot?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          annotation_id?: string;
          session_id?: string | null;
          book_id?: string | null;
          x?: number | null;
          y?: number | null;
          width?: number | null;
          height?: number | null;
          rotation?: number;
          z_index?: number;
          is_visible?: boolean;
          is_suggested?: boolean;
          suggested_slot?: number | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      mural_suggestions: {
        Row: {
          id: string;
          user_id: string;
          session_id: string;
          suggested_type: AnnotationType | null;
          suggested_slot: number;
          x: number | null;
          y: number | null;
          width: number | null;
          height: number | null;
          rotation: number;
          status: MuralSuggestionStatus;
          converted_annotation_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          session_id: string;
          suggested_type?: AnnotationType | null;
          suggested_slot: number;
          x?: number | null;
          y?: number | null;
          width?: number | null;
          height?: number | null;
          rotation?: number;
          status?: MuralSuggestionStatus;
          converted_annotation_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          suggested_type?: AnnotationType | null;
          suggested_slot?: number;
          x?: number | null;
          y?: number | null;
          width?: number | null;
          height?: number | null;
          rotation?: number;
          status?: MuralSuggestionStatus;
          converted_annotation_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      annotation_colors: {
        Row: {
          id: string;
          user_id: string;
          name: string | null;
          color_hex: string;
          applies_to: string | null;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string | null;
          color_hex: string;
          applies_to?: string | null;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string | null;
          color_hex?: string;
          applies_to?: string | null;
          is_default?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      automatic_mente_categories: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          confidence: number | null;
          source: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          confidence?: number | null;
          source?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          confidence?: number | null;
          source?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      book_automatic_mente_categories: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          automatic_category_id: string;
          confidence: number | null;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_id: string;
          automatic_category_id: string;
          confidence?: number | null;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          book_id?: string;
          automatic_category_id?: string;
          confidence?: number | null;
          reason?: string | null;
        };
        Relationships: [];
      };
      timeline_events: {
        Row: {
          id: string;
          user_id: string;
          book_id: string | null;
          session_id: string | null;
          annotation_id: string | null;
          event_type: string;
          title: string | null;
          description: string | null;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_id?: string | null;
          session_id?: string | null;
          annotation_id?: string | null;
          event_type: string;
          title?: string | null;
          description?: string | null;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          book_id?: string | null;
          session_id?: string | null;
          annotation_id?: string | null;
          event_type?: string;
          title?: string | null;
          description?: string | null;
          metadata?: Json | null;
        };
        Relationships: [];
      };
      exports: {
        Row: {
          id: string;
          user_id: string;
          format: string;
          export_type: string | null;
          file_url: string | null;
          included_private_content: boolean;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          format: string;
          export_type?: string | null;
          file_url?: string | null;
          included_private_content?: boolean;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          format?: string;
          export_type?: string | null;
          file_url?: string | null;
          included_private_content?: boolean;
          metadata?: Json | null;
        };
        Relationships: [];
      };
      user_settings: {
        Row: {
          id: string;
          user_id: string;
          key: string;
          value: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          key: string;
          value?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          key?: string;
          value?: Json | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      trash_items: {
        Row: {
          id: string;
          user_id: string;
          item_type: string;
          item_id: string;
          title: string | null;
          deleted_at: string;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          item_type: string;
          item_id: string;
          title?: string | null;
          deleted_at?: string;
          metadata?: Json | null;
        };
        Update: {
          item_type?: string;
          item_id?: string;
          title?: string | null;
          deleted_at?: string;
          metadata?: Json | null;
        };
        Relationships: [];
      };
      feedback: {
        Row: {
          id: string;
          user_id: string;
          type: FeedbackType;
          screen: FeedbackScreen;
          message: string;
          rating: number | null;
          status: FeedbackStatus;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: FeedbackType;
          screen: FeedbackScreen;
          message: string;
          rating?: number | null;
          status?: FeedbackStatus;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          type?: FeedbackType;
          screen?: FeedbackScreen;
          message?: string;
          rating?: number | null;
          status?: FeedbackStatus;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
