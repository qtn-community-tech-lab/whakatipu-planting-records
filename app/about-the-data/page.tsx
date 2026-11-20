import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardLink, PageHead } from "@/components/wrt/shared/page";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import styles from "./about.module.css";

export const metadata: Metadata = {
  title: "About WRT",
  description:
    "Meet Whakatipu Reforestation Trust, explore its community planting history, and find out how to help restore native biodiversity in the Whakatipu Basin.",
};

export default function AboutWrt() {
  return (
    <div className={styles.page}>
      <PageHead
        eyebrow="About Whakatipu Reforestation Trust"
        title="Restoring native biodiversity in the Whakatipu Basin"
        lead="Discover the people and plants behind local restoration, and explore the planting history that this app brings together."
      />

      <Card className={cn(styles.card)} title="A community growing native habitats">
        <div className={cn("wrt-prose", styles.copy)}>
          <p>
            Whakatipu Reforestation Trust (WRT) works with volunteers, schools,
            businesses and community groups to restore native biodiversity
            across the Whakatipu Basin. Growing and planting native species
            helps create food, shelter and connections between habitats for
            native birds, insects and other wildlife.
          </p>
          <p>
            The Trust combines practical restoration with education,
            collaboration and advocacy, helping people care for the landscape
            around them.
          </p>
          <p>
            <a
              href="https://wrtqt.org.nz/about-the-whakatipu-reforestation-trust/"
              target="_blank"
              rel="noopener noreferrer"
              className="cn-link"
            >
              Learn about WRT’s vision and work →
            </a>
          </p>
        </div>
      </Card>

      <Card className={cn(styles.card)} title="From local seed to native habitat">
        <div className={styles.features}>
          <div className={cn("wrt-prose", styles.feature)}>
            <h3>Growing plants</h3>
            <p>
              At the Jean Malpas Community Nursery in Kelvin Heights, volunteers
              grow native plants from locally collected seeds and cuttings.
              Nursery sessions offer a practical way to help and learn, with no
              experience needed.
            </p>
            <a
              href="https://wrtqt.org.nz/community-nursery/"
              target="_blank"
              rel="noopener noreferrer"
              className="cn-link"
            >
              Visit the community nursery →
            </a>
          </div>
          <div className={cn("wrt-prose", styles.feature)}>
            <h3>Restoring places</h3>
            <p>
              Community planting days bring people together to establish native
              trees and shrubs. WRT’s restoration sites include woodland,
              wetland, streamside and lakeshore habitats.
            </p>
            <a
              href="https://wrtqt.org.nz/our-planting-sites/"
              target="_blank"
              rel="noopener noreferrer"
              className="cn-link"
            >
              Meet WRT’s planting sites →
            </a>
          </div>
          <div className={cn("wrt-prose", styles.feature)}>
            <h3>Learning together</h3>
            <p>
              Educate for Nature connects schools, adults and community groups
              with hands-on environmental learning, from nursery activities to
              restoring local places.
            </p>
            <a
              href="https://wrtqt.org.nz/educate-for-nature/"
              target="_blank"
              rel="noopener noreferrer"
              className="cn-link"
            >
              Explore Educate for Nature →
            </a>
          </div>
        </div>
      </Card>

      <Card className={cn(styles.card)} title="Explore the planting history">
        <p className={cn("wrt-prose", styles.introduction)}>
          This app brings WRT’s planting records together so you can discover
          which species were recorded at each site, see quantities by season,
          and follow restoration work over time.
        </p>
        <div className={styles.features}>
          <div className={cn("wrt-prose", styles.feature)}>
            <h3>Find a place</h3>
            <p>
              Explore sites across the basin, their planting areas and the
              species recorded there.
            </p>
            <CardLink href="/sites">Explore sites</CardLink>
          </div>
          <div className={cn("wrt-prose", styles.feature)}>
            <h3>Meet the species</h3>
            <p>
              Browse native plants, reference photos and identification notes,
              and see where they feature in the history.
            </p>
            <CardLink href="/species">Discover species</CardLink>
          </div>
          <div className={cn("wrt-prose", styles.feature)}>
            <h3>Follow the seasons</h3>
            <p>
              Compare autumn and spring records and discover the sites and
              species in each season.
            </p>
            <CardLink href="/seasons">Browse seasons</CardLink>
          </div>
        </div>
      </Card>

      <Card className={cn(styles.card)} title="Reading the history">
        <div className={cn("wrt-prose", styles.copy)}>
          <p>
            The historical records come from WRT’s nursery allocation sheets and
            planting workbooks. A total of
            <strong> recorded plants</strong> describes the plants recorded as
            going to a site in a season; it is not a count of how many are
            growing there today. The history does not measure survival or
            current nursery stock.
          </p>
          <p id="threatened">
            Species information includes WRT’s recorded threatened-species
            marks. For local planting advice and further information about
            native and threatened plants, see the{" "}
            <a
              href="https://wrtqt.org.nz/whakatipu-planting-and-species-guide/"
              target="_blank"
              rel="noopener noreferrer"
              className="cn-link"
            >
              Whakatipu Planting and Species Guide
            </a>
            .
          </p>
          <p>
            <Link href="/" className="cn-link">
              Start with the planting overview →
            </Link>
          </p>
        </div>
      </Card>

      <Card className={cn(styles.card)} title="Be part of the next chapter">
        <div className={cn("wrt-prose", styles.copy)}>
          <p>
            Whether you live locally or are visiting, you can help grow and care
            for native habitats. Join a nursery session, a community planting
            day or a working bee. WRT also welcomes community planting partners
            and support through donations.
          </p>
          <p>
            Find current opportunities and session details on WRT’s website:
          </p>
        </div>
        <div className={styles.actions}>
          <Button asChild variant="primary" size="md">
            <a
              href="https://wrtqt.org.nz/get-involved/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Volunteer with WRT →
            </a>
          </Button>
          <Button asChild variant="secondary" size="md">
            <a
              href="https://wrtqt.org.nz/community-planting-days/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Join a planting day →
            </a>
          </Button>
          <Button asChild variant="soft" size="md">
            <a
              href="https://wrtqt.org.nz/donate/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Support the Trust →
            </a>
          </Button>
        </div>
      </Card>
    </div>
  );
}
