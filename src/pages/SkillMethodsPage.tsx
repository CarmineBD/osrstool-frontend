import { useParams } from "react-router-dom";
import { Home } from "@/pages/Home";
import { isOsrsSkill, formatSkillName } from "@/lib/skills";
import { NotFoundPage } from "@/pages/NotFoundPage";

export function SkillMethodsPage() {
  const { skill = "" } = useParams();
  const normalizedSkill = skill.toLowerCase();

  if (!isOsrsSkill(normalizedSkill)) {
    return <NotFoundPage />;
  }

  const skillName = formatSkillName(normalizedSkill);

  return (
    <Home
      lockedSkill={normalizedSkill}
      pageTitle={`Methods for ${skillName}`}
      seo={{
        title: `${skillName} Methods | RSMethods`,
        description: `OSRS methods filtered by the ${skillName} skill, with the same filters as /allMethods except for the skill selector.`,
        path: `/skilling/${normalizedSkill}`,
        keywords: `osrs ${normalizedSkill} methods, ${normalizedSkill} money making osrs`,
      }}
    />
  );
}
