import { Link } from "react-router";

const footerLinks = [
  { to: "/originals", label: "WorldStories Originals" },
  { to: "/story-map", label: "Story Map" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms of Service" },
];

const Footer = () => {
    return (
        <footer className="border-t border-border bg-muted/50 mt-8">
        <div className="container px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-20 w-20 items-center justify-center rounded-md">
                <img src="/worldstories-logo.png" alt="" />
              </div>
            </div>

            <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
              {footerLinks.map((link) => (
                <Link key={link.to} to={link.to} className="hover:text-foreground hover:underline">
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} WorldStories, All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    )
}

export default Footer;
