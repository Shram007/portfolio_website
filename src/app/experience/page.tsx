import WorkExperience from "@/components/sections/WorkExperience"; // default export is the component
import { experiences } from "@/lib/data/experience";                 // <- your data file

export default function ExperiencePage() {
  return <WorkExperience experiences={experiences} />;
}
