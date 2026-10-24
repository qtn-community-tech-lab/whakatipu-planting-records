import { Card, PageHead } from "@/components/wrt/shared/page";

export const metadata = { title: "About the data" };
export default function AboutTheData() {
  return (
    <>
      <PageHead
        title="About the data"
        lead="Saved records are the source of truth for this explorer."
      />
      <Card title="Planting records">
        <p className="wrt-prose m-0">
          Totals add the known quantities saved against planting events. Unknown
          counts remain unknown and are shown separately; a zero means a
          recorded count of zero. A planting record does not measure survival or
          the number growing today.
        </p>
      </Card>
      <Card title="Dates and seasons">
        <p className="wrt-prose m-0">
          Seasons use the labels saved on events, such as summer or winter.
          Equal labels are grouped together across years. Yearly summaries use
          planting dates; undated events remain in overall and season totals. No
          dates are inferred from season labels.
        </p>
      </Card>
      <Card title="Sources and locations">
        <p className="wrt-prose m-0">
          Records imported from workbooks can retain their original file, sheet
          and cell under Source. New records can include event notes. Site and
          area pins show saved point locations and source references, not
          planting boundaries. An area uses its site’s pin when it has no pin of
          its own.
        </p>
      </Card>
      <Card title="Species references">
        <p className="wrt-prose m-0">
          Species names, descriptions and images come from the saved catalogue.
          Sources and image credits appear with the description. Reference
          photos do not establish that a plant was observed at a particular
          site.
        </p>
      </Card>
      <Card id="threatened" title="Threatened marks">
        <p className="wrt-prose m-0">
          Threatened marks reflect the values saved in WRT’s catalogue. They are
          not an independently verified conservation assessment. Unspecified
          height and threatened values remain unknown.
        </p>
      </Card>
    </>
  );
}
