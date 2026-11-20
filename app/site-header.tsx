"use client";

import { useState } from "react";
import { ArrowUpRight, Braces, Menu, X } from "lucide-react";

const links = [
  ["Features", "#features"],
  ["Workflow", "#workflow"],
  ["Why SYNTAX", "#principles"],
  ["Release", "#release"],
  ["FAQ", "#faq"]
];

export default function SiteHeader() {
  const [open, setOpen] = useState(false);

  return (
    <header className="siteHeader">
      <a className="siteBrand" href="#top" aria-label="SYNTAX IDE home" onClick={() => setOpen(false)}>
        <span className="siteBrandMark"><Braces size={22}/></span>
        <span className="siteBrandName">SYNTAX<small>BEYOND THE CODE.</small></span>
      </a>
      <nav className={open ? "siteNav siteNavOpen" : "siteNav"} aria-label="Main navigation">
        {links.map(([label, href]) => <a key={href} href={href} onClick={() => setOpen(false)}>{label}</a>)}
      </nav>
      <div className="siteHeaderActions">
        <a className="headerCta" href="#release" onClick={() => setOpen(false)}>Release status <ArrowUpRight size={15}/></a>
        <button className="mobileMenuButton" type="button" aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} onClick={() => setOpen(value => !value)}>
          {open ? <X size={19}/> : <Menu size={19}/>}
        </button>
      </div>
    </header>
  );
}
