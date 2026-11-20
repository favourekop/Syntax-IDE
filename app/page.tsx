import SiteHeader from "./site-header";
import {
  ArrowDownRight, ArrowRight, ArrowUpRight, Braces, Bug, Check,
  Command, Code2, FileCode2, FolderOpen, GitBranch, Globe2,
  Monitor, Play, Search, ShieldCheck, Sparkles, Terminal, Zap
} from "lucide-react";

const features = [
  { icon: Code2, number: "01", title: "A focused code workspace", text: "A clean, powerful editing environment designed to keep your attention on the work that matters." },
  { icon: FolderOpen, number: "02", title: "Your projects stay yours", text: "Open and work with projects on your own computer. Your files stay local unless you choose otherwise." },
  { icon: Terminal, number: "03", title: "Build from one place", text: "Bring your editor, terminal, local preview and debugging workflow into one connected workspace." },
  { icon: Bug, number: "04", title: "Understand every step", text: "A developer-focused workflow with debugging tools and clear feedback as the desktop experience matures." },
  { icon: GitBranch, number: "05", title: "Made for real projects", text: "A foundation for the everyday tools developers need to create, test and refine their work." },
  { icon: ShieldCheck, number: "06", title: "Local-first by design", text: "Private by default. No automatic publishing of your projects and no surprise uploads." }
];

export default function Home() {
  return (
    <main className="siteShell">
      <SiteHeader />

      <section className="heroSection" id="top">
        <div className="heroGlow"/>
        <div className="heroCopy">
          <div className="eyebrow"><span/> THE NEXT CHAPTER OF YOUR WORKFLOW</div>
          <h1>Think it.<br/><span>Build it.</span><br/>Go beyond.</h1>
          <p className="heroLead">Meet SYNTAX IDE — a considered development environment for people who turn ideas into working software.</p>
          <div className="heroActions">
            <a className="primaryCta" href="#release">Discover the release <ArrowRight size={17}/></a>
            <a className="textCta" href="#workflow">Explore the workflow <ArrowDownRight size={16}/></a>
          </div>
          <div className="heroFootnote"><span className="liveDot"/> DESIGNED FOR BUILDERS <i/> WINDOWS DESKTOP FIRST</div>
        </div>
        <div className="heroVisual" aria-label="Illustration of the SYNTAX IDE development workspace">
          <div className="visualTop"><div className="visualBrand"><span><Braces size={14}/></span> SYNTAX <small>WORKSPACE</small></div><div className="windowDots"><i/><i/><i/></div></div>
          <div className="visualBody">
            <aside className="visualRail"><span className="railActive"><FolderOpen size={16}/></span><span><Search size={16}/></span><span><GitBranch size={16}/></span><span><Bug size={16}/></span><span className="railBottom"><Command size={16}/></span></aside>
            <aside className="visualExplorer"><small>EXPLORER</small><b><FolderOpen size={12}/> PROJECT</b><span className="treeActive"><FileCode2 size={13}/> app.tsx</span><span><FileCode2 size={13}/> styles.css</span><span><FileCode2 size={13}/> package.json</span><span><FolderOpen size={13}/> components</span></aside>
            <div className="visualEditor"><div className="visualTab"><span><Braces size={12}/> app.tsx</span><small>LOCAL WORKSPACE</small></div><div className="codeLines">
              <div><em>01</em><span><b>import</b> {"{"} <strong>createApp</strong> {"}"} <b>from</b> <i>"@syntax/core"</i>;</span></div>
              <div><em>02</em></div><div><em>03</em><span><b>const</b> <strong>vision</strong> = {"{"}</span></div>
              <div><em>04</em><span className="indent"><strong>ideas</strong>: <i>"made tangible"</i>,</span></div>
              <div><em>05</em><span className="indent"><strong>focus</strong>: <i>"on the craft"</i>,</span></div>
              <div><em>06</em><span className="indent"><strong>future</strong>: <i>"in your hands"</i></span></div>
              <div><em>07</em><span>{"}"};</span></div><div><em>08</em></div>
              <div><em>09</em><span><b>export default</b> <b>function</b> <strong>App</strong>() {"{"}</span></div>
              <div><em>10</em><span className="indent"><b>return</b> <strong>createApp</strong>(vision);</span></div>
              <div><em>11</em><span>{"}"}</span></div>
            </div><div className="visualTerminal"><div><span/> TERMINAL <small>LOCAL PREVIEW</small></div><p><b>$</b> npm run dev</p><p className="terminalSuccess"><Check size={11}/> Ready on localhost</p></div></div>
          </div>
          <div className="visualStatus"><span><GitBranch size={11}/> main</span><span>UTF-8</span><span><ShieldCheck size={11}/> LOCAL-FIRST</span></div>
          <div className="visualCaption"><span>01 / THE WORKSPACE</span><span>BUILT AROUND YOUR FLOW</span></div>
        </div>
        <div className="heroScroll"><span>SCROLL TO EXPLORE</span><div/></div>
      </section>

      <section className="introStrip" id="workflow">
        <div className="stripLabel">A BETTER SPACE<br/>TO MAKE THINGS</div>
        <p>Great software starts with a clear idea. SYNTAX is being built to give that idea the room, tools and focus it deserves.</p>
        <div className="stripMark"><Sparkles size={23}/><span>LESS FRICTION.<br/>MORE CREATION.</span></div>
      </section>

      <section className="featuresSection" id="features">
        <div className="sectionKicker">01 — THE TOOLKIT</div>
        <div className="sectionHeading">
          <h2>Everything in its<br/><span>right place.</span></h2>
          <p>One environment. A connected workflow. A foundation that grows with the way you build.</p>
        </div>
        <div className="featureGrid">
          {features.map((feature) => {
            const Icon = feature.icon;
            return <article className="featureCard" key={feature.number}>
              <div className="featureTop"><span>{feature.number}</span><Icon size={19}/></div>
              <h3>{feature.title}</h3><p>{feature.text}</p><div className="featureLine"/>
            </article>;
          })}
        </div>
      </section>

      <section className="principlesSection" id="principles">
        <div className="principlesVisual"><div className="orbit orbitOne"/><div className="orbit orbitTwo"/><div className="coreMark"><Braces size={54}/></div><span className="orbitLabel labelOne">YOUR CODE</span><span className="orbitLabel labelTwo">YOUR MACHINE</span><span className="orbitLabel labelThree">YOUR FLOW</span></div>
        <div className="principlesCopy"><div className="sectionKicker">02 — OUR PRINCIPLE</div><h2>Your work.<br/><span>Your machine.</span><br/>Your rules.</h2><p>SYNTAX is being shaped around a simple principle: your projects belong to you. The desktop experience is designed for local work, with publishing and connected services kept intentional.</p><ul><li><Check size={15}/> Local project files</li><li><Check size={15}/> Private previews on your machine</li><li><Check size={15}/> No automatic project publishing</li></ul></div>
      </section>

      <section className="workflowSection">
        <div className="sectionKicker">03 — THE FLOW</div><h2>From first line<br/>to <span>finished idea.</span></h2>
        <div className="workflowSteps">
          <article><span>01</span><div><FolderOpen size={20}/><h3>Open</h3><p>Bring a project from your computer into your workspace.</p></div></article>
          <article><span>02</span><div><Code2 size={20}/><h3>Create</h3><p>Write, shape and refine your code in a focused editor.</p></div></article>
          <article><span>03</span><div><Play size={20}/><h3>Run</h3><p>Build and inspect your work with local tools and previews.</p></div></article>
          <article><span>04</span><div><Zap size={20}/><h3>Launch</h3><p>Choose when and where your finished work goes live.</p></div></article>
        </div>
      </section>


      <section className="faqSection" id="faq">
        <div className="sectionKicker">05 — GOOD TO KNOW</div>
        <div className="faqHeading"><h2>Questions before<br/><span>the first build.</span></h2><p>Clear answers about what SYNTAX is today and what we're preparing next.</p></div>
        <div className="faqList">
          <details><summary>Is SYNTAX IDE available to download now?<span>+</span></summary><p>Not yet. The desktop application is in development. We'll publish a download only when a Windows installer has been built, tested and verified.</p></details>
          <details><summary>Which operating systems will be supported first?<span>+</span></summary><p>The first planned installer targets Windows 10 and Windows 11. macOS and Linux are planned for later releases.</p></details>
          <details><summary>Will my project files be uploaded automatically?<span>+</span></summary><p>No. SYNTAX is being designed around local-first project work. Your projects should remain on your computer unless you deliberately choose a connected service or publish action.</p></details>
          <details><summary>What tools are planned inside the IDE?<span>+</span></summary><p>The desktop roadmap includes a code editor, project explorer, terminal, local development preview, debugging tools and workspace settings. Availability will be documented as each capability is verified.</p></details>
          <details><summary>When will system requirements and release notes be published?<span>+</span></summary><p>System requirements, version details, installation guidance and release notes will be published alongside the first verified installer.</p></details>
        </div>
      </section>

      <section className="releaseSection" id="release">
        <div className="releaseGlow"/>
        <div className="sectionKicker">04 — THE ROAD AHEAD</div>
        <div className="releaseContent"><div><span className="releaseTag"><span/> IN DEVELOPMENT</span><h2>Build without<br/><span>boundaries.</span></h2><p>SYNTAX IDE is in active development. The first installable release is being prepared for Windows 10 and 11, with more platforms planned for the future.</p><div className="releaseMeta"><span><Monitor size={15}/> WINDOWS 10 / 11</span><span><ShieldCheck size={15}/> LOCAL-FIRST</span></div></div>
          <div className="releaseCard"><div className="releaseCardTop"><span>SYNTAX IDE</span><span>EARLY BUILD</span></div><div className="releaseIcon"><Braces size={32}/></div><h3>The desktop app<br/>is on its way.</h3><p>We're building the experience before opening downloads. No placeholder installers. No broken links.</p><span className="comingSoon">DOWNLOADS COMING SOON</span></div>
        </div>
      </section>

      <footer className="siteFooter">
        <div className="footerMain"><a className="siteBrand" href="#top"><span className="siteBrandMark"><Braces size={22}/></span><span className="siteBrandName">SYNTAX<small>BEYOND THE CODE.</small></span></a><p>Tools for the curious.<br/>Space for what comes next.</p><a className="footerTop" href="#top">BACK TO TOP <ArrowUpRight size={14}/></a></div>
        <div className="footerBottom"><span>© 2026 SYNTAX IDE · EKOP DESIGNZ HUB</span><span>CRAFTED FOR BUILDERS.</span></div>
      </footer>
    </main>
  );
}
