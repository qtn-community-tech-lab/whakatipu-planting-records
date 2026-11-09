import type { AppRoute } from "@/lib/wrt/routes";
import Image from "next/image";
import type { SpeciesPhoto } from "@/lib/wrt/species-photos";

/** Reference image with its saved attribution. */
export function SpeciesPhotoFigure({ photo, name }: { photo: SpeciesPhoto; name: string }) {
  return (
    <figure className="wrt-photo">
      <a href={photo.src} target="_blank" rel="noreferrer" aria-label={`View the full reference photo of ${name}`}>
        <Image
          src={photo.src} width={960} height={720}
          sizes="(max-width: 600px) 100vw, (max-width: 960px) 50vw, 33vw"
          alt={`Reference photo of ${name}`} className="wrt-photo__image" unoptimized
        />
      </a>
      <figcaption className="wrt-photo__caption">Photo: {photo.attribution}</figcaption>
    </figure>
  );
}
