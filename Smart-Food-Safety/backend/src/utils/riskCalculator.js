const calculateRisk = (category, description = "") => {

  let score = 0;

  // Category-based score
  switch (category) {

    case "Food Adulteration":
      score += 50;
      break;

    case "Food Poisoning":
      score += 60;
      break;

    case "Expired Food":
      score += 40;
      break;

    case "Poor Hygiene":
      score += 30;
      break;

    case "Bad Quality":
      score += 25;
      break;

    case "Other":
      score += 15;
      break;

    default:
      score += 10;
  }


  // Description keywords
  const text = description.toLowerCase();


  const highRiskWords = [
    "poison",
    "chemical",
    "contamination",
    "adulterated",
    "adulteration",
    "vomiting",
    "hospital",
    "sick"
  ];


  highRiskWords.forEach((word) => {

    if (text.includes(word)) {
      score += 10;
    }

  });


  // Maximum score
  if (score > 100) {
    score = 100;
  }


  let level = "LOW";


  if (score >= 75) {

    level = "CRITICAL";

  } else if (score >= 50) {

    level = "HIGH";

  } else if (score >= 30) {

    level = "MEDIUM";

  }


  return {
    score,
    level
  };

};


module.exports = calculateRisk;