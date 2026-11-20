// ✏️ Edit these lists to change what the Updates and Opportunities tabs look for.
export const INTERESTS = {
  paperTopics: ["Explainable AI (XAI)", "Computer Vision", "Neuroscience"],
  // arXiv searches used to find new papers (https://arxiv.org/help/api/user-manual)
  arxivQueries: [
    '(abs:"explainable" OR abs:"interpretability" OR abs:"XAI" OR abs:"saliency") AND (cat:cs.LG OR cat:cs.CV OR cat:cs.AI)',
    "cat:cs.CV",
    "cat:q-bio.NC",
  ],
  paperKeywords: /explain|interpretab|xai|saliency|attribution|vision|image|video|segment|detect|visual|3d|neuro|brain|cortex|fmri|eeg|cognit|neural cod/i,
  mediumTags: ["explainable-ai", "computer-vision", "neuroscience", "psychology", "investing", "machine-learning"],
  youtubeQueries: ["explainable AI", "computer vision", "neuroscience", "psychology", "investing for beginners"],
  opportunityFields: "Explainable AI (XAI), Computer Vision, Neuroscience, Psychology",
  // Optional: tell the AI where you'd like to study/work, e.g. "Europe, Australia, Singapore or remote"
  opportunityRegions: "anywhere in the world (including remote)",
};
