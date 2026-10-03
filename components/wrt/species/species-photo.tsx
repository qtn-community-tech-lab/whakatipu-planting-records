import Image from "next/image";
import Link from "next/link";
import type { SpeciesPhoto } from "@/lib/wrt/species-photos";

/** Framed reference with its full Wiki source and visible attribution. */
export function SpeciesPhotoFigure({ photo }: { photo: SpeciesPhoto }) {
  return (
    <figure className="wrt-photo">
      <a href={photo.src} target="_blank" rel="noreferrer" aria-label={`View the full reference photo of ${photo.scientificName}`}>
        <Image
          src={photo.src} width={photo.width} height={photo.height}
          sizes="(max-width: 600px) 100vw, (max-width: 960px) 50vw, 33vw"
          style={{ objectPosition: photo.focalPoint }} alt={photo.caption} className="wrt-photo__image" unoptimized
        />
      </a>
      <figcaption className="wrt-photo__caption">
        <p>{photo.caption}</p>
        <p>Photo: {photo.author} · <a href={photo.licenseUrl}>{photo.license}</a></p>
        <p><a href={photo.src} target="_blank" rel="noreferrer">Full image</a> · <a href={photo.sourceUrl}>{photo.sourceName === "iNaturalist" ? "iNaturalist photo source" : "Wiki image source"}</a> · <a href={photo.articleUrl}>Wikipedia species page</a></p>
      </figcaption>
    </figure>
  );
}

/** Compact reference used alongside a species name in the main list. */
export function SpeciesPhotoThumbnail({ photo, href }: { photo: SpeciesPhoto; href: string }) {
  return (
    <Link href={href} className="wrt-photo-thumb"
      aria-label={`View reference photos of ${photo.scientificName}`}
      title={`Reference photo: ${photo.caption}`}>
      <Image src={photo.src} width={photo.width} height={photo.height}
        style={{ objectPosition: photo.focalPoint }} alt={photo.caption} unoptimized className="wrt-photo-thumb__image" />
    </Link>
  );
}

export function SpeciesPhotoCredit({ photo }: { photo: SpeciesPhoto }) {
  return (
    <p className="wrt-photo-thumb__credit">
      Photo: {photo.author} · <a href={photo.licenseUrl}>{photo.license}</a>
      {" · "}<a href={photo.sourceUrl}>{photo.sourceName === "iNaturalist" ? "iNaturalist source" : "Wiki source"}</a>
    </p>
  );
}
