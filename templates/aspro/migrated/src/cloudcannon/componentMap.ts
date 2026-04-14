import Hero from "@/components/widgets/Hero.astro";
import Features from "@/components/widgets/Features.astro";
import Content from "@/components/widgets/Content.astro";
import Content2 from "@/components/widgets/Content2.astro";
import ServiceList from "@/components/widgets/ServiceList.astro";
import Values from "@/components/widgets/Values.astro";

export const componentMap: Record<string, any> = {
  hero: Hero,
  features: Features,
  content: Content,
  content2: Content2,
  service_list: ServiceList,
  values: Values,
};
