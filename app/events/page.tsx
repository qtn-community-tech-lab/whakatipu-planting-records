import type { Metadata } from "next";
import { PlantingPage } from "./planting-page";
export const metadata: Metadata = { title: "Records on the map" };
export default async function Page(props: Readonly<PageProps<"/events">>) {
  return PlantingPage({ searchParams: props.searchParams, recording: false });
}
