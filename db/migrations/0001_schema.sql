CREATE SCHEMA "legacy";
--> statement-breakpoint
CREATE TYPE "public"."event_source" AS ENUM('workbook', 'app');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('establishment', 'infill', 'replacement');--> statement-breakpoint
CREATE TYPE "public"."location_accuracy" AS ENUM('historic-event', 'landmark', 'surveyed');--> statement-breakpoint
CREATE TYPE "public"."note_kind" AS ENUM('ruling', 'confirm', 'fyi');--> statement-breakpoint
CREATE TYPE "public"."season_name" AS ENUM('Autumn', 'Spring');--> statement-breakpoint
CREATE TYPE "public"."site_class" AS ENUM('keystone', 'community', 'school');--> statement-breakpoint
CREATE TYPE "public"."species_status" AS ENUM('core', 'appended', 'contested', 'seedlog_only');--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"is_staff" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deactivated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "legacy"."imports" (
	"id" text PRIMARY KEY NOT NULL,
	"imported_at" timestamp with time zone DEFAULT now() NOT NULL,
	"files" jsonb NOT NULL,
	"workbook_sha256" text
);
--> statement-breakpoint
ALTER TABLE "legacy"."imports" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "legacy"."planting_history" (
	"record_id" text PRIMARY KEY NOT NULL,
	"year" integer NOT NULL,
	"season" text NOT NULL,
	"season_label_original" text,
	"site_original" text,
	"site_id_proposed" text,
	"site_group_proposed" text,
	"site_class" text,
	"species_original" text,
	"species_id_proposed" text,
	"species_canonical" text,
	"quantity" integer,
	"precision" text,
	"confidence" text,
	"needs_review" text,
	"review_reason" text,
	"source_file" text,
	"source_sheet" text,
	"source_cell" text,
	"import_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "legacy"."planting_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "legacy"."reconciliation" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "legacy"."reconciliation_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"item" text NOT NULL,
	"label" text NOT NULL,
	"generated" integer,
	"stated" integer,
	"difference" integer,
	"stated_cell" text,
	"records" integer,
	"cause" text,
	"import_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "legacy"."reconciliation" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "legacy"."site_crosswalk" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "legacy"."site_crosswalk_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"site_original" text NOT NULL,
	"site_id_as_typed" text,
	"site_id_proposed" text,
	"site_name_proposed" text,
	"site_group" text,
	"class" text,
	"precision" text,
	"confidence" text,
	"needs_review" text,
	"mapping_rule" text,
	"columns" integer,
	"records" integer,
	"plants" integer,
	"seasons_with_records" text,
	"note" text,
	"import_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "legacy"."site_crosswalk" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "legacy"."species_crosswalk" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "legacy"."species_crosswalk_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"species_id" text,
	"raw_name" text NOT NULL,
	"proposed_canonical_name" text,
	"alias_type" text,
	"confidence" text,
	"needs_wrt_decision" text,
	"occurrences" integer,
	"sources" text,
	"note" text,
	"match_key" text,
	"import_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "legacy"."species_crosswalk" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "legacy"."species_register" (
	"species_id" text PRIMARY KEY NOT NULL,
	"canonical_handle" text NOT NULL,
	"suggested_spelling" text,
	"common_name" text,
	"maori_name" text,
	"status" text,
	"in_core_98" text,
	"over_5m" text,
	"threatened" text,
	"needs_wrt_decision" text,
	"contested_with" text,
	"alias_rows" integer,
	"occurrences" integer,
	"source_types" text,
	"note" text,
	"import_id" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "legacy"."species_register" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "site_areas" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "site_areas_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"site_id" integer NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"wrt_number" text,
	"site_class" "site_class",
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid DEFAULT auth.uid(),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deactivated_at" timestamp with time zone,
	CONSTRAINT "site_areas_siteId_slug_unique" UNIQUE("site_id","slug"),
	CONSTRAINT "site_areas_siteId_wrtNumber_unique" UNIQUE("site_id","wrt_number"),
	CONSTRAINT "site_areas_id_site_id_key" UNIQUE("id","site_id")
);
--> statement-breakpoint
ALTER TABLE "site_areas" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "site_locations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "site_locations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"site_id" integer NOT NULL,
	"site_area_id" integer,
	"label" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"radius_m" integer,
	"accuracy" "location_accuracy" NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"source_label" text,
	"source_url" text,
	"coordinate_source_url" text,
	"coordinate_method" text,
	"checked_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid DEFAULT auth.uid(),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deactivated_at" timestamp with time zone,
	CONSTRAINT "site_locations_slug_unique" UNIQUE("slug"),
	CONSTRAINT "latitude_in_range" CHECK ("site_locations"."latitude" between -90 and 90),
	CONSTRAINT "longitude_in_range" CHECK ("site_locations"."longitude" between -180 and 180),
	CONSTRAINT "radius_positive" CHECK ("site_locations"."radius_m" > 0)
);
--> statement-breakpoint
ALTER TABLE "site_locations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sites" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sites_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"is_scheme" boolean DEFAULT false NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid DEFAULT auth.uid(),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deactivated_at" timestamp with time zone,
	CONSTRAINT "sites_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "sites" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "species" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "species_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"scientific_name" text NOT NULL,
	"suggested_spelling" text,
	"common_name" text,
	"maori_name" text,
	"status" "species_status",
	"over_5m" boolean,
	"threatened" boolean,
	"threatened_te_kakano" boolean DEFAULT false NOT NULL,
	"contested_group" text,
	"needs_decision" boolean DEFAULT false NOT NULL,
	"register_note" text,
	"register_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid DEFAULT auth.uid(),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deactivated_at" timestamp with time zone,
	CONSTRAINT "species_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "species" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "species_photos" (
	"species_id" integer NOT NULL,
	"position" smallint NOT NULL,
	"src" text NOT NULL,
	"width" integer,
	"height" integer,
	"caption" text,
	"author" text,
	"license" text,
	"license_url" text,
	"source_name" text,
	"source_url" text,
	"article_url" text,
	"article_label" text,
	"observation_url" text,
	"focal_point" text,
	"retrieved_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid DEFAULT auth.uid(),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deactivated_at" timestamp with time zone,
	CONSTRAINT "species_photos_species_id_position_pk" PRIMARY KEY("species_id","position")
);
--> statement-breakpoint
ALTER TABLE "species_photos" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "species_profiles" (
	"species_id" integer PRIMARY KEY NOT NULL,
	"common_name" text,
	"maori_names" text[] DEFAULT '{}' NOT NULL,
	"name_note" text,
	"summary" text,
	"look_for" text,
	"sources" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"checked_on" date,
	"photos_status" text,
	"photos_note" text,
	"photos_summary" text,
	"photos_checked_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid DEFAULT auth.uid(),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deactivated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "species_profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "line_notes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "line_notes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"line_id" integer NOT NULL,
	"topic_id" integer NOT NULL,
	"kind" "note_kind" NOT NULL,
	"text" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid DEFAULT auth.uid(),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deactivated_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "line_notes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planting_events" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "planting_events_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"site_area_id" integer NOT NULL,
	"season_id" integer NOT NULL,
	"planting_date" date,
	"event_type" "event_type",
	"notes" text DEFAULT '' NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"source" "event_source" DEFAULT 'app' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid DEFAULT auth.uid(),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deactivated_at" timestamp with time zone,
	CONSTRAINT "new_events_have_a_date" CHECK ("planting_events"."source" = 'workbook' or "planting_events"."planting_date" is not null)
);
--> statement-breakpoint
ALTER TABLE "planting_events" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "planting_lines" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "planting_lines_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"event_id" integer NOT NULL,
	"species_id" integer NOT NULL,
	"quantity" integer,
	"needs_review" boolean DEFAULT false NOT NULL,
	"legacy_code" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid DEFAULT auth.uid(),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deactivated_at" timestamp with time zone,
	CONSTRAINT "planting_lines_legacyCode_unique" UNIQUE("legacy_code"),
	CONSTRAINT "quantity_not_negative" CHECK ("planting_lines"."quantity" >= 0)
);
--> statement-breakpoint
ALTER TABLE "planting_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "review_topics" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "review_topics_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"label" text NOT NULL,
	"question" text NOT NULL,
	"decision" text,
	"decided_on" date,
	"decided_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" uuid DEFAULT auth.uid(),
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_by" uuid,
	"deactivated_at" timestamp with time zone,
	CONSTRAINT "review_topics_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "review_topics" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "seasons_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"slug" text NOT NULL,
	"year" smallint NOT NULL,
	"name" "season_name" NOT NULL,
	"label" text NOT NULL,
	"sort_order" smallint NOT NULL,
	"workbook_total" integer,
	"workbook_cell" text,
	CONSTRAINT "seasons_slug_unique" UNIQUE("slug"),
	CONSTRAINT "seasons_year_name_unique" UNIQUE("year","name"),
	CONSTRAINT "season_slug_format" CHECK ("seasons"."slug" ~ '^(autumn|spring)-[0-9]{4}$')
);
--> statement-breakpoint
ALTER TABLE "seasons" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_id_users_id_fk" FOREIGN KEY ("id") REFERENCES "auth"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legacy"."planting_history" ADD CONSTRAINT "planting_history_import_id_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "legacy"."imports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legacy"."reconciliation" ADD CONSTRAINT "reconciliation_import_id_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "legacy"."imports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legacy"."site_crosswalk" ADD CONSTRAINT "site_crosswalk_import_id_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "legacy"."imports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legacy"."species_crosswalk" ADD CONSTRAINT "species_crosswalk_import_id_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "legacy"."imports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "legacy"."species_register" ADD CONSTRAINT "species_register_import_id_imports_id_fk" FOREIGN KEY ("import_id") REFERENCES "legacy"."imports"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_areas" ADD CONSTRAINT "site_areas_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_areas" ADD CONSTRAINT "site_areas_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_areas" ADD CONSTRAINT "site_areas_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_locations" ADD CONSTRAINT "site_locations_site_id_sites_id_fk" FOREIGN KEY ("site_id") REFERENCES "public"."sites"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_locations" ADD CONSTRAINT "site_locations_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_locations" ADD CONSTRAINT "site_locations_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "site_locations" ADD CONSTRAINT "site_locations_site_area_id_site_id_site_areas_id_site_id_fk" FOREIGN KEY ("site_area_id","site_id") REFERENCES "public"."site_areas"("id","site_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sites" ADD CONSTRAINT "sites_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "species" ADD CONSTRAINT "species_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "species" ADD CONSTRAINT "species_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "species_photos" ADD CONSTRAINT "species_photos_species_id_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."species"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "species_photos" ADD CONSTRAINT "species_photos_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "species_photos" ADD CONSTRAINT "species_photos_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "species_profiles" ADD CONSTRAINT "species_profiles_species_id_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."species"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "species_profiles" ADD CONSTRAINT "species_profiles_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "species_profiles" ADD CONSTRAINT "species_profiles_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "line_notes" ADD CONSTRAINT "line_notes_line_id_planting_lines_id_fk" FOREIGN KEY ("line_id") REFERENCES "public"."planting_lines"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "line_notes" ADD CONSTRAINT "line_notes_topic_id_review_topics_id_fk" FOREIGN KEY ("topic_id") REFERENCES "public"."review_topics"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "line_notes" ADD CONSTRAINT "line_notes_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "line_notes" ADD CONSTRAINT "line_notes_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planting_events" ADD CONSTRAINT "planting_events_site_area_id_site_areas_id_fk" FOREIGN KEY ("site_area_id") REFERENCES "public"."site_areas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planting_events" ADD CONSTRAINT "planting_events_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planting_events" ADD CONSTRAINT "planting_events_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planting_events" ADD CONSTRAINT "planting_events_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planting_lines" ADD CONSTRAINT "planting_lines_event_id_planting_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."planting_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planting_lines" ADD CONSTRAINT "planting_lines_species_id_species_id_fk" FOREIGN KEY ("species_id") REFERENCES "public"."species"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planting_lines" ADD CONSTRAINT "planting_lines_legacy_code_planting_history_record_id_fk" FOREIGN KEY ("legacy_code") REFERENCES "legacy"."planting_history"("record_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planting_lines" ADD CONSTRAINT "planting_lines_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planting_lines" ADD CONSTRAINT "planting_lines_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_topics" ADD CONSTRAINT "review_topics_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "review_topics" ADD CONSTRAINT "review_topics_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "one_site_pin" ON "site_locations" USING btree ("site_id") WHERE "site_locations"."site_area_id" is null and "site_locations"."deactivated_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "one_area_pin" ON "site_locations" USING btree ("site_area_id") WHERE "site_locations"."site_area_id" is not null and "site_locations"."deactivated_at" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "one_workbook_event_per_area_season" ON "planting_events" USING btree ("site_area_id","season_id") WHERE "planting_events"."source" = 'workbook';--> statement-breakpoint
CREATE UNIQUE INDEX "one_line_per_species" ON "planting_lines" USING btree ("event_id","species_id") WHERE "planting_lines"."deactivated_at" is null;--> statement-breakpoint
CREATE VIEW "public"."line_details" WITH (security_invoker = true) AS (
  select l.id as line_id, e.id as event_id, l.legacy_code, e.source,
    se.slug as season, se.label as season_label, se.year, se.sort_order as season_order, e.planting_date,
    si.slug as site, si.name as site_name, si.is_scheme,
    a.slug as area, a.name as area_name, a.wrt_number, a.site_class,
    sp.slug as species, sp.scientific_name, sp.common_name, sp.maori_name,
    sp.over_5m, sp.threatened, sp.contested_group,
    l.quantity, l.needs_review
  
  from public.planting_lines l
  join public.planting_events e on e.id = l.event_id
  join public.seasons se       on se.id = e.season_id
  join public.site_areas a     on a.id = e.site_area_id
  join public.sites si         on si.id = a.site_id
  join public.species sp       on sp.id = l.species_id where l.deactivated_at is null and e.deactivated_at is null);--> statement-breakpoint
CREATE VIEW "public"."totals_by_review_topic" WITH (security_invoker = true) AS (
  with flagged as (
    select distinct n.topic_id, l.id, l.quantity
    from public.line_notes n join public.planting_lines l on l.id = n.line_id
    where l.needs_review and n.kind <> 'fyi' and n.deactivated_at is null and l.deactivated_at is null)
  select t.slug as topic, t.label, t.question, t.decision,
    coalesce(sum(f.quantity), 0) as plants_needs_review, count(f.id) as lines_needs_review
  from public.review_topics t left join flagged f on f.topic_id = t.id
  group by t.id);--> statement-breakpoint
CREATE VIEW "public"."totals_by_season" WITH (security_invoker = true) AS (
  select se.slug as season, se.label as season_label, se.sort_order as season_order, 
  coalesce(sum(l.quantity), 0)                                 as plants,
  coalesce(sum(l.quantity) filter (where not l.needs_review), 0) as plants_resolved,
  coalesce(sum(l.quantity) filter (where l.needs_review), 0)   as plants_needs_review,
  count(*)                                                     as lines,
  count(*) filter (where l.needs_review)                       as lines_needs_review,
    count(distinct si.id) as sites, count(distinct sp.id) as species
  
  from public.planting_lines l
  join public.planting_events e on e.id = l.event_id
  join public.seasons se       on se.id = e.season_id
  join public.site_areas a     on a.id = e.site_area_id
  join public.sites si         on si.id = a.site_id
  join public.species sp       on sp.id = l.species_id where l.deactivated_at is null and e.deactivated_at is null group by se.id);--> statement-breakpoint
CREATE VIEW "public"."totals_by_site" WITH (security_invoker = true) AS (
  select si.slug as site, si.name as site_name, si.is_scheme, 
  coalesce(sum(l.quantity), 0)                                 as plants,
  coalesce(sum(l.quantity) filter (where not l.needs_review), 0) as plants_resolved,
  coalesce(sum(l.quantity) filter (where l.needs_review), 0)   as plants_needs_review,
  count(*)                                                     as lines,
  count(*) filter (where l.needs_review)                       as lines_needs_review,
    count(distinct sp.id) as species, min(se.sort_order) as first_season_order, max(se.sort_order) as last_season_order
  
  from public.planting_lines l
  join public.planting_events e on e.id = l.event_id
  join public.seasons se       on se.id = e.season_id
  join public.site_areas a     on a.id = e.site_area_id
  join public.sites si         on si.id = a.site_id
  join public.species sp       on sp.id = l.species_id where l.deactivated_at is null and e.deactivated_at is null group by si.id);--> statement-breakpoint
CREATE VIEW "public"."totals_by_species" WITH (security_invoker = true) AS (
  select sp.slug as species, sp.scientific_name, sp.common_name, sp.maori_name, 
  coalesce(sum(l.quantity), 0)                                 as plants,
  coalesce(sum(l.quantity) filter (where not l.needs_review), 0) as plants_resolved,
  coalesce(sum(l.quantity) filter (where l.needs_review), 0)   as plants_needs_review,
  count(*)                                                     as lines,
  count(*) filter (where l.needs_review)                       as lines_needs_review,
    count(distinct si.id) as sites
  
  from public.planting_lines l
  join public.planting_events e on e.id = l.event_id
  join public.seasons se       on se.id = e.season_id
  join public.site_areas a     on a.id = e.site_area_id
  join public.sites si         on si.id = a.site_id
  join public.species sp       on sp.id = l.species_id where l.deactivated_at is null and e.deactivated_at is null group by sp.id);--> statement-breakpoint
CREATE POLICY "own or staff read" ON "profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ("profiles"."id" = (select auth.uid()) or (select public.is_staff()));--> statement-breakpoint
CREATE POLICY "staff read" ON "legacy"."imports" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "staff read" ON "legacy"."planting_history" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "staff read" ON "legacy"."reconciliation" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "staff read" ON "legacy"."site_crosswalk" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "staff read" ON "legacy"."species_crosswalk" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "staff read" ON "legacy"."species_register" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "staff read" ON "site_areas" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "staff insert" ON "site_areas" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "staff update" ON "site_areas" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select public.is_staff())) WITH CHECK ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "public read" ON "site_areas" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING ("site_areas"."is_public" and "site_areas"."deactivated_at" is null and exists (
    select 1 from public.sites s where s.id = "site_areas"."site_id" and s.is_public and s.deactivated_at is null));--> statement-breakpoint
CREATE POLICY "staff read" ON "site_locations" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "staff insert" ON "site_locations" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "staff update" ON "site_locations" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select public.is_staff())) WITH CHECK ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "public read" ON "site_locations" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING ("site_locations"."deactivated_at" is null and exists (
    select 1 from public.sites s where s.id = "site_locations"."site_id" and s.is_public and s.deactivated_at is null));--> statement-breakpoint
CREATE POLICY "staff read" ON "sites" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "staff insert" ON "sites" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "staff update" ON "sites" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select public.is_staff())) WITH CHECK ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "public read" ON "sites" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING ("sites"."is_public" and "sites"."deactivated_at" is null);--> statement-breakpoint
CREATE POLICY "staff read" ON "species" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "staff insert" ON "species" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "staff update" ON "species" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select public.is_staff())) WITH CHECK ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "public read" ON "species" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING ("species"."deactivated_at" is null);--> statement-breakpoint
CREATE POLICY "staff read" ON "species_photos" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "staff insert" ON "species_photos" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "staff update" ON "species_photos" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select public.is_staff())) WITH CHECK ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "public read" ON "species_photos" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING ("species_photos"."deactivated_at" is null);--> statement-breakpoint
CREATE POLICY "staff read" ON "species_profiles" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "staff insert" ON "species_profiles" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "staff update" ON "species_profiles" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select public.is_staff())) WITH CHECK ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "public read" ON "species_profiles" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING ("species_profiles"."deactivated_at" is null);--> statement-breakpoint
CREATE POLICY "staff read" ON "line_notes" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "staff insert" ON "line_notes" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "staff update" ON "line_notes" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select public.is_staff())) WITH CHECK ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "staff read" ON "planting_events" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "staff insert" ON "planting_events" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "staff update" ON "planting_events" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select public.is_staff())) WITH CHECK ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "public read" ON "planting_events" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING ("planting_events"."is_public" and "planting_events"."deactivated_at" is null);--> statement-breakpoint
CREATE POLICY "staff read" ON "planting_lines" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "staff insert" ON "planting_lines" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "staff update" ON "planting_lines" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select public.is_staff())) WITH CHECK ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "public read" ON "planting_lines" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING ("planting_lines"."deactivated_at" is null and exists (
    select 1 from public.planting_events e where e.id = "planting_lines"."event_id" and e.is_public and e.deactivated_at is null));--> statement-breakpoint
CREATE POLICY "staff read" ON "review_topics" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "staff insert" ON "review_topics" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "staff update" ON "review_topics" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select public.is_staff())) WITH CHECK ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "staff read" ON "seasons" AS PERMISSIVE FOR SELECT TO "authenticated" USING ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "staff insert" ON "seasons" AS PERMISSIVE FOR INSERT TO "authenticated" WITH CHECK ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "staff update" ON "seasons" AS PERMISSIVE FOR UPDATE TO "authenticated" USING ((select public.is_staff())) WITH CHECK ((select public.is_staff()));--> statement-breakpoint
CREATE POLICY "public read" ON "seasons" AS PERMISSIVE FOR SELECT TO "anon", "authenticated" USING (true);