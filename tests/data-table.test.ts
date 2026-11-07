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
  it("shows the empty state instead of an empty table", () => {
    const html = render({ rows: [], empty: createElement("p", null, "Nothing yet") });
    expect(html).toBe("<p>Nothing yet</p>");
  });
});
