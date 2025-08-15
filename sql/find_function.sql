create or replace function get_nearest_big_city(
  radius_meters float,
  current_lat float,
  current_long float
) 
returns table (
  resultcity text, 
  lat float, 
  long float, 
  distance_meters float8
)
language sql
as $$
  select 
    cities.place as resultcity,
    st_y(cities.location::geometry) as lat,
    st_x(cities.location::geometry) as long,
    st_distance(
      cities.location::geography, 
      st_setsrid(st_point(current_long, current_lat), 4326)::geography
    ) as distance_meters
  from public.cities
  where cities.population >= 5000
    and st_dwithin(
      cities.location::geography, 
      st_setsrid(st_point(current_long, current_lat), 4326)::geography, 
      radius_meters
    )
  order by distance_meters
  limit 1;
$$;