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

      <Card
        className={cn(styles.card)}
        title="A community growing native habitats"
      >
        <div className={cn("wrt-prose", styles.copy)}>
          <p>
            Whakatipu Reforestation Trust (WRT) is a volunteer-led charitable
            trust working to restore native biodiversity across the Whakatipu
            Basin. The Trust works with volunteers, schools, businesses and
            community groups to grow and plant native species and care for
            restoration sites as the plantings become established.
          </p>
          <p>
            Over time, these plantings provide food and shelter for native
            birds, insects and other wildlife and help connect habitats across
            the basin. Alongside its practical restoration work, the Trust
            brings local groups together, creates opportunities to learn about
            native plants and advocates for their protection.
          </p>
        </div>
      </Card>

      <Card
        className={cn(styles.card)}
        title="From local seed to native habitat"
      >
        <div className={styles.features}>
          <div className={cn("wrt-prose", styles.feature)}>
            <h3>Growing plants</h3>
            <p>
              At the Jean Malpas Community Nursery in Kelvin Heights, skilled
              volunteers grow native plants for local restoration projects from
              locally collected seed and cuttings. They share their knowledge
              and practical skills at nursery sessions, where newcomers can
              learn alongside them and lend a hand. No experience is needed to
              get started.
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
              Community planting days bring people together to plant keystone
              projects across the basin. These sites represent a variety of
              ecological habitats unique to the region, including dry shrubland,
              wetlands or forested lakeshore. These projects span many years,
              with volunteers returning to care for the plantings as they
              establish. The Trust also supports schools, businesses and
              community groups to restore and care for their own patches of
              public land.
            </p>
            <Link href="/sites" className="cn-link">
              Meet WRT’s planting sites →
            </Link>
          </div>
          <div className={cn("wrt-prose", styles.feature)}>
            <h3>Learning together</h3>
            <p>
              Education is a strategic pillar of the Trust’s work. Through
              Educate for Nature, children, adults and community groups build
              the skills and confidence to take an active role in local
              restoration. That might mean growing native plants in a school
              nursery, caring for a school restoration site or learning
              alongside experienced volunteers at the community nursery.
              Volunteers are encouraged to get involved at every stage, from
              collecting seed and growing plants to planting and caring for
              restoration sites.
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
          The dashboard brings together years of planting records to create a
          living history of restoration carried out by the Whakatipu community.
          It’s a resource for anyone interested in what was planted, where and
          when, showing the species and numbers recorded for each site by
          season. The Trust uses these records alongside observations from its
          sites to understand what’s working and guide future planting.
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
              and see where they fit into our restoring landscapes.
            </p>
            <CardLink href="/species">Discover species</CardLink>
          </div>
          <div className={cn("wrt-prose", styles.feature)}>
            <h3>Follow the seasons</h3>
            <p>
              Autumn and spring records show where planting took place and how
              many plants were recorded each season, tracing how restoration has
              progressed over the years.
            </p>
            <CardLink href="/seasons">Browse seasons</CardLink>
          </div>
        </div>
      </Card>

      <Card className={cn(styles.card)} title="Reading the history">
        <div className={cn("wrt-prose", styles.copy)}>
          <p>
            The historical records come from WRT’s nursery allocation sheets and
            planting workbooks. A total displayed as{" "}
            <strong>“recorded plants”</strong> describes the plants recorded as
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
