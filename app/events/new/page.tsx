import { PlantingPage } from "../planting-page";
export { metadata, viewport } from "../planting-page";
export default async function Page(props: Readonly<PageProps<"/events/new">>) {
  return PlantingPage({ searchParams: props.searchParams, recording: true });
}
