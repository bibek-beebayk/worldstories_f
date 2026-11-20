import { Facebook, Link2, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { copyShareLink, shareToFacebook, shareToTwitter } from "@/lib/share";

interface StoryShareMenuProps {
  path: string;
  title: string;
  buttonClassName?: string;
}

const StoryShareMenu = ({ path, title, buttonClassName = "h-11 w-11 px-0" }: StoryShareMenuProps) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button size="lg" variant="outline" className={buttonClassName} aria-label="Share this story">
        <Share2 className="h-4 w-4" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuItem onClick={() => shareToFacebook(path)}>
        <Facebook className="h-4 w-4" />
        Share on Facebook
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => shareToTwitter(path, title)}>
        <Share2 className="h-4 w-4" />
        Share on X (Twitter)
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => copyShareLink(path)}>
        <Link2 className="h-4 w-4" />
        Copy link
      </DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>
);

export default StoryShareMenu;
