create index cities_geo_index
  on public.cities
  using GIST (location);