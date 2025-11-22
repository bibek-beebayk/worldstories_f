const Footer = () => {
    return (
        <footer className="border-t border-border bg-muted/50 mt-16">
        <div className="container px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
                <span className="text-lg font-bold text-primary-foreground">W</span>
              </div>
              <span className="text-lg font-bold">WorldStories</span>
            </div>
            
            <div className="text-sm text-muted-foreground">
              © 2024 WorldStories, All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    )
}

export default Footer;