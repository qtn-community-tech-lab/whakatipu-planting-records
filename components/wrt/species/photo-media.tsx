import Image from "next/image";
import type { SpeciesPhoto } from "@/lib/wrt/species-photos";

const PHOTO_CLASSES = {
  guide: { figure: "wrt-photo", image: "wrt-photo__image", caption: "wrt-photo__caption" },
  hero: { figure: "wrt-shero__photo", image: "wrt-shero__img", caption: "wrt-shero__credit" },
  card: { figure: "wrt-scard__photo", image: "wrt-scard__img", caption: "wrt-scard__credit wrt-scard__above" },
  chat: { figure: "wrt-chat__photo", image: "wrt-chat__photo-img", caption: "wrt-chat__photo-credit" },
  overview: { figure: "wrt-ohero__photo", image: "wrt-ohero__img", caption: "wrt-ohero__tile-credit" },
};

/** Keep the source and licence with every displayed photo credit. */
function PhotoCredit({ photo }: { photo: SpeciesPhoto }) {
  return (
    <span>
      <a href={photo.sourceUrl} target="_blank" rel="noreferrer">{photo.attribution}</a>
      {" · "}<a href={photo.licenseUrl} target="_blank" rel="noreferrer">Licence</a>
    </span>
  );
}

/** Reference image with its saved attribution. */
export function PhotoMedia({ photo, name, variant = "card", sizes, preload = false }: {
  photo: SpeciesPhoto;
  name: string;
  variant?: keyof typeof PHOTO_CLASSES | "avatar";
  sizes?: string;
  preload?: boolean;
}) {
  const classes = variant === "avatar" ? null : PHOTO_CLASSES[variant];
  const image = (
    <Image
      src={photo.src} width={960} height={720}
      sizes={sizes ?? "(max-width: 600px) 100vw, (max-width: 960px) 50vw, 33vw"}
      alt={variant === "avatar" || variant === "overview" ? "" : `Reference photo of ${name}`}
      className={classes?.image} unoptimized preload={preload}
    />
  );
  // Avatars sit inside named links; the species view carries their full credits.
  if (!classes) return image;
  return (
    <figure className={classes.figure} tabIndex={variant === "chat" ? 0 : undefined}>
      {variant === "chat" || variant === "overview" ? image : (
        <a href={photo.src} target="_blank" rel="noreferrer" aria-label={`View the full reference photo of ${name}`}>
          {image}
        </a>
      )}
      <figcaption className={classes.caption}>
        {variant !== "hero" && variant !== "overview" && "Photo: "}<PhotoCredit photo={photo} />
      </figcaption>
    </figure>
  );
}
