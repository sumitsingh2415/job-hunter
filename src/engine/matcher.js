// Refined AI Job Matching & Relevance Scoring Engine for Anshu Priya

import { ANSHU_PROFILE } from '../config/profile.js';

export function calculateJobMatch(job, profile = ANSHU_PROFILE) {
  const { title = '', description = '', location = '', company = '' } = job;
  const fullContent = `${title} ${description}`.toLowerCase();
  const lowerTitle = title.toLowerCase();
  const lowerLoc = location.toLowerCase();

  // Step 1: Check for Negative Keywords (Immediate Disqualification)
  for (const neg of profile.negativeKeywords) {
    if (lowerTitle.includes(neg.toLowerCase())) {
      return {
        matchScore: 0,
        matchGrade: "Irrelevant Role",
        matchingSkills: [],
        missingSkills: profile.primarySkills.slice(0, 5),
        isLocationMatch: false,
        fitSummary: `Disqualified due to negative keyword "${neg}" in title.`,
        disqualified: true
      };
    }
  }

  // Step 2: Title Relevance Score (Max 40 points)
  let titleScore = 0;
  let matchedTargetTitle = "";

  for (const targetTitle of profile.targetTitles) {
    const targetTokens = targetTitle.toLowerCase().split(' ');
    let matchedTokenCount = 0;
    
    for (const token of targetTokens) {
      if (token.length > 2 && lowerTitle.includes(token)) {
        matchedTokenCount++;
      }
    }

    const tokenRatio = matchedTokenCount / targetTokens.length;
    if (tokenRatio * 40 > titleScore) {
      titleScore = Math.round(tokenRatio * 40);
      matchedTargetTitle = targetTitle;
    }
  }

  // Core role term boosted score
  const coreRoleTerms = ["business development", "b2b sales", "digital marketing", "content strategy", "client acquisition", "corporate partnerships", "marketing executive", "marketing associate", "growth associate"];
  for (const term of coreRoleTerms) {
    if (lowerTitle.includes(term)) {
      titleScore = Math.max(titleScore, 36);
      break;
    }
  }

  // Step 3: Primary Skills & Keyword Overlap Score (Max 35 points)
  const matchedSkills = [];
  const missingSkills = [];

  for (const skill of profile.primarySkills) {
    const lowerSkill = skill.toLowerCase();
    if (
      fullContent.includes(lowerSkill) ||
      (lowerSkill === 'excel' && fullContent.includes('excel')) ||
      (lowerSkill === 'b2b sales' && (fullContent.includes('b2b') || fullContent.includes('sales'))) ||
      (lowerSkill === 'business development' && (fullContent.includes('business development') || lowerTitle.includes('business development')))
    ) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  }

  const skillCoverageRatio = matchedSkills.length / Math.min(profile.primarySkills.length, 6);
  const skillsScore = Math.min(35, Math.round(skillCoverageRatio * 35));

  // Step 4: Location Score (Max 15 points)
  let isLocationMatch = false;
  let locationScore = 0;

  for (const loc of profile.locations) {
    if (lowerLoc.includes(loc.toLowerCase()) || lowerLoc.includes("remote") || lowerLoc.includes("work from home")) {
      isLocationMatch = true;
      locationScore = 15;
      break;
    }
  }
  if (locationScore === 0 && (lowerLoc.includes("india") || lowerLoc === "")) {
    locationScore = 10;
  }

  // Step 5: Experience Level & Domain Fit Score (Max 10 points)
  let experienceScore = 5;
  const domainBonusTerms = ["fresher", "associate", "executive", "0-2 years", "1-3 years", "pgdm", "mba", "healthcare", "telecom", "b2b", "consulting", "marketing"];
  for (const kw of domainBonusTerms) {
    if (fullContent.includes(kw)) {
      experienceScore += 1;
    }
  }
  experienceScore = Math.min(10, experienceScore);

  // Aggregate Final Score (0 - 100)
  const totalScore = Math.min(100, titleScore + skillsScore + locationScore + experienceScore);

  // Determine Grade
  let matchGrade = "Low Match";
  if (totalScore >= 75) matchGrade = "Exceptional Match";
  else if (totalScore >= 65) matchGrade = "Strong Fit";
  else if (totalScore >= 50) matchGrade = "Moderate Fit";

  // Synthesize Summary
  let fitSummary = "";
  if (matchedSkills.length > 0) {
    fitSummary = `${totalScore}% Match (${matchGrade}): Key fit for ${matchedSkills.slice(0, 3).join(', ')}.`;
  } else {
    fitSummary = `${totalScore}% Match (${matchGrade}): General alignment with target role.`;
  }

  return {
    matchScore: totalScore,
    matchGrade,
    matchingSkills: matchedSkills,
    missingSkills: missingSkills.slice(0, 5),
    matchedTitle: matchedTargetTitle || profile.targetTitles[0],
    isLocationMatch,
    fitSummary,
    scoreBreakdown: {
      title: titleScore,
      skills: skillsScore,
      location: locationScore,
      experience: experienceScore
    }
  };
}
