import { Link } from "react-router-dom";

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-muted/40">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="mb-2 font-semibold">InfluenceOS</p>
          <p className="text-sm text-muted-foreground">
            Where creators and brands actually trust each other. Free for creators. Escrow-protected for brands.
          </p>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Product</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li><Link to="/for-creators" className="hover:text-foreground">For Creators</Link></li>
            <li><Link to="/for-brands" className="hover:text-foreground">For Brands</Link></li>
            <li><Link to="/pricing" className="hover:text-foreground">Pricing</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Trust</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li><Link to="/trust-and-compliance" className="hover:text-foreground">Trust &amp; Compliance</Link></li>
            <li><Link to="/faq" className="hover:text-foreground">FAQ</Link></li>
          </ul>
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">Get started</p>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li><Link to="/signup?role=creator" className="hover:text-foreground">Join as a Creator</Link></li>
            <li><Link to="/signup?role=brand" className="hover:text-foreground">Start a Campaign</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-border py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} InfluenceOS. All rights reserved.
      </div>
    </footer>
  );
}
