// OPM 2026 Locality Pay Area Rates
// Source: https://www.opm.gov/policy-data-oversight/pay-leave/salaries-wages/2026/general-schedule/
export const EFFECTIVE_YEAR = 2026;

export interface LocalityArea {
  name: string;
  percentage: number;
}

export interface LocalityMatch extends LocalityArea {
  fallback?: boolean;
}

export const LOCALITY_AREAS: LocalityArea[] = [
  { name: 'Albany-Schenectady, NY-MA', percentage: 20.77 },
  { name: 'Albuquerque-Santa Fe-Las Vegas, NM', percentage: 18.33 },
  { name: 'Atlanta-Athens-Sandy Springs, GA-AL', percentage: 23.79 },
  { name: 'Austin-Round Rock-Georgetown, TX', percentage: 20.35 },
  { name: 'Birmingham-Hoover-Talladega, AL', percentage: 18.24 },
  { name: 'Boston-Worcester-Providence, MA-RI-NH-CT-ME-VT', percentage: 32.58 },
  { name: 'Buffalo-Cheektowaga-Olean, NY', percentage: 22.41 },
  { name: 'Burlington-South Burlington-Barre, VT', percentage: 19.45 },
  { name: 'Charlotte-Concord, NC-SC', percentage: 19.67 },
  { name: 'Chicago-Naperville, IL-IN-WI', percentage: 30.86 },
  { name: 'Cincinnati-Wilmington-Maysville, OH-KY-IN', percentage: 21.93 },
  { name: 'Cleveland-Akron-Canton, OH-PA', percentage: 22.23 },
  { name: 'Colorado Springs, CO', percentage: 20.15 },
  { name: 'Columbus-Marion-Zanesville, OH', percentage: 22.15 },
  { name: 'Corpus Christi-Kingsville-Alice, TX', percentage: 17.63 },
  { name: 'Dallas-Fort Worth, TX-OK', percentage: 27.26 },
  { name: 'Davenport-Moline, IA-IL', percentage: 18.93 },
  { name: 'Dayton-Springfield-Kettering, OH', percentage: 21.42 },
  { name: 'Denver-Aurora, CO', percentage: 30.52 },
  { name: 'Des Moines-Ames-West Des Moines, IA', percentage: 18.01 },
  { name: 'Detroit-Warren-Ann Arbor, MI', percentage: 29.12 },
  { name: 'Fresno-Madera-Hanford, CA', percentage: 17.65 },
  { name: 'Harrisburg-Lebanon, PA', percentage: 19.43 },
  { name: 'Hartford-East Hartford, CT-MA', percentage: 32.08 },
  { name: 'Houston-The Woodlands, TX', percentage: 35.00 },
  { name: 'Huntsville-Decatur, AL-TN', percentage: 21.91 },
  { name: 'Indianapolis-Carmel-Muncie, IN', percentage: 18.15 },
  { name: 'Kansas City-Overland Park, MO-KS', percentage: 18.97 },
  { name: 'Laredo, TX', percentage: 21.59 },
  { name: 'Las Vegas-Henderson, NV-AZ', percentage: 19.57 },
  { name: 'Los Angeles-Long Beach, CA', percentage: 36.47 },
  { name: 'Miami-Fort Lauderdale, FL', percentage: 24.67 },
  { name: 'Milwaukee-Racine-Waukesha, WI', percentage: 22.42 },
  { name: 'Minneapolis-St. Paul, MN-WI', percentage: 27.62 },
  { name: 'New York-Newark, NY-NJ-CT-PA', percentage: 37.95 },
  { name: 'Omaha-Council Bluffs-Fremont, NE-IA', percentage: 18.23 },
  { name: 'Palm Bay-Melbourne-Titusville, FL', percentage: 17.93 },
  { name: 'Philadelphia-Reading-Camden, PA-NJ-DE-MD', percentage: 28.99 },
  { name: 'Phoenix-Mesa, AZ', percentage: 22.45 },
  { name: 'Pittsburgh-New Castle-Weirton, PA-OH-WV', percentage: 21.03 },
  { name: 'Portland-Vancouver-Salem, OR-WA', percentage: 26.13 },
  { name: 'Raleigh-Durham-Cary, NC', percentage: 22.24 },
  { name: 'Reno-Fernley, NV', percentage: 17.52 },
  { name: 'Richmond, VA', percentage: 22.28 },
  { name: 'Rochester-Batavia-Seneca Falls, NY', percentage: 17.88 },
  { name: 'Sacramento-Roseville, CA-NV', percentage: 29.76 },
  { name: 'San Antonio-New Braunfels-Pearsall, TX', percentage: 18.78 },
  { name: 'San Diego-Chula Vista-Carlsbad, CA', percentage: 33.72 },
  { name: 'San Jose-San Francisco-Oakland, CA', percentage: 46.34 },
  { name: 'Seattle-Tacoma, WA', percentage: 31.57 },
  { name: 'Spokane-Spokane Valley, WA-ID', percentage: 17.67 },
  { name: 'St. Louis-St. Charles-Farmington, MO-IL', percentage: 20.03 },
  { name: 'Tucson-Nogales, AZ', percentage: 19.28 },
  { name: 'Virginia Beach-Norfolk, VA-NC', percentage: 18.80 },
  { name: 'Washington-Baltimore-Arlington, DC-MD-VA-WV-PA', percentage: 33.94 },
  { name: 'State of Alaska', percentage: 32.36 },
  { name: 'State of Hawaii', percentage: 22.21 },
  { name: 'Rest of US', percentage: 17.06 },
];

const ALIASES: Record<string, string> = {
  dc: 'washington',
  dmv: 'washington',
  nyc: 'new york',
  sf: 'san francisco',
  la: 'los angeles',
  chi: 'chicago',
  philly: 'philadelphia',
  atl: 'atlanta',
  dfw: 'dallas',
  hou: 'houston',
  bos: 'boston',
  den: 'denver',
  sea: 'seattle',
  pdx: 'portland',
  msp: 'minneapolis',
  alaska: 'state of alaska',
  hawaii: 'state of hawaii',
};

const REST_OF_US_ENTRY = LOCALITY_AREAS.find((area) => area.name === 'Rest of US')!;
const REST_OF_US: LocalityMatch = { ...REST_OF_US_ENTRY, fallback: true };

export function findLocalityArea(query: string): LocalityMatch {
  const trimmed = query.trim().toLowerCase();

  if (trimmed === '') return REST_OF_US;

  // Check aliases first
  const aliasTarget = ALIASES[trimmed];
  if (aliasTarget) {
    const match = LOCALITY_AREAS.find((area) =>
      area.name.toLowerCase().includes(aliasTarget),
    );
    if (match) return { ...match };
  }

  // Substring match
  const substringMatch = LOCALITY_AREAS.find((area) =>
    area.name.toLowerCase().includes(trimmed),
  );
  if (substringMatch) return { ...substringMatch };

  // Token overlap
  const queryTokens = trimmed.split(/[\s,\-]+/).filter((token) => token.length > 2);
  let bestMatch: LocalityArea | undefined;
  let bestScore = 0;

  LOCALITY_AREAS
    .filter((area) => area.name !== 'Rest of US')
    .forEach((area) => {
      const areaTokens = area.name.toLowerCase().split(/[\s,\-]+/);
      const score = queryTokens.filter((queryToken) =>
        areaTokens.some((areaToken) => areaToken.includes(queryToken)),
      ).length;
      if (score > bestScore) {
        bestScore = score;
        bestMatch = area;
      }
    });

  if (bestMatch && bestScore > 0) return { ...bestMatch };

  return REST_OF_US;
}
