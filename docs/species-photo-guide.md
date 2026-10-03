# Species photo guide

The app’s **Species → Top 20 photo guide** page (`/species/photos`) shows the twenty species with the highest recorded plant quantities across all sites and seasons. This includes quantities on records needing review, rather than treating them as verified plantings. At acquisition on 3 October 2026, these species totalled **105,783 of 140,068 recorded plants (75.5%)**. The gallery ranks the current dataset; ties use botanical names. The coverage test flags a changed top twenty for editorial review.

The main Species page shows a thumbnail beside each covered name, with its credit, licence and source link. Each covered species detail page also displays its reference photo. Each of the twenty species now has **three distinct reference images**, sixty in total (58 Wikimedia Commons and two iNaturalist). Whole plants, foliage, flowers, fruit or bark are included where sources allow; the third Austroderia richardii image is an explicitly labelled museum herbarium specimen. The shared catalogue is keyed to WRT’s species IDs. Contested names remain separate; choosing an image does not make a taxonomic ruling or alter planting data.

## Species names and identification profiles

The same twenty species have a reference profile in `data/species-profiles.json`, shown in the photo guide and on each species detail page. Each includes a botanical name, common name, documented Māori names, a short description, identification features, source links and a check date. These are manually reviewed summaries, primarily from Wikipedia, with New Zealand botanical references for gaps. No Wiki MCP was available. Olearia lineata uses NZPCN and the Flora of New Zealand; Olearia fimbriata uses a DOC factsheet. WRT’s own planting guide supports the narrow-leaved tree daisy common name.

An empty Māori-name list displays “Not recorded in the sources checked.” It does not mean no Māori name exists. Shared names are explained, including kōwhai, toetoe and mingimingi/mikimiki. Carmichaelia petriei’s WRT name Mākaka is explicitly marked as a shared broom name without species-specific confirmation. Macrons are retained in display text. Profiles remain separate from WRT’s historical species register and do not change names, quantities or disputed taxa. The Olearia lineata profile notes NZPCN’s newer Shawia lineata name while retaining the database name.

Profile text is bundled with the app; it makes no live Wikipedia request. The source URLs remain available for review and future updates. Hosted reference images still need internet access. To extend coverage, review names and identification details against the species-specific sources, add a profile keyed to the correct species ID and run the coverage tests.

## Photo sources and reuse

`data/species-photos.json` holds the reviewed species mapping, caption, photographer, licence and licence link, Wikimedia Commons file page, Wikipedia article, hosted image URL and source-check date. The browser loads the source-hosted thumbnails directly using `next/image` with `unoptimized`; the app does not download, cache or resize them on its server. No image binaries are committed. Image viewing needs internet access and depends on source availability; planting data stays local. Credits, licence links and source links appear with every photo.

Candidates came from Wikipedia’s lead images and Wikimedia Commons species categories, using the public [PageImages](https://www.mediawiki.org/wiki/Extension:PageImages) and [Imageinfo](https://www.mediawiki.org/wiki/API:Imageinfo) APIs. There was no installed Wiki MCP. Candidate selection was checked against the Commons file descriptions rather than accepting the article’s lead image blindly:

- Olearia lineata and Olearia fimbriata have Commons photos even though their articles returned no lead image.
- Austroderia richardii uses the species-labelled Port Hills photo instead of the Milford Sound photo labelled only “Austroderia sp.”
- Corokia cotoneaster uses a photograph rather than the article’s botanical illustration.
- Podocarpus laetus retains the already-cropped Wiki source and mentions that in its caption.

These are illustrative reference photos taken at other locations. They are not evidence of a planting, its survival, a site identification or its current condition. The app uses rounded, cropped previews with an adjustable focal point to fit the Canopy theme. Full image links open the complete source-hosted reference. Thumbnail files were resized by their source; the app does not edit the downloaded assets. Each asset remains under its stated CC BY, CC BY-SA, CC0 or public-domain terms; see the linked source for full licence details. There is no blanket relicensing of these photos under an application licence.

The catalogue retains the image URLs, dimensions, species mapping and complete attribution so the same references can be downloaded for offline display later. Offline support is not enabled now. A later download process should verify that the source image and licence still match, save the files locally and retain the same credits. To extend coverage now, select a species-labelled reference, check its licence and attribution, add its hosted URL and metadata, and run the catalogue tests.

## Olearia hectorii fallback

Wiki’s species category (spelled “Olearia hectori”) and article provided only one suitable photo. With the user’s approval to use other openly licensed sources, two complementary photos of flower buds and bark were selected from John Barkla’s [research-grade iNaturalist observation](https://www.inaturalist.org/observations/60402502). The API identifies the taxon as Olearia hectorii (404278) and the individual photos as CC BY. The official [iNaturalist licence module](https://github.com/inaturalist/inaturalist/blob/main/app/models/shared/license_module.rb) maps CC BY to version 4.0. Photo-level attribution and source evidence are saved in `data/photo-source-evidence/inaturalist-hectorii.json`; observation coordinates are not copied into the project. Source labels distinguish these photos from Wiki references.

## Browsing sublocations

Site pages link each entry in **Parts of this site** to the records page with both the parent site and exact parcel ID in its URL. The **Part of site** filter lets you switch between registered sublocations or return to all parts. Sorting, pagination and CSV downloads retain that selection; changing or removing the parent site clears it. A species summary shows the selected part’s recorded quantities, including unresolved records. Searching a site-group alias is not a reliable sublocation filter.

The species names link to their detail pages and reference photos where available. A future photo view for a selected sublocation can reuse this catalogue alongside any unresolved source/location notes. The separate wetlands walkthrough has been removed; its earlier version remains in the baseline commit.
