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
  // ── Computer vision / image analysis ──
  { short: "IPMI 2027", name: "Information Processing in Medical Imaging", topics: ["CV"], city: "Orford, Quebec", country: "Canada", dates: "27 Jun – 2 Jul 2027", start: "2027-06-27", deadline: "2026-12-14", abstract: "2026-12-07", status: "confirmed", rank: "A", url: "https://2027.ipmi-conf.org/", note: "Deadline is Pacific time, not AoE." },
  { short: "ICME 2027", name: "IEEE International Conference on Multimedia & Expo", topics: ["CV"], city: "Xiamen", country: "China", dates: "13–17 Jul 2027", start: "2027-07-13", deadline: "2026-12-30", status: "confirmed", rank: "check", url: "https://2027.ieeeicme.org/about/important-dates", note: "Time zone not stated on the official page." },
  { short: "SCIA 2027", name: "Scandinavian Conference on Image Analysis", topics: ["CV"], city: "Gjøvik", country: "Norway", dates: "8–11 Jun 2027", start: "2027-06-08", deadline: "2027-01-26", status: "unconfirmed", rank: "check", url: "https://scia2027.org/", note: "From a third-party listing." },
  { short: "ICMR 2027", name: "ACM International Conference on Multimedia Retrieval", topics: ["CV"], city: "Singapore", country: "Singapore", dates: "7–10 Jun 2027", start: "2027-06-07", deadline: "2027-01-31", status: "confirmed", rank: "check", url: "https://mldeadlines.com/conference/icmr/" },
  { short: "EUSIPCO 2027", name: "European Signal Processing Conference", topics: ["CV"], city: "Darmstadt", country: "Germany", dates: "30 Aug – 3 Sep 2027", start: "2027-08-30", deadline: "2027-02-06", status: "unconfirmed", rank: "B", url: "https://eusipco2027.de/", note: "From a third-party listing." },
  { short: "ICIAP 2027", name: "International Conference on Image Analysis and Processing", topics: ["CV", "XAI"], city: "Modena", country: "Italy", dates: "13–17 Sep 2027", start: "2027-09-13", deadline: "2027-02-11", status: "confirmed", rank: "B", url: "https://iciap2027.unimore.it/call-for-papers.html", note: "Round 1. Round 2 deadline: 15 Apr 2027." },
  { short: "ICDAR 2027", name: "International Conference on Document Analysis and Recognition", topics: ["CV"], city: "Kuala Lumpur", country: "Malaysia", dates: "18–22 Aug 2027", start: "2027-08-18", deadline: "2027-02-20", abstract: "2027-01-31", status: "confirmed", rank: "A", url: "https://icdar2027.org/call-for-papers", note: "Strict, no extensions." },
  { short: "MICCAI 2027", name: "Medical Image Computing and Computer Assisted Intervention", topics: ["CV", "XAI"], city: "Auckland", country: "New Zealand", dates: "27 Sep – 1 Oct 2027", start: "2027-09-27", deadline: "2027-02-25", status: "estimated", rank: "A", url: "https://miccai.org/", note: "2026 deadline was 26 Feb." },
  { short: "ICCV 2027", name: "IEEE/CVF International Conference on Computer Vision", topics: ["CV"], city: "Hong Kong", country: "China", dates: "3–7 Oct 2027", start: "2027-10-03", deadline: "2027-03-08", abstract: "2027-03-01", status: "estimated", rank: "A*", url: "https://iccv.thecvf.com/", note: "Call for papers not out yet; dates projected." },
  { short: "BMVC 2027", name: "British Machine Vision Conference", topics: ["CV"], city: "TBA", country: "UK", dates: "Nov 2027 (TBA)", start: "2027-11-22", deadline: "2027-05-28", status: "estimated", rank: "A", url: "https://www.bmva.org/bmvc", note: "2026 deadline was 29 May." },
  { short: "WACV 2028", name: "IEEE/CVF Winter Conference on Applications of Computer Vision", topics: ["CV"], city: "Waikoloa, Hawaii", country: "USA", dates: "2–9 Jan 2028", start: "2028-01-02", deadline: "2027-06-25", status: "estimated", rank: "A", url: "https://wacv.thecvf.com/", note: "Round 1 estimated from 2027 (26 Jun); round 2 is usually late Aug." },
  { short: "ICASSP 2028", name: "IEEE International Conference on Acoustics, Speech and Signal Processing", topics: ["CV"], city: "TBA", country: "TBA", dates: "May 2028 (TBA)", start: "2028-05-01", deadline: "2027-09-20", status: "estimated", rank: "check", url: "https://signalprocessingsociety.org/", note: "Has an image & video track. 2027 deadline was 23 Sep 2026." },
  { short: "CVPR 2028", name: "IEEE/CVF Conference on Computer Vision and Pattern Recognition", topics: ["CV"], city: "TBA", country: "TBA", dates: "Jun 2028 (TBA)", start: "2028-06-01", deadline: "2027-11-15", status: "estimated", rank: "A*", url: "https://cvpr.thecvf.com/", note: "2027 deadline was 16 Nov 2026." },

  // ── AI / ML (all take XAI and CV papers) ──
  { short: "ESANN 2027", name: "European Symposium on Artificial Neural Networks, Computational Intelligence and ML", topics: ["AI", "XAI"], city: "Bruges", country: "Belgium", dates: "21–23 Apr 2027", start: "2027-04-21", deadline: "2026-11-25", status: "confirmed", rank: "check", url: "https://www.esann.org/", note: "Extended to 25 Nov (CET). Hybrid." },
  { short: "IJCAI-ECAI 2027", name: "International Joint Conference on Artificial Intelligence (with ECAI)", topics: ["AI", "XAI", "CV"], city: "Kyoto", country: "Japan", dates: "7–13 Aug 2027", start: "2027-08-07", deadline: "2027-01-11", abstract: "2027-01-04", status: "confirmed", rank: "A*", url: "https://2027.ijcai.org/" },
  { short: "ICML 2027", name: "International Conference on Machine Learning", topics: ["AI", "XAI"], city: "Rio de Janeiro", country: "Brazil", dates: "31 Jul – 6 Aug 2027", start: "2027-07-31", deadline: "2027-01-22", abstract: "2027-01-14", status: "confirmed", rank: "A*", url: "https://icml.cc/" },
  { short: "IJCNN 2027", name: "International Joint Conference on Neural Networks", topics: ["AI", "XAI", "CV"], city: "Cape Town", country: "South Africa", dates: "14–18 Jun 2027", start: "2027-06-14", deadline: "2027-01-31", status: "confirmed", rank: "check", url: "https://ijcnn.org/2027", note: "Time zone not stated." },
  { short: "ECML-PKDD 2027", name: "European Conference on Machine Learning and Principles of Knowledge Discovery", topics: ["AI", "XAI"], city: "TBA", country: "TBA", dates: "Sep 2027 (TBA)", start: "2027-09-06", deadline: "2027-03-11", abstract: "2027-03-04", status: "estimated", rank: "A", url: "https://ecmlpkdd.org/", note: "2026 deadline was 12 Mar." },
  { short: "IWANN 2027", name: "International Work-Conference on Artificial Neural Networks", topics: ["AI", "XAI"], city: "Puerto de la Cruz, Tenerife", country: "Spain", dates: "14–16 Jun 2027", start: "2027-06-14", deadline: "2027-03-30", status: "unconfirmed", rank: "check", url: "https://iwann.uma.es/", note: "From a third-party listing." },
  { short: "NeurIPS 2027", name: "Conference on Neural Information Processing Systems", topics: ["AI", "XAI", "CV"], city: "TBA", country: "Europe", dates: "Dec 2027 (TBA)", start: "2027-12-01", deadline: "2027-05-21", abstract: "2027-05-14", status: "estimated", rank: "A*", url: "https://neurips.cc/", note: "2026 deadline was 6 May." },
  { short: "AAAI 2028", name: "AAAI Conference on Artificial Intelligence", topics: ["AI", "XAI", "CV"], city: "TBA", country: "TBA", dates: "Feb 2028 (TBA)", start: "2028-02-01", deadline: "2027-07-27", status: "estimated", rank: "A*", url: "https://aaai.org/conference/aaai/", note: "2027 deadline was 28 Jul 2026." },
  { short: "ICLR 2028", name: "International Conference on Learning Representations", topics: ["AI", "XAI", "CV"], city: "TBA", country: "TBA", dates: "Apr 2028 (TBA)", start: "2028-04-20", deadline: "2027-09-24", abstract: "2027-09-17", status: "estimated", rank: "A*", url: "https://iclr.cc/", note: "2027 deadline was 25 Sep 2026." },
  { short: "AISTATS 2028", name: "International Conference on Artificial Intelligence and Statistics", topics: ["AI", "XAI"], city: "TBA", country: "TBA", dates: "May 2028 (TBA)", start: "2028-05-01", deadline: "2027-10-05", status: "estimated", rank: "A", url: "https://aistats.org/", note: "2027 deadline was 6 Oct 2026." },

  // ── Fuzzy logic ──
  { short: "FUZZ-IEEE 2027", name: "IEEE International Conference on Fuzzy Systems", topics: ["Fuzzy", "XAI"], city: "Sydney", country: "Australia", dates: "10–13 Jul 2027", start: "2027-07-10", deadline: "2027-01-15", status: "unconfirmed", rank: "A", url: "https://attend.ieee.org/fuzz-2027/", note: "Deadline from a third-party listing; check the official page." },
  { short: "IFSA-EUSFLAT 2027", name: "Joint 22nd IFSA World Congress & 15th EUSFLAT Conference", topics: ["Fuzzy", "XAI", "CV"], city: "Bari", country: "Italy", dates: "13–17 Sep 2027", start: "2027-09-13", deadline: "2027-02-14", abstract: "2027-02-14", status: "confirmed", rank: "check", url: "https://easychair.org/cfp/IFSA-EUSFLAT-2027" },

  // ── Deadline not announced yet ──
  { short: "MIDL 2027", name: "Medical Imaging with Deep Learning", topics: ["CV"], city: "Porto", country: "Portugal", dates: "14–16 Jul 2027", start: "2027-07-14", deadline: null, status: "tba", rank: "unranked", url: "https://www.midl.io/", note: "Abstract registration 30 Nov 2026; full paper date TBA." },
  { short: "xAI 2027", name: "5th World Conference on eXplainable Artificial Intelligence", topics: ["XAI"], city: "TBA", country: "TBA", dates: "Mid 2027 (TBA)", start: "2027-07-01", deadline: null, status: "tba", rank: "unranked", url: "https://xaiworldconference.com/", note: "Annual; 2027 call not out yet." },
  { short: "ACM MM 2027", name: "ACM International Conference on Multimedia", topics: ["CV", "XAI"], city: "Hong Kong", country: "China", dates: "8–12 Nov 2027", start: "2027-11-08", deadline: null, status: "tba", rank: "A*", url: "https://acmmm.org/" },
  { short: "ICIP 2027", name: "IEEE International Conference on Image Processing", topics: ["CV"], city: "Singapore", country: "Singapore", dates: "29 Nov – 3 Dec 2027", start: "2027-11-29", deadline: null, status: "tba", rank: "B", url: "https://2027.ieeeicip.org/", note: "Deadline expected mid-2027." },
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
