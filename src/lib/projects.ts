import { api } from "./api";
import { parseGeoTagCoords, splitGeolocations, LatLng } from "./geo";

export type Project = { id: string; name: string; sites: LatLng[] };

export async function loadProjects(): Promise<Project[]> {
  const res: any = await api.hr.getAllProjects();
  return (res?.response?.results ?? [])
    .map((p: any) => ({
      id: p._id,
      name: p.name ?? "",
      sites: splitGeolocations(p.geolocations)
        .map(parseGeoTagCoords)
        .filter((c: LatLng | null): c is LatLng => c !== null),
    }))
    .filter((p: Project) => p.name);
}
