ALTER TABLE "toolkit_candidates" ADD CONSTRAINT "toolkit_candidates_source_id_sources_id_fk" FOREIGN KEY ("source_id") REFERENCES "public"."sources"("id") ON DELETE cascade ON UPDATE no action;
