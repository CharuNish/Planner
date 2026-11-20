// Research paper deadlines for the Updates > Research deadlines section.
// Hand-curated (no daily refresh). Ask Claude to refresh this list when needed.
// Every deadline below was checked on LAST_CHECKED; nothing is invented.
//   status "confirmed"   = from the official site / call for papers
//   status "unconfirmed" = published by a third-party listing, official page not readable yet
//   status "estimated"   = not announced; projected from last year's cycle (shown with "est.")
//   status "tba"         = not announced and no reliable pattern; date left blank
// Ranks are CORE 2023 (portal.core.edu.au). "check" = not sure, look it up before relying on it.

export const LAST_CHECKED = "2026-11-20";

export type Conference = {
  short: string;          // e.g. "ICCV 2027"
  name: string;           // full name
  topics: ("CV" | "XAI" | "Fuzzy" | "AI")[];
  city: string;
  country: string;
  dates: string;          // human readable conference dates
  start: string | null;   // ISO date of first day, for sorting
  deadline: string | null;  // ISO date of full paper deadline (end of day, Anywhere on Earth)
  abstract?: string;      // ISO date of abstract / registration deadline, if separate
  status: "confirmed" | "unconfirmed" | "estimated" | "tba";
  rank: string;
  url: string;
  note?: string;
};

export const CONFERENCES: Conference[] = [
  { short: "ICME 2027", name: "IEEE International Conference on Multimedia & Expo", topics: ["CV"], city: "Xiamen", country: "China", dates: "13–17 Jul 2027", start: "2027-07-13", deadline: "2026-12-30", status: "confirmed", rank: "check", url: "https://2027.ieeeicme.org/about/important-dates", note: "Time zone not stated on the official page." },
  { short: "IJCAI 2027", name: "International Joint Conference on Artificial Intelligence", topics: ["AI", "XAI", "CV"], city: "Kyoto", country: "Japan", dates: "7–13 Aug 2027", start: "2027-08-07", deadline: "2027-01-11", abstract: "2027-01-04", status: "confirmed", rank: "A*", url: "https://2027.ijcai.org/" },
  { short: "FUZZ-IEEE 2027", name: "IEEE International Conference on Fuzzy Systems", topics: ["Fuzzy", "XAI"], city: "Sydney", country: "Australia", dates: "10–13 Jul 2027", start: "2027-07-10", deadline: "2027-01-15", status: "unconfirmed", rank: "A", url: "https://attend.ieee.org/fuzz-2027/", note: "Deadline from a third-party listing; check the official page." },
  { short: "ICML 2027", name: "International Conference on Machine Learning", topics: ["AI", "XAI"], city: "TBA", country: "South America", dates: "Summer 2027 (TBA)", start: "2027-07-01", deadline: "2027-01-22", abstract: "2027-01-16", status: "estimated", rank: "A*", url: "https://icml.cc/" },
  { short: "IFSA-EUSFLAT 2027", name: "Joint 22nd IFSA World Congress & 15th EUSFLAT Conference", topics: ["Fuzzy", "XAI", "CV"], city: "Bari", country: "Italy", dates: "13–17 Sep 2027", start: "2027-09-13", deadline: "2027-02-14", abstract: "2027-02-14", status: "confirmed", rank: "check", url: "https://easychair.org/cfp/IFSA-EUSFLAT-2027" },
  { short: "MICCAI 2027", name: "Medical Image Computing and Computer Assisted Intervention", topics: ["CV", "XAI"], city: "Auckland", country: "New Zealand", dates: "27 Sep – 1 Oct 2027", start: "2027-09-27", deadline: "2027-02-25", status: "estimated", rank: "A", url: "https://miccai.org/", note: "2026 deadline was 26 Feb." },
  { short: "ICCV 2027", name: "IEEE/CVF International Conference on Computer Vision", topics: ["CV"], city: "Hong Kong", country: "China", dates: "3–7 Oct 2027", start: "2027-10-03", deadline: "2027-03-08", abstract: "2027-03-01", status: "estimated", rank: "A*", url: "https://iccv.thecvf.com/", note: "Call for papers not out yet; dates projected." },
  { short: "ECAI 2027", name: "European Conference on Artificial Intelligence", topics: ["AI", "XAI"], city: "Athens", country: "Greece", dates: "2027 (TBA)", start: null, deadline: "2027-04-14", status: "unconfirmed", rank: "A", url: "https://www.opencurious.com/ai-conference-deadlines", note: "From a deadline tracker; official call not checked." },
  { short: "NeurIPS 2027", name: "Conference on Neural Information Processing Systems", topics: ["AI", "XAI", "CV"], city: "TBA", country: "Europe", dates: "Dec 2027 (TBA)", start: "2027-12-01", deadline: "2027-05-21", abstract: "2027-05-14", status: "estimated", rank: "A*", url: "https://neurips.cc/" },
  { short: "BMVC 2027", name: "British Machine Vision Conference", topics: ["CV"], city: "TBA", country: "UK", dates: "Nov 2027 (TBA)", start: "2027-11-22", deadline: "2027-05-28", status: "estimated", rank: "A", url: "https://www.bmva.org/bmvc", note: "2026 deadline was 29 May." },
  { short: "WACV 2028", name: "IEEE/CVF Winter Conference on Applications of Computer Vision", topics: ["CV"], city: "Waikoloa, Hawaii", country: "USA", dates: "2–9 Jan 2028", start: "2028-01-02", deadline: "2027-06-25", status: "estimated", rank: "A", url: "https://wacv.thecvf.com/", note: "Round 1 estimated from 2027 (26 Jun); round 2 is usually late Aug." },
  { short: "AAAI 2028", name: "AAAI Conference on Artificial Intelligence", topics: ["AI", "XAI", "CV"], city: "TBA", country: "TBA", dates: "Feb 2028 (TBA)", start: "2028-02-01", deadline: "2027-07-27", status: "estimated", rank: "A*", url: "https://aaai.org/conference/aaai/", note: "2027 deadline was 28 Jul 2026." },
  { short: "xAI 2027", name: "5th World Conference on eXplainable Artificial Intelligence", topics: ["XAI"], city: "TBA", country: "TBA", dates: "Mid 2027 (TBA)", start: "2027-07-01", deadline: null, status: "tba", rank: "unranked", url: "https://xaiworldconference.com/", note: "Annual; 2027 call not out yet." },
  { short: "ACM MM 2027", name: "ACM International Conference on Multimedia", topics: ["CV", "XAI"], city: "Hong Kong", country: "China", dates: "8–12 Nov 2027", start: "2027-11-08", deadline: null, status: "tba", rank: "A*", url: "https://acmmm.org/" },
  { short: "ICIP 2027", name: "IEEE International Conference on Image Processing", topics: ["CV"], city: "Singapore", country: "Singapore", dates: "29 Nov – 3 Dec 2027", start: "2027-11-29", deadline: null, status: "tba", rank: "B", url: "https://2027.ieeeicip.org/" },
];

/** End of the deadline day, Anywhere on Earth (UTC-12), as a timestamp. */
export const deadlineMs = (iso: string) => new Date(`${iso}T23:59:59-12:00`).getTime();

/** Upcoming conferences: deadline not passed and within a year from now; TBA ones last. */
export function upcomingConferences(now = Date.now()) {
  const yearAhead = now + 365 * 86400000;
  const dated = CONFERENCES.filter((c) => c.deadline && deadlineMs(c.deadline) >= now && deadlineMs(c.deadline) <= yearAhead)
    .sort((a, b) => a.deadline!.localeCompare(b.deadline!));
  const tba = CONFERENCES.filter((c) => !c.deadline && (!c.start || new Date(c.start).getTime() >= now)).sort((a, b) => (a.start || "").localeCompare(b.start || ""));
  return { dated, tba };
}
