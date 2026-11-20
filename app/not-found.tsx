import Link from "next/link";
import { ArrowLeft, Braces } from "lucide-react";

export default function NotFound() {
  return (
    <main className="siteShell notFoundShell">
      <div className="notFoundCard">
        <span className="siteBrandMark"><Braces size={24}/></span>
        <p className="sectionKicker">404 — PAGE NOT FOUND</p>
        <h1>This route went<br/><span>off the map.</span></h1>
        <p>The page may have moved, or the address may be incorrect. The SYNTAX homepage is still right here.</p>
        <Link className="primaryCta" href="/"> <ArrowLeft size={16}/> Back to SYNTAX</Link>
      </div>
    </main>
  );
}
