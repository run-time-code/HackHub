# Hackathon Worth Score

## Purpose
Help students decide if a hackathon is worth entering.

## Formula (0-100)
```
worth = 0.30*SkillRelevance + 0.20*Learning + 0.15*Prize + 0.20*Reputation + 0.15*DifficultyFit
```

Each factor 0-100.

| Factor | How to compute |
|---|---|
| Skill Relevance | Jaccard overlap between user skills and required skills/domains |
| Learning | Domain novelty + workshop/mentor availability |
| Prize Pool | Normalized log scale of total prize |
| Organizer Reputation | Manual rating per source (MLH/Devpost high) + past rating |
| Difficulty Fit | Match user level (beginner/intermediate/advanced) vs hackathon tier |

## Tiers
- 90-100: Must Join
- 70-89: Worth It
- 50-69: Consider
- 0-49: Skip

## Example
```js
function calcWorthScore(hackathon, user) {
  const skill = overlap(user.skills, hackathon.skills) * 100
  const learning = hackathon.hasMentors ? 80 : 50
  const prize = Math.min(100, Math.log10(hackathon.prizePool+1)*25)
  const rep = reputationMap[hackathon.organizer] ?? 60
  const diff = difficultyFit(user.level, hackathon.difficulty)
  return Math.round(skill*0.3 + learning*0.2 + prize*0.15 + rep*0.2 + diff*0.15)
}
```
