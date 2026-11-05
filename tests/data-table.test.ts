import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DataTable, type DataTableColumn } from "@/components/wrt/shared/data-table";

interface Row { id: string; name: string; n: number }
const rows: Row[] = [{ id: "a", name: "Mānuka", n: 1240 }, { id: "b", name: "Kōwhai", n: 60 }];
const columns: DataTableColumn<Row>[] = [
  { key: "name", header: "Species", cell: (r) => r.name },
  { key: "n", header: "Plants", cell: (r) => r.n, numeric: true, strong: true },
  { key: "edit", header: "Actions", hideHeader: true, cell: () => "Edit" },
];
const render = (props: Partial<Parameters<typeof DataTable<Row>>[0]> = {}) =>
  renderToStaticMarkup(createElement(DataTable<Row>, { caption: "Test table", rows, columns, rowKey: (r) => r.id, ...props }));

describe("DataTable", () => {
  it("renders a real table inside the scrolling wrapper, with a caption", () => {
    const html = render();
    expect(html).toMatch(/^<div class="wrt-table-wrap"><table class="wrt-table wrt-data-table" style="min-width:640px">/);
    expect(html).toContain('<caption class="sr-only">Test table</caption>');
  });

  it("gives every row the same columns, in order", () => {
    const html = render();
    expect(html.match(/<th scope="col"/g)).toHaveLength(3);
    expect(html.match(/<tr>/g)).toHaveLength(3); // header + 2 rows
    expect(html.match(/<td/g)).toHaveLength(6);
  });

  it("right-aligns and bolds numeric columns, header included", () => {
    const html = render();
    expect(html).toContain('<th scope="col" class="cn-num">Plants</th>');
    expect(html).toContain('<td class="cn-num font-extrabold">1240</td>');
  });

  it("keeps hidden headers for screen readers", () => {
    expect(render()).toContain('<th scope="col"><span class="sr-only">Actions</span></th>');
  });

  it("uses the given scroll width and row classes", () => {
    const html = render({ minWidth: 720, rowClassName: (r) => (r.id === "b" ? "is-review" : undefined) });
    expect(html).toContain("min-width:720px");
    expect(html).toContain('<tr class="is-review">');
  });

  it("shows the empty state instead of an empty table", () => {
    const html = render({ rows: [], empty: createElement("p", null, "Nothing yet") });
    expect(html).toBe("<p>Nothing yet</p>");
  });
});
