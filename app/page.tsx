import { World } from "@/components/three/World";
import { Nav } from "@/components/sections/Nav";
import { Hero } from "@/components/sections/Hero";
import { SceneCompanion } from "@/components/sections/SceneCompanion";
import { About } from "@/components/sections/About";
import { ScenePortrait } from "@/components/sections/ScenePortrait";
import { Projects } from "@/components/sections/Projects";
import { Marquee } from "@/components/sections/Marquee";
import { Skills } from "@/components/sections/Skills";
import { Contact } from "@/components/sections/Contact";
import { Footer } from "@/components/sections/Footer";

export default function Home() {
  return (
    <>
      {/* One fixed WebGL world behind the whole page; it reads the scroll. */}
      <World />
      <Nav />
      <main id="content" className="relative z-10">
        <Hero />
        <SceneCompanion />
        <About />
        <ScenePortrait />
        <Projects />
        <Marquee />
        <Skills />
        <Contact />
      </main>
      <Footer />
    </>
  );
}
